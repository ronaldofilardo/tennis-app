/**
 * ballExchangeRules.test.ts
 * Testes unitários para a lógica de validação de trocas de bolas
 */

import { describe, it, expect } from 'vitest';
import type { PointDetails } from '../types';
import {
  calculateDefaultBallExchanges,
  shouldConfirmBallExchanges,
  getBallExchangeConfirmationMessage,
  getPointTypeDescription,
  calculateFinalBallExchanges,
  isRallyPoint,
} from '../ballExchangeRules';

describe('ballExchangeRules — Validação de trocas de bolas', () => {
  describe('calculateDefaultBallExchanges', () => {
    it('deve retornar 1 para Ace', () => {
      const pointDetails: Partial<PointDetails> = {
        serve: { type: 'ACE', isFirstServe: true },
        result: { winner: 'PLAYER_1', type: 'WINNER' },
        rally: { ballExchanges: 0 },
        shotPlayer: 'PLAYER_1',
        timestamp: Date.now(),
      };

      const result = calculateDefaultBallExchanges(pointDetails);

      expect(result.expectedCount).toBe(1);
      expect(result.isAutomatic).toBe(true);
      expect(result.reason).toContain('Ace');
    });

    it('deve retornar 1 para Dupla Falta', () => {
      const pointDetails: Partial<PointDetails> = {
        serve: { type: 'DOUBLE_FAULT', isFirstServe: false },
        result: { winner: 'PLAYER_2', type: 'FORCED_ERROR' },
        rally: { ballExchanges: 0 },
        shotPlayer: 'PLAYER_2',
        timestamp: Date.now(),
      };

      const result = calculateDefaultBallExchanges(pointDetails);

      expect(result.expectedCount).toBe(1);
      expect(result.isAutomatic).toBe(true);
      expect(result.reason).toContain('Dupla Falta');
    });

    it('deve retornar 1 para Service Winner', () => {
      const pointDetails: Partial<PointDetails> = {
        serve: { type: 'SERVICE_WINNER', isFirstServe: true },
        result: { winner: 'PLAYER_1', type: 'WINNER' },
        rally: { ballExchanges: 0 },
        shotPlayer: 'PLAYER_1',
        timestamp: Date.now(),
      };

      const result = calculateDefaultBallExchanges(pointDetails);

      expect(result.expectedCount).toBe(1);
      expect(result.isAutomatic).toBe(true);
      expect(result.reason).toContain('Service Winner');
    });

    it('deve retornar 1 para Erro Não-Forçado sem contador do usuário', () => {
      const pointDetails: Partial<PointDetails> = {
        serve: { type: 'FAULT_FIRST', isFirstServe: true },
        result: { winner: 'PLAYER_2', type: 'UNFORCED_ERROR' },
        rally: { ballExchanges: 0 },
        shotPlayer: 'PLAYER_2',
        timestamp: Date.now(),
      };

      const result = calculateDefaultBallExchanges(pointDetails);

      expect(result.expectedCount).toBe(1);
      expect(result.isAutomatic).toBe(true);
      expect(result.reason).toContain('Erro');
    });

    it('deve retornar contador do usuário para Winner com múltiplas trocas', () => {
      const pointDetails: Partial<PointDetails> = {
        serve: { type: 'FAULT_FIRST', isFirstServe: true },
        result: { winner: 'PLAYER_1', type: 'WINNER' },
        rally: { ballExchanges: 0 },
        shotPlayer: 'PLAYER_1',
        timestamp: Date.now(),
      };

      const result = calculateDefaultBallExchanges(pointDetails, 5);

      expect(result.expectedCount).toBe(5);
      expect(result.isAutomatic).toBe(true);
      expect(result.reason).toContain('5');
    });

    it('deve retornar contador do usuário para Erro com múltiplas trocas', () => {
      const pointDetails: Partial<PointDetails> = {
        serve: { type: 'FAULT_FIRST', isFirstServe: true },
        result: { winner: 'PLAYER_2', type: 'FORCED_ERROR' },
        rally: { ballExchanges: 0 },
        shotPlayer: 'PLAYER_2',
        timestamp: Date.now(),
      };

      const result = calculateDefaultBallExchanges(pointDetails, 3);

      expect(result.expectedCount).toBe(3);
      expect(result.isAutomatic).toBe(true);
      expect(result.reason).toContain('3');
    });
  });

  describe('shouldConfirmBallExchanges', () => {
    it('deve retornar false se contador === esperado (Ace com 1)', () => {
      const pointDetails: Partial<PointDetails> = {
        serve: { type: 'ACE', isFirstServe: true },
        result: { winner: 'PLAYER_1', type: 'WINNER' },
        rally: { ballExchanges: 0 },
        shotPlayer: 'PLAYER_1',
        timestamp: Date.now(),
      };

      const shouldConfirm = shouldConfirmBallExchanges(pointDetails, 1);

      expect(shouldConfirm).toBe(false);
    });

    it('deve retornar true se contador !== esperado (Ace com 3)', () => {
      const pointDetails: Partial<PointDetails> = {
        serve: { type: 'ACE', isFirstServe: true },
        result: { winner: 'PLAYER_1', type: 'WINNER' },
        rally: { ballExchanges: 0 },
        shotPlayer: 'PLAYER_1',
        timestamp: Date.now(),
      };

      const shouldConfirm = shouldConfirmBallExchanges(pointDetails, 3);

      expect(shouldConfirm).toBe(true);
    });

    it('deve retornar false se contador === esperado (Rally com 5)', () => {
      const pointDetails: Partial<PointDetails> = {
        serve: { type: 'FAULT_FIRST', isFirstServe: true },
        result: { winner: 'PLAYER_1', type: 'WINNER' },
        rally: { ballExchanges: 0 },
        shotPlayer: 'PLAYER_1',
        timestamp: Date.now(),
      };

      const shouldConfirm = shouldConfirmBallExchanges(pointDetails, 5);

      expect(shouldConfirm).toBe(false);
    });
  });

  describe('getBallExchangeConfirmationMessage', () => {
    it('deve retornar mensagem congruente para contador válido', () => {
      const pointDetails: Partial<PointDetails> = {
        serve: { type: 'ACE', isFirstServe: true },
        result: { winner: 'PLAYER_1', type: 'WINNER' },
        rally: { ballExchanges: 0 },
        shotPlayer: 'PLAYER_1',
        timestamp: Date.now(),
      };

      const message = getBallExchangeConfirmationMessage(pointDetails, 1);

      expect(message).toContain('1 bola');
      expect(message).not.toContain('sistema detectou');
    });

    it('deve retornar mensagem de discordância para contador inválido', () => {
      const pointDetails: Partial<PointDetails> = {
        serve: { type: 'ACE', isFirstServe: true },
        result: { winner: 'PLAYER_1', type: 'WINNER' },
        rally: { ballExchanges: 0 },
        shotPlayer: 'PLAYER_1',
        timestamp: Date.now(),
      };

      const message = getBallExchangeConfirmationMessage(pointDetails, 3);

      expect(message).toContain('O sistema detectou');
      expect(message).toContain('3 bolas');
      expect(message).toContain('Confirma');
    });
  });

  describe('getPointTypeDescription', () => {
    it('deve retornar "Ace" para Ace', () => {
      const pointDetails: Partial<PointDetails> = {
        serve: { type: 'ACE', isFirstServe: true },
      };

      const desc = getPointTypeDescription(pointDetails);

      expect(desc).toBe('Ace');
    });

    it('deve retornar "Dupla Falta" para DOUBLE_FAULT', () => {
      const pointDetails: Partial<PointDetails> = {
        serve: { type: 'DOUBLE_FAULT', isFirstServe: false },
      };

      const desc = getPointTypeDescription(pointDetails);

      expect(desc).toBe('Dupla Falta');
    });

    it('deve retornar "Winner" para resultado WINNER', () => {
      const pointDetails: Partial<PointDetails> = {
        result: { winner: 'PLAYER_1', type: 'WINNER' },
      };

      const desc = getPointTypeDescription(pointDetails);

      expect(desc).toBe('Winner');
    });

    it('deve retornar "Erro Não-Forçado" para UNFORCED_ERROR', () => {
      const pointDetails: Partial<PointDetails> = {
        result: { winner: 'PLAYER_2', type: 'UNFORCED_ERROR' },
      };

      const desc = getPointTypeDescription(pointDetails);

      expect(desc).toBe('Erro Não-Forçado');
    });

    it('deve retornar "Erro Forçado" para FORCED_ERROR', () => {
      const pointDetails: Partial<PointDetails> = {
        result: { winner: 'PLAYER_1', type: 'FORCED_ERROR' },
      };

      const desc = getPointTypeDescription(pointDetails);

      expect(desc).toBe('Erro Forçado');
    });
  });

  describe('calculateFinalBallExchanges — Cálculo final com devolvedor', () => {
    it('2 bolas, sacador venceu → 2 bolas', () => {
      expect(calculateFinalBallExchanges(2, false)).toBe(2);
    });

    it('2 bolas, devolvedor venceu → 3 bolas', () => {
      expect(calculateFinalBallExchanges(2, true)).toBe(3);
    });

    it('4 bolas, sacador venceu → 4 bolas', () => {
      expect(calculateFinalBallExchanges(4, false)).toBe(4);
    });

    it('4 bolas, devolvedor venceu → 5 bolas', () => {
      expect(calculateFinalBallExchanges(4, true)).toBe(5);
    });

    it('6 bolas, sacador venceu → 6 bolas', () => {
      expect(calculateFinalBallExchanges(6, false)).toBe(6);
    });

    it('6 bolas, devolvedor venceu → 7 bolas', () => {
      expect(calculateFinalBallExchanges(6, true)).toBe(7);
    });

    it('0 bolas → retorna 1 (mínimo)', () => {
      expect(calculateFinalBallExchanges(0, false)).toBe(1);
      expect(calculateFinalBallExchanges(0, true)).toBe(1);
    });

    it('negativo → retorna 1 (mínimo)', () => {
      expect(calculateFinalBallExchanges(-1, false)).toBe(1);
    });
  });

  describe('isRallyPoint — Identificação de rally', () => {
    it('Ace NÃO é rally', () => {
      expect(isRallyPoint({ serve: { type: 'ACE', isFirstServe: true } })).toBe(false);
    });

    it('Dupla Falta NÃO é rally', () => {
      expect(isRallyPoint({ serve: { type: 'DOUBLE_FAULT', isFirstServe: false } })).toBe(false);
    });

    it('Service Winner NÃO é rally', () => {
      expect(isRallyPoint({ serve: { type: 'SERVICE_WINNER', isFirstServe: true } })).toBe(false);
    });

    it('Fault (primeiro saque errado) + rally É rally', () => {
      expect(isRallyPoint({ serve: { type: 'FAULT_FIRST', isFirstServe: true } })).toBe(true);
    });

    it('Ponto sem serve É rally', () => {
      expect(isRallyPoint({ result: { winner: 'PLAYER_1', type: 'WINNER' } })).toBe(true);
    });
  });
});
