import { describe, it, expect, vi, beforeEach } from "vitest";
import * as matchService from "./matchService.js";

describe("updateMatchState", () => {
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = {
      match: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };
  });

  it("atualiza estado da partida com sucesso", async () => {
    const matchId = "test-match-id";
    const statePayload = {
      matchState: {
        server: "PLAYER_1",
        startedAt: "2025-11-10T00:36:00.000Z",
      },
    };

    // Mock do estado atual
    mockPrisma.match.findUnique.mockResolvedValue({
      status: "NOT_STARTED",
      matchState: JSON.stringify({}),
    });

    // Mock da atualização
    mockPrisma.match.update.mockResolvedValue({
      id: matchId,
      status: "IN_PROGRESS",
      matchState: JSON.stringify(statePayload.matchState),
    });

    const result = await matchService.updateMatchState(
      matchId,
      statePayload,
      mockPrisma
    );

    expect(result.id).toBe(matchId);
    expect(result.message).toBe("Estado da partida atualizado com sucesso");

    expect(mockPrisma.match.update).toHaveBeenCalledWith({
      where: { id: matchId },
      data: {
        matchState: JSON.stringify(statePayload.matchState),
        status: "IN_PROGRESS",
        updatedAt: expect.any(Date),
      },
    });
  });

  it("muda status para IN_PROGRESS quando partida tem indicadores de progresso", async () => {
    const matchId = "test-match-id";
    const statePayload = {
      matchState: {
        server: "PLAYER_1",
        startedAt: "2025-11-10T00:36:00.000Z",
        currentGame: { score: [0, 0] },
      },
    };

    mockPrisma.match.findUnique.mockResolvedValue({
      status: "NOT_STARTED",
      matchState: JSON.stringify({}),
    });

    mockPrisma.match.update.mockResolvedValue({
      id: matchId,
      status: "IN_PROGRESS",
      matchState: JSON.stringify(statePayload.matchState),
    });

    await matchService.updateMatchState(matchId, statePayload, mockPrisma);

    expect(mockPrisma.match.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "IN_PROGRESS",
        }),
      })
    );
  });

  it("muda status para FINISHED quando partida tem vencedor", async () => {
    const matchId = "test-match-id";
    const statePayload = {
      matchState: {
        winner: "PLAYER_1",
        isFinished: true,
        endedAt: "2025-11-10T01:00:00.000Z",
      },
    };

    mockPrisma.match.findUnique.mockResolvedValue({
      status: "IN_PROGRESS",
      matchState: JSON.stringify({}),
    });

    mockPrisma.match.update.mockResolvedValue({
      id: matchId,
      status: "FINISHED",
      matchState: JSON.stringify(statePayload.matchState),
    });

    await matchService.updateMatchState(matchId, statePayload, mockPrisma);

    expect(mockPrisma.match.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FINISHED",
        }),
      })
    );
  });

  it("trata payload de string corretamente", async () => {
    const matchId = "test-match-id";
    const stateString =
      '{"server":"PLAYER_1","startedAt":"2025-11-10T00:36:00.000Z"}';
    const statePayload = {
      matchState: stateString,
    };

    mockPrisma.match.findUnique.mockResolvedValue({
      status: "NOT_STARTED",
      matchState: JSON.stringify({}),
    });

    mockPrisma.match.update.mockResolvedValue({
      id: matchId,
      status: "IN_PROGRESS",
      matchState: stateString,
    });

    const result = await matchService.updateMatchState(
      matchId,
      statePayload,
      mockPrisma
    );

    expect(result.id).toBe(matchId);
    expect(mockPrisma.match.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          matchState: stateString,
        }),
      })
    );
  });

  it("trata payload inválido graciosamente", async () => {
    const matchId = "test-match-id";
    const statePayload = {
      matchState: null, // Payload inválido
    };

    mockPrisma.match.findUnique.mockResolvedValue({
      status: "NOT_STARTED",
      matchState: JSON.stringify({}),
    });

    mockPrisma.match.update.mockResolvedValue({
      id: matchId,
      status: "NOT_STARTED",
      matchState: JSON.stringify({}),
    });

    const result = await matchService.updateMatchState(
      matchId,
      statePayload,
      mockPrisma
    );

    expect(result.id).toBe(matchId);
    expect(mockPrisma.match.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          matchState: JSON.stringify({}), // Estado vazio como fallback
        }),
      })
    );
  });
});
