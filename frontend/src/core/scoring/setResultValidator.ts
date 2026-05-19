import type { TennisFormat, Player } from './types';

/**
 * Resultado de um set digitado pelo usuário (ex: "6x4" ou "7x6")
 */
export interface SetResult {
  p1Games: number;
  p2Games: number;
}

/**
 * Validação do resultado do set
 */
export interface SetValidation {
  isValid: boolean;
  error?: string;
  winner?: 'PLAYER_1' | 'PLAYER_2';
  hasTiebreak?: boolean;
}

/**
 * Valida se um resultado de set é válido de acordo com as regras do tênis
 * @param result Resultado do set (ex: {p1Games: 6, p2Games: 4})
 * @param format Formato do jogo
 * @returns Validação contendo se é válido e quem venceu
 */
export function validateSetResult(result: SetResult, format: TennisFormat): SetValidation {
  const { p1Games, p2Games } = result;

  // Validações básicas
  if (p1Games < 0 || p2Games < 0) {
    return { isValid: false, error: 'Games não podem ser negativos' };
  }

  if (p1Games === 0 && p2Games === 0) {
    return { isValid: false, error: 'Digite o resultado do set' };
  }

  // Máximo de games por set (considerando jogos normais + tiebreak)
  const maxGames = getMaxGamesForFormat(format);

  // Determina se há tiebreak baseado no format
  const hasTiebreak = shouldHaveTiebreak(format);
  const tiebreakAt = getTiebreakAtForFormat(format);

  // Validar resultado baseado no tipo de jogo
  switch (format) {
    case 'SINGLE_SET':
    case 'NO_AD':
    case 'NO_LET_TENNIS':
      // Set único: primeiro a 4 ou 6 games com vantagem de 2
      return validateStandardSet(p1Games, p2Games, 4, true, hasTiebreak);

    case 'SHORT_SET':
    case 'SHORT_SET_NO_AD':
      // Set curto: primeiro a 4 games
      return validateStandardSet(p1Games, p2Games, 4, false, hasTiebreak);

    case 'FAST4':
      // Fast4: 4 games sem deuce, tiebreak em 3-3
      return validateFast4Set(p1Games, p2Games);

    case 'PRO_SET':
      // Pro Set: primeiro a 8 games com vantagem de 2
      return validateStandardSet(p1Games, p2Games, 8, true, hasTiebreak);

    case 'MATCH_TIEBREAK':
      // Match Tiebreak: não é um set tradicional, é um super tiebreak
      return validateMatchTiebreak(p1Games, p2Games);

    case 'BEST_OF_3':
    case 'BEST_OF_5':
    case 'BEST_OF_3_MATCH_TB':
    default:
      // Sets normais: primeiro a 6 games com vantagem de 2
      return validateStandardSet(p1Games, p2Games, 6, true, hasTiebreak);
  }
}

/**
 * Valida um set padrão de tênis
 * Regra: Primeiro a atingir o número de games NECESSÁRIOS com diferença de 2
 * @param p1Games Games do jogador 1
 * @param p2Games Games do jogador 2
 * @param gamesNeeded Games necessários para vencer (4, 6, ou 8)
 * @param withAdvantage Permite vantagem (diferença de 2)
 * @param hasTiebreak Tem tiebreak em caso de empate
 */
function validateStandardSet(
  p1Games: number,
  p2Games: number,
  gamesNeeded: number,
  withAdvantage: boolean,
  hasTiebreak: boolean,
): SetValidation {
  const maxGames = gamesNeeded + 5; // Máximo razoável (ex: 6-4, 5-7, 7-5, 6-6 pode ter TB, 7-6 com TB)

  // Se ambos chegaram ao máximo sem diferença de 2
  if (p1Games > maxGames || p2Games > maxGames) {
    return {
      isValid: false,
      error: `Máximo de ${maxGames} games por set`,
    };
  }

  // Verifica se alguém venceu
  let winner: 'PLAYER_1' | 'PLAYER_2' | undefined;
  let validReason = '';

  if (p1Games >= gamesNeeded && p1Games - p2Games >= 2) {
    winner = 'PLAYER_1';
    validReason = `${p1Games}x${p2Games} - Jogador 1 venceu com diferença de 2`;
  } else if (p2Games >= gamesNeeded && p2Games - p1Games >= 2) {
    winner = 'PLAYER_2';
    validReason = `${p1Games}x${p2Games} - Jogador 2 venceu com diferença de 2`;
  } else if (p1Games === p2Games && p1Games === gamesNeeded - 1) {
    // Empate: pode ter tiebreak
    if (hasTiebreak) {
      return {
        isValid: false,
        error: `Resultado ${p1Games}x${p2Games} requer tiebreak (digite resultado do tiebreak)`,
      };
    } else {
      return {
        isValid: false,
        error: `Resultado ${p1Games}x${p2Games} requer diferença de 2 games`,
      };
    }
  }

  // Se tem tiebreak resultado como 7x6 ou 6x7
  if (hasTiebreak && p1Games === gamesNeeded + 1 && p2Games === gamesNeeded - 1) {
    winner = 'PLAYER_1';
    validReason = `${p1Games}x${p2Games} (com tiebreak) - Jogador 1 venceu`;
  } else if (hasTiebreak && p2Games === gamesNeeded + 1 && p1Games === gamesNeeded - 1) {
    winner = 'PLAYER_2';
    validReason = `${p1Games}x${p2Games} (com tiebreak) - Jogador 2 venceu`;
  }

  if (!winner) {
    return {
      isValid: false,
      error: `Resultado ${p1Games}x${p2Games} não é válido. Um jogador deve vencer com diferença de 2 games`,
    };
  }

  return {
    isValid: true,
    winner,
    hasTiebreak: hasTiebreak && (p1Games === gamesNeeded + 1 || p2Games === gamesNeeded + 1),
  };
}

/**
 * Fast4: 4 games, sem deuce, tiebreak em 3-3
 */
function validateFast4Set(p1Games: number, p2Games: number): SetValidation {
  // Fast4: tiebreak em 3-3, primeiro a 4 games ou 4 pontos no tiebreak em 3-3
  if (p1Games >= 4 && p1Games - p2Games >= 1) {
    return { isValid: true, winner: 'PLAYER_1' };
  }
  if (p2Games >= 4 && p2Games - p1Games >= 1) {
    return { isValid: true, winner: 'PLAYER_2' };
  }

  // 3-3 indica tiebreak
  if (p1Games === 3 && p2Games === 3) {
    return {
      isValid: false,
      error: 'Resultado 3x3 requer tiebreak (digite resultado do tiebreak de 4 pontos)',
    };
  }

  return {
    isValid: false,
    error: `Resultado ${p1Games}x${p2Games} não é válido para Fast4`,
  };
}

/**
 * Match Tiebreak: super tiebreak de 10 pontos
 */
function validateMatchTiebreak(p1Points: number, p2Points: number): SetValidation {
  // Match tiebreak é realmente pontos, não games
  // Primeiro a 10 com diferença de 2
  if (p1Points >= 10 && p1Points - p2Points >= 2) {
    return { isValid: true, winner: 'PLAYER_1' };
  }
  if (p2Points >= 10 && p2Points - p1Points >= 2) {
    return { isValid: true, winner: 'PLAYER_2' };
  }

  if (p1Points > 15 || p2Points > 15) {
    return {
      isValid: false,
      error: 'Match Tiebreak: máximo de ~15 pontos (10 + 5 para diferença de 2)',
    };
  }

  return {
    isValid: false,
    error: `Resultado ${p1Points}x${p2Points} não é válido. Um jogador deve vencer com 10+ pontos e diferença de 2`,
  };
}

/**
 * Determina quem saca no próximo set baseado em:
 * 1. Quem venceu o set anterior
 * 2. Regras de saque do formato (alternância, par/ímpar, etc)
 */
export function getServerForNextSet(
  setWinner: Player,
  previousServer: Player,
  completedSetsCount: number,
  format: TennisFormat,
): Player {
  // Regra padrão de tênis: após cada set, o saque passa para o outro jogador
  // Exceto no primeiro set, que começa com quem foi determinado

  // Se é o primeiro set (completedSetsCount === 0), mantem o servidor
  if (completedSetsCount === 0) {
    return previousServer;
  }

  // Para sets subsequentes, o saque alterna
  // Em general, quem sacou no último game do set anterior será o próximo a sacar
  // Mas como simplificação: se set winner é PLAYER_1, PLAYER_2 saca
  // Se set winner é PLAYER_2, PLAYER_1 saca
  // (Exceto em match tiebreak, onde há regras especiais)

  if (format === 'MATCH_TIEBREAK') {
    // No match tiebreak, saque alterna a cada ponto (ou a cada 2 pontos)
    // Para propósitos desta função, retorna o próximo na sequência
    return previousServer === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
  }

  // Regra padrão: após set, saque passa para o outro
  return previousServer === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
}

/**
 * Máximo de games possível em um set
 */
function getMaxGamesForFormat(format: TennisFormat): number {
  switch (format) {
    case 'SHORT_SET':
    case 'SHORT_SET_NO_AD':
    case 'FAST4':
      return 5; // 4 games + 1
    case 'PRO_SET':
      return 10; // 8 games + 2
    case 'MATCH_TIEBREAK':
      return 15; // Super tiebreak de 10 + margem de 5
    default:
      return 13; // 6 games + 2 (padrão)
  }
}

/**
 * Verificar se deve ter tiebreak
 */
function shouldHaveTiebreak(format: TennisFormat): boolean {
  switch (format) {
    case 'SINGLE_SET':
    case 'NO_AD':
    case 'SHORT_SET_NO_AD':
    case 'NO_LET_TENNIS':
      return false;
    default:
      return true;
  }
}

/**
 * Getter para em qual game acontece o tiebreak
 */
function getTiebreakAtForFormat(format: TennisFormat): number {
  switch (format) {
    case 'FAST4':
      return 3; // tiebreak em 3-3
    default:
      return 6; // tiebreak em 6-6 (padrão)
  }
}

/**
 * Converte string "6x4" para SetResult
 */
export function parseSetResultString(input: string): SetResult | null {
  const match = input.match(/^(\d+)[x\-](\d+)$/i);
  if (!match) return null;

  return {
    p1Games: parseInt(match[1], 10),
    p2Games: parseInt(match[2], 10),
  };
}

/**
 * Valida resultado PARCIAL do set (jogo ainda em andamento)
 * Aceita qualquer score positivo sem exigir vencedor
 * Ex: "4x2" em um set parcial é válido mesmo sem vencedor
 * @param result Resultado do set
 * @returns Validação contendo se é válido e detalhes do placar
 */
export interface PartialSetValidation {
  isValid: boolean;
  error?: string;
  p1Games: number;
  p2Games: number;
  isCompleted: boolean; // true se tem vencedor claro
  winner?: 'PLAYER_1' | 'PLAYER_2';
}

export function validatePartialSetResult(
  result: SetResult,
  format: TennisFormat,
): PartialSetValidation {
  const { p1Games, p2Games } = result;

  // Validações básicas
  if (p1Games < 0 || p2Games < 0) {
    return {
      isValid: false,
      error: 'Games não podem ser negativos',
      p1Games: 0,
      p2Games: 0,
      isCompleted: false,
    };
  }

  if (p1Games === 0 && p2Games === 0) {
    return {
      isValid: false,
      error: 'Digite o resultado do set',
      p1Games: 0,
      p2Games: 0,
      isCompleted: false,
    };
  }

  // Máximo razoável (para evitar typos)
  const maxGames = 13; // Máximo padrão
  if (p1Games > maxGames || p2Games > maxGames) {
    return {
      isValid: false,
      error: `Games muito alto (máximo ~${maxGames})`,
      p1Games,
      p2Games,
      isCompleted: false,
    };
  }

  // Verificar se é um resultado completo (tem vencedor claro)
  const fullValidation = validateSetResult(result, format);
  const isCompleted = fullValidation.isValid;

  // Se for parcial (sem vencedor), ainda é válido!
  return {
    isValid: true,
    p1Games,
    p2Games,
    isCompleted,
    winner: fullValidation.winner,
  };
}
