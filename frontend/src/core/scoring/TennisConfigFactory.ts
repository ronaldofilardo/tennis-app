// src/core/scoring/TennisConfigFactory.ts
import type { TennisConfig, TennisFormat } from './types';

/**
 * Configuração base para todos os formatos de tênis.
 * Valores padrão que são mais comumente usados.
 */
const baseConfig: Omit<TennisConfig, 'format'> = {
  setsToWin: 2,
  gamesPerSet: 6,
  useAdvantage: true,
  useTiebreak: true,
  tiebreakAt: 6,
  tiebreakPoints: 7,
  useNoAd: false,
  useAlternateTiebreakSides: false,
  useNoLet: false
};

interface FormatDefinition {
  config: Partial<Omit<TennisConfig, 'format'>>;
  displayName: string;
  detailedName: string;
}

/**
 * Mapa de definições de formatos de tênis.
 * Cada formato contém suas configurações específicas (apenas o que difere do padrão),
 * nome de exibição e descrição detalhada.
 */
const formatDefinitions: Record<TennisFormat, FormatDefinition> = {
  'BEST_OF_3': {
    config: {},  // Usa configuração base
    displayName: 'Melhor de 3 sets',
    detailedName: 'Melhor de 3 sets com vantagem, Set tie-break em todos os sets'
  },
  'BEST_OF_5': {
    config: { setsToWin: 3 },
    displayName: 'Melhor de 5 sets',
    detailedName: 'Melhor de 5 sets com vantagem, Set tie-break em todos os sets'
  },
  'SINGLE_SET': {
    config: { setsToWin: 1 },
    displayName: 'Set único',
    detailedName: 'Set único com vantagem, Set tie-break em 6-6'
  },
  'PRO_SET': {
    config: { 
      setsToWin: 1, 
      gamesPerSet: 8, 
      tiebreakAt: 8 
    },
    displayName: 'Pro Set (8 games)',
    detailedName: 'Pro Set (8 games) com vantagem, Set tie-break em 8-8'
  },
  'MATCH_TIEBREAK': {
    config: {
      setsToWin: 1,
      gamesPerSet: 0,
      useAdvantage: false,
      tiebreakAt: 0,
      tiebreakPoints: 10
    },
    displayName: 'Match Tiebreak (10 pontos)',
    detailedName: 'Match Tiebreak (10 pontos) sem vantagem, Primeiro a 10'
  },
  'SHORT_SET': {
    config: {
      setsToWin: 1,
      gamesPerSet: 4,
      tiebreakAt: 4
    },
    displayName: 'Set curto (4 games)',
    detailedName: 'Set curto (4 games) com vantagem, Tie-break em 4-4'
  },
  'NO_AD': {
    config: {
      useAdvantage: false,
      useNoAd: true
    },
    displayName: 'Sem vantagem',
    detailedName: 'Melhor de 3 sets método No-Ad (ponto decisivo em 40-40), Set tie-break em 6-6'
  },
  'FAST4': {
    config: {
      setsToWin: 1,
      gamesPerSet: 4,
      useAdvantage: false,
      tiebreakAt: 3,
      useNoAd: true
    },
    displayName: 'Fast4 Tennis',
    detailedName: 'Fast4 Tennis (4 games) método No-Ad, Tie-break em 3-3'
  },
  'BEST_OF_3_MATCH_TB': {
    config: {
      tiebreakPoints: 10
    },
    displayName: 'Melhor de 3 c/ Match TB',
    detailedName: 'Melhor de 3 sets com vantagem, Set tie-break em 6-6, Match tie-break no 3º set'
  },
  'SHORT_SET_NO_AD': {
    config: {
      setsToWin: 1,
      gamesPerSet: 4,
      useAdvantage: false,
      tiebreakAt: 4,
      useNoAd: true
    },
    displayName: 'Set curto No-Ad',
    detailedName: 'Set curto (4 games) método No-Ad, Tie-break em 4-4'
  },
  'NO_LET_TENNIS': {
    config: {
      useNoLet: true
    },
    displayName: 'Tênis No-Let',
    detailedName: 'Melhor de 3 sets método No-Let (saque na rede está em jogo)'
  }
};

export class TennisConfigFactory {
  /**
   * Retorna a configuração completa para o formato especificado.
   * @throws {Error} Se o formato não for suportado
   */
  static getConfig(format: TennisFormat): TennisConfig {
    const definition = formatDefinitions[format];
    if (!definition) {
      throw new Error(`Formato de tênis não suportado: ${format}`);
    }

    return {
      format,
      ...baseConfig,
      ...definition.config
    };
  }

  /**
   * Retorna o nome de exibição do formato especificado.
   */
  static getFormatDisplayName(format: TennisFormat): string {
    return formatDefinitions[format]?.displayName ?? format;
  }

  /**
   * Retorna a descrição detalhada do formato especificado.
   */
  static getFormatDetailedName(format: TennisFormat): string {
    return formatDefinitions[format]?.detailedName ?? format;
  }

  /**
   * Verifica se o formato especificado é suportado.
   */
  static isValidFormat(format: unknown): format is TennisFormat {
    return typeof format === 'string' && format in formatDefinitions;
  }
}