import type { PointDetails } from '../core/scoring/types';

export interface TechStats {
  firstServePercent: number;
  winners: number;
  unforced: number;
}

export function computeTechStats(
  pointsHistory: PointDetails[],
  playerKey: 'PLAYER_1' | 'PLAYER_2',
): TechStats {
  if (!pointsHistory.length) return { firstServePercent: 0, winners: 0, unforced: 0 };
  const won = pointsHistory.filter((p) => p.result?.winner === playerKey);
  const served = pointsHistory.filter((p) => p.serve);
  const first = served.filter((p) => p.serve?.isFirstServe);
  return {
    firstServePercent: served.length ? Math.round((first.length / served.length) * 100) : 0,
    winners: won.filter((p) => p.result?.type === 'WINNER').length,
    unforced: pointsHistory.filter(
      (p) => p.result?.winner !== playerKey && p.result?.type === 'UNFORCED_ERROR',
    ).length,
  };
}
