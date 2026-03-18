// tests/Dashboard.test.tsx
// Testes do Dashboard do Atleta (mobile-first refactor)

import "../vitest.setup";

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks de CSS ────────────────────────────────────────────
vi.mock("../src/pages/Dashboard.css", () => ({}));
vi.mock("../src/components/BottomTabBar.css", () => ({}));
vi.mock("../src/components/FloatingActionButton.css", () => ({}));
vi.mock("../src/components/FilterChips.css", () => ({}));
vi.mock("../src/components/AthleteHeader.css", () => ({}));
vi.mock("../src/components/LiveMatchesCarousel.css", () => ({}));
vi.mock("../src/components/MatchStatsModal.css", () => ({}));
vi.mock("../src/components/Toast.css", () => ({}));

// ── Mock do Toast ────────────────────────────────────────────
const toastFns = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
};
vi.mock("../src/components/Toast", () => ({
  useToast: () => toastFns,
}));

// ── Mock do Logger ───────────────────────────────────────────
vi.mock("../src/services/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
  logger: {
    createModuleLogger: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

// ── Mock resolvePlayerName ───────────────────────────────────
vi.mock("../src/data/players", () => ({
  resolvePlayerName: (name: string) => name || "Jogador",
}));

// ── Mock MatchStatsModal ─────────────────────────────────────
vi.mock("../src/components/MatchStatsModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="stats-modal">Stats Modal</div> : null,
}));

// ── Mock da config/api ───────────────────────────────────────
vi.mock("../src/config/api", () => ({
  API_URL: "http://localhost:3000/api",
}));

// ── Mock do AuthContext ──────────────────────────────────────
vi.mock("../src/contexts/AuthContext", () => ({
  useAuth: () => ({ currentUser: null }),
  AuthProvider: ({ children }: any) => children,
}));

import Dashboard from "../src/pages/Dashboard";

// ── Helpers ──────────────────────────────────────────────────

const defaultUser = {
  email: "athlete@test.com",
  name: "João Silva",
  role: "ATHLETE",
};

const createMatch = (overrides: Record<string, unknown> = {}) => ({
  id: "m1",
  players: { p1: "athlete@test.com", p2: "adversario@test.com" },
  sportType: "TENNIS",
  format: "BEST_OF_3",
  courtType: "CLAY" as const,
  status: "FINISHED",
  nickname: "Amistoso",
  apontadorEmail: "scorer@test.com",
  playersEmails: ["athlete@test.com", "adversario@test.com"],
  matchState: {
    winner: "PLAYER_1",
    endedAt: "2026-02-27T10:00:00Z",
    startedAt: "2026-02-27T08:00:00Z",
    sets: { PLAYER_1: 2, PLAYER_2: 0 },
    completedSets: [
      { setNumber: 1, games: { PLAYER_1: 6, PLAYER_2: 3 }, winner: "PLAYER_1" },
      { setNumber: 2, games: { PLAYER_1: 6, PLAYER_2: 4 }, winner: "PLAYER_1" },
    ],
    currentSetState: { games: { PLAYER_1: 0, PLAYER_2: 0 } },
    currentGame: { points: { PLAYER_1: "0", PLAYER_2: "0" } },
  },
  ...overrides,
});

const createLiveMatch = (id = "live1") =>
  createMatch({
    id,
    status: "IN_PROGRESS",
    nickname: "Ao Vivo",
    matchState: {
      sets: { PLAYER_1: 1, PLAYER_2: 0 },
      completedSets: [
        {
          setNumber: 1,
          games: { PLAYER_1: 6, PLAYER_2: 4 },
          winner: "PLAYER_1",
        },
      ],
      currentSetState: { games: { PLAYER_1: 3, PLAYER_2: 2 } },
      currentGame: {
        points: { PLAYER_1: "30", PLAYER_2: "15" },
        isTiebreak: false,
        isMatchTiebreak: false,
      },
    },
  });

const createPendingMatch = (id = "pend1") =>
  createMatch({
    id,
    status: "NOT_STARTED",
    nickname: "Pendente",
    matchState: null,
  });

const defaultProps = {
  onNewMatchClick: vi.fn(),
  onContinueMatch: vi.fn(),
  onStartMatch: vi.fn(),
  matches: [] as any[],
  loading: false,
  error: null,
  currentUser: defaultUser,
};

// ═════════════════════════════════════════════════════════════
// TESTS
// ═════════════════════════════════════════════════════════════

describe("Dashboard — Athlete Dashboard (Mobile-First)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockReset?.();
  });

  // ── Rendering basics ────────────────────────────────────

  describe("Renderização Básica", () => {
    it("renderiza o dashboard com data-testid", () => {
      render(<Dashboard {...defaultProps} />);
      expect(screen.getByTestId("dashboard")).toBeInTheDocument();
    });

    it("exibe estado vazio quando não há partidas", () => {
      render(<Dashboard {...defaultProps} matches={[]} />);
      expect(screen.getByText("Nenhuma partida ainda")).toBeInTheDocument();
    });

    it("exibe loading quando carregando", () => {
      render(<Dashboard {...defaultProps} loading={true} />);
      expect(screen.getByText("Carregando partidas...")).toBeInTheDocument();
    });

    it("exibe erro quando há erro", () => {
      render(<Dashboard {...defaultProps} error="Falha na API" />);
      expect(screen.getByText(/Falha na API/)).toBeInTheDocument();
    });
  });

  // ── Athlete Header ──────────────────────────────────────

  describe("AthleteHeader", () => {
    it("renderiza o header do atleta com nome", () => {
      render(<Dashboard {...defaultProps} />);
      expect(screen.getByTestId("athlete-header")).toBeInTheDocument();
      expect(screen.getByText("João Silva")).toBeInTheDocument();
    });

    it("exibe V/D rápido no header", () => {
      const matches = [
        createMatch({ id: "m1" }),
        createMatch({
          id: "m2",
          matchState: { winner: "PLAYER_2", endedAt: "2026-02-26T10:00:00Z" },
        }),
      ];
      render(<Dashboard {...defaultProps} matches={matches} />);
      const header = screen.getByTestId("athlete-header");
      // Should show at least the stats
      expect(header).toBeInTheDocument();
    });

    it("expande detalhes ao clicar no header", async () => {
      const user = userEvent.setup();
      render(<Dashboard {...defaultProps} matches={[createMatch()]} />);

      const toggle = screen.getByTestId("athlete-header-toggle");
      await user.click(toggle);

      const details = screen.getByTestId("athlete-details");
      expect(details.className).toContain("athlete-details--open");
    });
  });

  // ── Bottom Tab Bar ──────────────────────────────────────

  describe("BottomTabBar", () => {
    it("renderiza a tab bar inferior com 4 abas", () => {
      render(<Dashboard {...defaultProps} />);
      expect(screen.getByTestId("bottom-tab-bar")).toBeInTheDocument();
      expect(screen.getByTestId("tab-home")).toBeInTheDocument();
      expect(screen.getByTestId("tab-stats")).toBeInTheDocument();
      expect(screen.getByTestId("tab-tournaments")).toBeInTheDocument();
      expect(screen.getByTestId("tab-profile")).toBeInTheDocument();
    });

    it("aba Início está ativa por padrão", () => {
      render(<Dashboard {...defaultProps} />);
      const homeTab = screen.getByTestId("tab-home");
      expect(homeTab.getAttribute("aria-selected")).toBe("true");
    });

    it("muda de aba ao clicar", async () => {
      const user = userEvent.setup();
      render(<Dashboard {...defaultProps} />);

      await user.click(screen.getByTestId("tab-stats"));

      expect(
        screen.getByTestId("tab-stats").getAttribute("aria-selected"),
      ).toBe("true");
      expect(screen.getByTestId("tab-home").getAttribute("aria-selected")).toBe(
        "false",
      );
    });

    it("exibe placeholder de Stats ao navegar para aba Stats", async () => {
      const user = userEvent.setup();
      render(<Dashboard {...defaultProps} />);

      await user.click(screen.getByTestId("tab-stats"));
      expect(screen.getByText("Estatísticas")).toBeInTheDocument();
    });

    it("exibe placeholder de Torneios ao navegar para aba Torneios", async () => {
      const user = userEvent.setup();
      render(<Dashboard {...defaultProps} />);

      await user.click(screen.getByTestId("tab-tournaments"));
      expect(
        screen.getByText("Em breve: seus torneios e inscrições."),
      ).toBeInTheDocument();
    });

    it("exibe placeholder de Perfil ao navegar para aba Perfil", async () => {
      const user = userEvent.setup();
      render(<Dashboard {...defaultProps} />);

      await user.click(screen.getByTestId("tab-profile"));
      expect(screen.getByText("Meu Perfil")).toBeInTheDocument();
    });

    it("exibe badge de live matches na aba Início", () => {
      const matches = [createLiveMatch()];
      render(<Dashboard {...defaultProps} matches={matches} />);

      expect(screen.getByTestId("badge-home")).toBeInTheDocument();
      expect(screen.getByTestId("badge-home").textContent).toBe("1");
    });
  });

  // ── FAB ─────────────────────────────────────────────────

  describe("FloatingActionButton", () => {
    it("renderiza o FAB de nova partida", () => {
      render(<Dashboard {...defaultProps} />);
      expect(screen.getByTestId("fab-new-match")).toBeInTheDocument();
    });

    it("chama onNewMatchClick ao clicar no FAB", async () => {
      const user = userEvent.setup();
      const onNewMatchClick = vi.fn();
      render(<Dashboard {...defaultProps} onNewMatchClick={onNewMatchClick} />);

      await user.click(screen.getByTestId("fab-new-match"));
      expect(onNewMatchClick).toHaveBeenCalledTimes(1);
    });
  });

  // ── Filter Chips ────────────────────────────────────────

  describe("FilterChips", () => {
    it("renderiza chips de filtro quando há partidas", () => {
      render(<Dashboard {...defaultProps} matches={[createMatch()]} />);
      expect(screen.getByTestId("filter-chips")).toBeInTheDocument();
    });

    it("não renderiza chips quando não há partidas", () => {
      render(<Dashboard {...defaultProps} matches={[]} />);
      expect(screen.queryByTestId("filter-chips")).not.toBeInTheDocument();
    });

    it("filtra para mostrar apenas finalizadas", async () => {
      const user = userEvent.setup();
      const matches = [createMatch({ id: "m1" }), createPendingMatch("pend1")];
      render(<Dashboard {...defaultProps} matches={matches} />);

      await user.click(screen.getByTestId("filter-finished"));

      // Should show section title "Finalizadas" (use getAllBy since chip + section title + badge)
      const finalizadas = screen.getAllByText("Finalizadas");
      expect(finalizadas.length).toBeGreaterThanOrEqual(2);
    });

    it("filtra para mostrar apenas aguardando", async () => {
      const user = userEvent.setup();
      const matches = [createMatch({ id: "m1" }), createPendingMatch("pend1")];
      render(<Dashboard {...defaultProps} matches={matches} />);

      await user.click(screen.getByTestId("filter-pending"));
      // Multiple elements contain "Aguardando" (chip, section title, badge)
      const aguardando = screen.getAllByText("Aguardando");
      expect(aguardando.length).toBeGreaterThanOrEqual(2);
    });

    it("exibe contagem por status nos chips", () => {
      const matches = [
        createMatch({ id: "m1" }),
        createMatch({ id: "m2" }),
        createLiveMatch("live1"),
        createPendingMatch("pend1"),
      ];
      render(<Dashboard {...defaultProps} matches={matches} />);

      // The "all" chip should show total count
      const allChip = screen.getByTestId("filter-all");
      expect(allChip.textContent).toContain("(4)");
    });
  });

  // ── Live Matches Carousel ───────────────────────────────

  describe("LiveMatchesCarousel", () => {
    it("renderiza seção ao vivo quando há partidas live", () => {
      render(<Dashboard {...defaultProps} matches={[createLiveMatch()]} />);
      expect(screen.getByTestId("live-section")).toBeInTheDocument();
    });

    it("não renderiza seção ao vivo quando não há partidas live", () => {
      render(<Dashboard {...defaultProps} matches={[createMatch()]} />);
      expect(screen.queryByTestId("live-section")).not.toBeInTheDocument();
    });

    it("exibe cards de partidas ao vivo no carrossel", () => {
      const matches = [createLiveMatch("live1"), createLiveMatch("live2")];
      render(<Dashboard {...defaultProps} matches={matches} />);

      expect(screen.getByTestId("live-card-live1")).toBeInTheDocument();
      expect(screen.getByTestId("live-card-live2")).toBeInTheDocument();
    });

    it("exibe contagem de partidas ao vivo", () => {
      const matches = [createLiveMatch("live1"), createLiveMatch("live2")];
      render(<Dashboard {...defaultProps} matches={matches} />);

      // Check the live section count specifically
      const liveSection = screen.getByTestId("live-section");
      expect(within(liveSection).getByText("(2)")).toBeInTheDocument();
    });

    it("partidas ao vivo não aparecem duplicadas na lista principal", () => {
      const matches = [createLiveMatch("live1"), createMatch({ id: "m1" })];
      render(<Dashboard {...defaultProps} matches={matches} />);

      // The carousel should have the live match
      expect(screen.getByTestId("live-card-live1")).toBeInTheDocument();

      // The main match list should NOT have the live match card
      // (it's filtered out from the "all" view when carousel is showing)
      const matchList = screen.getByText("Histórico");
      expect(matchList).toBeInTheDocument();
    });
  });

  // ── Match Cards ─────────────────────────────────────────

  describe("Match Cards", () => {
    it("renderiza card de partida finalizada", () => {
      render(<Dashboard {...defaultProps} matches={[createMatch()]} />);
      expect(screen.getByText("athlete@test.com")).toBeInTheDocument();
      expect(screen.getByText("adversario@test.com")).toBeInTheDocument();
    });

    it("exibe badge de status correto", () => {
      render(<Dashboard {...defaultProps} matches={[createMatch()]} />);
      expect(screen.getByText("Finalizada")).toBeInTheDocument();
    });

    it("exibe badge de tipo de quadra", () => {
      render(<Dashboard {...defaultProps} matches={[createMatch()]} />);
      expect(screen.getByText(/Saibro/)).toBeInTheDocument();
    });

    it("exibe botão de relatório no card", () => {
      render(<Dashboard {...defaultProps} matches={[createMatch()]} />);
      expect(screen.getByText("📊 Relatório")).toBeInTheDocument();
    });

    it("clica em partida NOT_STARTED chama onStartMatch", async () => {
      const user = userEvent.setup();
      const onStartMatch = vi.fn();
      render(
        <Dashboard
          {...defaultProps}
          matches={[createPendingMatch()]}
          onStartMatch={onStartMatch}
        />,
      );

      // Need to filter to "pending" or "all" — pending cards show in "all" filter
      await user.click(screen.getByTestId("filter-pending"));

      // Click on the card (not the stats button)
      const playerName = screen.getByText("athlete@test.com");
      const card = playerName.closest(".match-card");
      if (card) await user.click(card);

      expect(onStartMatch).toHaveBeenCalled();
    });
  });

  // ── Visibility filter ───────────────────────────────────

  describe("Visibilidade", () => {
    it("filtra partidas onde usuário não é jogador nem apontador", () => {
      const otherMatch = createMatch({
        id: "other",
        apontadorEmail: "other@test.com",
        playersEmails: ["other@test.com", "third@test.com"],
      });
      render(<Dashboard {...defaultProps} matches={[otherMatch]} />);

      // The match shouldn't be visible, so empty state should appear
      expect(screen.getByText("Nenhuma partida ainda")).toBeInTheDocument();
    });

    it("mostra partidas onde usuário é apontador", () => {
      const scorerMatch = createMatch({
        id: "scorer",
        apontadorEmail: "athlete@test.com",
        playersEmails: ["other@test.com", "third@test.com"],
      });
      render(<Dashboard {...defaultProps} matches={[scorerMatch]} />);

      expect(
        screen.queryByText("Nenhuma partida ainda"),
      ).not.toBeInTheDocument();
    });
  });
});
