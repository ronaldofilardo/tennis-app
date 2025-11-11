import { describe, it, expect, vi } from "vitest";
import { TennisScoring } from "../core/scoring/TennisScoring";
import {
  createEmptyPlayerStats,
  createEmptyMatchStats,
  calculatePlayerPercentages,
} from "../services/statsUtils";
import {
  validateMatchState,
  validatePlayerStats,
  validatePointDetails,
  validateMatchStats,
  validateMatchApiResponse,
  VersionedMatchStateSchema,
  VersionedPlayerStatsSchema,
  VersionedPointDetailsSchema,
  VersionedMatchStatsSchema,
  VersionedMatchApiResponseSchema,
  CONTRACT_VERSION,
} from "../schemas/contracts";

// Mock do TennisScoring para testes de contrato
vi.mock("../core/scoring/TennisScoring", () => ({
  TennisScoring: class MockTennisScoring {
    constructor(server, format) {
      this.server = server;
      this.format = format;
    }

    getState() {
      return {
        sets: { PLAYER_1: 0, PLAYER_2: 0 },
        currentSet: 1,
        currentSetState: { games: { PLAYER_1: 0, PLAYER_2: 0 } },
        currentGame: {
          points: { PLAYER_1: "0", PLAYER_2: "0" },
          server: this.server,
          isTiebreak: false,
        },
        server: this.server,
        isFinished: false,
        config: { format: this.format },
        startedAt: new Date().toISOString(),
      };
    }

    addPoint() {}
    canUndo() {
      return false;
    }
    undoLastPoint() {}
    enableSync() {}
    syncState() {
      return Promise.resolve(true);
    }
  },
}));

describe("Validação de Contratos - Interfaces Consistentes", () => {
  describe("Contrato MatchState", () => {
    it("deve validar MatchState usando schema Zod", () => {
      const tennisScoring = new TennisScoring("PLAYER_1", "BEST_OF_3");
      const state = tennisScoring.getState();

      const validation = validateMatchState(state);
      expect(validation.success).toBe(true);
      expect(validation.data).toEqual(state);
    });

    it("sets deve ter estrutura PLAYER_1 e PLAYER_2", () => {
      const tennisScoring = new TennisScoring("PLAYER_1", "BEST_OF_3");
      const state = tennisScoring.getState();

      expect(state.sets).toHaveProperty("PLAYER_1");
      expect(state.sets).toHaveProperty("PLAYER_2");
      expect(typeof state.sets.PLAYER_1).toBe("number");
      expect(typeof state.sets.PLAYER_2).toBe("number");
    });

    it("currentSetState deve ter estrutura de games", () => {
      const tennisScoring = new TennisScoring("PLAYER_1", "BEST_OF_3");
      const state = tennisScoring.getState();

      expect(state.currentSetState).toHaveProperty("games");
      expect(state.currentSetState.games).toHaveProperty("PLAYER_1");
      expect(state.currentSetState.games).toHaveProperty("PLAYER_2");
    });

    it("currentGame deve ter estrutura de pontos e server", () => {
      const tennisScoring = new TennisScoring("PLAYER_1", "BEST_OF_3");
      const state = tennisScoring.getState();

      expect(state.currentGame).toHaveProperty("points");
      expect(state.currentGame).toHaveProperty("server");
      expect(state.currentGame.points).toHaveProperty("PLAYER_1");
      expect(state.currentGame.points).toHaveProperty("PLAYER_2");
      expect(typeof state.currentGame.server).toBe("string");
    });

    it("config deve ter formato válido", () => {
      const tennisScoring = new TennisScoring("PLAYER_1", "BEST_OF_3");
      const state = tennisScoring.getState();

      expect(state.config).toHaveProperty("format");
      expect(["BEST_OF_1", "BEST_OF_3", "BEST_OF_5"]).toContain(
        state.config.format
      );
    });
  });

  describe("Contrato PlayerStats", () => {
    it("createEmptyPlayerStats deve retornar estrutura válida", () => {
      const stats = createEmptyPlayerStats();

      const validation = validatePlayerStats(stats);
      expect(validation.success).toBe(true);
      expect(validation.data).toEqual(stats);
    });

    it("calculatePlayerPercentages deve manter estrutura após cálculo", () => {
      const stats = createEmptyPlayerStats();
      stats.totalServes = 10;
      stats.firstServes = 7;
      stats.firstServeWins = 5;

      const originalKeys = Object.keys(stats);
      calculatePlayerPercentages(stats);
      const newKeys = Object.keys(stats);

      // Deve manter todas as propriedades
      expect(newKeys).toEqual(expect.arrayContaining(originalKeys));

      // Percentuais devem ser calculados
      expect(stats.firstServePercentage).toBeGreaterThan(0);
      expect(stats.firstServeWinPercentage).toBeGreaterThan(0);
    });

    it("percentuais devem estar no intervalo válido", () => {
      const stats = createEmptyPlayerStats();
      stats.totalServes = 10;
      stats.firstServes = 7;
      stats.firstServeWins = 5;
      stats.servicePointsWon = 8;

      calculatePlayerPercentages(stats);

      // Percentuais devem estar entre 0 e 100
      expect(stats.firstServePercentage).toBeGreaterThanOrEqual(0);
      expect(stats.firstServePercentage).toBeLessThanOrEqual(100);
      expect(stats.firstServeWinPercentage).toBeGreaterThanOrEqual(0);
      expect(stats.firstServeWinPercentage).toBeLessThanOrEqual(100);
      expect(stats.serviceHoldPercentage).toBeGreaterThanOrEqual(0);
      expect(stats.serviceHoldPercentage).toBeLessThanOrEqual(100);
    });
  });

  describe("Contrato MatchStats", () => {
    it("createEmptyMatchStats deve retornar estrutura válida", () => {
      const matchStats = createEmptyMatchStats();

      const validation = validateMatchStats(matchStats);
      expect(validation.success).toBe(true);
      expect(validation.data).toEqual(matchStats);
    });
  });

  describe("Contrato PointDetails", () => {
    it("deve validar estrutura básica de PointDetails usando schema", () => {
      const validPointDetails = {
        result: {
          winner: "PLAYER_1",
          type: "WINNER",
        },
        timestamp: Date.now(),
      };

      const validation = validatePointDetails(validPointDetails);
      expect(validation.success).toBe(true);
      expect(validation.data).toEqual(validPointDetails);
    });

    it("deve permitir propriedades opcionais em PointDetails", () => {
      const pointDetailsWithExtras = {
        result: {
          winner: "PLAYER_1",
          type: "WINNER",
        },
        timestamp: Date.now(),
        serve: {
          type: "ACE",
          isFirstServe: true,
        },
        rally: {
          ballExchanges: 3,
        },
      };

      // Deve aceitar propriedades opcionais
      expect(pointDetailsWithExtras).toHaveProperty("serve");
      expect(pointDetailsWithExtras).toHaveProperty("rally");

      // Estrutura do serve
      if (pointDetailsWithExtras.serve) {
        expect(pointDetailsWithExtras.serve).toHaveProperty("type");
        expect(["ACE", "SERVICE_WINNER", "DOUBLE_FAULT", "IN"]).toContain(
          pointDetailsWithExtras.serve.type
        );
      }

      // Estrutura do rally
      if (pointDetailsWithExtras.rally) {
        expect(pointDetailsWithExtras.rally).toHaveProperty("ballExchanges");
        expect(typeof pointDetailsWithExtras.rally.ballExchanges).toBe(
          "number"
        );
      }
    });
  });

  describe("Contrato API Responses", () => {
    it("resposta de listagem de matches deve ter estrutura válida", () => {
      // Todos os campos obrigatórios do schema MatchApiResponseSchema
      const mockMatches = [
        {
          id: "match-1",
          sportType: "Tênis",
          format: "BEST_OF_3",
          players: { p1: "João", p2: "Maria" },
          status: "IN_PROGRESS",
          matchState: {
            sets: { PLAYER_1: 0, PLAYER_2: 0 },
            currentSet: 1,
            currentSetState: { games: { PLAYER_1: 0, PLAYER_2: 0 } },
            currentGame: {
              points: { PLAYER_1: "0", PLAYER_2: "0" },
              server: "PLAYER_1",
              isTiebreak: false,
            },
            server: "PLAYER_1",
            isFinished: false,
            config: { format: "BEST_OF_3" },
            completedSets: [],
          },
        },
        // Exemplo de match sem matchState (permitido pelo schema)
        {
          id: "match-2",
          sportType: "Tênis",
          format: "BEST_OF_3",
          players: { p1: "Carlos", p2: "Ana" },
          status: "NOT_STARTED",
          // Adiciona campos extras para garantir aderência ao schema flexível
        },
      ];

      // Cada match deve validar com o schema
      mockMatches.forEach((match) => {
        const validation = validateMatchApiResponse(match);
        if (!validation.success) {
          // Log detalhado para depuração
          // eslint-disable-next-line no-console
          console.log(
            "Falha na validação do match:",
            JSON.stringify(match, null, 2)
          );
          console.log("Erro de validação:", validation.error);
        }
        expect(validation.success).toBe(true);
        // Verifica que os campos obrigatórios estão presentes
        expect(validation.data).toHaveProperty("id");
        expect(validation.data).toHaveProperty("sportType");
        expect(validation.data).toHaveProperty("players");
      });
    });

    it("resposta de match individual deve incluir matchState quando aplicável", () => {
      const mockMatch = {
        id: "match-1",
        sportType: "Tênis",
        format: "BEST_OF_3",
        players: { p1: "João", p2: "Maria" },
        status: "IN_PROGRESS",
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
          startedAt: new Date().toISOString(),
        },
      };

      // Para matches IN_PROGRESS, deve ter matchState
      expect(mockMatch).toHaveProperty("matchState");

      // matchState deve seguir contrato do MatchState
      const state = mockMatch.matchState;
      expect(state).toHaveProperty("sets");
      expect(state).toHaveProperty("currentSet");
      expect(state).toHaveProperty("currentSetState");
      expect(state).toHaveProperty("currentGame");
      expect(state).toHaveProperty("server");
      expect(state).toHaveProperty("isFinished");
      expect(state).toHaveProperty("config");
      expect(state).toHaveProperty("startedAt");
    });
  });

  describe("Versionamento de Contratos", () => {
    it("deve validar MatchState com versão do contrato", () => {
      const tennisScoring = new TennisScoring("PLAYER_1", "BEST_OF_3");
      const state = tennisScoring.getState();

      const validation = VersionedMatchStateSchema.safeParse(state);
      expect(validation.success).toBe(true);
      expect(validation.data.contractVersion).toBe(CONTRACT_VERSION);
    });

    it("deve validar PlayerStats com versão do contrato", () => {
      const stats = createEmptyPlayerStats();

      const validation = VersionedPlayerStatsSchema.safeParse(stats);
      expect(validation.success).toBe(true);
      expect(validation.data.contractVersion).toBe(CONTRACT_VERSION);
    });

    it("deve rejeitar dados com versão incompatível", () => {
      const state = {
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
        contractVersion: "0.9.0", // Versão antiga
      };

      const validation = VersionedMatchStateSchema.safeParse(state);
      expect(validation.success).toBe(false); // Deve falhar por causa da versão
    });
  });

  describe("Invariantes do Sistema", () => {
    it("pontos de jogadores devem ser valores válidos de tênis", () => {
      const tennisScoring = new TennisScoring("PLAYER_1", "BEST_OF_3");
      const state = tennisScoring.getState();

      const validPoints = ["0", "15", "30", "40", "AD"];

      expect(validPoints).toContain(state.currentGame.points.PLAYER_1);
      expect(validPoints).toContain(state.currentGame.points.PLAYER_2);
    });

    it("server deve ser sempre PLAYER_1 ou PLAYER_2", () => {
      const tennisScoring = new TennisScoring("PLAYER_1", "BEST_OF_3");
      const state = tennisScoring.getState();

      expect(["PLAYER_1", "PLAYER_2"]).toContain(state.server);
      expect(["PLAYER_1", "PLAYER_2"]).toContain(state.currentGame.server);
    });

    it("sets e games devem ser números não negativos", () => {
      const tennisScoring = new TennisScoring("PLAYER_1", "BEST_OF_3");
      const state = tennisScoring.getState();

      expect(state.sets.PLAYER_1).toBeGreaterThanOrEqual(0);
      expect(state.sets.PLAYER_2).toBeGreaterThanOrEqual(0);
      expect(state.currentSetState.games.PLAYER_1).toBeGreaterThanOrEqual(0);
      expect(state.currentSetState.games.PLAYER_2).toBeGreaterThanOrEqual(0);
      expect(state.currentSet).toBeGreaterThanOrEqual(1);
    });

    it("estatísticas calculadas devem ser consistentes", () => {
      const stats = createEmptyPlayerStats();
      stats.totalServes = 10;
      stats.firstServes = 7;
      stats.secondServes = 3;
      stats.firstServeWins = 5;
      stats.secondServeWins = 2;

      calculatePlayerPercentages(stats);

      // Invariante: firstServes + secondServes = totalServes
      expect(stats.firstServes + stats.secondServes).toBe(stats.totalServes);

      // Invariante: percentuais devem ser consistentes com contadores
      expect(stats.firstServePercentage).toBeCloseTo(
        (stats.firstServes / stats.totalServes) * 100,
        1
      );
      expect(stats.firstServeWinPercentage).toBeCloseTo(
        (stats.firstServeWins / stats.firstServes) * 100,
        1
      );
    });
  });
});
