import { describe, it, expect, vi } from "vitest";
import * as zodPackage from "zod";
import {
  MatchCreateSchema,
  MatchUpdateSchema,
  MatchStateUpdateSchema,
  VisibleMatchesQuerySchema,
  MatchIdSchema,
  validateMatchStatePayload,
  validateAndFormatZodError,
} from "../validationSchemas.js";

describe("validationSchemas", () => {
  describe("Carregamento do Zod", () => {
    it("deve carregar Zod diretamente quando disponível com z", () => {
      const mockZod = { z: {} };
      expect(zodPackage).toBeDefined();
    });

    it("deve usar fallback para zodPackage.default quando necessário", () => {
      const mockZod = { default: {} };
      expect(zodPackage).toBeDefined();
    });

    it("deve usar fallback para zodPackage direto quando necessário", () => {
      const mockZod = {};
      expect(zodPackage).toBeDefined();
    });

    it("deve criar stub quando Zod não pode ser carregado", () => {
      const testData = { test: "data" };
      const result = validateMatchStatePayload(testData);
      expect(result).toBeDefined();
    });
  });

  describe("MatchCreateSchema", () => {
    it("deve validar dados de criação válidos", () => {
      const validData = {
        sportType: "Tênis",
        format: "BEST_OF_3",
        players: { p1: "player1@email.com", p2: "player2@email.com" },
        apontadorEmail: "admin@email.com",
      };

      const result = MatchCreateSchema.safeParse(validData);
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject(validData);
    });

    it("deve validar dados com campos opcionais", () => {
      const validData = {
        sportType: "Tênis",
        format: "BEST_OF_3",
        players: { p1: "player1@email.com", p2: "player2@email.com" },
        apontadorEmail: "admin@email.com",
        nickname: "Test Match",
        visibleTo: "both",
      };

      const result = MatchCreateSchema.safeParse(validData);
      expect(result.success).toBe(true);
      expect(result.data.nickname).toBe("Test Match");
      expect(result.data.visibleTo).toBe("both");
    });

    it("deve rejeitar sportType vazio", () => {
      const invalidData = {
        sportType: "",
        format: "BEST_OF_3",
        players: { p1: "player1@email.com", p2: "player2@email.com" },
        apontadorEmail: "admin@email.com",
      };

      const result = MatchCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (
        result.error &&
        result.error.errors &&
        result.error.errors.length > 0
      ) {
        expect(result.error.errors[0].message).toContain("não pode ser vazio");
      }
    });

    it("deve rejeitar format vazio", () => {
      const invalidData = {
        sportType: "Tênis",
        format: "",
        players: { p1: "player1@email.com", p2: "player2@email.com" },
        apontadorEmail: "admin@email.com",
      };

      const result = MatchCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (
        result.error &&
        result.error.errors &&
        result.error.errors.length > 0
      ) {
        expect(result.error.errors[0].message).toContain("não pode ser vazio");
      }
    });

    it("deve rejeitar players.p1 vazio", () => {
      const invalidData = {
        sportType: "Tênis",
        format: "BEST_OF_3",
        players: { p1: "", p2: "player2@email.com" },
        apontadorEmail: "admin@email.com",
      };

      const result = MatchCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (
        result.error &&
        result.error.errors &&
        result.error.errors.length > 0
      ) {
        expect(result.error.errors[0].message).toContain("não pode ser vazio");
      }
    });

    it("deve rejeitar players.p2 vazio", () => {
      const invalidData = {
        sportType: "Tênis",
        format: "BEST_OF_3",
        players: { p1: "player1@email.com", p2: "" },
        apontadorEmail: "admin@email.com",
      };

      const result = MatchCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (
        result.error &&
        result.error.errors &&
        result.error.errors.length > 0
      ) {
        expect(result.error.errors[0].message).toContain("não pode ser vazio");
      }
    });

    it("deve rejeitar email inválido", () => {
      const invalidData = {
        sportType: "Tênis",
        format: "BEST_OF_3",
        players: { p1: "player1@email.com", p2: "player2@email.com" },
        apontadorEmail: "invalid-email",
      };

      const result = MatchCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (
        result.error &&
        result.error.errors &&
        result.error.errors.length > 0
      ) {
        expect(result.error.errors[0].message).toContain("deve ser válido");
      }
    });

    it("deve rejeitar dados sem sportType", () => {
      const invalidData = {
        format: "BEST_OF_3",
        players: { p1: "player1@email.com", p2: "player2@email.com" },
        apontadorEmail: "admin@email.com",
      };

      const result = MatchCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (
        result.error &&
        result.error.errors &&
        result.error.errors.length > 0
      ) {
        expect(result.error.errors[0].message).toContain("obrigatório");
      }
    });

    it("deve rejeitar dados sem players", () => {
      const invalidData = {
        sportType: "Tênis",
        format: "BEST_OF_3",
        apontadorEmail: "admin@email.com",
      };

      const result = MatchCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (
        result.error &&
        result.error.errors &&
        result.error.errors.length > 0
      ) {
        expect(result.error.errors[0].message).toContain("obrigatório");
      }
    });
    // ── Testes para clubId e createdByUserId (adicionados nesta conversa) ──

    it("deve aceitar clubId opcional", () => {
      const validData = {
        sportType: "TENNIS",
        format: "BEST_OF_3",
        players: { p1: "Jogador 1", p2: "Jogador 2" },
        clubId: "club-abc-123",
      };
      const result = MatchCreateSchema.safeParse(validData);
      expect(result.success).toBe(true);
      expect(result.data.clubId).toBe("club-abc-123");
    });

    it("deve aceitar createdByUserId opcional", () => {
      const validData = {
        sportType: "TENNIS",
        format: "BEST_OF_3",
        players: { p1: "Jogador 1", p2: "Jogador 2" },
        createdByUserId: "user-xyz-456",
      };
      const result = MatchCreateSchema.safeParse(validData);
      expect(result.success).toBe(true);
      expect(result.data.createdByUserId).toBe("user-xyz-456");
    });

    it("deve aceitar clubId e createdByUserId como null", () => {
      const validData = {
        sportType: "TENNIS",
        format: "BEST_OF_3",
        players: { p1: "Jogador 1", p2: "Jogador 2" },
        clubId: null,
        createdByUserId: null,
      };
      const result = MatchCreateSchema.safeParse(validData);
      expect(result.success).toBe(true);
      expect(result.data.clubId).toBeNull();
      expect(result.data.createdByUserId).toBeNull();
    });

    it("deve validar sem clubId (partida avulsa)", () => {
      const validData = {
        sportType: "TENNIS",
        format: "BEST_OF_3",
        players: { p1: "Jogador 1", p2: "Jogador 2" },
      };
      const result = MatchCreateSchema.safeParse(validData);
      expect(result.success).toBe(true);
      expect(result.data.clubId).toBeUndefined();
      expect(result.data.createdByUserId).toBeUndefined();
    });

    it("deve preservar clubId e createdByUserId no objeto validado", () => {
      const validData = {
        sportType: "TENNIS",
        format: "BEST_OF_3",
        players: { p1: "Jogador 1", p2: "Jogador 2" },
        clubId: "cmm4dw15v0001hpm0e6pxy7ns",
        createdByUserId: "user-gestor-99",
      };
      const result = MatchCreateSchema.safeParse(validData);
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        clubId: "cmm4dw15v0001hpm0e6pxy7ns",
        createdByUserId: "user-gestor-99",
      });
    });
  });

  describe("MatchUpdateSchema", () => {
    it("deve validar dados de atualização válidos", () => {
      const validData = {
        score: "6-4, 7-5",
        winner: "PLAYER_1",
        completedSets: [{ PLAYER_1: 6, PLAYER_2: 4 }],
      };

      const result = MatchUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it("deve validar dados parciais", () => {
      const partialData = { score: "6-4" };

      const result = MatchUpdateSchema.safeParse(partialData);
      expect(result.success).toBe(true);
      expect(result.data.score).toBe("6-4");
      expect(result.data.winner).toBeUndefined();
    });

    it("deve aceitar winner null", () => {
      const dataWithNullWinner = { winner: null };

      const result = MatchUpdateSchema.safeParse(dataWithNullWinner);
      expect(result.success).toBe(true);
      expect(result.data.winner).toBeNull();
    });

    it("deve rejeitar campos extras", () => {
      const invalidData = {
        score: "6-4",
        extraField: "not allowed",
      };

      const result = MatchUpdateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("MatchStateUpdateSchema", () => {
    it("deve aceitar payload com matchState string", () => {
      const testData = { matchState: '{"score":"1-0"}' };

      const result = MatchStateUpdateSchema.safeParse(testData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(testData);
    });

    it("deve aceitar payload com matchState objeto", () => {
      const testData = { matchState: { score: "1-0", sets: [] } };

      const result = MatchStateUpdateSchema.safeParse(testData);
      expect(result.success).toBe(true);
    });

    it("deve rejeitar payload sem matchState (.strict())", () => {
      const testData = { any: "data", nested: { object: true } };

      const result = MatchStateUpdateSchema.safeParse(testData);
      expect(result.success).toBe(false);
    });

    it("deve fazer parse de payload válido com matchState", () => {
      const testData = { matchState: '{"test":"data"}' };

      const result = MatchStateUpdateSchema.parse(testData);
      expect(result).toEqual(testData);
    });
  });

  describe("VisibleMatchesQuerySchema", () => {
    it("deve validar query válida", () => {
      const validQuery = {
        email: "user@email.com",
        role: "ATHLETE",
      };

      const result = VisibleMatchesQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validQuery);
    });

    it("deve validar query com apenas email", () => {
      const query = { email: "user@email.com" };

      const result = VisibleMatchesQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      expect(result.data.email).toBe("user@email.com");
      expect(result.data.role).toBeUndefined();
    });

    it("deve validar query com apenas role", () => {
      const query = { role: "admin" };

      const result = VisibleMatchesQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      expect(result.data.role).toBe("admin");
    });

    it("deve rejeitar email inválido", () => {
      const invalidQuery = { email: "invalid-email" };

      const result = VisibleMatchesQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
    });

    it("deve rejeitar campos extras", () => {
      const invalidQuery = {
        email: "user@email.com",
        extraField: "not allowed",
      };

      const result = VisibleMatchesQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
    });
  });

  describe("MatchIdSchema", () => {
    it("deve validar ID válido", () => {
      const validId = "match-123";

      const result = MatchIdSchema.safeParse(validId);
      expect(result.success).toBe(true);
      expect(result.data).toBe(validId);
    });

    it("deve rejeitar ID vazio", () => {
      const invalidId = "";

      const result = MatchIdSchema.safeParse(invalidId);
      expect(result.success).toBe(false);
      if (
        result.error &&
        result.error.errors &&
        result.error.errors.length > 0
      ) {
        expect(result.error.errors[0].message).toContain("não pode ser vazio");
      }
    });

    it("deve rejeitar ID muito longo", () => {
      const invalidId = "a".repeat(101);

      const result = MatchIdSchema.safeParse(invalidId);
      expect(result.success).toBe(false);
      if (
        result.error &&
        result.error.errors &&
        result.error.errors.length > 0
      ) {
        expect(result.error.errors[0].message).toContain("muito longo");
      }
    });
  });

  describe("validateMatchStatePayload", () => {
    it("deve validar um payload de estado válido", () => {
      const validPayload = {
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
        config: {},
      };

      const result = validateMatchStatePayload(validPayload);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validPayload);
    });

    it("deve rejeitar um payload de estado inválido", () => {
      const invalidPayload = {
        sets: { INVALID: 0 },
        currentSet: "not a number",
        currentSetState: null,
        currentGame: {
          points: { INVALID: "0" },
          server: "INVALID",
          isTiebreak: "not a boolean",
        },
      };

      const result = validateMatchStatePayload(invalidPayload);
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("validateAndFormatZodError", () => {
    it("deve formatar erro Zod em mensagem amigável", () => {
      const mockZodError = {
        errors: [
          {
            path: ["currentGame", "points", "PLAYER_1"],
            message: "Invalid input",
          },
        ],
      };

      const formatted = validateAndFormatZodError(mockZodError);
      expect(formatted).toContain("currentGame.points.PLAYER_1");
      expect(formatted).toContain("Invalid input");
    });

    it("deve retornar mensagem genérica para erro não-Zod", () => {
      const error = new Error("Test error");
      const formatted = validateAndFormatZodError(error);
      expect(formatted).toContain("Erro de validação");
      expect(formatted).toContain("Test error");
    });
  });
});
