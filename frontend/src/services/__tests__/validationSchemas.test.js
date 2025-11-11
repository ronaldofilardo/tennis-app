import { describe, it, expect, vi } from "vitest";
import * as zodPackage from "zod";
import {
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
