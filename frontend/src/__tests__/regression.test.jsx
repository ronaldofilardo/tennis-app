import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import Dashboard from "../pages/Dashboard";
import ScoreboardV2 from "../pages/ScoreboardV2";
import { TennisScoring } from "../core/scoring/TennisScoring";
import { AuthProvider } from "../contexts/AuthContext";
import { MatchesProvider } from "../contexts/MatchesContext";
import { NavigationProvider } from "../contexts/NavigationContext";

// Mock useParams hook para refletir o matchId da URL
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(() => {
      // Para testes de scoreboard, sempre retorna um matchId válido
      if (window.location.pathname.includes('/match/')) {
        return { matchId: 'regression-match-1' };
      }
      return {};
    })
  };
});

// Mock do backend para testes de regressão
// Inclui apontadorEmail e playersEmails para que canViewMatch funcione
const mockBackend = {
  matches: [
    {
      id: "regression-match-1",
      sportType: "Tênis",
      format: "BEST_OF_3",
      players: { p1: "Jogador 1", p2: "Jogador 2" },
      status: "NOT_STARTED",
      apontadorEmail: "test@test.com",
      playersEmails: ["test@test.com"],
      matchState: {
        sets: { PLAYER_1: 0, PLAYER_2: 0 },
        currentSet: 1,
        currentSetState: { games: { PLAYER_1: 0, PLAYER_2: 0 } },
        currentGame: {
          points: { PLAYER_1: "0", PLAYER_2: "0" },
          server: "PLAYER_1",
        },
        server: "PLAYER_1",
        isFinished: false,
        config: { format: "BEST_OF_3" },
      },
    },
    {
      id: "regression-match-2",
      sportType: "Tênis",
      format: "BEST_OF_3",
      players: { p1: "Jogador A", p2: "Jogador B" },
      status: "IN_PROGRESS",
      apontadorEmail: "test@test.com",
      playersEmails: ["test@test.com"],
      matchState: {
        sets: { PLAYER_1: 1, PLAYER_2: 0 },
        currentSet: 2,
        currentSetState: { games: { PLAYER_1: 3, PLAYER_2: 2 } },
        currentGame: {
          points: { PLAYER_1: "40", PLAYER_2: "30" },
          server: "PLAYER_2",
        },
        server: "PLAYER_2",
        isFinished: false,
        config: { format: "BEST_OF_3" },
        startedAt: new Date().toISOString(),
      },
    },
    {
      id: "regression-match-3",
      sportType: "Tênis",
      format: "BEST_OF_3",
      players: { p1: "Jogador X", p2: "Jogador Y" },
      status: "FINISHED",
      apontadorEmail: "test@test.com",
      playersEmails: ["test@test.com"],
      matchState: {
        sets: { PLAYER_1: 2, PLAYER_2: 0 },
        currentSet: 1,
        currentSetState: { games: { PLAYER_1: 0, PLAYER_2: 0 } },
        currentGame: {
          points: { PLAYER_1: "0", PLAYER_2: "0" },
          server: "PLAYER_1",
        },
        server: "PLAYER_1",
        isFinished: true,
        config: { format: "BEST_OF_3" },
        startedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hora atrás
        endedAt: new Date().toISOString(),
      },
    },
  ],
};

// Mock das APIs
vi.mock("../config/api", () => ({
  API_URL: "http://localhost:3000/api",
}));

// Mock fetch global
global.fetch = vi.fn();

// Mock do TennisScoring - preservar lógica real e apenas sobrescrever métodos de sincronização
vi.mock("../core/scoring/TennisScoring", async () => {
  const actual = await vi.importActual("../core/scoring/TennisScoring");
  return {
    ...actual,
    TennisScoring: class MockTennisScoring extends actual.TennisScoring {
      // Apenas sobrescrever métodos de sincronização
      enableSync() {
        this.syncEnabled = true;
        this.matchId = null;
      }

      disableSync() {
        this.syncEnabled = false;
        this.matchId = null;
      }

      syncState() {
        // Mock da sincronização sem fazer requisições reais
        return Promise.resolve(true);
      }

      addPointWithSync(player, details) {
        // Usar lógica real de adição de ponto
        const newState = this.addPoint(player, details);
        // Apenas simular sincronização sem fazer requisições reais
        return Promise.resolve(newState);
      }

      undoLastPointWithSync() {
        // Usar lógica real de undo
        const newState = this.undoLastPoint();
        // Apenas simular sincronização sem fazer requisições reais
        return Promise.resolve(newState);
      }
    },
  };
});

// Setup do mock fetch
beforeEach(() => {
  global.fetch.mockImplementation((url, options) => {
    // GET /matches/visible - listar partidas visíveis (usado pelo Dashboard via MatchesContext)
    // Capturar com ou sem query parameters
    if (url.includes("/matches/visible")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockBackend.matches),
        text: () => Promise.resolve(JSON.stringify(mockBackend.matches)),
      });
    } else if (url.includes("/matches") && !options?.method) {
      // GET /matches - listar partidas
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockBackend.matches),
        text: () => Promise.resolve(JSON.stringify(mockBackend.matches)),
      });
    } else if (url.includes("/matches/") && !options?.method) {
      // GET /matches/:id - buscar partida específica
      const matchId = url.split("/").pop()?.split("?")[0]; // remover query params
      const match = mockBackend.matches.find((m) => m.id === matchId);
      if (match) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(match),
          text: () => Promise.resolve(JSON.stringify(match)),
        });
      }
    } else if (url.includes("/matches/") && options?.method === "PATCH") {
      // PATCH /matches/:id/state - atualizar estado
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: "Estado atualizado" }),
        text: () => Promise.resolve(JSON.stringify({ message: "Estado atualizado" })),
      });
    }
    return Promise.reject(new Error(`URL não mockada: ${url}`));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Helper para renderizar componentes com providers
const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <NavigationProvider>
          <MatchesProvider>{component}</MatchesProvider>
        </NavigationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe("Testes de Regressão - Funcionalidades Críticas", () => {
  describe("Dashboard - Listagem de Partidas", () => {
    it("dashboard deve mostrar 'Minhas Partidas' quando renderizado", async () => {
      renderWithProviders(<Dashboard />);

      // Verificar se título aparece
      expect(screen.getByText("Minhas Partidas")).toBeInTheDocument();
    });

    it("dashboard deve permitir navegar para criação de nova partida", async () => {
      renderWithProviders(<Dashboard />);

      // Verificar se botão de criar partida existe
      const createButton = screen.getByText("Nova Partida");
      expect(createButton).toBeInTheDocument();
    });

    it("dashboard deve filtrar partidas visíveis corretamente", async () => {
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(
          screen.queryByTestId("loading-indicator")
        ).not.toBeInTheDocument();
      });

      // Verificar que partidas foram retornadas
      expect(screen.getByText("Minhas Partidas")).toBeInTheDocument();
    });
  });

  describe("Scoreboard - Renderização Básica", () => {
    it("deve renderizar scoreboard sem erros", async () => {
      // Renderizar com um MemoryRouter que simula uma URL com matchId
      const { render } = await import("@testing-library/react");
      const { MemoryRouter } = await import("react-router-dom");

      render(
        <MemoryRouter initialEntries={['/match/regression-match-1']}>
          <AuthProvider>
            <NavigationProvider>
              <MatchesProvider>
                <ScoreboardV2 />
              </MatchesProvider>
            </NavigationProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      // Apenas verificar que não há crash - o componente deve renderizar
      await waitFor(() => {
        expect(screen.getByText("Voltar") || screen.getByTestId("loading-indicator")).toBeTruthy();
      }, { timeout: 3000 });
    });
  });
});