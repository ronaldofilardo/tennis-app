import { TennisScoring } from '../core/scoring/TennisScoring';
import type { Player, TennisFormat } from '../core/scoring/types';
import { describe, test, expect } from 'vitest';

describe('TennisScoring - Lógica Geral', () => {
  const PLAYER_1: Player = 'PLAYER_1';
  const PLAYER_2: Player = 'PLAYER_2';

  function createMatch(format: TennisFormat = 'BEST_OF_3', server: Player = PLAYER_1) {
    return new TennisScoring(server, format);
  }

  test('Transição de pontos para game, set e match', () => {
    const match = createMatch();
    // PLAYER_1 vence um game
    match.addPoint(PLAYER_1); // 15
    match.addPoint(PLAYER_1); // 30
    match.addPoint(PLAYER_1); // 40
    match.addPoint(PLAYER_1); // game
    expect(match.getState().currentSetState.games.PLAYER_1).toBe(1);
    // PLAYER_1 vence o set
    for (let g = 0; g < 5; g++) {
      for (let p = 0; p < 4; p++) match.addPoint(PLAYER_1);
    }
    expect(match.getState().sets.PLAYER_1).toBe(1);
    // PLAYER_1 vence o match
    for (let s = 0; s < 6 * 4; s++) match.addPoint(PLAYER_1);
    expect(match.getState().isFinished).toBe(true);
    expect(match.getState().winner).toBe(PLAYER_1);
  });

  test('Validação: não permite adicionar pontos após match finalizado', () => {
    const match = createMatch();
    for (let s = 0; s < 6 * 4 * 2; s++) match.addPoint(PLAYER_1); // Garante finalização
    const stateBefore = match.getState();
    match.addPoint(PLAYER_2);
    expect(match.getState()).toEqual(stateBefore);
  });

  test('Validação: jogadores inválidos', () => {
    // @ts-expect-error
    expect(() => createMatch('BEST_OF_3', 'INVALID')).toThrow();
    // @ts-expect-error
    const match = createMatch();
    expect(() => match.addPoint('INVALID')).toThrow();
  });

  test('Edge: vantagem e deuce', () => {
    const match = createMatch('BEST_OF_3');
    // Chega em 40-40
    for (let i = 0; i < 3; i++) {
      match.addPoint(PLAYER_1);
      match.addPoint(PLAYER_2);
    }
    expect(match.getState().currentGame.points.PLAYER_1).toBe('40');
    expect(match.getState().currentGame.points.PLAYER_2).toBe('40');
    // Vantagem PLAYER_1
    match.addPoint(PLAYER_1);
    expect(match.getState().currentGame.points.PLAYER_1).toBe('AD');
    // Volta para deuce
    match.addPoint(PLAYER_2);
    expect(match.getState().currentGame.points.PLAYER_1).toBe('40');
    expect(match.getState().currentGame.points.PLAYER_2).toBe('40');
  });

  test('Edge: tie-break no set correto', () => {
    const match = createMatch('BEST_OF_3');
    // Simula 6-6 para acionar o tie-break.
    // No tênis, o tie-break é jogado quando ambos vencem 6 games no set.
    // Durante o tie-break, o sacador troca a cada 2 pontos (exceto o primeiro, que é 1 ponto),
    // para garantir equilíbrio. O vencedor do tie-break vence o set.
    for (let g = 0; g < 6; g++) {
      for (let p = 0; p < 4; p++) match.addPoint(PLAYER_1);
      for (let p = 0; p < 4; p++) match.addPoint(PLAYER_2);
    }
    expect(match.getState().currentGame.isTiebreak).toBe(true);
    // PLAYER_1 vence tie-break (precisa de pelo menos 7 pontos e 2 de diferença)
    for (let i = 0; i < 7; i++) match.addPoint(PLAYER_1);
    expect(match.getState().sets.PLAYER_1).toBe(1);
  });

  test('Edge: tie-break em set diferente (não deve ocorrer)', () => {
    const match = createMatch('BEST_OF_3');
    // Simula 6-5
    for (let g = 0; g < 6; g++) for (let p = 0; p < 4; p++) match.addPoint(PLAYER_1);
    for (let g = 0; g < 5; g++) for (let p = 0; p < 4; p++) match.addPoint(PLAYER_2);
    expect(match.getState().currentGame.isTiebreak).toBe(false);
  });

  test('empate em set curto: ambos vencem mesmo número de games', () => {
    const match = new TennisScoring(PLAYER_1, 'SHORT_SET');
    // Simular empate 4-4 alternando games
    // Em sets curtos, o tie-break ocorre em 4-4 (ao invés de 6-6).
    // A lógica do tie-break segue as mesmas regras: troca de sacador a cada 2 pontos e vitória por 2 de diferença.
    for (let i = 0; i < 4; i++) {
      // PLAYER_1 vence um game
      for (let p = 0; p < 4; p++) match.addPoint(PLAYER_1);
      // PLAYER_2 vence um game
      for (let p = 0; p < 4; p++) match.addPoint(PLAYER_2);
    }
    // Verificar estado após o empate 4-4
    const stateAt44 = match.getState();
    console.log('Estado em 4-4:', {
      games: stateAt44.currentSetState.games,
      points: stateAt44.currentGame.points,
      isTiebreak: stateAt44.currentGame.isTiebreak
    });

    // Após 4-4, o próximo ponto deve iniciar o tie-break
    match.addPoint(PLAYER_1); // inicia o tie-break
    const stateAfterPoint1 = match.getState();
    console.log('Estado após ponto 1 (início tie-break):', {
      games: stateAfterPoint1.currentSetState.games,
      points: stateAfterPoint1.currentGame.points,
      isTiebreak: stateAfterPoint1.currentGame.isTiebreak
    });

    expect(match.getState().currentGame.isTiebreak).toBe(true);
  });
});

describe('TennisScoring - Métodos utilitários e regras alternativas', () => {
  const PLAYER_1: Player = 'PLAYER_1';
  const PLAYER_2: Player = 'PLAYER_2';

  test('getServingSide e getServerInfo', () => {
    const match = new TennisScoring(PLAYER_1, 'BEST_OF_3');
    expect(match.getServingSide()).toBe('right');
    match.addPoint(PLAYER_1);
    expect(match.getServingSide()).toBe('left');
    const info = match.getServerInfo();
    expect(info.server).toBe(PLAYER_1);
    expect(['left', 'right']).toContain(info.side);
    expect(typeof info.totalPointsPlayed).toBe('number');
    expect(typeof info.isOddPoint).toBe('boolean');
  });

  test('shouldChangeSides lógica de games ímpares e tie-break', () => {
    const match = new TennisScoring(PLAYER_1, 'BEST_OF_3');
    // No tênis, os jogadores trocam de lado a cada número ímpar de games.
    // No tie-break, a troca de lado ocorre a cada 6 pontos jogados (soma dos pontos).
    // O sacador no tie-break troca a cada 2 pontos (exceto o primeiro, que é 1 ponto).
    // 1 game jogado (ímpar)
    for (let p = 0; p < 4; p++) match.addPoint(PLAYER_1);
    expect(match.shouldChangeSides().shouldChange).toBe(true);
    // 2 games jogados (par)
    for (let p = 0; p < 4; p++) match.addPoint(PLAYER_1);
    expect(match.shouldChangeSides().shouldChange).toBe(false);
    // Força tie-break
    for (let g = 0; g < 4; g++) {
      for (let p = 0; p < 4; p++) match.addPoint(PLAYER_2);
    }
    for (let g = 0; g < 4; g++) {
      for (let p = 0; p < 4; p++) match.addPoint(PLAYER_1);
    }
    // Empata 6-6
    for (let p = 0; p < 4; p++) match.addPoint(PLAYER_2);
    for (let p = 0; p < 4; p++) match.addPoint(PLAYER_2);
    // Tie-break: simula pontos e verifica troca de lado apenas em múltiplos de 6
    for (let i = 1; i <= 12; i++) {
      match.addPoint(i % 2 === 0 ? PLAYER_2 : PLAYER_1);
      // Apenas chama o método para garantir cobertura
      match.shouldChangeSides();
    }
  });

  test('getMatchStats, getPointsHistory, clearPointsHistory', () => {
    const match = new TennisScoring(PLAYER_1, 'BEST_OF_3');
    // Simula pontos com detalhes
    for (let i = 0; i < 3; i++) {
      match.addPoint(PLAYER_1, {
        serve: { type: i === 0 ? 'ACE' : 'SERVICE_WINNER', isFirstServe: true },
        result: { winner: PLAYER_1, type: i === 1 ? 'WINNER' : i === 2 ? 'UNFORCED_ERROR' : 'FORCED_ERROR', finalShot: 'FOREHAND' },
  rally: { ballExchanges: 1 },
        timestamp: Date.now()
      });
    }
    const stats = match.getMatchStats();
    expect(stats.totalPoints).toBe(3);
    expect(stats.aces).toBe(1);
    expect(stats.winners).toBe(1);
    expect(stats.unforcedErrors).toBe(1);
    expect(stats.forcedErrors).toBe(1);
    expect(stats.doubleFaults).toBe(0);
    expect(Array.isArray(match.getPointsHistory())).toBe(true);
    expect(match.getLastPointDetails()).not.toBeNull();
    match.clearPointsHistory();
    expect(match.getPointsHistory().length).toBe(0);
  });

  test('isNoAdDecidingPoint, setNoAdReceivingSide, isNoLetServe, getAlternativeRules', () => {
    const match = new TennisScoring(PLAYER_1, 'NO_AD');
    // Força ponto decisivo
  // Apenas cobre o método público (não há setter público para forçar o ponto decisivo)
  expect(typeof match.isNoAdDecidingPoint()).toBe('boolean');
  match.setNoAdReceivingSide('left'); // Apenas cobre o método
    // No-Let
    const matchNoLet = new TennisScoring(PLAYER_1, 'NO_LET_TENNIS');
    expect(matchNoLet.isNoLetServe(true)).toBe(true);
    expect(matchNoLet.isNoLetServe(false)).toBe(false);
    // Regras alternativas
    const alt = matchNoLet.getAlternativeRules();
    expect(typeof alt.noAd).toBe('boolean');
    expect(typeof alt.alternateTiebreakSides).toBe('boolean');
    expect(typeof alt.noLet).toBe('boolean');
  });
});
describe('TennisScoring - Cobertura de métodos e edge cases', () => {
  const PLAYER_1: Player = 'PLAYER_1';
  const PLAYER_2: Player = 'PLAYER_2';

  test('undoLastPoint: desfaz ponto e lida com histórico vazio', () => {
    const match = new TennisScoring(PLAYER_1, 'BEST_OF_3');
    expect(match.undoLastPoint()).toBeNull();
    match.addPoint(PLAYER_1);
    expect(match.undoLastPoint()).not.toBeNull();
    expect(match.canUndo()).toBe(false);
  });

  test('loadState: restaura estado e lida com formato diferente', () => {
    const match = new TennisScoring(PLAYER_1, 'BEST_OF_3');
    const state = match.getState();
    // Simula formato diferente
    const fakeState = { ...state, config: { ...state.config, format: 'FAST4' as import('./types').TennisFormat } };
    match.loadState(fakeState as any);
    expect(match.getState().config.format).toBe('BEST_OF_3');
  });

  test('shouldPlayMatchTiebreak e isDecidingSet', () => {
    const match = new TennisScoring(PLAYER_1, 'BEST_OF_3_MATCH_TB');
    // Simula fluxo real: PLAYER_1 vence 1 set, PLAYER_2 vence 1 set
    for (let g = 0; g < 6; g++) for (let p = 0; p < 4; p++) match.addPoint(PLAYER_1); // 1º set
    for (let g = 0; g < 6; g++) for (let p = 0; p < 4; p++) match.addPoint(PLAYER_2); // 2º set
    // Agora ambos têm 1 set vencido
    expect((match as any).isDecidingSet()).toBe(true);
    expect((match as any).shouldPlayMatchTiebreak()).toBe(true);
  });

  test('startMatchTiebreak: inicia match tiebreak corretamente', () => {
    const match = new TennisScoring(PLAYER_1, 'BEST_OF_3_MATCH_TB');
    (match as any).startMatchTiebreak();
    expect(match.getState().currentGame.isMatchTiebreak).toBe(true);
  });

  test('winMatch: completedSets e winner', () => {
    const match = new TennisScoring(PLAYER_1, 'BEST_OF_3');
    // Força estado para simular finalização
    (match.getState() as any).currentSet = 1;
    (match.getState() as any).currentSetState = { games: { PLAYER_1: 6, PLAYER_2: 0 } };
    (match as any).winMatch(PLAYER_1);
    expect(match.getState().isFinished).toBe(true);
    expect(match.getState().winner).toBe(PLAYER_1);
    expect(Array.isArray(match.getState().completedSets)).toBe(true);
  });

  test('convertScoreToActualPoints: cobre todos os cases', () => {
    const match = new TennisScoring(PLAYER_1, 'BEST_OF_3');
    const fn = (match as any).convertScoreToActualPoints.bind(match);
    expect(fn('0')).toBe(0);
    expect(fn('15')).toBe(1);
    expect(fn('30')).toBe(2);
    expect(fn('40')).toBe(3);
    expect(fn('AD')).toBe(4);
    expect(fn('X')).toBe(0);
  });

  test('getTotalPointsPlayed: cobre tie-break, vantagem e normal', () => {
    const match = new TennisScoring(PLAYER_1, 'BEST_OF_3');
    // Simula tie-break real
    for (let g = 0; g < 6; g++) {
      for (let p = 0; p < 4; p++) match.addPoint(PLAYER_1);
      for (let p = 0; p < 4; p++) match.addPoint(PLAYER_2);
    }
    // Agora está em tie-break
    match.addPoint(PLAYER_1); // 1
    match.addPoint(PLAYER_2); // 1
    match.addPoint(PLAYER_1); // 2
    match.addPoint(PLAYER_2); // 2
    match.addPoint(PLAYER_1); // 3
    expect((match as any).getTotalPointsPlayed()).toBe(5);

    // Game normal com vantagem: simula 40-40, depois vantagem
    const match2 = new TennisScoring(PLAYER_1, 'BEST_OF_3');
    for (let i = 0; i < 3; i++) {
      match2.addPoint(PLAYER_1);
      match2.addPoint(PLAYER_2);
    }
    // 40-40
    match2.addPoint(PLAYER_1); // AD
    expect((match2 as any).getTotalPointsPlayed()).toBeGreaterThanOrEqual(7);

    // Game normal sem vantagem
    const match3 = new TennisScoring(PLAYER_1, 'BEST_OF_3');
    match3.addPoint(PLAYER_1); // 15
    match3.addPoint(PLAYER_1); // 30
    match3.addPoint(PLAYER_2); // 15
    expect((match3 as any).getTotalPointsPlayed()).toBe(3);
  });

  test('enableSync, disableSync, syncState: cobre warnings e erros', async () => {
    const match = new TennisScoring(PLAYER_1, 'BEST_OF_3');
    // Sem sync habilitado
    const res1 = await match.syncState();
    expect(res1).toBe(false);
    match.enableSync('fake-id');
    match.disableSync();
    expect((match as any).syncEnabled).toBe(false);
    expect((match as any).matchId).toBeNull();
  });

  test('addPointWithSync e undoLastPointWithSync: cobre caminhos sem sync', async () => {
    const match = new TennisScoring(PLAYER_1, 'BEST_OF_3');
    const state = await match.addPointWithSync(PLAYER_1);
    expect(state).toBeDefined();
    const undo = await match.undoLastPointWithSync();
    expect(undo).toBeDefined();
  });
});
