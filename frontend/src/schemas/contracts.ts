import { z } from 'zod';

// Tipos base
const PlayerSchema = z.enum(['PLAYER_1', 'PLAYER_2']);
const GamePointSchema = z.union([z.enum(['0', '15', '30', '40', 'AD']), z.number()]);
const TennisFormatSchema = z.enum([
  'BEST_OF_3',
  'BEST_OF_5',
  'SINGLE_SET',
  'PRO_SET',
  'MATCH_TIEBREAK',
  'SHORT_SET',
  'NO_AD',
  'FAST4',
  'BEST_OF_3_MATCH_TB',
  'SHORT_SET_NO_AD',
  'NO_LET_TENNIS'
]);

// Schema para TennisConfig (mais flexível para testes)
export const TennisConfigSchema = z.object({
  format: TennisFormatSchema,
  setsToWin: z.number().int().positive().optional(),
  gamesPerSet: z.number().int().positive().optional(),
  useAdvantage: z.boolean().optional(),
  useTiebreak: z.boolean().optional(),
  tiebreakAt: z.number().int().nonnegative().optional(),
  tiebreakPoints: z.number().int().positive().optional(),
  useNoAd: z.boolean().optional(),
  useAlternateTiebreakSides: z.boolean().optional(),
  useNoLet: z.boolean().optional(),
}).catchall(z.unknown()); // Permite campos extras

// Schema para GameState (mais flexível)
export const GameStateSchema = z.object({
  points: z.record(PlayerSchema, GamePointSchema),
  server: PlayerSchema,
  isTiebreak: z.boolean(),
  isMatchTiebreak: z.boolean().optional(),
  winner: PlayerSchema.optional(),
  isNoAdDecidingPoint: z.boolean().optional(),
}).catchall(z.unknown()); // Permite campos extras

// Schema para SetState
export const SetStateSchema = z.object({
  games: z.record(PlayerSchema, z.number().int().nonnegative()),
  tiebreakScore: z.record(PlayerSchema, z.number().int().nonnegative()).optional(),
  winner: PlayerSchema.optional(),
});

// Schema para MatchState (mais flexível)
export const MatchStateSchema = z.object({
  sets: z.record(PlayerSchema, z.number().int().nonnegative()),
  currentSet: z.number().int().positive(),
  currentSetState: SetStateSchema,
  currentGame: GameStateSchema,
  server: PlayerSchema,
  winner: PlayerSchema.optional(),
  isFinished: z.boolean(),
  config: TennisConfigSchema,
  completedSets: z.array(z.object({
    setNumber: z.number().int().positive(),
    games: z.record(PlayerSchema, z.number().int().nonnegative()),
    winner: PlayerSchema,
    tiebreakScore: z.record(PlayerSchema, z.number().int().nonnegative()).optional(),
  })).optional(),
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
  viewLog: z.array(z.object({
    viewedAt: z.string(),
    startedAt: z.string().optional(),
    endedAt: z.string().optional(),
    durationSeconds: z.number().int().nonnegative().optional(),
  }).catchall(z.unknown())).optional(),
}).catchall(z.unknown()); // Permite campos extras

// Schema para PointDetails (mais flexível)
const ServeTypeSchema = z.enum(['ACE', 'FAULT_FIRST', 'DOUBLE_FAULT', 'SERVICE_WINNER']);
const PointResultTypeSchema = z.enum(['WINNER', 'UNFORCED_ERROR', 'FORCED_ERROR']);
const ShotTypeSchema = z.enum(['FOREHAND', 'BACKHAND', 'VOLLEY', 'SMASH', 'SLICE', 'DROP_SHOT', 'LOB', 'PASSING_SHOT']);

export const PointDetailsSchema = z.object({
  serve: z.object({
    type: ServeTypeSchema,
    isFirstServe: z.boolean(),
  }).optional(),
  result: z.object({
    winner: PlayerSchema,
    type: PointResultTypeSchema,
    finalShot: ShotTypeSchema.optional(),
  }).catchall(z.unknown()), // Permite campos extras
  rally: z.object({
    ballExchanges: z.number().int().nonnegative(),
  }).optional(), // Opcional para validação básica
  timestamp: z.number(),
}).catchall(z.unknown()); // Permite campos extras

// Schema para PlayerStats
export const PlayerStatsSchema = z.object({
  pointsWon: z.number().int().nonnegative(),
  totalServes: z.number().int().nonnegative(),
  firstServes: z.number().int().nonnegative(),
  secondServes: z.number().int().nonnegative(),
  firstServeWins: z.number().int().nonnegative(),
  secondServeWins: z.number().int().nonnegative(),
  aces: z.number().int().nonnegative(),
  doubleFaults: z.number().int().nonnegative(),
  serviceWinners: z.number().int().nonnegative(),
  servicePointsWon: z.number().int().nonnegative(),
  returnPointsWon: z.number().int().nonnegative(),
  winners: z.number().int().nonnegative(),
  unforcedErrors: z.number().int().nonnegative(),
  forcedErrors: z.number().int().nonnegative(),
  shortRallies: z.number().int().nonnegative(),
  longRallies: z.number().int().nonnegative(),
  breakPoints: z.number().int().nonnegative(),
  breakPointsSaved: z.number().int().nonnegative(),
  firstServePercentage: z.number(),
  firstServeWinPercentage: z.number(),
  secondServeWinPercentage: z.number(),
  serviceHoldPercentage: z.number(),
  breakPointConversion: z.number(),
  winnerToErrorRatio: z.number(),
  returnWinPercentage: z.number(),
  dominanceRatio: z.number(),
});

// Schema para MatchStats
export const MatchStatsSchema = z.object({
  avgRallyLength: z.number(),
  longestRally: z.number().int().nonnegative(),
  shortestRally: z.number().int().nonnegative(),
  totalRallies: z.number().int().nonnegative(),
});

// Schema para API Responses (mais flexível)
export const MatchApiResponseSchema = z.object({
  id: z.string(),
  sportType: z.string(),
  format: z.string(), // Mais flexível que enum
  players: z.object({
    p1: z.string(),
    p2: z.string(),
  }),
  status: z.string(), // Mais flexível que enum
  matchState: MatchStateSchema.optional(),
}).catchall(z.unknown()); // Permite campos extras

// Funções de validação
export function validateMatchState(data: unknown) {
  return MatchStateSchema.safeParse(data);
}

export function validatePlayerStats(data: unknown) {
  return PlayerStatsSchema.safeParse(data);
}

export function validatePointDetails(data: unknown) {
  return PointDetailsSchema.safeParse(data);
}

export function validateMatchStats(data: unknown) {
  return MatchStatsSchema.safeParse(data);
}

export function validateMatchApiResponse(data: unknown) {
  return MatchApiResponseSchema.safeParse(data);
}

// Versão do contrato (para versionamento)
export const CONTRACT_VERSION = '1.0.0';

// Schema com versionamento
export const VersionedMatchStateSchema = MatchStateSchema.extend({
  contractVersion: z.string().default(CONTRACT_VERSION),
});

export const VersionedPlayerStatsSchema = PlayerStatsSchema.extend({
  contractVersion: z.string().default(CONTRACT_VERSION),
});

export const VersionedPointDetailsSchema = PointDetailsSchema.extend({
  contractVersion: z.string().default(CONTRACT_VERSION),
});

export const VersionedMatchStatsSchema = MatchStatsSchema.extend({
  contractVersion: z.string().default(CONTRACT_VERSION),
});

export const VersionedMatchApiResponseSchema = MatchApiResponseSchema.extend({
  contractVersion: z.string().default(CONTRACT_VERSION),
});