// backend/src/services/__tests__/matchStatus.test.js

import { vi, describe, it, expect, beforeEach } from "vitest";
import { MatchStatusService } from "./matchStatusService.js";

describe("MatchStatusService", () => {
  let matchStatusService;
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = {
      match: {
        update: vi.fn(),
        findUnique: vi.fn(),
      },
    };
    matchStatusService = new MatchStatusService(mockPrisma);
  });

  describe("updateMatchStatus", () => {
    it("deve atualizar para IN_PROGRESS quando houver pontos no histórico", async () => {
      const matchId = "match123";
      const matchState = JSON.stringify({
        pointsHistory: [{ winner: "PLAYER_1" }],
        isFinished: false,
      });

      await matchStatusService.updateMatchStatus(matchId, matchState);

      expect(mockPrisma.match.update).toHaveBeenCalledWith({
        where: { id: matchId },
        data: expect.objectContaining({
          status: "IN_PROGRESS",
          matchState,
        }),
      });
    });

    it("deve atualizar para FINISHED quando houver vencedor", async () => {
      const matchId = "match123";
      const matchState = JSON.stringify({
        pointsHistory: [{ winner: "PLAYER_1" }],
        winner: "PLAYER_1",
        isFinished: true,
      });

      await matchStatusService.updateMatchStatus(matchId, matchState);

      expect(mockPrisma.match.update).toHaveBeenCalledWith({
        where: { id: matchId },
        data: expect.objectContaining({
          status: "FINISHED",
          matchState,
        }),
      });
    });
  });

  describe("getMatchStatus", () => {
    it("deve retornar o status atual da partida", async () => {
      const matchId = "match123";
      const expectedMatch = {
        status: "IN_PROGRESS",
        matchState: JSON.stringify({ pointsHistory: [{ winner: "PLAYER_1" }] }),
      };

      mockPrisma.match.findUnique.mockResolvedValue(expectedMatch);

      const result = await matchStatusService.getMatchStatus(matchId);

      expect(result).toEqual(expectedMatch);
      expect(mockPrisma.match.findUnique).toHaveBeenCalledWith({
        where: { id: matchId },
        select: {
          status: true,
          matchState: true,
        },
      });
    });
  });
});
