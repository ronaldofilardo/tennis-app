// tests/timelineUtils.test.ts
// Testes de unidade para src/services/timelineUtils.ts

import { describe, it, expect } from 'vitest';
import type { PointDetails } from '../src/core/scoring/types';
import {
  filterPointsHistory,
  countByFilter,
  formatGameScore,
  formatGameScoreLabel,
  formatPointTime,
  summarizePoint,
} from '../src/services/timelineUtils';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makePoint(overrides: Partial<PointDetails> = {}): PointDetails {
  return {
    result: { winner: 'PLAYER_1', type: 'WINNER' },
    shotPlayer: 'PLAYER_1',
    rally: { ballExchanges: 3 },
    timestamp: 1712620800000,
    ...overrides,
  };
}

function makeAce(isFirstServe = true): PointDetails {
  return makePoint({
    serve: { type: 'ACE', isFirstServe, serveEffect: 'Flat', direction: 'Aberto' },
    result: { winner: 'PLAYER_1', type: 'WINNER' },
  });
}

function makeDoubleFault(): PointDetails {
  return makePoint({
    serve: {
      type: 'DOUBLE_FAULT',
      isFirstServe: false,
      firstFault: { errorType: 'out', serveEffect: 'Slice', direction: 'Fechado' },
    },
    result: { winner: 'PLAYER_2', type: 'UNFORCED_ERROR' },
  });
}

function makeBreakPoint(winner: 'PLAYER_1' | 'PLAYER_2' = 'PLAYER_2'): PointDetails {
  return makePoint({
    result: { winner, type: 'WINNER' },
    context: {
      setNumber: 1,
      gamesP1: 2,
      gamesP2: 3,
      setsWonP1: 0,
      setsWonP2: 0,
      gameScoreP1: '0',
      gameScoreP2: '40',
      server: 'PLAYER_1',
      isBreakPoint: true,
      isTiebreak: false,
    },
  });
}

// ─── filterPointsHistory ─────────────────────────────────────────────────────

describe('filterPointsHistory', () => {
  const points: PointDetails[] = [
    makeAce(), // P1 vence com ace
    makeDoubleFault(), // P2 vence (dupla falta)
    makeBreakPoint('PLAYER_2'), // P2 vence breakpoint
    makePoint({ result: { winner: 'PLAYER_1', type: 'UNFORCED_ERROR' } }), // erro do P2 → P1 vence
    makePoint({
      result: { winner: 'PLAYER_1', type: 'FORCED_ERROR' },
      rally: { ballExchanges: 8 },
    }),
  ];

  it('deve retornar todos os pontos quando critérios estão vazios', () => {
    expect(filterPointsHistory(points, {})).toHaveLength(5);
  });

  describe('por playerWinner', () => {
    it('deve filtrar por PLAYER_1', () => {
      const result = filterPointsHistory(points, { playerWinner: 'PLAYER_1' });
      expect(result).toHaveLength(3);
      result.forEach((p) => expect(p.result.winner).toBe('PLAYER_1'));
    });

    it('deve filtrar por PLAYER_2', () => {
      const result = filterPointsHistory(points, { playerWinner: 'PLAYER_2' });
      expect(result).toHaveLength(2);
      result.forEach((p) => expect(p.result.winner).toBe('PLAYER_2'));
    });

    it('deve retornar lista vazia quando playerWinner é null', () => {
      const result = filterPointsHistory(points, { playerWinner: null });
      // null não deve filtrar — comporta como "sem filtro"
      expect(result).toHaveLength(5);
    });
  });

  describe('breakPointsOnly', () => {
    it('deve retornar apenas breakpoints', () => {
      const result = filterPointsHistory(points, { breakPointsOnly: true });
      expect(result).toHaveLength(1);
      expect(result[0].context?.isBreakPoint).toBe(true);
    });

    it('deve retornar lista vazia se não há breakpoints', () => {
      const semBP = [makeAce(), makeDoubleFault()];
      expect(filterPointsHistory(semBP, { breakPointsOnly: true })).toHaveLength(0);
    });
  });

  describe('winnersOnly', () => {
    it('deve incluir aces', () => {
      const result = filterPointsHistory(points, { winnersOnly: true });
      expect(result.some((p) => p.serve?.type === 'ACE')).toBe(true);
    });

    it('deve incluir winners de rally', () => {
      const result = filterPointsHistory(points, { winnersOnly: true });
      expect(result.some((p) => p.result.type === 'WINNER')).toBe(true);
    });

    it('deve excluir erros não forçados', () => {
      const result = filterPointsHistory(points, { winnersOnly: true });
      expect(result.some((p) => p.result.type === 'UNFORCED_ERROR')).toBe(false);
    });

    it('deve incluir service winners', () => {
      const sw = [makePoint({ serve: { type: 'SERVICE_WINNER', isFirstServe: true } })];
      const result = filterPointsHistory(sw, { winnersOnly: true });
      expect(result).toHaveLength(1);
    });
  });

  describe('errorsOnly', () => {
    it('deve incluir erros não forçados', () => {
      const result = filterPointsHistory(points, { errorsOnly: true });
      expect(result.some((p) => p.result.type === 'UNFORCED_ERROR')).toBe(true);
    });

    it('deve incluir erros forçados', () => {
      const result = filterPointsHistory(points, { errorsOnly: true });
      expect(result.some((p) => p.result.type === 'FORCED_ERROR')).toBe(true);
    });

    it('deve incluir duplas faltas', () => {
      const result = filterPointsHistory(points, { errorsOnly: true });
      expect(result.some((p) => p.serve?.type === 'DOUBLE_FAULT')).toBe(true);
    });

    it('deve excluir winners puros', () => {
      const result = filterPointsHistory(points, { errorsOnly: true });
      // O ace (winner sem erro) não deve aparecer
      expect(result.some((p) => p.serve?.type === 'ACE')).toBe(false);
    });
  });

  describe('por comprimento de rally', () => {
    it('deve filtrar por minRallyLength', () => {
      const result = filterPointsHistory(points, { minRallyLength: 5 });
      result.forEach((p) => expect(p.rally.ballExchanges).toBeGreaterThanOrEqual(5));
    });

    it('deve filtrar por maxRallyLength', () => {
      const result = filterPointsHistory(points, { maxRallyLength: 3 });
      result.forEach((p) => expect(p.rally.ballExchanges).toBeLessThanOrEqual(3));
    });

    it('deve combinar min e max', () => {
      const result = filterPointsHistory(points, { minRallyLength: 3, maxRallyLength: 5 });
      result.forEach((p) => {
        expect(p.rally.ballExchanges).toBeGreaterThanOrEqual(3);
        expect(p.rally.ballExchanges).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('combinação de critérios', () => {
    it('deve combinar playerWinner + breakPointsOnly', () => {
      const result = filterPointsHistory(points, {
        playerWinner: 'PLAYER_2',
        breakPointsOnly: true,
      });
      expect(result).toHaveLength(1);
      expect(result[0].result.winner).toBe('PLAYER_2');
      expect(result[0].context?.isBreakPoint).toBe(true);
    });

    it('deve retornar vazio quando critérios são mutuamente exclusivos', () => {
      const result = filterPointsHistory(points, {
        winnersOnly: true,
        errorsOnly: true,
      });
      // Um ponto não pode ser winner E erro ao mesmo tempo
      expect(result).toHaveLength(0);
    });
  });
});

// ─── countByFilter ───────────────────────────────────────────────────────────

describe('countByFilter', () => {
  const points = [makeAce(), makeDoubleFault(), makeBreakPoint()];

  it('deve contar corretamente', () => {
    expect(countByFilter(points, { playerWinner: 'PLAYER_1' })).toBe(1);
    expect(countByFilter(points, { playerWinner: 'PLAYER_2' })).toBe(2);
    expect(countByFilter(points, { breakPointsOnly: true })).toBe(1);
  });

  it('deve retornar 0 para lista vazia', () => {
    expect(countByFilter([], { winnersOnly: true })).toBe(0);
  });
});

// ─── formatGameScore ─────────────────────────────────────────────────────────

describe('formatGameScore', () => {
  it('deve formatar pontuação string', () => {
    expect(formatGameScore('0')).toBe('0');
    expect(formatGameScore('15')).toBe('15');
    expect(formatGameScore('30')).toBe('30');
    expect(formatGameScore('40')).toBe('40');
    expect(formatGameScore('AD')).toBe('AD');
  });

  it('deve formatar pontuação numérica (tiebreak)', () => {
    expect(formatGameScore(0)).toBe('0');
    expect(formatGameScore(7)).toBe('7');
    expect(formatGameScore(10)).toBe('10');
  });

  it('deve retornar "—" para undefined', () => {
    expect(formatGameScore(undefined)).toBe('—');
  });
});

// ─── formatGameScoreLabel ────────────────────────────────────────────────────

describe('formatGameScoreLabel', () => {
  it('deve formatar placar do game', () => {
    expect(formatGameScoreLabel('30', '40')).toBe('30 — 40');
    expect(formatGameScoreLabel('AD', '40')).toBe('AD — 40');
  });

  it('deve usar "—" para undefined', () => {
    expect(formatGameScoreLabel(undefined, '0')).toBe('— — 0');
  });
});

// ─── formatPointTime ─────────────────────────────────────────────────────────

describe('formatPointTime', () => {
  it('deve retornar string de hora para timestamp válido', () => {
    const ts = new Date('2026-04-09T14:32:15').getTime();
    const result = formatPointTime(ts);
    expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it('deve retornar string vazia para 0 ou undefined', () => {
    expect(formatPointTime(0)).toBe('');
    expect(formatPointTime(undefined)).toBe('');
  });
});

// ─── summarizePoint ──────────────────────────────────────────────────────────

describe('summarizePoint', () => {
  it('deve resumir ace corretamente', () => {
    const pt = makeAce();
    const summary = summarizePoint(pt);
    expect(summary).toContain('Ace');
  });

  it('deve resumir dupla falta corretamente', () => {
    const pt = makeDoubleFault();
    const summary = summarizePoint(pt);
    expect(summary).toContain('Dupla Falta');
  });

  it('deve resumir winner de forehand', () => {
    const pt = makePoint({
      result: { winner: 'PLAYER_1', type: 'WINNER', finalShot: 'FOREHAND' },
    });
    const summary = summarizePoint(pt);
    expect(summary).toContain('Winner');
    expect(summary).toContain('Forehand');
  });

  it('deve resumir erro sem golpe final', () => {
    const pt = makePoint({ result: { winner: 'PLAYER_1', type: 'UNFORCED_ERROR' } });
    const summary = summarizePoint(pt);
    expect(summary).toContain('Erro Não Forçado');
  });
});
