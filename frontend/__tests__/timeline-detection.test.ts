/**
 * Tests para detecção de GameBall e SetBall na timeline.
 * Garante que:
 * 1. GameBall é detectado corretamente em placar 40-0/15/30
 * 2. GameBall é detectado em tiebreak 9-8/10-9
 * 3. SetBall é detectado em 5 games com vantagem
 * 4. Enriquecimento de pontos funciona sem regressão
 */

import { describe, it, expect } from 'vitest';
import type { PointDetails } from '../src/core/scoring/types';
import {
  detectGameBall,
  detectSetBall,
  enrichPointsWithBallDetection,
} from '../src/services/timelineUtils';

// ─── Mock Factory ─────────────────────────────────────────────────────────────

function createMockPoint(overrides: Partial<PointDetails> = {}): PointDetails {
  return {
    result: {
      type: 'WINNER',
      winner: 'PLAYER_1',
      finalShot: 'FOREHAND',
    },
    rally: {
      ballExchanges: 1,
    },
    serve: undefined,
    rallyDetails: undefined,
    timestamp: 0,
    context: {
      server: 'PLAYER_1',
      gameScoreP1: '0',
      gameScoreP2: '0',
      gamesP1: 0,
      gamesP2: 0,
      setNumber: 1,
      setsWonP1: 0,
      setsWonP2: 0,
      isTiebreak: false,
      isBreakPoint: false,
    },
    ...overrides,
  };
}

// ─── detectGameBall ───────────────────────────────────────────────────────────

describe('detectGameBall', () => {
  it('retorna false se point não tem context', () => {
    const point = createMockPoint({ context: undefined });
    expect(detectGameBall(point)).toBe(false);
  });

  describe('Placar normal (não tiebreak)', () => {
    it('detecta game ball em 40-0', () => {
      const point = createMockPoint({
        context: {
          server: 'PLAYER_1',
          gameScoreP1: '40',
          gameScoreP2: '0',
          gamesP1: 0,
          gamesP2: 0,
          setNumber: 1,
          setsWonP1: 0,
          setsWonP2: 0,
          isTiebreak: false,
          isBreakPoint: false,
        },
      });
      expect(detectGameBall(point)).toBe(true);
    });

    it('detecta game ball em 40-15', () => {
      const point = createMockPoint({
        context: {
          server: 'PLAYER_1',
          gameScoreP1: '40',
          gameScoreP2: '15',
          gamesP1: 0,
          gamesP2: 0,
          setNumber: 1,
          setsWonP1: 0,
          setsWonP2: 0,
          isTiebreak: false,
          isBreakPoint: false,
        },
      });
      expect(detectGameBall(point)).toBe(true);
    });

    it('detecta game ball em 40-30', () => {
      const point = createMockPoint({
        context: {
          server: 'PLAYER_1',
          gameScoreP1: '40',
          gameScoreP2: '30',
          gamesP1: 0,
          gamesP2: 0,
          setNumber: 1,
          setsWonP1: 0,
          setsWonP2: 0,
          isTiebreak: false,
          isBreakPoint: false,
        },
      });
      expect(detectGameBall(point)).toBe(true);
    });

    it('detecta game ball para PLAYER_2 em 30-40', () => {
      const point = createMockPoint({
        context: {
          server: 'PLAYER_1',
          gameScoreP1: '30',
          gameScoreP2: '40',
          gamesP1: 0,
          gamesP2: 0,
          setNumber: 1,
          setsWonP1: 0,
          setsWonP2: 0,
          isTiebreak: false,
          isBreakPoint: false,
        },
      });
      expect(detectGameBall(point)).toBe(true);
    });

    it('NÃO detecta game ball em deuce (40-40)', () => {
      const point = createMockPoint({
        context: {
          server: 'PLAYER_1',
          gameScoreP1: '40',
          gameScoreP2: '40',
          gamesP1: 0,
          gamesP2: 0,
          setNumber: 1,
          setsWonP1: 0,
          setsWonP2: 0,
          isTiebreak: false,
          isBreakPoint: false,
        },
      });
      expect(detectGameBall(point)).toBe(false);
    });

    it('NÃO detecta game ball em vantagem (AD-40)', () => {
      const point = createMockPoint({
        context: {
          server: 'PLAYER_1',
          gameScoreP1: 'AD',
          gameScoreP2: '40',
          gamesP1: 0,
          gamesP2: 0,
          setNumber: 1,
          setsWonP1: 0,
          setsWonP2: 0,
          isTiebreak: false,
          isBreakPoint: false,
        },
      });
      expect(detectGameBall(point)).toBe(false);
    });

    it('NÃO detecta game ball em 0-0', () => {
      const point = createMockPoint({
        context: {
          server: 'PLAYER_1',
          gameScoreP1: '0',
          gameScoreP2: '0',
          gamesP1: 0,
          gamesP2: 0,
          setNumber: 1,
          setsWonP1: 0,
          setsWonP2: 0,
          isTiebreak: false,
          isBreakPoint: false,
        },
      });
      expect(detectGameBall(point)).toBe(false);
    });
  });

  describe('Tiebreak', () => {
    it('detecta game ball em tiebreak 9-8', () => {
      const point = createMockPoint({
        context: {
          server: 'PLAYER_1',
          gameScoreP1: 9,
          gameScoreP2: 8,
          gamesP1: 6,
          gamesP2: 6,
          setNumber: 1,
          setsWonP1: 0,
          setsWonP2: 0,
          isTiebreak: true,
          isBreakPoint: false,
        },
      });
      expect(detectGameBall(point)).toBe(true);
    });

    it('detecta game ball em tiebreak 10-9', () => {
      const point = createMockPoint({
        context: {
          server: 'PLAYER_1',
          gameScoreP1: 10,
          gameScoreP2: 9,
          gamesP1: 6,
          gamesP2: 6,
          setNumber: 1,
          setsWonP1: 0,
          setsWonP2: 0,
          isTiebreak: true,
          isBreakPoint: false,
        },
      });
      expect(detectGameBall(point)).toBe(true);
    });

    it('NÃO detecta game ball em tiebreak 5-5', () => {
      const point = createMockPoint({
        context: {
          server: 'PLAYER_1',
          gameScoreP1: 5,
          gameScoreP2: 5,
          gamesP1: 6,
          gamesP2: 6,
          setNumber: 1,
          setsWonP1: 0,
          setsWonP2: 0,
          isTiebreak: true,
          isBreakPoint: false,
        },
      });
      expect(detectGameBall(point)).toBe(false);
    });

    it('NÃO detecta game ball em tiebreak 8-7 (sem diferença de 2)', () => {
      const point = createMockPoint({
        context: {
          server: 'PLAYER_1',
          gameScoreP1: 8,
          gameScoreP2: 7,
          gamesP1: 6,
          gamesP2: 6,
          setNumber: 1,
          setsWonP1: 0,
          setsWonP2: 0,
          isTiebreak: true,
          isBreakPoint: false,
        },
      });
      expect(detectGameBall(point)).toBe(false);
    });
  });
});

// ─── detectSetBall ────────────────────────────────────────────────────────────

describe('detectSetBall', () => {
  it('retorna false se point não tem context', () => {
    const point = createMockPoint({ context: undefined });
    expect(detectSetBall(point)).toBe(false);
  });

  it('detecta set ball quando P1 tem 5 games e P2 tem 4', () => {
    const point = createMockPoint({
      context: {
        server: 'PLAYER_1',
        gameScoreP1: '30',
        gameScoreP2: '30',
        gamesP1: 5,
        gamesP2: 4,
        setNumber: 1,
        setsWonP1: 0,
        setsWonP2: 0,
        isTiebreak: false,
        isBreakPoint: false,
      },
    });
    expect(detectSetBall(point)).toBe(true);
  });

  it('detecta set ball quando P1 tem 5 games e P2 tem 0', () => {
    const point = createMockPoint({
      context: {
        server: 'PLAYER_1',
        gameScoreP1: '0',
        gameScoreP2: '0',
        gamesP1: 5,
        gamesP2: 0,
        setNumber: 1,
        setsWonP1: 0,
        setsWonP2: 0,
        isTiebreak: false,
        isBreakPoint: false,
      },
    });
    expect(detectSetBall(point)).toBe(true);
  });

  it('detecta set ball quando P2 tem 5 games e P1 tem 3', () => {
    const point = createMockPoint({
      context: {
        server: 'PLAYER_1',
        gameScoreP1: '15',
        gameScoreP2: '30',
        gamesP1: 3,
        gamesP2: 5,
        setNumber: 1,
        setsWonP1: 0,
        setsWonP2: 0,
        isTiebreak: false,
        isBreakPoint: false,
      },
    });
    expect(detectSetBall(point)).toBe(true);
  });

  it('NÃO detecta set ball em 5-5 games', () => {
    const point = createMockPoint({
      context: {
        server: 'PLAYER_1',
        gameScoreP1: '0',
        gameScoreP2: '0',
        gamesP1: 5,
        gamesP2: 5,
        setNumber: 1,
        setsWonP1: 0,
        setsWonP2: 0,
        isTiebreak: false,
        isBreakPoint: false,
      },
    });
    expect(detectSetBall(point)).toBe(false);
  });

  it('NÃO detecta set ball em 4-4 games', () => {
    const point = createMockPoint({
      context: {
        server: 'PLAYER_1',
        gameScoreP1: '30',
        gameScoreP2: '30',
        gamesP1: 4,
        gamesP2: 4,
        setNumber: 1,
        setsWonP1: 0,
        setsWonP2: 0,
        isTiebreak: false,
        isBreakPoint: false,
      },
    });
    expect(detectSetBall(point)).toBe(false);
  });

  it('NÃO detecta set ball em 6-6 games (tiebreak em progresso)', () => {
    const point = createMockPoint({
      context: {
        server: 'PLAYER_1',
        gameScoreP1: 5,
        gameScoreP2: 5,
        gamesP1: 6,
        gamesP2: 6,
        setNumber: 1,
        setsWonP1: 0,
        setsWonP2: 0,
        isTiebreak: true,
        isBreakPoint: false,
      },
    });
    expect(detectSetBall(point)).toBe(false);
  });
});

// ─── enrichPointsWithBallDetection ────────────────────────────────────────────

describe('enrichPointsWithBallDetection', () => {
  it('retorna array vazio para entrada vazia', () => {
    const result = enrichPointsWithBallDetection([]);
    expect(result).toEqual([]);
  });

  it('marca isGameBall em pontos com game ball', () => {
    const point1 = createMockPoint({
      context: {
        server: 'PLAYER_1',
        gameScoreP1: '40',
        gameScoreP2: '0',
        gamesP1: 0,
        gamesP2: 0,
        setNumber: 1,
        setsWonP1: 0,
        setsWonP2: 0,
        isTiebreak: false,
        isBreakPoint: false,
      },
    });

    const point2 = createMockPoint({
      context: {
        server: 'PLAYER_1',
        gameScoreP1: '30',
        gameScoreP2: '30',
        gamesP1: 0,
        gamesP2: 0,
        setNumber: 1,
        setsWonP1: 0,
        setsWonP2: 0,
        isTiebreak: false,
        isBreakPoint: false,
      },
    });

    const points = [point1, point2];
    const result = enrichPointsWithBallDetection(points);

    expect(result[0].context?.isGameBall).toBe(true);
    expect(result[1].context?.isGameBall).toBe(false);
  });

  it('marca isSetBall em pontos com set ball', () => {
    const point1 = createMockPoint({
      context: {
        server: 'PLAYER_1',
        gameScoreP1: '0',
        gameScoreP2: '0',
        gamesP1: 5,
        gamesP2: 3,
        setNumber: 1,
        setsWonP1: 0,
        setsWonP2: 0,
        isTiebreak: false,
        isBreakPoint: false,
      },
    });

    const result = enrichPointsWithBallDetection([point1]);

    expect(result[0].context?.isSetBall).toBe(true);
  });

  it('não modificar ponto original (retorna cópia)', () => {
    const original = createMockPoint({
      context: {
        server: 'PLAYER_1',
        gameScoreP1: '40',
        gameScoreP2: '0',
        gamesP1: 0,
        gamesP2: 0,
        setNumber: 1,
        setsWonP1: 0,
        setsWonP2: 0,
        isTiebreak: false,
        isBreakPoint: false,
      },
    });

    const points = [original];
    const result = enrichPointsWithBallDetection(points);

    // Original não deve ter isGameBall marcado
    expect(original.context?.isGameBall).toBeUndefined();
    // Resultado deve ter
    expect(result[0].context?.isGameBall).toBe(true);
  });

  it('processa múltiplos pontos corretamente', () => {
    const points = [
      createMockPoint({
        context: {
          server: 'PLAYER_1',
          gameScoreP1: '40',
          gameScoreP2: '0',
          gamesP1: 5,
          gamesP2: 3,
          setNumber: 1,
          setsWonP1: 0,
          setsWonP2: 0,
          isTiebreak: false,
          isBreakPoint: false,
        },
      }),
      createMockPoint({
        context: {
          server: 'PLAYER_2',
          gameScoreP1: '0',
          gameScoreP2: '15',
          gamesP1: 3,
          gamesP2: 3,
          setNumber: 1,
          setsWonP1: 0,
          setsWonP2: 0,
          isTiebreak: false,
          isBreakPoint: false,
        },
      }),
    ];

    const result = enrichPointsWithBallDetection(points);

    // Primeiro ponto: game ball E set ball
    expect(result[0].context?.isGameBall).toBe(true);
    expect(result[0].context?.isSetBall).toBe(true);

    // Segundo ponto: nem game ball nem set ball
    expect(result[1].context?.isGameBall).toBe(false);
    expect(result[1].context?.isSetBall).toBe(false);
  });

  it('preserva pontos sem context sem erro', () => {
    const pointWithContext = createMockPoint({
      context: {
        server: 'PLAYER_1',
        gameScoreP1: '40',
        gameScoreP2: '0',
        gamesP1: 0,
        gamesP2: 0,
        setNumber: 1,
        setsWonP1: 0,
        setsWonP2: 0,
        isTiebreak: false,
        isBreakPoint: false,
      },
    });

    const pointWithoutContext = createMockPoint({ context: undefined });

    const points = [pointWithContext, pointWithoutContext];
    const result = enrichPointsWithBallDetection(points);

    expect(result).toHaveLength(2);
    expect(result[0].context?.isGameBall).toBe(true);
    expect(result[1].context).toBeUndefined();
  });
});
