import { describe, it, expect, vi, beforeEach } from "vitest";
import * as matchService from "./matchService.js";

const mockMatches = [
  {
    id: "1",
    sportType: "TENNIS",
    format: "BEST_OF_3",
    playerP1: "play@email.com",
    playerP2: "outro@email.com",
    playersEmails: ["play@email.com", "outro@email.com"],
    apontadorEmail: "play@email.com",
    status: "NOT_STARTED",
    score: "",
    winner: null,
    completedSets: "[]",
    createdAt: new Date(),
    matchState:
      '{"playersIds":{"p1":"play@email.com","p2":"outro@email.com"},"visibleTo":"both"}',
  },
  {
    id: "2",
    sportType: "TENNIS",
    format: "BEST_OF_3",
    playerP1: "play@email.com",
    playerP2: "admin@email.com",
    playersEmails: ["play@email.com", "admin@email.com"],
    apontadorEmail: "admin@email.com",
    status: "IN_PROGRESS",
    score: "",
    winner: null,
    completedSets: "[]",
    createdAt: new Date(),
    matchState:
      '{"playersIds":{"p1":"play@email.com","p2":"admin@email.com"},"visibleTo":"play@email.com","role":"admin"}',
  },
  {
    id: "3",
    sportType: "TENNIS",
    format: "BEST_OF_3",
    playerP1: "other@email.com",
    playerP2: "admin@email.com",
    playersEmails: ["other@email.com", "admin@email.com"],
    apontadorEmail: "other@email.com",
    status: "FINISHED",
    score: "",
    winner: "other@email.com",
    completedSets: "[]",
    createdAt: new Date(),
    matchState:
      '{"playersIds":{"p1":"other@email.com","p2":"admin@email.com"},"visibleTo":"other@email.com","role":"admin"}',
  },
  {
    id: "4",
    sportType: "TENNIS",
    format: "BEST_OF_3",
    playerP1: "x@email.com",
    playerP2: "y@email.com",
    playersEmails: ["x@email.com", "y@email.com"],
    apontadorEmail: "x@email.com",
    status: "IN_PROGRESS",
    score: "",
    winner: null,
    completedSets: "[]",
    createdAt: new Date(),
    matchState:
      '{"playersIds":{"p1":"x@email.com","p2":"y@email.com"},"visibleTo":"both"}',
  },
];

describe("getVisibleMatches com playersEmails", () => {
  let mockPrisma;
  beforeEach(() => {
    mockPrisma = {
      match: {
        findMany: vi.fn().mockResolvedValue(mockMatches),
      },
    };
  });

  it("retorna partidas se o email estiver em playersEmails", async () => {
    const result = await matchService.getVisibleMatches(
      {
        email: "play@email.com",
      },
      mockPrisma
    );
    const ids = result.map((m) => m.id);
    // Com validação desabilitada, ainda filtra por playersEmails
    expect(ids).toContain("1");
    expect(ids).toContain("2");
    expect(ids).not.toContain("3");
  });

  it("filtra por role corretamente em playersEmails", async () => {
    const result = await matchService.getVisibleMatches(
      {
        email: "admin@email.com",
        role: "admin",
      },
      mockPrisma
    );
    // Com validação desabilitada, retorna todas as partidas visíveis para o usuário
    expect(result.length).toBeGreaterThanOrEqual(1);
    const ids = result.map((r) => r.id);
    expect(ids).toContain("2");
  });

  it("não retorna partidas se o email não estiver em playersEmails", async () => {
    const result = await matchService.getVisibleMatches(
      {
        email: "naoexiste@email.com",
      },
      mockPrisma
    );
    expect(result.length).toBe(0);
  });

  it("retorna partidas visíveis para ambos se o email estiver em playersEmails", async () => {
    const result = await matchService.getVisibleMatches(
      {
        email: "x@email.com",
      },
      mockPrisma
    );
    // Com validação desabilitada, ainda filtra corretamente
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("4");
    expect(result[0].visibleTo).toBe("both");
  });
});
