import React, { createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';

interface NavigationContextType {
  navigateToDashboard: () => void;
  navigateToMatch: (matchId: string, initialState?: any) => void;
  navigateToNewMatch: () => void;
  navigateToLogin: () => void;
  goBack: () => void;
  goForward: () => void;
  replace: (path: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const navigate = useNavigate();

  const navigateToDashboard = () => {
    navigate('/dashboard', { replace: false });
  };

  const navigateToMatch = (matchId: string, initialState?: any) => {
    const options: any = { replace: false };
    if (initialState !== undefined) {
      options.state = { initialState };
    }
    navigate(`/match/${matchId}`, options);
  };

  const navigateToNewMatch = () => {
    navigate('/match/new', { replace: false });
  };

  const navigateToLogin = () => {
    navigate('/login', { replace: false });
  };

  const goBack = () => {
    navigate(-1);
  };

  const goForward = () => {
    navigate(1);
  };

  const replace = (path: string) => {
    navigate(path, { replace: true });
  };

  const value: NavigationContextType = {
    navigateToDashboard,
    navigateToMatch,
    navigateToNewMatch,
    navigateToLogin,
    goBack,
    goForward,
    replace,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};