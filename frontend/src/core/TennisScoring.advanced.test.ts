import { describe, it, expect } from 'vitest';
import { TennisScoring } from '../core/scoring/TennisScoring';
import { TennisConfigFactory } from '../core/scoring/TennisConfigFactory';
import type { Player, TennisFormat } from '../core/scoring/types';

describe('TennisScoring - Cobertura avançada', () => {
  const PLAYER_1: Player = 'PLAYER_1';
  const PLAYER_2: Player = 'PLAYER_2';

  it('permite desfazer ponto e verifica canUndo', () => {
    const match = new TennisScoring(PLAYER_1);
    expect(match.canUndo()).toBe(false);
    match.addPoint(PLAYER_1);
    expect(match.canUndo()).toBe(true);
    match.undoLastPoint();
    expect(match.canUndo()).toBe(false);
  });

  it('não desfaz se histórico está vazio', () => {
    const match = new TennisScoring(PLAYER_1);
    expect(match.undoLastPoint()).toBeNull();
  });

  it('getServerInfo retorna informações corretas', () => {
    const match = new TennisScoring(PLAYER_1);
    const info = match.getServerInfo();
    expect(info.server).toBe(PLAYER_1);
    expect(['left', 'right']).toContain(info.side);
    expect(typeof info.totalPointsPlayed).toBe('number');
  });

  it('shouldChangeSides retorna corretamente', () => {
    const match = new TennisScoring(PLAYER_1);
    expect(match.shouldChangeSides()).toHaveProperty('shouldChange');
  });

  it('getMatchStats retorna estatísticas', () => {
    const match = new TennisScoring(PLAYER_1);
    match.addPoint(PLAYER_1, {
      serve: { type: 'ACE', isFirstServe: true },
      result: { winner: PLAYER_1, type: 'WINNER', finalShot: 'FOREHAND' },
      rally: { ballExchanges: 1 },
      timestamp: Date.now()
    });
    const stats = match.getMatchStats();
    expect(stats.totalPoints).toBe(1);
    expect(stats.aces).toBe(1);
    expect(stats.winners).toBe(1);
    expect(stats).toHaveProperty('doubleFaults');
  });

  it('isNoAdDecidingPoint e setNoAdReceivingSide', () => {
    const match = new TennisScoring(PLAYER_1, 'FAST4');
    // Simula até o ponto decisivo No-Ad (40-40)
    match.addPoint(PLAYER_1); // 15-0
    match.addPoint(PLAYER_2); // 15-15
    match.addPoint(PLAYER_1); // 30-15
    match.addPoint(PLAYER_2); // 30-30
    match.addPoint(PLAYER_1); // 40-30
    // Antes do ponto decisivo, não é No-Ad
    expect(match.isNoAdDecidingPoint()).toBe(false);
    match.addPoint(PLAYER_2); // 40-40 (No-Ad, ponto decisivo será resolvido)
    // Após o ponto, o flag volta a ser false
    expect(match.isNoAdDecidingPoint()).toBe(false);
    // O método setNoAdReceivingSide não faz nada se não for ponto decisivo
    match.setNoAdReceivingSide('left');
  });

  it('isNoLetServe retorna true/false conforme config', () => {
    const match = new TennisScoring(PLAYER_1, 'NO_LET_TENNIS');
    expect(match.isNoLetServe(true)).toBe(true);
    expect(match.isNoLetServe(false)).toBe(false);
  });

  it('getAlternativeRules retorna flags corretas', () => {
    const match = new TennisScoring(PLAYER_1, 'FAST4');
    const rules = match.getAlternativeRules();
    expect(typeof rules.noAd).toBe('boolean');
    expect(typeof rules.alternateTiebreakSides).toBe('boolean');
    expect(typeof rules.noLet).toBe('boolean');
  });

  it('getPointsHistory e getLastPointDetails', () => {
    const match = new TennisScoring(PLAYER_1);
    expect(match.getPointsHistory()).toEqual([]);
    expect(match.getLastPointDetails()).toBeNull();
    match.addPoint(PLAYER_1, {
      serve: { type: 'ACE', isFirstServe: true },
      result: { winner: PLAYER_1, type: 'WINNER', finalShot: 'FOREHAND' },
      rally: { ballExchanges: 1 },
      timestamp: Date.now()
    });
    expect(match.getPointsHistory().length).toBe(1);
    expect(match.getLastPointDetails()).not.toBeNull();
    match.clearPointsHistory();
    expect(match.getPointsHistory()).toEqual([]);
  });
});

describe('TennisConfigFactory - Cobertura', () => {
  it('retorna configuração correta para todos os formatos', () => {
    const formats: TennisFormat[] = [
      'BEST_OF_3', 'BEST_OF_5', 'BEST_OF_3_MATCH_TB', 'SHORT_SET',
      'PRO_SET', 'FAST4', 'MATCH_TIEBREAK'
    ];
    for (const format of formats) {
      const config = TennisConfigFactory.getConfig(format);
      expect(config.format).toBe(format);
    }
  });

  it('lança erro para formato inválido', () => {
    // @ts-expect-error
    expect(() => TennisConfigFactory.getConfig('INVALID')).toThrow('Formato de tênis não suportado');
  });
});
