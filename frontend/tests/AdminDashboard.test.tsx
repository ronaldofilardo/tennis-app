// tests/AdminDashboard.test.tsx
// Testes de acesso e conteúdo do AdminDashboard

import "../vitest.setup";

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks de CSS ────────────────────────────────────────────
vi.mock("../src/pages/AdminDashboard.css", () => ({}));

// ── Mock do httpClient ───────────────────────────────────────
const mockHttpGet = vi.fn();
vi.mock("../src/config/httpClient", () => ({
  default: { get: (...args: unknown[]) => mockHttpGet(...args) },
}));

// ── Mock do AuthContext ──────────────────────────────────────
const mockCurrentUser: Record<string, unknown> = {
  activeRole: "ADMIN",
  name: "Admin",
  email: "admin@test.com",
};
vi.mock("../src/contexts/AuthContext", () => ({
  useAuth: () => ({ currentUser: mockCurrentUser }),
}));

// ── Mock do NavigationContext ────────────────────────────────
const mockNavigation = {
  navigateToDashboard: vi.fn(),
  navigateToAdminDashboard: vi.fn(),
  navigateToGestorDashboard: vi.fn(),
  navigateToLogin: vi.fn(),
  navigateToMatch: vi.fn(),
  navigateToNewMatch: vi.fn(),
};
vi.mock("../src/contexts/NavigationContext", () => ({
  useNavigation: () => mockNavigation,
}));

// ── Mock do Toast ────────────────────────────────────────────
vi.mock("../src/components/Toast", () => {
  // objeto estável — mesma referência em todo render, evita loop infinito no useCallback
  const toastFns = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };
  return { useToast: () => toastFns };
});

// ── Dados mockados de stats ──────────────────────────────────
const mockStats = {
  totalUsers: 120,
  totalClubs: 8,
  newUsersThisMonth: 15,
  newClubsThisMonth: 2,
  activeUsersLastWeek: 45,
  clubsByPlan: [
    { plan: "FREE", count: 4 },
    { plan: "PREMIUM", count: 3 },
    { plan: "ENTERPRISE", count: 1 },
  ],
  membershipsByRole: [
    { role: "ATHLETE", count: 80 },
    { role: "COACH", count: 20 },
    { role: "GESTOR", count: 8 },
  ],
  topClubsByMembers: [
    {
      id: "c1",
      name: "Clube Alpha",
      slug: "clube-alpha",
      planType: "PREMIUM",
      createdAt: "2025-01-01",
      memberCount: 50,
    },
  ],
  recentClubs: [
    {
      id: "c2",
      name: "Clube Beta",
      slug: "clube-beta",
      planType: "FREE",
      createdAt: "2026-02-01",
      memberCount: 5,
    },
  ],
};

import AdminDashboard from "../src/pages/AdminDashboard";

describe("AdminDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser.activeRole = "ADMIN";
    mockHttpGet.mockResolvedValue({ data: mockStats });
  });

  describe("Controle de acesso", () => {
    it("bloqueia acesso para usuário não-ADMIN", async () => {
      mockCurrentUser.activeRole = "GESTOR";
      render(<AdminDashboard />);
      expect(await screen.findByText(/Acesso restrito/i)).toBeInTheDocument();
      expect(screen.queryByText("Painel")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Visão Geral/i }),
      ).not.toBeInTheDocument();
    });

    it("bloqueia acesso para usuário ATHLETE", async () => {
      mockCurrentUser.activeRole = "ATHLETE";
      render(<AdminDashboard />);
      expect(await screen.findByText(/Acesso restrito/i)).toBeInTheDocument();
    });

    it("renderiza dashboard para usuário ADMIN", async () => {
      render(<AdminDashboard />);
      await waitFor(() => {
        expect(screen.queryByText(/Acesso restrito/i)).not.toBeInTheDocument();
      });
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });
  });

  describe("KPIs administrativos/financeiros", () => {
    it("exibe total de usuários", async () => {
      render(<AdminDashboard />);
      expect(await screen.findByText("120")).toBeInTheDocument();
      expect(screen.getByText(/Usuários Total/i)).toBeInTheDocument();
    });

    it("exibe total de clubes", async () => {
      render(<AdminDashboard />);
      expect(await screen.findByText(/Clubes Total/i)).toBeInTheDocument();
      // totalClubs = 8
      const allEight = screen.getAllByText("8");
      expect(allEight.length).toBeGreaterThan(0);
    });

    it("exibe novos usuários do mês", async () => {
      render(<AdminDashboard />);
      expect(
        await screen.findByText(/Novos usu\u00e1rios/i),
      ).toBeInTheDocument();
      expect(screen.getByText("15")).toBeInTheDocument();
    });

    it("exibe novos clubes do mês", async () => {
      render(<AdminDashboard />);
      expect(await screen.findByText(/Novos clubes/i)).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("exibe usuários ativos (7d)", async () => {
      render(<AdminDashboard />);
      expect(await screen.findByText(/Ativos \(7d\)/i)).toBeInTheDocument();
      expect(screen.getByText("45")).toBeInTheDocument();
    });
  });

  describe("Seções removidas (não pertencem ao Admin)", () => {
    it('NÃO exibe "Partidas por Status"', async () => {
      render(<AdminDashboard />);
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      expect(
        screen.queryByText(/Partidas por Status/i),
      ).not.toBeInTheDocument();
    });

    it('NÃO exibe "Torneios por Status"', async () => {
      render(<AdminDashboard />);
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      expect(
        screen.queryByText(/Torneios por Status/i),
      ).not.toBeInTheDocument();
    });

    it('NÃO exibe "Total Partidas" nos KPIs', async () => {
      render(<AdminDashboard />);
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      // O label de KPI "PARTIDAS" não deve existir
      expect(screen.queryByText(/^Partidas$/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/^Torneios$/i)).not.toBeInTheDocument();
    });
  });

  describe("Seção de Clubes por Plano", () => {
    it("exibe os planos disponíveis", async () => {
      render(<AdminDashboard />);
      // Aguarda stats carregar (KPI já confirmado funcionar)
      await screen.findByText(/Clubes Total/i);
      expect(screen.queryByText("Clubes por Plano")).toBeInTheDocument();
      // Os planos aparecem no plan-breakdown (usa queryAll para não travar)
      expect(screen.queryAllByText("Gratuito").length).toBeGreaterThan(0);
      expect(screen.queryAllByText("Premium").length).toBeGreaterThan(0);
      expect(screen.queryAllByText("Enterprise").length).toBeGreaterThan(0);
    });
  });

  describe("Tabs", () => {
    it("tem as três abas: Visão Geral, Clubes, Usuários", async () => {
      render(<AdminDashboard />);
      await screen.findByText(/Visão Geral/i);
      expect(screen.getByText(/Visão Geral/i)).toBeInTheDocument();
      expect(screen.getByText(/^Clubes$/i)).toBeInTheDocument();
      expect(screen.getByText(/^Usu\u00e1rios$/i)).toBeInTheDocument();
    });

    it("busca clubes ao clicar na aba Clubes", async () => {
      const user = userEvent.setup();
      mockHttpGet.mockImplementation((url: string) => {
        if (url.includes("/admin/clubs")) {
          return Promise.resolve({
            data: { clubs: [], total: 0, limit: 20, offset: 0 },
          });
        }
        return Promise.resolve({ data: mockStats });
      });
      render(<AdminDashboard />);
      await screen.findByText(/Visão Geral/i);
      await user.click(screen.getByText(/^Clubes$/i));
      await waitFor(() => {
        expect(mockHttpGet).toHaveBeenCalledWith(
          expect.stringContaining("/admin/clubs"),
        );
      });
    });

    it("busca usuários ao clicar na aba Usuários", async () => {
      const user = userEvent.setup();
      mockHttpGet.mockImplementation((url: string) => {
        if (url.includes("/admin/users")) {
          return Promise.resolve({
            data: { users: [], total: 0, limit: 20, offset: 0 },
          });
        }
        return Promise.resolve({ data: mockStats });
      });
      render(<AdminDashboard />);
      await screen.findByText(/Visão Geral/i);
      await user.click(screen.getByText(/^Usuários$/i));
      await waitFor(() => {
        expect(mockHttpGet).toHaveBeenCalledWith(
          expect.stringContaining("/admin/users"),
        );
      });
    });
  });

  describe("Tabela de Clubes - colunas corretas", () => {
    it("tabela de clubes NÃO tem colunas de Partidas ou Torneios", async () => {
      const user = userEvent.setup();
      mockHttpGet.mockImplementation((url: string) => {
        if (url.includes("/admin/clubs")) {
          return Promise.resolve({
            data: {
              clubs: [
                {
                  id: "c1",
                  name: "Clube Alpha",
                  slug: "clube-alpha",
                  planType: "PREMIUM",
                  createdAt: "2025-01-01",
                  memberCount: 50,
                },
              ],
              total: 1,
              limit: 20,
              offset: 0,
            },
          });
        }
        return Promise.resolve({ data: mockStats });
      });
      render(<AdminDashboard />);
      await screen.findByText(/Visão Geral/i);
      await user.click(screen.getByText(/^Clubes$/i));
      await screen.findByText("Clube Alpha");
      expect(
        screen.queryByRole("columnheader", { name: /Partidas/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("columnheader", { name: /Torneios/i }),
      ).not.toBeInTheDocument();
    });
  });
});
