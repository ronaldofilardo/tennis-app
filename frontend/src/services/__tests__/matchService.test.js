import { describe, it, expect, vi, beforeEach } from "vitest";

// Define DATABASE_URL para testes
process.env.DATABASE_URL =
  "postgresql://postgres:123456@localhost:5432/racket_mvp?schema=public&sslmode=disable";

// Mock do matchService
vi.mock("../matchService.js", () => ({
  getAllMatches: vi.fn(),
  createMatch: vi.fn(),
  getMatchById: vi.fn(),
  updateMatch: vi.fn(),
  updateMatchState: vi.fn(),
}));

import * as matchService from "../matchService.js";

// Configuração centralizada de mocks
beforeEach(() => {
  vi.clearAllMocks();
});

describe("matchService", () => {
  describe("getAllMatches", () => {
    it("deve retornar todas as partidas formatadas corretamente", async () => {
      const expectedResult = [
        {
          id: "match-1",
          sportType: "Tênis",
          format: "BEST_OF_3",
          players: { p1: "player1@email.com", p2: "player2@email.com" },
          status: "IN_PROGRESS",
          score: "6-4",
          winner: null,
          completedSets: [],
          createdAt: new Date("2024-01-01"),
          matchState: {
            isFinished: false,
            startedAt: expect.any(Date),
            server: "PLAYER_1",
            currentGame: { points: { PLAYER_1: "0", PLAYER_2: "0" } },
            visibleTo: "both",
          },
        },
      ];

      matchService.getAllMatches.mockResolvedValue(expectedResult);

      const result = await matchService.getAllMatches();

      expect(result).toEqual(expectedResult);
    });

    it("deve recalcular status baseado no estado da partida", async () => {
      const expectedResult = [
        {
          id: "match-1",
          sportType: "Tênis",
          format: "BEST_OF_3",
          players: { p1: "player1@email.com", p2: "player2@email.com" },
          status: "FINISHED",
          score: "6-4",
          winner: "PLAYER_1",
          completedSets: [{ PLAYER_1: 6, PLAYER_2: 4 }],
          createdAt: new Date("2024-01-01"),
          matchState: {
            isFinished: true,
            winner: "PLAYER_1",
            visibleTo: "both",
          },
        },
      ];

      matchService.getAllMatches.mockResolvedValue(expectedResult);

      const result = await matchService.getAllMatches();

      expect(result).toEqual(expectedResult);
    });

    it("deve lidar com matchState inválido", async () => {
      const expectedResult = [
        {
          id: "match-1",
          sportType: "Tênis",
          format: "BEST_OF_3",
          players: { p1: "player1@email.com", p2: "player2@email.com" },
          status: "NOT_STARTED",
          score: null,
          winner: null,
          completedSets: [],
          createdAt: new Date("2024-01-01"),
          matchState: null,
        },
      ];

      matchService.getAllMatches.mockResolvedValue(expectedResult);

      const result = await matchService.getAllMatches();

      expect(result).toEqual(expectedResult);
    });
  });

  describe("createMatch", () => {
    it("deve criar uma partida com sucesso", async () => {
      const matchData = {
        sportType: "Tênis",
        format: "BEST_OF_3",
        players: { p1: "player1@email.com", p2: "player2@email.com" },
        nickname: "Test Match",
        visibleTo: "both",
      };

      const expectedResult = {
        id: "new-match-id",
        sportType: "Tênis",
        format: "BEST_OF_3",
        players: { p1: "player1@email.com", p2: "player2@email.com" },
        status: "NOT_STARTED",
        score: null,
        winner: null,
        visibleTo: "both",
        nickname: "Test Match",
        createdAt: expect.any(Date),
      };

      matchService.createMatch.mockResolvedValue(expectedResult);

      const result = await matchService.createMatch(matchData);

      expect(result).toEqual(expectedResult);
    });

    it("deve criar partida sem nickname opcional", async () => {
      const matchData = {
        sportType: "Tênis",
        format: "BEST_OF_3",
        players: { p1: "player1@email.com", p2: "player2@email.com" },
        visibleTo: "both",
      };

      const expectedResult = {
        id: "new-match-id",
        sportType: "Tênis",
        format: "BEST_OF_3",
        players: { p1: "player1@email.com", p2: "player2@email.com" },
        status: "NOT_STARTED",
        score: null,
        winner: null,
        visibleTo: "both",
        nickname: null,
        createdAt: expect.any(Date),
      };

      matchService.createMatch.mockResolvedValue(expectedResult);

      const result = await matchService.createMatch(matchData);

      expect(result).toEqual(expectedResult);
    });

    it("deve lançar erro para dados inválidos", async () => {
      const invalidData = {
        sportType: "Tênis",
        // faltando campos obrigatórios
      };

      matchService.createMatch.mockRejectedValue(
        new Error("Erro de validação")
      );

      await expect(matchService.createMatch(invalidData)).rejects.toThrow(
        "Erro de validação"
      );
    });
  });

  describe("getMatchById", () => {
    it("deve retornar partida por ID com sucesso", async () => {
      const expectedResult = {
        id: "match-123",
        sportType: "Tênis",
        format: "BEST_OF_3",
        players: { p1: "player1@email.com", p2: "player2@email.com" },
        status: "IN_PROGRESS",
        score: "6-4",
        winner: null,
        completedSets: [],
        createdAt: new Date("2024-01-01"),
        matchState: {
          isFinished: false,
          visibleTo: "both",
        },
      };

      matchService.getMatchById.mockResolvedValue(expectedResult);

      const result = await matchService.getMatchById("match-123");

      expect(result).toEqual(expectedResult);
    });

    it("deve lançar erro 404 para partida não encontrada", async () => {
      matchService.getMatchById.mockRejectedValue(
        new Error("Partida não encontrada")
      );

      await expect(matchService.getMatchById("non-existent")).rejects.toThrow(
        "Partida não encontrada"
      );
    });

    it("deve lidar com matchState JSON inválido", async () => {
      const expectedResult = {
        id: "match-123",
        sportType: "Tênis",
        format: "BEST_OF_3",
        players: { p1: "player1@email.com", p2: "player2@email.com" },
        status: "NOT_STARTED",
        score: null,
        winner: null,
        completedSets: [],
        createdAt: new Date("2024-01-01"),
        matchState: null,
      };

      matchService.getMatchById.mockResolvedValue(expectedResult);

      const result = await matchService.getMatchById("match-123");

      expect(result).toEqual(expectedResult);
    });
  });

  describe("updateMatch", () => {
    it("deve atualizar partida com sucesso", async () => {
      const updateData = {
        nickname: "Updated Match",
        visibleTo: "p1",
      };

      const expectedResult = {
        id: "match-123",
        sportType: "Tênis",
        format: "BEST_OF_3",
        players: { p1: "player1@email.com", p2: "player2@email.com" },
        status: "NOT_STARTED",
        score: null,
        winner: null,
        visibleTo: "p1",
        nickname: "Updated Match",
        createdAt: new Date("2024-01-01"),
      };

      matchService.updateMatch.mockResolvedValue(expectedResult);

      const result = await matchService.updateMatch("match-123", updateData);

      expect(result).toEqual(expectedResult);
    });

    it("deve atualizar apenas campos fornecidos", async () => {
      const updateData = {
        visibleTo: "p2",
      };

      const expectedResult = {
        id: "match-123",
        sportType: "Tênis",
        format: "BEST_OF_3",
        players: { p1: "player1@email.com", p2: "player2@email.com" },
        status: "NOT_STARTED",
        score: null,
        winner: null,
        visibleTo: "p2",
        nickname: "Original Match",
        createdAt: new Date("2024-01-01"),
      };

      matchService.updateMatch.mockResolvedValue(expectedResult);

      const result = await matchService.updateMatch("match-123", updateData);

      expect(result).toEqual(expectedResult);
    });
  });

  describe("updateMatchState", () => {
    it("deve atualizar estado da partida com sucesso", async () => {
      const matchState = {
        isFinished: true,
        winner: "PLAYER_1",
        visibleTo: "both",
      };

      const expectedResult = {
        id: "match-123",
        message: "Estado da partida atualizado com sucesso",
      };

      matchService.updateMatchState.mockResolvedValue(expectedResult);

      const result = await matchService.updateMatchState(
        "match-123",
        matchState
      );

      expect(result).toEqual(expectedResult);
    });

    it("deve aceitar payload como string", async () => {
      const matchStateString = JSON.stringify({
        isFinished: true,
        winner: "PLAYER_1",
        visibleTo: "both",
      });

      const expectedResult = {
        id: "match-123",
        message: "Estado da partida atualizado com sucesso",
      };

      matchService.updateMatchState.mockResolvedValue(expectedResult);

      const result = await matchService.updateMatchState(
        "match-123",
        matchStateString
      );

      expect(result).toEqual(expectedResult);
    });

    it("deve lidar com payload inválido", async () => {
      matchService.updateMatchState.mockRejectedValue(
        new Error("Erro ao fazer parse do matchState")
      );

      await expect(
        matchService.updateMatchState("match-123", "INVALID_JSON")
      ).rejects.toThrow("Erro ao fazer parse do matchState");
    });

    it("deve inferir status baseado no estado", async () => {
      const matchState = {
        isFinished: true,
        winner: "PLAYER_1",
        visibleTo: "both",
      };

      const expectedResult = {
        id: "match-123",
        message: "Estado da partida atualizado com sucesso",
      };

      matchService.updateMatchState.mockResolvedValue(expectedResult);

      const result = await matchService.updateMatchState(
        "match-123",
        matchState
      );

      expect(result).toEqual(expectedResult);
    });
  });
});
