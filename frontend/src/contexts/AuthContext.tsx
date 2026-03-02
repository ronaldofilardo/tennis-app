import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { ReactNode } from "react";
import { logger } from "../services/logger";
import httpClient from "../config/httpClient";
import {
  loadClubTheme,
  applyClubTheme,
  resetTheme,
} from "../config/themeProvider";

const authLog = logger.createModuleLogger("AuthContext");

// === Tipos ===

export type UserRole =
  | "ADMIN"
  | "GESTOR"
  | "COACH"
  | "ATHLETE"
  | "SPECTATOR"
  | "annotator"
  | "player";

export interface ClubMembership {
  clubId: string;
  clubName: string;
  clubSlug: string;
  role: UserRole;
  logoUrl?: string;
  planType?: string;
  subscriptionStatus?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  clubs: ClubMembership[];
  activeClubId: string | null;
  activeRole: UserRole;
  planType?: string;
  subscriptionStatus?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: AuthUser | null;
  activeClub: ClubMembership | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  switchClub: (clubId: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// === Constantes de storage ===
const STORAGE_KEYS = {
  token: "racket_token",
  refreshToken: "racket_refresh_token",
  user: "racket_user",
} as const;

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const storedUser = localStorage.getItem(STORAGE_KEYS.user);
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as AuthUser;
        // Recalcular activeRole a partir do clube ativo (migração de sessão antiga)
        if (parsed.clubs?.length && parsed.activeClubId) {
          const club = parsed.clubs.find(
            (c) => c.clubId === parsed.activeClubId,
          );
          if (club) {
            parsed.activeRole = club.role;
            parsed.role = club.role;
          }
        }
        return parsed;
      } catch {
        localStorage.removeItem(STORAGE_KEYS.user);
        localStorage.removeItem(STORAGE_KEYS.token);
        return null;
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = currentUser !== null;

  const activeClub =
    currentUser?.clubs?.find((c) => c.clubId === currentUser.activeClubId) ??
    null;

  // Configurar httpClient com token e clubId armazenados
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.token);
    if (token) {
      httpClient.setAuthConfig({ token });
    }
    if (currentUser?.activeClubId) {
      httpClient.setTenantConfig({ clubId: currentUser.activeClubId });
    }
  }, [currentUser?.activeClubId]);

  // Carregar tema quando clube muda
  useEffect(() => {
    if (currentUser?.activeClubId) {
      loadClubTheme(currentUser.activeClubId)
        .then(applyClubTheme)
        .catch(() => {});
    } else {
      resetTheme();
    }
  }, [currentUser?.activeClubId]);

  // Redirecionar ao login em caso de 401
  useEffect(() => {
    httpClient.onUnauthorized(() => {
      authLog.warn("Token expirado ou inválido — forçando logout");
      performLogout();
    });
  }, []);

  // === Helpers internos ===

  const persistSession = (
    token: string,
    refreshToken: string | undefined,
    user: AuthUser,
  ) => {
    localStorage.setItem(STORAGE_KEYS.token, token);
    if (refreshToken) {
      localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
    }
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    httpClient.setAuthConfig({ token, refreshToken });
    if (user.activeClubId) {
      httpClient.setTenantConfig({ clubId: user.activeClubId });
    }
    logger.setGlobalContext({ userId: user.email, clubId: user.activeClubId });
  };

  const performLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    localStorage.removeItem(STORAGE_KEYS.user);
    // Limpa legado
    localStorage.removeItem("racket_auth");
    setCurrentUser(null);
    setError(null);
    httpClient.setAuthConfig({ token: null, refreshToken: null });
    httpClient.setTenantConfig({ clubId: null });
    resetTheme();
    logger.clearGlobalContext();
    authLog.info("Logout realizado");
  };

  const mapLoginResponse = (data: {
    token: string;
    refreshToken?: string;
    user: {
      id: string;
      email: string;
      name: string;
      clubs: Array<{
        clubId: string;
        clubName: string;
        clubSlug: string;
        role: string;
        logoUrl?: string;
        planType?: string;
        subscriptionStatus?: string;
      }>;
      activeClubId?: string;
      activeRole?: string;
      planType?: string;
      subscriptionStatus?: string;
    };
  }): { token: string; refreshToken?: string; user: AuthUser } => {
    const firstClub = data.user.clubs[0];
    return {
      token: data.token,
      refreshToken: data.refreshToken,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: (data.user.activeRole || firstClub?.role || "PLAYER") as UserRole,
        clubs: data.user.clubs.map((c) => ({
          ...c,
          role: c.role as UserRole,
        })),
        activeClubId: data.user.activeClubId || firstClub?.clubId || null,
        activeRole: (data.user.activeRole ||
          firstClub?.role ||
          "PLAYER") as UserRole,
        planType: data.user.planType || firstClub?.planType || "FREE",
        subscriptionStatus:
          data.user.subscriptionStatus ||
          firstClub?.subscriptionStatus ||
          "ACTIVE",
      },
    };
  };

  // === Ações públicas ===

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
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
            clubs: Array<{
              clubId: string;
              clubName: string;
              clubSlug: string;
              role: string;
            }>;
            activeClubId?: string;
            activeRole?: string;
          };
        }>("/auth/login", { email, password }, { skipAuthHeaders: true });

        const { token, refreshToken, user } = mapLoginResponse(response.data);
        persistSession(token, refreshToken, user);
        setCurrentUser(user);

        authLog.info("Login bem-sucedido via API", {
          email: user.email,
          clubId: user.activeClubId,
        });
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "responseData" in err
            ? ((err as { responseData: { error?: string } }).responseData
                ?.error ?? "Credenciais inválidas.")
            : "Erro ao conectar. Tente novamente.";
        setError(message);
        authLog.warn("Login falhou", { email, error: message });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

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
            clubs: Array<{
              clubId: string;
              clubName: string;
              clubSlug: string;
              role: string;
            }>;
            activeClubId?: string;
            activeRole?: string;
          };
        }>(
          "/auth/register",
          { name, email, password },
          { skipAuthHeaders: true },
        );

        const { token, refreshToken, user } = mapLoginResponse(response.data);
        persistSession(token, refreshToken, user);
        setCurrentUser(user);

        authLog.info("Registro e login automático", { email: user.email });
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "responseData" in err
            ? ((err as { responseData: { error?: string } }).responseData
                ?.error ?? "Erro ao registrar.")
            : "Erro ao conectar. Tente novamente.";
        setError(message);
        authLog.warn("Registro falhou", { email, error: message });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const switchClub = useCallback(async (clubId: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await httpClient.post<{
        token: string;
        club: {
          clubId: string;
          clubName: string;
          clubSlug: string;
          role: string;
          planType?: string;
          subscriptionStatus?: string;
        };
      }>("/auth/switch-club", { clubId });

      const newToken = response.data.token;
      const club = response.data.club;

      // Atualizar user mantendo clubs existentes
      setCurrentUser((prev) => {
        if (!prev) return null;
        const updated: AuthUser = {
          ...prev,
          activeClubId: club.clubId,
          activeRole: club.role as UserRole,
          role: club.role as UserRole,
          planType: club.planType || "FREE",
          subscriptionStatus: club.subscriptionStatus || "ACTIVE",
        };
        persistSession(
          newToken,
          localStorage.getItem(STORAGE_KEYS.refreshToken) ?? undefined,
          updated,
        );
        return updated;
      });

      authLog.info("Clube alternado", { clubId, role: club.role });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "responseData" in err
          ? ((err as { responseData: { error?: string } }).responseData
              ?.error ?? "Erro ao trocar clube.")
          : "Erro ao conectar. Tente novamente.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    performLogout();
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value: AuthContextType = {
    isAuthenticated,
    currentUser,
    activeClub,
    login,
    register,
    logout,
    switchClub,
    loading,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
