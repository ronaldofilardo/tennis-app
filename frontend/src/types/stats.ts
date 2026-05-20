export interface PlayerStats {
  player: string;
  totalGamesWon: number;
  totalGamesLost: number;
  totalSetsWon: number;
  totalSetsLost: number;
  aces?: number;
  doubleFaults?: number;
  breakPoints?: {
    won: number;
    total: number;
  };
  firstServePercentage?: number;
  winners?: number;
  unforcedErrors?: number;
}

export interface AthleteStats {
  athleteId: string;
  athleteName: string;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  winRate: number;
  recentForm: ('W' | 'L')[];
  totalSets: { won: number; lost: number };
  totalGames: { won: number; lost: number };
  averageSetDuration?: number;
  strongAgainst?: string[];
  weakAgainst?: string[];
}

export interface MatchStats {
  matchId: string;
  players: { p1: PlayerStats; p2: PlayerStats };
  duration: number;
  totalGames: number;
  totalSets: number;
  ralliesPlayed: number;
  averageRallyLength: number;
}

export interface MatchStatsData {
  match: MatchStats;
  p1: PlayerStats;
  p2: PlayerStats;
  normalized: {
    p1: Partial<PlayerStats>;
    p2: Partial<PlayerStats>;
  };
}

export interface SeasonStats {
  seasonId: string;
  year: number;
  season: 'SPRING' | 'SUMMER' | 'FALL' | 'WINTER';
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  totalSets: { won: number; lost: number };
  totalGames: { won: number; lost: number };
  ranking?: number;
}
