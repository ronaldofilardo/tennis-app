import { describe, it, expect } from 'vitest';
import { TennisConfigFactory } from '../core/scoring/TennisConfigFactory';
import type { TennisFormat } from '../core/scoring/types';

describe('TennisConfigFactory - Cobertura detalhada', () => {
  it('retorna configs corretas para cada formato', () => {
    const expectedConfigs = {
      BEST_OF_3: {
        setsToWin: 2, gamesPerSet: 6, useAdvantage: true, useTiebreak: true, tiebreakAt: 6, tiebreakPoints: 7, useNoAd: false, useAlternateTiebreakSides: false, useNoLet: false
      },
      BEST_OF_5: {
        setsToWin: 3, gamesPerSet: 6, useAdvantage: true, useTiebreak: true, tiebreakAt: 6, tiebreakPoints: 7, useNoAd: false, useAlternateTiebreakSides: false, useNoLet: false
      },
      SINGLE_SET: {
        setsToWin: 1, gamesPerSet: 6, useAdvantage: true, useTiebreak: true, tiebreakAt: 6, tiebreakPoints: 7, useNoAd: false, useAlternateTiebreakSides: false, useNoLet: false
      },
      PRO_SET: {
        setsToWin: 1, gamesPerSet: 8, useAdvantage: true, useTiebreak: true, tiebreakAt: 8, tiebreakPoints: 7, useNoAd: false, useAlternateTiebreakSides: false, useNoLet: false
      },
      MATCH_TIEBREAK: {
        setsToWin: 1, gamesPerSet: 0, useAdvantage: false, useTiebreak: true, tiebreakAt: 0, tiebreakPoints: 10, useNoAd: false, useAlternateTiebreakSides: false, useNoLet: false
      },
      SHORT_SET: {
        setsToWin: 1, gamesPerSet: 4, useAdvantage: true, useTiebreak: true, tiebreakAt: 4, tiebreakPoints: 7, useNoAd: false, useAlternateTiebreakSides: false, useNoLet: false
      },
      NO_AD: {
        setsToWin: 2, gamesPerSet: 6, useAdvantage: false, useTiebreak: true, tiebreakAt: 6, tiebreakPoints: 7, useNoAd: true, useAlternateTiebreakSides: false, useNoLet: false
      },
      FAST4: {
        setsToWin: 1, gamesPerSet: 4, useAdvantage: false, useTiebreak: true, tiebreakAt: 3, tiebreakPoints: 7, useNoAd: true, useAlternateTiebreakSides: false, useNoLet: false
      },
      BEST_OF_3_MATCH_TB: {
        setsToWin: 2, gamesPerSet: 6, useAdvantage: true, useTiebreak: true, tiebreakAt: 6, tiebreakPoints: 10, useNoAd: false, useAlternateTiebreakSides: false, useNoLet: false
      },
      SHORT_SET_NO_AD: {
        setsToWin: 1, gamesPerSet: 4, useAdvantage: false, useTiebreak: true, tiebreakAt: 4, tiebreakPoints: 7, useNoAd: true, useAlternateTiebreakSides: false, useNoLet: false
      },
      NO_LET_TENNIS: {
        setsToWin: 2, gamesPerSet: 6, useAdvantage: true, useTiebreak: true, tiebreakAt: 6, tiebreakPoints: 7, useNoAd: false, useAlternateTiebreakSides: false, useNoLet: true
      }
    };
    (Object.keys(expectedConfigs) as TennisFormat[]).forEach(format => {
      const config = TennisConfigFactory.getConfig(format);
      const expected = expectedConfigs[format];
      expect(config.format).toBe(format);
      expect(config.setsToWin).toBe(expected.setsToWin);
      expect(config.gamesPerSet).toBe(expected.gamesPerSet);
      expect(config.useAdvantage).toBe(expected.useAdvantage);
      expect(config.useTiebreak).toBe(expected.useTiebreak);
      expect(config.tiebreakAt).toBe(expected.tiebreakAt);
      expect(config.tiebreakPoints).toBe(expected.tiebreakPoints);
      expect(config.useNoAd).toBe(expected.useNoAd);
      expect(config.useAlternateTiebreakSides).toBe(expected.useAlternateTiebreakSides);
      expect(config.useNoLet).toBe(expected.useNoLet);
    });
  });

  it('getFormatDisplayName cobre todos os formatos', () => {
    const formats: TennisFormat[] = [
      'BEST_OF_3', 'BEST_OF_5', 'SINGLE_SET', 'PRO_SET', 'MATCH_TIEBREAK',
      'SHORT_SET', 'NO_AD', 'FAST4', 'BEST_OF_3_MATCH_TB', 'SHORT_SET_NO_AD', 'NO_LET_TENNIS'
    ];
    for (const format of formats) {
      const name = TennisConfigFactory.getFormatDisplayName(format);
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it('getFormatDetailedName cobre todos os formatos', () => {
    const formats: TennisFormat[] = [
      'BEST_OF_3', 'BEST_OF_5', 'SINGLE_SET', 'PRO_SET', 'MATCH_TIEBREAK',
      'SHORT_SET', 'NO_AD', 'FAST4', 'BEST_OF_3_MATCH_TB', 'SHORT_SET_NO_AD', 'NO_LET_TENNIS'
    ];
    for (const format of formats) {
      const name = TennisConfigFactory.getFormatDetailedName(format);
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it('retorna o próprio formato se display/detailed for desconhecido', () => {
    // @ts-expect-error
    expect(TennisConfigFactory.getFormatDisplayName('FAKE_FORMAT')).toBe('FAKE_FORMAT');
    // @ts-expect-error
    expect(TennisConfigFactory.getFormatDetailedName('FAKE_FORMAT')).toBe('FAKE_FORMAT');
  });

  it('lança erro para formato inválido em getConfig', () => {
    // @ts-expect-error
    expect(() => TennisConfigFactory.getConfig('FORMATO_INVALIDO')).toThrow('Formato de tênis não suportado: FORMATO_INVALIDO');
  });

  it('getFormatDisplayName retorna nome correto para todos os formatos e valor não mapeado', () => {
    const formatos: TennisFormat[] = [
      'BEST_OF_3', 'BEST_OF_5', 'SINGLE_SET', 'PRO_SET', 'MATCH_TIEBREAK',
      'SHORT_SET', 'NO_AD', 'FAST4', 'BEST_OF_3_MATCH_TB', 'SHORT_SET_NO_AD', 'NO_LET_TENNIS'
    ];
    const nomesEsperados = {
      BEST_OF_3: 'Melhor de 3 sets',
      BEST_OF_5: 'Melhor de 5 sets',
      SINGLE_SET: 'Set único',
      PRO_SET: 'Pro Set (8 games)',
      MATCH_TIEBREAK: 'Match Tiebreak (10 pontos)',
      SHORT_SET: 'Set curto (4 games)',
      NO_AD: 'Sem vantagem',
      FAST4: 'Fast4 Tennis',
      BEST_OF_3_MATCH_TB: 'Melhor de 3 c/ Match TB',
      SHORT_SET_NO_AD: 'Set curto No-Ad',
      NO_LET_TENNIS: 'Tênis No-Let'
    };
    formatos.forEach(f => {
      expect(TennisConfigFactory.getFormatDisplayName(f)).toBe(nomesEsperados[f]);
    });
    // Valor não mapeado
    // @ts-expect-error
    expect(TennisConfigFactory.getFormatDisplayName('FORMATO_X')).toBe('FORMATO_X');
  });

  it('getFormatDetailedName retorna descrição correta para todos os formatos e valor não mapeado', () => {
    const formatos: TennisFormat[] = [
      'BEST_OF_3', 'BEST_OF_5', 'SINGLE_SET', 'PRO_SET', 'MATCH_TIEBREAK',
      'SHORT_SET', 'NO_AD', 'FAST4', 'BEST_OF_3_MATCH_TB', 'SHORT_SET_NO_AD', 'NO_LET_TENNIS'
    ];
    const descricoesEsperadas = {
      BEST_OF_3: 'Melhor de 3 sets com vantagem, Set tie-break em todos os sets',
      BEST_OF_5: 'Melhor de 5 sets com vantagem, Set tie-break em todos os sets',
      SINGLE_SET: 'Set único com vantagem, Set tie-break em 6-6',
      PRO_SET: 'Pro Set (8 games) com vantagem, Set tie-break em 8-8',
      MATCH_TIEBREAK: 'Match Tiebreak (10 pontos) sem vantagem, Primeiro a 10',
      SHORT_SET: 'Set curto (4 games) com vantagem, Tie-break em 4-4',
      NO_AD: 'Melhor de 3 sets método No-Ad (ponto decisivo em 40-40), Set tie-break em 6-6',
      FAST4: 'Fast4 Tennis (4 games) método No-Ad, Tie-break em 3-3',
      BEST_OF_3_MATCH_TB: 'Melhor de 3 sets com vantagem, Set tie-break em 6-6, Match tie-break no 3º set',
      SHORT_SET_NO_AD: 'Set curto (4 games) método No-Ad, Tie-break em 4-4',
      NO_LET_TENNIS: 'Melhor de 3 sets método No-Let (saque na rede está em jogo)'
    };
    formatos.forEach(f => {
      expect(TennisConfigFactory.getFormatDetailedName(f)).toBe(descricoesEsperadas[f]);
    });
    // Valor não mapeado
    // @ts-expect-error
    expect(TennisConfigFactory.getFormatDetailedName('FORMATO_X')).toBe('FORMATO_X');
  });

  it('retorna o próprio valor para null/undefined em getFormatDisplayName e getFormatDetailedName', () => {
    // @ts-expect-error
    expect(TennisConfigFactory.getFormatDisplayName(undefined)).toBe(undefined);
    // @ts-expect-error
    expect(TennisConfigFactory.getFormatDisplayName(null)).toBe(null);
    // @ts-expect-error
    expect(TennisConfigFactory.getFormatDetailedName(undefined)).toBe(undefined);
    // @ts-expect-error
    expect(TennisConfigFactory.getFormatDetailedName(null)).toBe(null);
  });

  it('lança erro para null/undefined em getConfig', () => {
    // @ts-expect-error
    expect(() => TennisConfigFactory.getConfig(undefined)).toThrow();
    // @ts-expect-error
    expect(() => TennisConfigFactory.getConfig(null)).toThrow();
  });
});
