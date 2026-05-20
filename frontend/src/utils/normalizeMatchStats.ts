// Normalizes raw MatchStatsData, applying safe number coercion to all fields.
// Extracted from MatchStatsModal.tsx to reduce component size and allow reuse.

import type { MatchStatsData, PlayerStats, MatchStats } from '../components/MatchStatsModal';

export function ensureNumber(value: unknown): number {
  return typeof value === 'number' && !isNaN(value) ? value : 0;
}

export interface NormalizedMatchStats {
  player1: PlayerStats;
  player2: PlayerStats;
  match: MatchStats;
  totalPoints: number;
  pointsHistory: MatchStatsData['pointsHistory'];
}

function normalizePlayer(raw: PlayerStats | undefined): PlayerStats {
  if (!raw) return {} as PlayerStats;
  return {
    pointsWon: ensureNumber(raw.pointsWon),
    totalServes: ensureNumber(raw.totalServes),
    firstServes: ensureNumber(raw.firstServes),
    secondServes: ensureNumber(raw.secondServes),
    firstServeWins: ensureNumber(raw.firstServeWins),
    secondServeWins: ensureNumber(raw.secondServeWins),
    aces: ensureNumber(raw.aces),
    doubleFaults: ensureNumber(raw.doubleFaults),
    serviceWinners: ensureNumber(raw.serviceWinners),
    servicePointsWon: ensureNumber(raw.servicePointsWon),
    returnPointsWon: ensureNumber(raw.returnPointsWon),
    winners: ensureNumber(raw.winners),
    unforcedErrors: ensureNumber(raw.unforcedErrors),
    forcedErrors: ensureNumber(raw.forcedErrors),
    shortRallies: ensureNumber(raw.shortRallies),
    longRallies: ensureNumber(raw.longRallies),
    breakPoints: ensureNumber(raw.breakPoints),
    breakPointsSaved: ensureNumber(raw.breakPointsSaved),
    firstServePercentage: ensureNumber(raw.firstServePercentage),
    firstServeWinPercentage: ensureNumber(raw.firstServeWinPercentage),
    secondServeWinPercentage: ensureNumber(raw.secondServeWinPercentage),
    serviceHoldPercentage: ensureNumber(raw.serviceHoldPercentage),
    breakPointConversion: ensureNumber(raw.breakPointConversion),
    winnerToErrorRatio: ensureNumber(raw.winnerToErrorRatio),
    returnWinPercentage: ensureNumber(raw.returnWinPercentage),
    dominanceRatio: ensureNumber(raw.dominanceRatio),
  };
}

export function normalizeMatchStats(stats: MatchStatsData): NormalizedMatchStats {
  return {
    player1: normalizePlayer(stats.player1),
    player2: normalizePlayer(stats.player2),
    match: stats.match
      ? {
          avgRallyLength: ensureNumber(stats.match.avgRallyLength),
          longestRally: ensureNumber(stats.match.longestRally),
          shortestRally: ensureNumber(stats.match.shortestRally),
          totalRallies: ensureNumber(stats.match.totalRallies),
        }
      : ({} as MatchStats),
    totalPoints: ensureNumber(stats.totalPoints),
    pointsHistory: stats.pointsHistory ?? [],
  };
}
