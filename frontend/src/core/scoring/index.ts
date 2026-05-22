// src/core/scoring/index.ts
// Barrel re-exports for the tennis scoring engine module.

export { TennisScoring } from './TennisScoring';
export { TennisConfigFactory } from './TennisConfigFactory';
export { TennisStateTransitions } from './TennisStateTransitions';
export {
  computeMatchStats,
  buildPointContextFromState,
  getTotalPointsPlayed,
  gameScoreToNumber,
} from './TennisStatsEngine';
export {
  computeServingSide,
  computeServerInfo,
  computeShouldChangeSides,
  checkIsDecidingSet,
  checkShouldPlayMatchTiebreak,
  computeAlternativeRules,
} from './TennisRuleEngine';
export type {
  TennisFormat,
  TennisConfig,
  MatchState,
  EnhancedMatchState,
  Player,
  GamePoint,
  PointDetails,
  PointContext,
} from './types';
