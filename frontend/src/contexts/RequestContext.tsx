import { createContext, useContext, useState, type ReactNode } from 'react';

type RequestState = 'simulator' | 'documentation';

interface RequestContextType {
  requestState: RequestState;
  setRequestState: (state: RequestState) => void;
}

const RequestContext = createContext<RequestContextType | undefined>(undefined);

export const RequestProvider = ({ children }: { children: ReactNode }) => {
  const [requestState, setRequestState] = useState<RequestState>('simulator');

  return (
    <RequestContext.Provider value={{ requestState, setRequestState }}>
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
