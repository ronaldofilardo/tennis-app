export type { MatchScore, Match, UpdateMatchData, API } from './api';
export type { RealtimeMatch, MatchUpdate } from './match';
export type { MatchScore as RealtimeMatchScore } from './match';
export type { Athlete, AthletesState, MatchPlayers } from './athlete';
export {
  generateLocalAthleteId,
  createAthleteFromName,
  createAthletesStateFromNames,
  matchPlayersToLegacy,
  legacyToMatchPlayers,
  getAthleteById,
  upsertAthlete,
} from './athlete';
