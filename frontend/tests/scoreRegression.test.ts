// tests/scoreRegression.test.ts
// Testes de regressão para os 3 bugs de pontuação "voltando":
//   BUG #1: swipe-down threshold aumentado para 80px (PlayerCard)
//   BUG #2: handlePointDetailsConfirm sem result → não crashava, mas podia chamar addPoint sem result
//   BUG #3: undoLastPoint não revertia pointsHistory → stats incorretos após undo

import { describe, it, expect } from 'vitest';
import { TennisScoring } from '../src/core/scoring/TennisScoring';
import type { Player } from '../src/core/scoring/types';

const P1: Player = 'PLAYER_1';
const P2: Player = 'PLAYER_2';

// ─────────────────────────────────────────────────────────────
// BUG #3 — undoLastPoint deve reverter pointsHistory
// ─────────────────────────────────────────────────────────────
describe('BUG #3 — undoLastPoint reverte pointsHistory e mantém stats consistentes', () => {
  it('após undo, pointsHistory não deve conter o ponto desfeito', () => {
    const match = new TennisScoring(P1);

    // Arrange: marca 1 ponto com detalhes
    match.addPoint(P1, {
      serve: { type: 'ACE', isFirstServe: true },
      result: { winner: P1, type: 'WINNER', finalShot: 'FOREHAND' },
      rally: { ballExchanges: 1 },
      timestamp: Date.now(),
    });

    // Act: desfaz
    match.undoLastPoint();

    // Assert: histórico de pontos deve estar vazio
    expect(match.getPointsHistory()).toHaveLength(0);
    expect(match.getLastPointDetails()).toBeNull();
  });

  it('stats após undo refletem o estado antes do ponto desfeito', () => {
    const match = new TennisScoring(P1);

    match.addPoint(P1, {
      serve: { type: 'ACE', isFirstServe: true },
      result: { winner: P1, type: 'WINNER', finalShot: 'FOREHAND' },
      rally: { ballExchanges: 1 },
      timestamp: Date.now(),
    });

    // Antes do undo: 1 ace
    expect(match.getMatchStats().aces).toBe(1);
    expect(match.getMatchStats().totalPoints).toBe(1);

    match.undoLastPoint();

    // Após undo: stats zeradas
    expect(match.getMatchStats().aces).toBe(0);
    expect(match.getMatchStats().totalPoints).toBe(0);
    expect(match.getMatchStats().winners).toBe(0);
  });

  it('undo sem detalhes (addPoint sem details) não faz pop extra de pointsHistory', () => {
    const match = new TennisScoring(P1);

    // Primeiro ponto com detalhes
    match.addPoint(P1, {
      serve: { type: 'ACE', isFirstServe: true },
      result: { winner: P1, type: 'WINNER' },
      rally: { ballExchanges: 1 },
      timestamp: Date.now(),
    });

    // Segundo ponto sem detalhes
    match.addPoint(P2);

    expect(match.getPointsHistory()).toHaveLength(1);

    // Desfaz o 2º ponto (que não tinha detalhes)
    match.undoLastPoint();
    // pointsHistory deve continuar com 1 entrada (do 1º ponto)
    expect(match.getPointsHistory()).toHaveLength(1);

    // Desfaz o 1º ponto (que tinha detalhes)
    match.undoLastPoint();
    expect(match.getPointsHistory()).toHaveLength(0);
  });

  it('múltiplos undos revertam pointsHistory corretamente na ordem certa', () => {
    const match = new TennisScoring(P1);
    const ts = Date.now();

    match.addPoint(P1, {
      serve: { type: 'ACE', isFirstServe: true },
      result: { winner: P1, type: 'WINNER' },
      rally: { ballExchanges: 1 },
      timestamp: ts,
    });
    match.addPoint(P2, {
      serve: { type: 'DOUBLE_FAULT', isFirstServe: false },
      result: { winner: P1, type: 'FORCED_ERROR' },
      rally: { ballExchanges: 1 },
      timestamp: ts + 1,
    });

    expect(match.getMatchStats().totalPoints).toBe(2);
    expect(match.getMatchStats().aces).toBe(1);
    expect(match.getMatchStats().doubleFaults).toBe(1);

    match.undoLastPoint();

    expect(match.getMatchStats().totalPoints).toBe(1);
    expect(match.getMatchStats().doubleFaults).toBe(0);
    expect(match.getMatchStats().aces).toBe(1); // primeiro ponto ainda presente

    match.undoLastPoint();

    expect(match.getMatchStats().totalPoints).toBe(0);
    expect(match.getMatchStats().aces).toBe(0);
  });

  it('undo não afeta o estado do jogo quando histórico está vazio', () => {
    const match = new TennisScoring(P1);
    const result = match.undoLastPoint();
    expect(result).toBeNull();
    expect(match.getPointsHistory()).toHaveLength(0);
  });

  it('após undo o score do game volta ao ponto anterior', () => {
    const match = new TennisScoring(P1);

    match.addPoint(P1); // 15-0
    match.addPoint(P1); // 30-0

    expect(match.getState().currentGame.points.PLAYER_1).toBe('30');

    match.undoLastPoint(); // volta para 15-0

    expect(match.getState().currentGame.points.PLAYER_1).toBe('15');
    expect(match.getState().currentGame.points.PLAYER_2).toBe('0');
  });

  it('após undo no 40 o score volta para 30 (cenário reportado)', () => {
    const match = new TennisScoring(P1);

    match.addPoint(P1); // 15-0
    match.addPoint(P1); // 30-0
    match.addPoint(P1); // 40-0

    expect(match.getState().currentGame.points.PLAYER_1).toBe('40');

    match.undoLastPoint(); // volta para 30-0

    expect(match.getState().currentGame.points.PLAYER_1).toBe('30');
  });
});

// ─────────────────────────────────────────────────────────────
// BUG #2 — addPoint com result definido não deve crashar em recordPointDetails
// ─────────────────────────────────────────────────────────────
describe('BUG #2 — addPoint com serve + result completo funciona corretamente', () => {
  it('addPoint com serve e result registra ponto sem lançar exceção', () => {
    const match = new TennisScoring(P1);

    expect(() => {
      match.addPoint(P1, {
        serve: { isFirstServe: true },
        result: { winner: P1, type: 'WINNER' },
        rally: { ballExchanges: 1 },
        timestamp: Date.now(),
      });
    }).not.toThrow();

    expect(match.getState().currentGame.points.PLAYER_1).toBe('15');
    expect(match.getPointsHistory()).toHaveLength(1);
  });

  it('addPoint com serve + result avança o placar normalmente (0→15→30→40)', () => {
    const match = new TennisScoring(P1);
    const baseDetails = {
      serve: { isFirstServe: true },
      result: { winner: P1, type: 'WINNER' as const },
      rally: { ballExchanges: 1 },
      timestamp: Date.now(),
    };

    match.addPoint(P1, baseDetails);
    expect(match.getState().currentGame.points.PLAYER_1).toBe('15');

    match.addPoint(P1, baseDetails);
    expect(match.getState().currentGame.points.PLAYER_1).toBe('30');

    match.addPoint(P1, baseDetails);
    expect(match.getState().currentGame.points.PLAYER_1).toBe('40');

    // Após 40 com game ganho o game counter sobe
    match.addPoint(P1, baseDetails);
    expect(match.getState().currentSetState.games.PLAYER_1).toBe(1);
    expect(match.getState().currentGame.points.PLAYER_1).toBe('0');
  });

  it('pointsHistory cresce corretamente a cada addPoint com details', () => {
    const match = new TennisScoring(P1);
    const details = {
      serve: { isFirstServe: true },
      result: { winner: P1, type: 'WINNER' as const },
      rally: { ballExchanges: 1 },
      timestamp: Date.now(),
    };

    match.addPoint(P1, details);
    expect(match.getPointsHistory()).toHaveLength(1);

    match.addPoint(P1, details);
    expect(match.getPointsHistory()).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────
// BUG #1 — Validação indireta: swipe-down requer confirmação
// (Testado no nível de lógica de undo: score NÃO deve voltar sem handleUndo ser chamado)
// ─────────────────────────────────────────────────────────────
describe('BUG #1 — Undo acidental: score não retrocede sem ação explícita de undo', () => {
  it('addPoint nunca reverte pontuação por si só (sem undo)', () => {
    const match = new TennisScoring(P1);
    match.addPoint(P1); // 15
    match.addPoint(P1); // 30
    match.addPoint(P1); // 40

    // Simula outro addPoint (não deve regredir para 30)
    match.addPoint(P2); // 40-15

    expect(match.getState().currentGame.points.PLAYER_1).toBe('40');
    expect(match.getState().currentGame.points.PLAYER_2).toBe('15');
  });

  it('múltiplos pontos seguidos acumulam corretamente sem regressão', () => {
    const match = new TennisScoring(P1);

    // Sequência rápida de pontos (simula cliques rápidos em mobile)
    match.addPoint(P1);
    match.addPoint(P1);
    match.addPoint(P1);
    match.addPoint(P2); // adversário marca
    match.addPoint(P1);

    // P1 ganhou o game (4 pontos com lead)
    expect(match.getState().currentSetState.games.PLAYER_1).toBe(1);
    expect(match.getState().currentSetState.games.PLAYER_2).toBe(0);
  });

  it('undoLastPoint chamado uma vez retrocede exatamente 1 ponto', () => {
    const match = new TennisScoring(P1);

    match.addPoint(P1); // 15
    match.addPoint(P1); // 30

    match.undoLastPoint(); // deve voltar apenas 1 ponto → 15

    // Deve ter voltado para 15, não para 0
    expect(match.getState().currentGame.points.PLAYER_1).toBe('15');
    expect(match.canUndo()).toBe(true); // ainda pode desfazer o primeiro ponto
  });
});
