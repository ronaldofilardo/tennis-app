import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import MOCK_PLAYERS from '../data/players';

interface User {
  role: 'annotator' | 'player';
  email: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    localStorage.getItem('racket_auth') === 'true'
  );

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('racket_user');
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch {
        // Se houver erro no parsing, limpar dados inválidos
        localStorage.removeItem('racket_auth');
        localStorage.removeItem('racket_user');
        return null;
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    setError(null);

    // Credenciais para testes E2E (compatível com test-server.cjs)
    const testEmail = 'test@test.com';
    const testPassword = 'password';
    let userToAuth: User | null = null;

    if (email === testEmail && password === testPassword) {
      userToAuth = { role: 'annotator', email: testEmail };
    } else {
      // Credenciais originais para compatibilidade
      const annotatorEmail = 'play@email.com';
      const annotatorPassword = '1234';

      if (email === annotatorEmail && password === annotatorPassword) {
        userToAuth = { role: 'annotator', email: annotatorEmail };
      } else {
        const foundPlayer = MOCK_PLAYERS.find(p => p.email === email && p.password === password);
        if (foundPlayer) {
          userToAuth = { role: 'player', email: foundPlayer.email };
        }
      }
    }

    if (userToAuth) {
      localStorage.setItem('racket_auth', 'true');
      localStorage.setItem('racket_user', JSON.stringify(userToAuth));
      setIsAuthenticated(true);
      setCurrentUser(userToAuth);
      setError(null);
    } else {
      setError('Credenciais inválidas.');
    }
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('racket_auth');
    localStorage.removeItem('racket_user');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setError(null);
  };

  // Verificar autenticação no carregamento inicial
  useEffect(() => {
    const storedAuth = localStorage.getItem('racket_auth');
    const storedUser = localStorage.getItem('racket_user');

    if (storedAuth === 'true' && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setIsAuthenticated(true);
        setCurrentUser(user);
      } catch {
        // Se houver erro no parsing, limpar dados inválidos
        logout();
      }
    }
  }, []);

  const value: AuthContextType = {
    isAuthenticated,
    currentUser,
    login,
    logout,
    loading,
    error,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
