import { describe, it, expect, vi, beforeEach } from "vitest";
import * as matchService from "./matchService.js";

// Mock do Prisma
const mockCreate = vi.fn();
const mockPrisma = {
  match: {
    create: mockCreate,
  },
};

describe("createMatch", () => {
  it("lança erro de validação se dados inválidos", async () => {
    const matchData = {
      sportType: "", // inválido
      format: "BEST_OF_3",
      players: { p1: "", p2: "" }, // inválido
      visibleTo: "both",
      apontadorEmail: "not-an-email", // inválido
    };
    await expect(
      matchService.createMatch(matchData, mockPrisma)
    ).rejects.toThrowError(/obrigatório|inválido|vazio/i);
  });
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("preenche playersEmails corretamente com os e-mails dos jogadores", async () => {
    mockCreate.mockResolvedValue({
      id: "1",
      sportType: "TENNIS",
      format: "BEST_OF_3",
      nickname: null,
      playerP1: "play@email.com",
      playerP2: "outro@email.com",
      playersEmails: ["play@email.com", "outro@email.com"],
      status: "NOT_STARTED",
      score: null,
      winner: null,
      completedSets: "[]",
      createdAt: new Date(),
      matchState: JSON.stringify({
        playersIds: { p1: "play@email.com", p2: "outro@email.com" },
        visibleTo: "both",
        needsSetup: true,
        startedAt: null,
      }),
    });

    const matchData = {
      sportType: "TENNIS",
      format: "BEST_OF_3",
      players: { p1: "play@email.com", p2: "outro@email.com" },
      visibleTo: "both",
      apontadorEmail: "play@email.com",
    };

    // Teste com mock do Prisma para evitar validações Zod
    const result = await matchService.createMatch(matchData, mockPrisma);
    expect(result).toBeDefined();
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          playersEmails: ["play@email.com", "outro@email.com"],
        }),
      })
    );
    expect(result.players.p1).toBe("play@email.com");
    expect(result.players.p2).toBe("outro@email.com");
  });
});
