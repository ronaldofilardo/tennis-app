/**
 * fixture-builders.ts — Typed test factories para Racket App
 *
 * Objetivo: Eliminar hardcoding de dados em testes e garantir tipos consistentes
 * Uso: createMatchData(), createPlayerData(), etc.
 *
 * Phase 5: Prevention Layer — Garantir que novos testes já nasçam com tipos
 */

import { MatchData, MatchState, AnnotationSession } from '../types/scoreboard';

/**
 * Factory para criar dados de partida mock com tipos corretos
 * @param overrides - Valores customizados para fields específicos
 * @returns MatchData tipado e validado
 */
export function createMatchData(overrides?: Partial<MatchData>): MatchData {
  return {
    id: 'match_test_001',
    sportType: 'TENNIS',
    format: 'BEST_OF_3',
    courtType: 'HARD',
    players: { p1: 'Jogador 1', p2: 'Jogador 2' },
    nickname: 'Test Match',
    status: 'LIVE',
    visibility: 'PLAYERS_ONLY',
    visibleTo: 'both',
    apontadorEmail: 'test@example.com',
    createdAt: new Date().toISOString(),
    matchState: createMatchState(),
    annotationSessions: [],
    ...overrides,
  };
}

/**
 * Factory para criar estado de partida (scoreboard)
 * @param overrides - Valores customizados
 * @returns MatchState tipado
 */
export function createMatchState(overrides?: Partial<MatchState>): MatchState {
  return {
    config: {
      sportType: 'TENNIS',
      format: 'BEST_OF_3',
      courtType: 'HARD',
    },
    sets: [],
    currentGame: {
      points: { PLAYER_1: 0, PLAYER_2: 0 },
      server: 'PLAYER_1',
      isTiebreak: false,
      isMatchTiebreak: false,
    },
    currentSetState: {
      setNumber: 1,
      games: { PLAYER_1: 0, PLAYER_2: 0 },
      winner: null,
    },
    currentSetGames: { PLAYER_1: 0, PLAYER_2: 0 },
    pointsObj: { PLAYER_1: 0, PLAYER_2: 0 },
    isTiebreak: false,
    isMatchTiebreak: false,
    completedSets: [],
    startedAt: new Date().toISOString(),
    isFinished: false,
    server: 'PLAYER_1',
    ...overrides,
  };
}

/**
 * Factory para criar sessão de anotação suspensa
 * @param overrides - Valores customizados
 * @returns AnnotationSession tipado
 */
export function createAnnotationSession(overrides?: Partial<AnnotationSession>): AnnotationSession {
  return {
    id: 'session_test_001',
    matchId: 'match_test_001',
    userId: 'user_test_001',
    status: 'SUSPENDED',
    isActive: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    matchStateSnapshot: createMatchState(),
    ...overrides,
  };
}

/**
 * Factory para criar score parcial
 * @param setNumber - Número do set
 * @param games - Placar em games
 * @returns Record<string, number> tipado
 */
export function createSetScore(
  setNumber: number,
  games: Record<string, number>,
): Record<string, number> {
  return {
    setNumber,
    ...games,
  };
}

/**
 * Factory para criar context de validação HTTP
 * @param statusCode - Código HTTP
 * @param errorMessage - Mensagem de erro
 * @returns HttpError tipado
 */
export interface HttpError {
  status: number;
  message: string;
  code?: string;
}

export function createHttpError(
  statusCode: number = 400,
  message: string = 'Bad Request',
): HttpError {
  return {
    status: statusCode,
    message,
    code: `HTTP_${statusCode}`,
  };
}
