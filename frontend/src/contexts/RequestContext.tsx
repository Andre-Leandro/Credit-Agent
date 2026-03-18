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
    
    // Estados que muestran documentos en lugar del simulador
    const DOCUMENTATION_STATES = [
      'DOCUMENTACION',
      'DOCUMENTACIÓN',
      'REVISION',
      'REVISIÓN',
      'BUSQUEDA_PROPIEDAD',
      'BÚSQUEDA_PROPIEDAD',
      'TITULOS_CARGADOS',
      'TÍTULOS_CARGADOS',
      'TASACION',
      'TASACIÓN',
      'FINALIZADO',
      'COMPLETADO',
      'APROBADO',
      'APROBACION',
      'APROBACIÓN'
    ];
    
    const state = DOCUMENTATION_STATES.includes(estado) ? 'documentation' : 'simulator';
    
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
