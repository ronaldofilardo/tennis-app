export interface MatchScore {
  sets: number[];
  games: number[];
  points: string[];
  server: 'PLAYER_1' | 'PLAYER_2';
}

export interface Match {
  id: string;
  sportType: 'TENNIS';
  format: 'BEST_OF_3' | 'BEST_OF_5' | 'SINGLE_SET';
  players: {
    p1: string;
    p2: string;
  };
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'FINISHED';
  score?: MatchScore;
}

export interface UpdateMatchData {
  score?: Partial<MatchScore>;
  status?: Match['status'];
}

export interface API {
  createMatch: (data: Omit<Match, 'id'>) => Promise<Match>;
  updateMatch: (id: string, data: UpdateMatchData) => Promise<Match>;
  getMatch: (id: string) => Promise<Match>;
}