import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

type RequestState = 'simulator' | 'documentation';

interface RequestContextType {
  requestState: RequestState;
}

const RequestContext = createContext<RequestContextType | undefined>(undefined);

export const RequestProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  // Determinar estado basado en el usuario desde Lambda (solo lectura)
  const requestState = useMemo(() => {
    const estado = (user?.estado || 'PRE_APROBACION').toUpperCase();
    const state = estado === 'DOCUMENTACION' || estado === 'DOCUMENTACIÓN' ? 'documentation' : 'simulator';
    
    console.log('📋 RequestContext - Renderizando:', {
      user_estado: user?.estado,
      estado_uppercase: estado,
      requestState: state,
      timestamp: new Date().toISOString()
    });
    
    return state;
  }, [user?.estado]) as RequestState;

  return (
    <RequestContext.Provider value={{ requestState }}>
      {children}
    </RequestContext.Provider>
  );
};

export const useRequest = () => {
  const context = useContext(RequestContext);
  if (context === undefined) {
    throw new Error('useRequest debe ser usado dentro de RequestProvider');
  }
  return context;
};
