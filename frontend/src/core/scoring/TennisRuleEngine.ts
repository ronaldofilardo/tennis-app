// src/core/scoring/TennisRuleEngine.ts
// Pure rule evaluation functions for tennis game mechanics.
// No class state required — functions take explicit state/config parameters.

import type { MatchState, TennisConfig, Player } from './types';
import { getTotalPointsPlayed } from './TennisStatsEngine';

/**
 * Determines the serving side (left or right) based on total points played.
 * Odd number of points → left; even → right.
 */
export function computeServingSide(state: MatchState): 'left' | 'right' {
  const totalPoints = getTotalPointsPlayed(state);
  return totalPoints % 2 === 0 ? 'right' : 'left';
}

/**
 * Returns full server info including side, total points played, and odd-point flag.
 */
export function computeServerInfo(state: MatchState): {
  server: Player;
  side: 'left' | 'right';
  totalPointsPlayed: number;
  isOddPoint: boolean;
} {
  const totalPoints = getTotalPointsPlayed(state);
  return {
    server: state.server,
    side: computeServingSide(state),
    totalPointsPlayed: totalPoints,
    isOddPoint: totalPoints % 2 === 1,
  };
}

/**
 * Evaluates whether players should change sides after the current point/game.
 * Applies standard rules and Annex V alternate tiebreak side rules.
 */
export function computeShouldChangeSides(
  state: MatchState,
  config: TennisConfig,
): { shouldChange: boolean; reason: string } {
  const p1Games = state.currentSetState.games.PLAYER_1;
  const p2Games = state.currentSetState.games.PLAYER_2;
  const totalGames = p1Games + p2Games;

  if (state.currentGame.isTiebreak) {
    const p1Points = state.currentGame.points.PLAYER_1 as number;
    const p2Points = state.currentGame.points.PLAYER_2 as number;
    const totalTiebreakPoints = p1Points + p2Points;

    if (config.useAlternateTiebreakSides) {
      if (
        totalTiebreakPoints === 1 ||
        (totalTiebreakPoints > 1 && (totalTiebreakPoints - 1) % 4 === 0)
      ) {
        return {
          shouldChange: true,
          reason: `Tie-break alternativo: após 1º ponto e a cada 4 pontos (${totalTiebreakPoints} pontos jogados)`,
        };
      }
    } else if (totalTiebreakPoints > 0 && totalTiebreakPoints % 6 === 0) {
      return {
        shouldChange: true,
        reason: `Tie-break: troca a cada 6 pontos (${totalTiebreakPoints} pontos jogados)`,
      };
    }
  }

  if (totalGames % 2 === 1) {
    return {
      shouldChange: true,
      reason: `Fim do ${totalGames}º game (game ímpar)`,
    };
  }

  return { shouldChange: false, reason: 'Não é necessário trocar de lado agora' };
}

/**
 * Returns true if the match is currently in the deciding set
 * (both players have won exactly 1 set).
 */
export function checkIsDecidingSet(state: MatchState): boolean {
  return (
    (state.completedSets?.length ?? 0) === 1 &&
    state.sets.PLAYER_1 === 1 &&
    state.sets.PLAYER_2 === 1
  );
}

/**
 * Returns true if a match tiebreak should be played (deciding set at 6-6).
 */
export function checkShouldPlayMatchTiebreak(state: MatchState): boolean {
  return (
    checkIsDecidingSet(state) &&
    state.currentSetState.games.PLAYER_1 === 6 &&
    state.currentSetState.games.PLAYER_2 === 6
  );
}

/**
 * Returns a summary of which alternative rules (Annex V) are active.
 */
export function computeAlternativeRules(config: TennisConfig): {
  noAd: boolean;
  alternateTiebreakSides: boolean;
  noLet: boolean;
} {
  return {
    noAd: config.useNoAd ?? false,
    alternateTiebreakSides: config.useAlternateTiebreakSides ?? false,
    noLet: config.useNoLet ?? false,
  };
}

/**
 * Returns true when a serve that touches the net is kept in play (No-Let rule).
 */
export function checkIsNoLetServe(config: TennisConfig, touchedNet: boolean): boolean {
  return (config.useNoLet ?? false) && touchedNet;
}

/**
 * Returns true if the current game point is the No-Ad deciding point.
 */
export function checkIsNoAdDecidingPoint(state: MatchState): boolean {
  return state.currentGame.isNoAdDecidingPoint ?? false;
}
