// frontend/src/types/match.ts

export interface RealtimeMatch {
  id: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'FINISHED';
  sportType: string;
  format: string;
  playerP1: string;
  playerP2: string;
  score?: string;
  winner?: string;
  matchState?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchScore {
  sets: {
    PLAYER_1: number;
    PLAYER_2: number;
  };
  currentSet: number;
  currentGame: {
    points: { [key: string]: string | number };
    server: string;
    isTiebreak: boolean;
  };
  pointsHistory: Array<{
    winner: string;
    timestamp: string;
    score: string;
  }>;
}

export interface MatchUpdate {
  status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'FINISHED';
  score?: string;
  winner?: string;
  matchState?: string;
}