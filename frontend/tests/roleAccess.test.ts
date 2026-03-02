// tests/roleAccess.test.ts
// Testes de lógica de separação de papéis: ADMIN vs GESTOR
// Cobre: isAdmin, isGestor, rota /gestor, redirecionamento pós-login

import { describe, it, expect } from "vitest";

// ── Helpers que replicam a lógica do App.tsx / AuthPage.tsx ─

function computeIsAdmin(activeRole: string | undefined) {
  return activeRole === "ADMIN";
}

function computeIsGestor(activeRole: string | undefined) {
  return activeRole === "GESTOR";
}

function postLoginRedirect(activeRole: string | undefined): string {
  if (!activeRole) return "/login";
  if (activeRole === "ADMIN") return "/admin";
  return "/dashboard";
}

function gestorRouteTarget(
  isAuthenticated: boolean,
  isGestor: boolean,
  isAdmin: boolean,
): string {
  if (!isAuthenticated) return "/login";
  if (isGestor) return "RENDER_GESTOR";
  if (isAdmin) return "/admin";
  return "/dashboard";
}

// ── Testes ──────────────────────────────────────────────────

describe("Lógica isAdmin", () => {
  it("retorna true apenas para ADMIN", () => {
    expect(computeIsAdmin("ADMIN")).toBe(true);
  });

  it("retorna false para GESTOR", () => {
    expect(computeIsAdmin("GESTOR")).toBe(false);
  });

  it("retorna false para COACH", () => {
    expect(computeIsAdmin("COACH")).toBe(false);
  });

  it("retorna false para ATHLETE", () => {
    expect(computeIsAdmin("ATHLETE")).toBe(false);
  });

  it("retorna false para undefined (sem usuário)", () => {
    expect(computeIsAdmin(undefined)).toBe(false);
  });
});

describe("Lógica isGestor", () => {
  it("retorna true apenas para GESTOR", () => {
    expect(computeIsGestor("GESTOR")).toBe(true);
  });

  it("retorna false para ADMIN — ADMIN não é gestor de clube", () => {
    expect(computeIsGestor("ADMIN")).toBe(false);
  });

  it("retorna false para COACH", () => {
    expect(computeIsGestor("COACH")).toBe(false);
  });

  it("retorna false para ATHLETE", () => {
    expect(computeIsGestor("ATHLETE")).toBe(false);
  });

  it("retorna false para undefined", () => {
    expect(computeIsGestor(undefined)).toBe(false);
  });
});

describe("Redirecionamento pós-login", () => {
  it("ADMIN é redirecionado para /admin", () => {
    expect(postLoginRedirect("ADMIN")).toBe("/admin");
  });

  it("GESTOR é redirecionado para /dashboard", () => {
    expect(postLoginRedirect("GESTOR")).toBe("/dashboard");
  });

  it("ATHLETE é redirecionado para /dashboard", () => {
    expect(postLoginRedirect("ATHLETE")).toBe("/dashboard");
  });

  it("COACH é redirecionado para /dashboard", () => {
    expect(postLoginRedirect("COACH")).toBe("/dashboard");
  });

  it("sem papel → /login", () => {
    expect(postLoginRedirect(undefined)).toBe("/login");
  });
});

describe("Rota /gestor — proteção de acesso", () => {
  it("GESTOR autenticado acessa o dashboard do gestor", () => {
    expect(gestorRouteTarget(true, true, false)).toBe("RENDER_GESTOR");
  });

  it("ADMIN autenticado é redirecionado para /admin (não vê /gestor)", () => {
    expect(gestorRouteTarget(true, false, true)).toBe("/admin");
  });

  it("ATHLETE autenticado é redirecionado para /dashboard", () => {
    expect(gestorRouteTarget(true, false, false)).toBe("/dashboard");
  });

  it("não autenticado é redirecionado para /login", () => {
    expect(gestorRouteTarget(false, false, false)).toBe("/login");
  });
});

describe("Separação Admin (plataforma) vs Gestor (clube)", () => {
  const PLATFORM_ROLES = ["ADMIN"];
  const CLUB_ROLES = ["GESTOR", "COACH", "ATHLETE", "SPECTATOR"];

  it("papéis de plataforma não devem ser papéis de clube", () => {
    PLATFORM_ROLES.forEach((role) => {
      expect(CLUB_ROLES).not.toContain(role);
    });
  });

  it("papéis de clube não devem ser papéis de plataforma", () => {
    CLUB_ROLES.forEach((role) => {
      expect(PLATFORM_ROLES).not.toContain(role);
    });
  });

  it("filter de membros exclui ADMIN (agnostico a clubes)", () => {
    const allMemberships = [
      { role: "ADMIN", userId: "u1" },
      { role: "GESTOR", userId: "u2" },
      { role: "COACH", userId: "u3" },
      { role: "ATHLETE", userId: "u4" },
    ];
    const currentUserId = "u2"; // gestor logado

    // Filtro idêntico ao aplicado no dev-server.cjs e authService.js
    const visible = allMemberships.filter(
      (m) => m.role !== "ADMIN" && m.userId !== currentUserId,
    );

    expect(visible).toHaveLength(2);
    expect(visible.map((m) => m.role)).toEqual(["COACH", "ATHLETE"]);
    expect(visible.find((m) => m.role === "ADMIN")).toBeUndefined();
    expect(visible.find((m) => m.userId === currentUserId)).toBeUndefined();
  });

  it("filter de membros recentes exclui ADMIN e o próprio usuário", () => {
    const clubMemberships = [
      { role: "ADMIN", userId: "u-admin", name: "Ronaldo Admin" },
      { role: "GESTOR", userId: "u-gestor", name: "Gestor Atual" },
      { role: "ATHLETE", userId: "u1", name: "Atleta 1" },
      { role: "COACH", userId: "u2", name: "Treinador 1" },
    ];
    const loggedUserId = "u-gestor";

    const recentMembers = clubMemberships.filter(
      (m) => m.role !== "ADMIN" && m.userId !== loggedUserId,
    );

    expect(recentMembers).toHaveLength(2);
    expect(recentMembers.map((m) => m.name)).toContain("Atleta 1");
    expect(recentMembers.map((m) => m.name)).toContain("Treinador 1");
    expect(recentMembers.map((m) => m.name)).not.toContain("Ronaldo Admin");
    expect(recentMembers.map((m) => m.name)).not.toContain("Gestor Atual");
  });
});
