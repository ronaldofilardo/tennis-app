// src/core/scoring/TennisStatsEngine.ts
// Pure utility functions for tennis match stats and point context analysis.
// No class state required — all functions take explicit parameters.

import type { MatchState, GamePoint, PointDetails, PointContext, Player } from './types';

/**
 * Converts a game score label ('0', '15', '30', '40', 'AD') to a comparable number.
 * Accepts numbers too (for tiebreak points).
 */
export function gameScoreToNumber(score: GamePoint | number): number {
  if (typeof score === 'number') return score;
  switch (score) {
    case '0':
      return 0;
    case '15':
      return 1;
    case '30':
      return 2;
    case '40':
      return 3;
    case 'AD':
      return 4;
    default:
      return 0;
  }
}

/**
 * Converts a game score label to the number of actual points played from
 * the start of the game (i.e., "15" means 1 point was played by that player).
 */
export function convertScoreToActualPoints(score: GamePoint): number {
  switch (score) {
    case '0':
      return 0;
    case '15':
      return 1;
    case '30':
      return 2;
    case '40':
      return 3;
    case 'AD':
      return 4;
    default:
      return 0;
  }
}

/**
 * Calculates total points played in the current game from the match state.
 */
export function getTotalPointsPlayed(state: MatchState): number {
  if (state.currentGame.isTiebreak) {
    const p1 = state.currentGame.points.PLAYER_1 as number;
    const p2 = state.currentGame.points.PLAYER_2 as number;
    return p1 + p2;
  }

  const p1Score = state.currentGame.points.PLAYER_1 as GamePoint;
  const p2Score = state.currentGame.points.PLAYER_2 as GamePoint;
  const p1Pts = convertScoreToActualPoints(p1Score);
  const p2Pts = convertScoreToActualPoints(p2Score);

  if (p1Score === 'AD' || p2Score === 'AD') {
    // Advantage reached after at least 3 deuces (6 points minimum)
    const extraPoints = Math.max(p1Pts - 3, 0) + Math.max(p2Pts - 3, 0);
    return 6 + extraPoints;
  }

  return p1Pts + p2Pts;
}

/**
 * Builds the PointContext from a MatchState snapshot.
 * Captures score, games, sets, server and break-point status at the moment BEFORE a point is played.
 */
export function buildPointContextFromState(state: MatchState): PointContext {
  const game = state.currentGame;
  const set = state.currentSetState;
  const server = state.server;
  const opponent: Player = server === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
  const serverScore = game.points[server];
  const receiverScore = game.points[opponent];

  let isBreakPoint = false;
  if (!game.isTiebreak && !game.isMatchTiebreak) {
    isBreakPoint =
      receiverScore === '40' &&
      (serverScore === '0' || serverScore === '15' || serverScore === '30');
    if (receiverScore === 'AD') isBreakPoint = true;
    if (game.isNoAdDecidingPoint && receiverScore === '40' && serverScore === '40') {
      isBreakPoint = true;
    }
  }

  return {
    setNumber: state.currentSet,
    gamesP1: set.games.PLAYER_1,
    gamesP2: set.games.PLAYER_2,
    setsWonP1: state.sets.PLAYER_1,
    setsWonP2: state.sets.PLAYER_2,
    gameScoreP1: game.points.PLAYER_1,
    gameScoreP2: game.points.PLAYER_2,
    server,
    isBreakPoint,
    isTiebreak: (game.isTiebreak || game.isMatchTiebreak) ?? false,
  };
}

/**
 * Computes match statistics from a points history array.
 */
export function computeMatchStats(pointsHistory: PointDetails[]): {
  totalPoints: number;
  aces: number;
  doubleFaults: number;
  winners: number;
  unforcedErrors: number;
  forcedErrors: number;
} {
  const stats = {
    totalPoints: pointsHistory.length,
    aces: 0,
    doubleFaults: 0,
    winners: 0,
    unforcedErrors: 0,
    forcedErrors: 0,
  };

  for (const point of pointsHistory) {
    if (point.serve?.type === 'ACE') stats.aces++;
    if (point.serve?.type === 'DOUBLE_FAULT') stats.doubleFaults++;
    switch (point.result.type) {
      case 'WINNER':
        stats.winners++;
        break;
      case 'UNFORCED_ERROR':
        stats.unforcedErrors++;
        break;
      case 'FORCED_ERROR':
        stats.forcedErrors++;
        break;
    }
  }

  return stats;
}
