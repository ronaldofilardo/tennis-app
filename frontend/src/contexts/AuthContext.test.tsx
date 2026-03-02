import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { act } from "@testing-library/react";

// vi.hoisted garante inicialização antes do hoisting do vi.mock
const { mockHttpClient } = vi.hoisted(() => ({
  mockHttpClient: {
    post: vi.fn(),
    get: vi.fn(),
    setAuthConfig: vi.fn(),
    setTenantConfig: vi.fn(),
    onUnauthorized: vi.fn(),
  },
}));

vi.mock("../config/httpClient", () => ({ default: mockHttpClient }));

vi.mock("../config/themeProvider", () => ({
  loadClubTheme: vi.fn().mockResolvedValue({}),
  applyClubTheme: vi.fn(),
  resetTheme: vi.fn(),
}));

vi.mock("../services/logger", () => ({
  logger: {
    createModuleLogger: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
    setGlobalContext: vi.fn(),
    clearGlobalContext: vi.fn(),
  },
}));

import { AuthProvider, useAuth } from "./AuthContext";
import type { AuthUser } from "./AuthContext";

// Usuários padrão com estrutura nova (AuthUser completo)
const mockAnnotatorUser: AuthUser = {
  id: "user-001",
  email: "play@email.com",
  name: "Annotator Test",
  role: "annotator",
  clubs: [],
  activeClubId: null,
  activeRole: "annotator",
};

const mockPlayerUser: AuthUser = {
  id: "user-002",
  email: "player@test.com",
  name: "Test Player",
  role: "player",
  clubs: [],
  activeClubId: null,
  activeRole: "player",
};

const mockAnnotatorLoginResponse = {
  data: {
    token: "test-jwt-token",
    refreshToken: "test-refresh-token",
    user: {
      id: "user-001",
      email: "play@email.com",
      name: "Annotator Test",
      clubs: [],
      activeClubId: null,
      activeRole: "annotator",
    },
  },
};

const mockPlayerLoginResponse = {
  data: {
    token: "test-jwt-token-2",
    refreshToken: "test-refresh-token-2",
    user: {
      id: "user-002",
      email: "player@test.com",
      name: "Test Player",
      clubs: [],
      activeClubId: null,
      activeRole: "player",
    },
  },
};

// Mock do localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Componente de teste para usar o hook
const TestComponent: React.FC = () => {
  const { isAuthenticated, currentUser, login, logout, loading, error } =
    useAuth();

  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? "authenticated" : "not-authenticated"}
      </div>
      <div data-testid="user">
        {currentUser ? JSON.stringify(currentUser) : "no-user"}
      </div>
      <div data-testid="loading">{loading ? "loading" : "not-loading"}</div>
      <div data-testid="error">{error || "no-error"}</div>
      <button onClick={() => login("play@email.com", "1234")}>
        Login Annotator
      </button>
      <button onClick={() => login("player@test.com", "123")}>
        Login Player
      </button>
      <button onClick={() => login("invalid@test.com", "wrong")}>
        Login Invalid
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("Estado inicial", () => {
    it("deve começar não autenticado sem usuário salvo", () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      expect(screen.getByTestId("auth-status")).toHaveTextContent(
        "not-authenticated",
      );
      expect(screen.getByTestId("user")).toHaveTextContent("no-user");
      expect(screen.getByTestId("loading")).toHaveTextContent("not-loading");
      expect(screen.getByTestId("error")).toHaveTextContent("no-error");
    });

    it("deve carregar usuário autenticado do localStorage", () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === "racket_token") return "test-token";
        if (key === "racket_user") return JSON.stringify(mockAnnotatorUser);
        return null;
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      expect(screen.getByTestId("auth-status")).toHaveTextContent(
        "authenticated",
      );
      expect(screen.getByTestId("user")).toHaveTextContent(
        JSON.stringify(mockAnnotatorUser),
      );
    });
  });

  describe("Login", () => {
    it("deve autenticar anotador com credenciais corretas", async () => {
      mockHttpClient.post.mockResolvedValueOnce(mockAnnotatorLoginResponse);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      fireEvent.click(screen.getByText("Login Annotator"));

      await waitFor(() => {
        expect(screen.getByTestId("auth-status")).toHaveTextContent(
          "authenticated",
        );
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "racket_token",
        "test-jwt-token",
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "racket_user",
        expect.any(String),
      );
    });

    it("deve autenticar jogador com credenciais corretas", async () => {
      mockHttpClient.post.mockResolvedValueOnce(mockPlayerLoginResponse);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      fireEvent.click(screen.getByText("Login Player"));

      await waitFor(() => {
        expect(screen.getByTestId("auth-status")).toHaveTextContent(
          "authenticated",
        );
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "racket_token",
        "test-jwt-token-2",
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "racket_user",
        expect.any(String),
      );
    });

    it("deve rejeitar credenciais inválidas", async () => {
      mockHttpClient.post.mockRejectedValueOnce({
        responseData: { error: "Credenciais inválidas." },
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await act(async () => {
        fireEvent.click(screen.getByText("Login Invalid"));
      });

      await waitFor(() => {
        expect(screen.getByTestId("error")).toHaveTextContent(
          "Credenciais inválidas.",
        );
      });
      expect(screen.getByTestId("auth-status")).toHaveTextContent(
        "not-authenticated",
      );
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it("deve mostrar estado de loading durante login", async () => {
      mockHttpClient.post.mockResolvedValueOnce(mockAnnotatorLoginResponse);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      fireEvent.click(screen.getByText("Login Annotator"));

      expect(screen.getByTestId("loading")).toHaveTextContent("loading");

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("not-loading");
      });
    });
  });

  describe("Logout", () => {
    it("deve desautenticar usuário", () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === "racket_token") return "test-token";
        if (key === "racket_user") return JSON.stringify(mockAnnotatorUser);
        return null;
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      fireEvent.click(screen.getByText("Logout"));

      expect(screen.getByTestId("auth-status")).toHaveTextContent(
        "not-authenticated",
      );
      expect(screen.getByTestId("user")).toHaveTextContent("no-user");
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("racket_token");
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("racket_user");
    });
  });

  describe("Hook useAuth", () => {
    it("deve lançar erro quando usado fora do provider", () => {
      const OutsideProviderComponent = () => {
        const { isAuthenticated } = useAuth();
        return <div>{isAuthenticated ? "Sim" : "Não"}</div>;
      };

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => render(<OutsideProviderComponent />)).toThrow(
        "useAuth must be used within an AuthProvider",
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Persistência de sessão", () => {
    it("deve limpar dados inválidos do localStorage", () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === "racket_token") return "test-token";
        if (key === "racket_user") return "invalid-json";
        return null;
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      expect(screen.getByTestId("auth-status")).toHaveTextContent(
        "not-authenticated",
      );
      expect(screen.getByTestId("user")).toHaveTextContent("no-user");
    });
  });
});
