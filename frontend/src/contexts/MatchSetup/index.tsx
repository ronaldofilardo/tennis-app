import React, { createContext, useContext, useMemo } from 'react';
import type { UseMatchSetupFormReturn } from '../../hooks/useMatchSetupForm';

export const MatchSetupContext = createContext<UseMatchSetupFormReturn | undefined>(undefined);

export interface MatchSetupProviderProps {
  value: UseMatchSetupFormReturn;
  children: React.ReactNode;
}

export const MatchSetupProvider: React.FC<MatchSetupProviderProps> = ({ value, children }) => {
  const memoizedValue = useMemo(() => value, [value]);

  return (
    <MatchSetupContext.Provider value={memoizedValue}>
      {children}
    </MatchSetupContext.Provider>
  );
};

export function useMatchSetup(): UseMatchSetupFormReturn {
  const context = useContext(MatchSetupContext);
  if (!context) {
    throw new Error('useMatchSetup must be used within MatchSetupProvider');
  }
  return context;
}
