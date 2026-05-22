import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { logger } from '../services/logger';
import { httpClient } from '../config/httpClient';

const authLog = logger.createModuleLogger('AuthContext');

// === Tipos ===

export type UserRole = 'ADMIN' | 'GESTOR' | 'COACH' | 'ATHLETE' | 'SPECTATOR';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl: string | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Aplica uma sessão a partir de uma resposta de API já obtida (ex: após auto-cadastro). */
  loginWithResult: (apiResponse: {
    token: string;
    refreshToken?: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      avatarUrl?: string | null;
    };
  }) => void;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// === Constantes de storage ===
const STORAGE_KEYS = {
  token: 'racket_token',
  refreshToken: 'racket_refresh_token',
  user: 'racket_user',
  schemaVersion: 'racket_schema_v',
} as const;

// Incrementar este número sempre que o formato do AuthUser mudar de forma incompatível.
// Isso garante que sessões antigas sejam limpas automaticamente em todos os browsers.
const CURRENT_SCHEMA_VERSION = '3';

/** Limpa todos os dados de sessão do localStorage */
function clearAllSessionData(): void {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  // Limpa legado
  localStorage.removeItem('racket_auth');
  localStorage.removeItem('racket_club');
}

/** Lê e valida o AuthUser do localStorage. Retorna null se inválido ou desatualizado. */
function loadStoredUser(): AuthUser | null {
  try {
    // Verificar versão do schema — se diferente, limpar tudo
    const storedVersion = localStorage.getItem(STORAGE_KEYS.schemaVersion);
    if (storedVersion !== CURRENT_SCHEMA_VERSION) {
      clearAllSessionData();
      localStorage.setItem(STORAGE_KEYS.schemaVersion, CURRENT_SCHEMA_VERSION);
      return null;
    }

    const storedUser = localStorage.getItem(STORAGE_KEYS.user);
    if (!storedUser) return null;

    const parsed = JSON.parse(storedUser) as AuthUser;

    // Validação mínima de estrutura — garante que o objeto é um AuthUser válido
    if (!parsed || typeof parsed.id !== 'string' || typeof parsed.email !== 'string') {
      clearAllSessionData();
      return null;
    }

    return parsed;
  } catch {
    clearAllSessionData();
    return null;
  }
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(loadStoredUser);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = currentUser !== null;

  // Configurar httpClient com token
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.token);
    if (token) {
      httpClient.setAuthConfig({ token });
    }
  }, []);

  // Redirecionar ao login em caso de 401
  useEffect(() => {
    httpClient.onUnauthorized(() => {
      authLog.warn('Token expirado ou inválido — forçando logout');
      performLogout();
    });
  }, []);

  // === Helpers internos ===

  const persistSession = (token: string, refreshToken: string | undefined, user: AuthUser) => {
    localStorage.setItem(STORAGE_KEYS.token, token);
    if (refreshToken) {
      localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
    }
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEYS.schemaVersion, CURRENT_SCHEMA_VERSION);
    httpClient.setAuthConfig({ token, refreshToken });
    logger.setGlobalContext({ userId: user.email });
  };

  const performLogout = () => {
    clearAllSessionData();
    setCurrentUser(null);
    setError(null);
    httpClient.setAuthConfig({ token: null, refreshToken: null });
    logger.clearGlobalContext();
    authLog.info('Logout realizado');
  };

  const mapLoginResponse = (data: {
    token: string;
    refreshToken?: string;
    user: {
      id: string;
      email: string;
      name: string;
      role?: string;
      platformRole?: string;
      avatarUrl?: string | null;
    };
  }): { token: string; refreshToken?: string; user: AuthUser } => {
    // Backend returns platformRole; map to UserRole for frontend consistency
    const roleValue = data.user.role || data.user.platformRole || 'ATHLETE';
    const roleMap: Record<string, UserRole> = {
      ADMIN: 'ADMIN',
      MEMBER: 'ATHLETE',
      ATHLETE: 'ATHLETE',
      SPECTATOR: 'SPECTATOR',
      COACH: 'COACH',
      GESTOR: 'GESTOR',
    };
    return {
      token: data.token,
      refreshToken: data.refreshToken,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: (roleMap[roleValue] || 'ATHLETE') as UserRole,
        avatarUrl: data.user.avatarUrl ?? null,
      },
    };
  };

  // === Ações públicas ===

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await httpClient.post<{
        token: string;
        refreshToken?: string;
        user: {
          id: string;
          email: string;
          name: string;
          role: string;
          avatarUrl?: string | null;
        };
      }>('/auth/login', { email, password }, { skipAuthHeaders: true });

      const { token, refreshToken, user } = mapLoginResponse(response.data);
      persistSession(token, refreshToken, user);
      setCurrentUser(user);

      authLog.info('Login bem-sucedido via API', {
        email: user.email,
      });
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'responseData' in err
          ? ((err as { responseData: { error?: string } }).responseData?.error ??
            'Credenciais inválidas.')
          : 'Erro ao conectar. Tente novamente.';
      setError(message);
      authLog.warn('Login falhou', { email, error: message });
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const response = await httpClient.post<{
          token: string;
          refreshToken?: string;
          user: {
            id: string;
            email: string;
            name: string;
            role: string;
            avatarUrl?: string | null;
          };
        }>('/auth/register', { name, email, password }, { skipAuthHeaders: true });

        const { token, refreshToken, user } = mapLoginResponse(response.data);
        persistSession(token, refreshToken, user);
        setCurrentUser(user);

        authLog.info('Registro e login automático', { email: user.email });
      } catch (err: unknown) {
        const message =
          err && typeof err === 'object' && 'responseData' in err
            ? ((err as { responseData: { error?: string } }).responseData?.error ??
              'Erro ao registrar.')
            : 'Erro ao conectar. Tente novamente.';
        setError(message);
        authLog.warn('Registro falhou', { email, error: message });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(() => {
    performLogout();
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const loginWithResult = useCallback(
    (apiResponse: Parameters<AuthContextType['loginWithResult']>[0]) => {
      const { token, refreshToken, user } = mapLoginResponse(apiResponse);
      persistSession(token, refreshToken, user);
      setCurrentUser(user);
    },
    [],
  );

  const value: AuthContextType = {
    isAuthenticated,
    currentUser,
    login,
    register,
    logout,
    loginWithResult,
    loading,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
