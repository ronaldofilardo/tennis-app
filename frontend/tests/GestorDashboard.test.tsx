// tests/GestorDashboard.test.tsx
// Testes de acesso e conteúdo do GestorDashboard

import "../vitest.setup";

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// ── Mocks de CSS ────────────────────────────────────────────
vi.mock("../src/pages/GestorDashboard.css", () => ({}));

// ── Mock do httpClient ───────────────────────────────────────
const mockHttpGet = vi.fn();
const mockHttpPost = vi.fn();
vi.mock("../src/config/httpClient", () => ({
  default: {
    get: (...args: unknown[]) => mockHttpGet(...args),
    post: (...args: unknown[]) => mockHttpPost(...args),
  },
}));

// ── Mock do AthleteSearchInput ───────────────────────────────
vi.mock("../src/components/AthleteSearchInput", () => ({
  default: () => <div data-testid="athlete-search" />,
}));

// ── Estado mutável para AuthContext ─────────────────────────
const mockActiveClub = {
  clubId: "club-123",
  clubName: "Clube Teste",
  clubSlug: "clube-teste",
  role: "GESTOR",
};

vi.mock("../src/contexts/AuthContext", () => ({
  useAuth: () => ({
    currentUser: {
      activeRole: mockActiveClub.role,
      name: "Gestor",
      email: "gestor@test.com",
    },
    activeClub: mockActiveClub,
  }),
}));

// ── Mock do NavigationContext ────────────────────────────────
const mockNavigation = {
  navigateToDashboard: vi.fn(),
  navigateToMatch: vi.fn(),
};
vi.mock("../src/contexts/NavigationContext", () => ({
  useNavigation: () => mockNavigation,
}));

// ── Mock do Toast ────────────────────────────────────────────
vi.mock("../src/components/Toast", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }),
}));

// ── Stats mockadas sem membersByRole ─────────────────────────
const mockClubStats = {
  totalMembers: 10,
  totalMatches: 5,
  matchesByStatus: [{ status: "FINISHED", count: 5 }],
  totalTournaments: 1,
  tournamentsByStatus: [{ status: "IN_PROGRESS", count: 1 }],
  recentMatches: [],
  recentMembers: [
    {
      id: "m1",
      userId: "u1",
      name: "Atleta Souza",
      email: "atleta@test.com",
      role: "ATHLETE",
      status: "ACTIVE",
      joinedAt: "2026-02-01",
    },
  ],
};

import GestorDashboard from "../src/pages/GestorDashboard";

describe("GestorDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveClub.role = "GESTOR";
    mockHttpGet.mockResolvedValue({ data: mockClubStats });
  });

  describe("Controle de acesso", () => {
    it("bloqueia acesso para usuário ADMIN", async () => {
      mockActiveClub.role = "ADMIN";
      render(<GestorDashboard />);
      expect(await screen.findByText(/gestores do clube/i)).toBeInTheDocument();
      expect(screen.queryByText(/Painel do/i)).not.toBeInTheDocument();
    });

    it("bloqueia acesso para usuário ATHLETE", async () => {
      mockActiveClub.role = "ATHLETE";
      render(<GestorDashboard />);
      expect(await screen.findByText(/gestores do clube/i)).toBeInTheDocument();
    });

    it("bloqueia acesso para usuário COACH", async () => {
      mockActiveClub.role = "COACH";
      render(<GestorDashboard />);
      expect(await screen.findByText(/gestores do clube/i)).toBeInTheDocument();
    });

    it("renderiza dashboard para usuário GESTOR", async () => {
      render(<GestorDashboard />);
      await waitFor(() => {
        expect(
          screen.queryByText(/gestores do clube/i),
        ).not.toBeInTheDocument();
      });
      expect(screen.getByText("Gestor")).toBeInTheDocument();
    });
  });

  describe('Seção "Membros por Papel" REMOVIDA', () => {
    it('NÃO exibe seção "Membros por Papel"', async () => {
      render(<GestorDashboard />);
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      expect(screen.queryByText(/Membros por Papel/i)).not.toBeInTheDocument();
    });

    it("NÃO exibe barras de progresso por papel", async () => {
      render(<GestorDashboard />);
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      // Os papéis ATHLETE/COACH/GESTOR não devem aparecer como breakdown
      expect(screen.queryByText(/role-bar/i)).not.toBeInTheDocument();
    });
  });

  describe('Seção "Membros Recentes" MANTIDA', () => {
    it('exibe seção "Membros Recentes"', async () => {
      render(<GestorDashboard />);
      expect(await screen.findByText(/Membros Recentes/i)).toBeInTheDocument();
    });

    it("exibe membro recente pelo nome", async () => {
      render(<GestorDashboard />);
      expect(await screen.findByText("Atleta Souza")).toBeInTheDocument();
    });

    it('exibe botão "Ver todos" para membros recentes', async () => {
      render(<GestorDashboard />);
      expect(await screen.findByText(/Ver todos/i)).toBeInTheDocument();
    });
  });

  describe("KPIs do clube", () => {
    it("exibe total de membros", async () => {
      render(<GestorDashboard />);
      const membrosLabels = await screen.findAllByText(/MEMBROS/i);
      expect(membrosLabels.length).toBeGreaterThan(0);
    });

    it("exibe total de partidas", async () => {
      render(<GestorDashboard />);
      await screen.findAllByText(/MEMBROS/i);
      const partidasLabels = screen.getAllByText(/PARTIDAS/i);
      expect(partidasLabels.length).toBeGreaterThan(0);
    });

    it("exibe total de torneios", async () => {
      render(<GestorDashboard />);
      await screen.findAllByText(/MEMBROS/i);
      const torneiosLabels = screen.getAllByText(/TORNEIOS/i);
      expect(torneiosLabels.length).toBeGreaterThan(0);
    });
  });

  describe("Dados do endpoint de stats", () => {
    it("chama o endpoint correto do clube", async () => {
      render(<GestorDashboard />);
      await waitFor(() => {
        expect(mockHttpGet).toHaveBeenCalledWith("/clubs/club-123/stats");
      });
    });

    it("NÃO chama endpoint de admin/stats", async () => {
      render(<GestorDashboard />);
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      const calls = mockHttpGet.mock.calls.map((c) => c[0] as string);
      expect(calls.every((url) => !url.includes("/admin/"))).toBe(true);
    });
  });
});
