// frontend/src/types/scoreboard.ts
// Shared match data shape for the scoreboard engine

import type { TennisFormat, MatchState } from '../core/scoring/types';

export interface MatchData {
  id: string;
  sportType: string;
  format: TennisFormat | string;
  courtType?: 'GRASS' | 'CLAY' | 'HARD';
  players: { p1: string; p2: string };
  status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'FINISHED';
  matchState?: MatchState;
  player1GlobalId?: string | null;
  player2GlobalId?: string | null;
  createdByUserId?: string | null;
  nickname?: string | null;
  scheduledAt?: string | null;
  venueId?: string | null;
  venue?: { id: string; name: string; city?: string | null } | null;
  visibility?: string;
  openForAnnotation?: boolean;
}
