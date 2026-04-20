import { describe, it, expect } from 'vitest';
import { generatePublicMatchCode, isValidPublicMatchCode } from '../src/utils/codeGenerator';

describe('codeGenerator', () => {
  describe('generatePublicMatchCode', () => {
    it('deve gerar um código de 6-8 caracteres', () => {
      const code = generatePublicMatchCode();
      expect(code).toHaveLength(code.length);
      expect(code.length).toBeGreaterThanOrEqual(6);
      expect(code.length).toBeLessThanOrEqual(8);
    });

    it('deve começar com uma letra maiúscula', () => {
      for (let i = 0; i < 10; i++) {
        const code = generatePublicMatchCode();
        expect(/^[A-Z]/.test(code)).toBe(true);
      }
    });

    it('deve conter apenas caracteres alfanuméricos', () => {
      for (let i = 0; i < 10; i++) {
        const code = generatePublicMatchCode();
        expect(/^[A-Z0-9]+$/.test(code)).toBe(true);
      }
    });

    it('deve gerar códigos diferentes (alta probabilidade)', () => {
      const codes = new Set();
      for (let i = 0; i < 50; i++) {
        codes.add(generatePublicMatchCode());
      }
      // Com 50 tentativas, é muito provável ter pelo menos 40 códigos diferentes
      expect(codes.size).toBeGreaterThan(40);
    });
  });

  describe('isValidPublicMatchCode', () => {
    it('deve validar códigos corretos', () => {
      const validCodes = ['TN42KX', 'ABCD1234', 'XYZ789', 'A000000'];
      validCodes.forEach((code) => {
        expect(isValidPublicMatchCode(code)).toBe(true);
      });
    });

    it('deve rejeitar códigos que não começam com letra', () => {
      expect(isValidPublicMatchCode('1234567')).toBe(false);
      expect(isValidPublicMatchCode('0ABCDEF')).toBe(false);
    });

    it('deve rejeitar códigos muito curtos', () => {
      expect(isValidPublicMatchCode('ABC')).toBe(false);
      expect(isValidPublicMatchCode('ABCD')).toBe(false);
      expect(isValidPublicMatchCode('ABCDE')).toBe(false);
    });

    it('deve rejeitar códigos muito longos', () => {
      expect(isValidPublicMatchCode('ABCDEFGHI')).toBe(false); // 9 caracteres
    });

    it('deve rejeitar códigos com caracteres inválidos', () => {
      expect(isValidPublicMatchCode('ABC-1234')).toBe(false);
      expect(isValidPublicMatchCode('ABC@1234')).toBe(false);
      expect(isValidPublicMatchCode('abc12345')).toBe(false); // minúsculas
    });
  });
});
