import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface CreditData {
  estado?: string;
  monto_credito?: number;
  plazo_anos?: number;
  rci?: number;
  [key: string]: any;
}

interface CreditStatusContextType {
  creditData: CreditData | null;
  setCreditData: (data: CreditData | null) => void;
}

const CreditStatusContext = createContext<CreditStatusContextType | undefined>(undefined);

export const CreditStatusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [creditData, setCreditData] = useState<CreditData | null>(null);

  return (
    <CreditStatusContext.Provider value={{ creditData, setCreditData }}>
      {children}
    </CreditStatusContext.Provider>
  );
};

export const useCreditStatus = () => {
  const context = useContext(CreditStatusContext);
  if (context === undefined) {
    throw new Error('useCreditStatus debe ser usado dentro de CreditStatusProvider');
  }
  return context;
};
