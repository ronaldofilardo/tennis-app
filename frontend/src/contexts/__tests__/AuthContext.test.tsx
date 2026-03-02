import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// vi.hoisted garante que mockHttpClient seja inicializado antes do hoisting do vi.mock
const { mockHttpClient } = vi.hoisted(() => ({
  mockHttpClient: {
    post: vi.fn(),
    get: vi.fn(),
    setAuthConfig: vi.fn(),
    setTenantConfig: vi.fn(),
    onUnauthorized: vi.fn(),
  },
}));

// Mock do httpClient (usado internamente em AuthContext para chamadas API)
vi.mock("../../config/httpClient", () => ({ default: mockHttpClient }));

// Mock do themeProvider
vi.mock("../../config/themeProvider", () => ({
  loadClubTheme: vi.fn().mockResolvedValue({}),
  applyClubTheme: vi.fn(),
  resetTheme: vi.fn(),
}));

// Mock do logger
vi.mock("../../services/logger", () => ({
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

// Mock do localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", { value: mockLocalStorage });

// --- Imports do módulo a testar (após mocks) ---
import { AuthProvider, useAuth } from "../AuthContext";
import type { AuthUser } from "../AuthContext";

// Usuário retornado pela API após login
const mockAuthUser: AuthUser = {
  id: "user-001",
  email: "play@email.com",
  name: "Player Test",
  role: "PLAYER",
  clubs: [],
  activeClubId: null,
  activeRole: "PLAYER",
};

// Payload retornado por httpClient.post('/auth/login')
const mockLoginResponse = {
  data: {
    token: "test-jwt-token",
    refreshToken: "test-refresh-token",
    user: {
      id: "user-001",
      email: "play@email.com",
      name: "Player Test",
      clubs: [],
      activeClubId: null,
      activeRole: "PLAYER",
    },
  },
};

// Componente de teste
const TestComponent = () => {
  const { isAuthenticated, login, logout, currentUser, error } = useAuth();
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? "true" : "false"}</div>
      <div data-testid="user-info">
        {currentUser ? JSON.stringify(currentUser) : ""}
      </div>
      <div data-testid="error-info">{error ?? ""}</div>
      <button onClick={() => login("play@email.com", "1234")}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it("deve inicializar com estado não autenticado", () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    expect(screen.getByTestId("auth-status")).toHaveTextContent("false");
    expect(screen.getByTestId("user-info")).toHaveTextContent("");
  });

  it("deve autenticar usuário com sucesso via API", async () => {
    mockHttpClient.post.mockResolvedValueOnce(mockLoginResponse);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByText("Login"));

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent("true");
      expect(screen.getByTestId("user-info")).toHaveTextContent(
        "play@email.com",
      );
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "racket_token",
      "test-jwt-token",
    );
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "racket_refresh_token",
      "test-refresh-token",
    );
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "racket_user",
      JSON.stringify(mockAuthUser),
    );
  });

  it("deve expor erro quando login falha (credenciais inválidas)", async () => {
    const apiError = Object.assign(new Error("Unauthorized"), {
      responseData: { error: "Credenciais inválidas." },
    });
    mockHttpClient.post.mockRejectedValueOnce(apiError);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByText("Login"));

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent("false");
      expect(screen.getByTestId("error-info")).toHaveTextContent(
        "Credenciais inválidas.",
      );
    });
  });

  it("deve fazer logout com sucesso", () => {
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === "racket_user") return JSON.stringify(mockAuthUser);
      if (key === "racket_token") return "test-jwt-token";
      return null;
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    expect(screen.getByTestId("auth-status")).toHaveTextContent("true");

    fireEvent.click(screen.getByText("Logout"));

    expect(screen.getByTestId("auth-status")).toHaveTextContent("false");
    expect(screen.getByTestId("user-info")).toHaveTextContent("");

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("racket_token");
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
      "racket_refresh_token",
    );
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("racket_user");
  });

  it("deve restaurar sessão do localStorage com novo formato AuthUser", () => {
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === "racket_token") return "test-jwt-token";
      if (key === "racket_user") return JSON.stringify(mockAuthUser);
      return null;
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    expect(screen.getByTestId("auth-status")).toHaveTextContent("true");
    expect(screen.getByTestId("user-info")).toHaveTextContent("play@email.com");
    expect(screen.getByTestId("user-info")).toHaveTextContent("Player Test");
  });

  it("deve lidar com dados inválidos no localStorage", () => {
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === "racket_user") return "invalid-json";
      return null;
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    expect(screen.getByTestId("auth-status")).toHaveTextContent("false");
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("racket_user");
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("racket_token");
  });
});
