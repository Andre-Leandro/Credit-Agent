import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface User {
  email: string;
  dni: string;
  estado?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, dni: string, estado?: string) => void;
  logout: () => void;
  isLoading: boolean;
  updateEstado: (estado: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar usuario del localStorage al montar
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Error parsing stored user:', e);
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  // Sincronizar estado desde Lambda cada 10 segundos (igual que CreditProgressBar)
  useEffect(() => {
    if (!user?.dni) return;

    const sincronizarEstado = async () => {
      try {
        const lambdaUrl = import.meta.env.VITE_LAMBDA_URL;
        if (!lambdaUrl) return;

        const response = await fetch(lambdaUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get_status',
            dni: user.dni
          })
        });

        const data = await response.json();

        if (data.status === 'success' && data.data?.estado) {
          const nuevoEstado = data.data.estado;
          console.log('🔄 AuthContext sincronizado:', { 
            dni: user.dni,
            estado_anterior: user.estado,
            estado_nuevo: nuevoEstado 
          });

          // Actualizar solo si el estado cambió
          if (user.estado !== nuevoEstado) {
            const updatedUser = { ...user, estado: nuevoEstado };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            console.log('✅ AuthContext actualizado - Panel lateral debería cambiar ahora');
          }
        }
      } catch (err) {
        console.error('❌ Error sincronizando estado en AuthContext:', err);
      }
    };

    sincronizarEstado();
    const intervalo = setInterval(sincronizarEstado, 10000); // 10 segundos, igual que CreditProgressBar
    return () => clearInterval(intervalo);
  }, [user?.dni]);

  const login = (email: string, dni: string, estado?: string) => {
    const newUser: User = { email, dni, estado: estado || 'PRE_APROBACION' };
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const updateEstado = (estado: string) => {
    if (user) {
      const updatedUser = { ...user, estado };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, updateEstado }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};
