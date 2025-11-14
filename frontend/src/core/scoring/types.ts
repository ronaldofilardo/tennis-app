// src/core/scoring/types.ts

export type Player = 'PLAYER_1' | 'PLAYER_2';

export type GamePoint = '0' | '15' | '30' | '40' | 'AD';

// Formatos baseados no PDF anexo dos 8 tipos de tênis
export type TennisFormat = 
  | 'BEST_OF_3'        // Melhor de 3 sets (padrão)
  | 'BEST_OF_5'        // Melhor de 5 sets (Grand Slams masculino)
  | 'SINGLE_SET'       // Set único
  | 'PRO_SET'          // Pro Set (primeiro a 8 games com vantagem de 2)
  | 'MATCH_TIEBREAK'   // Match Tiebreak (super tiebreak de 10 pontos)
  | 'SHORT_SET'        // Set curto (primeiro a 4 games)
  | 'NO_AD'            // Sem vantagem (sudden death no deuce)
  | 'FAST4'            // Fast4 Tennis (4 games, sem deuce, tiebreak em 3-3)
  | 'BEST_OF_3_MATCH_TB' // Melhor de 3 com match tiebreak no 3º set
  | 'SHORT_SET_NO_AD'  // Set curto com método No-Ad (Anexo V)
  | 'NO_LET_TENNIS';   // Tênis com regra No-Let (Anexo V)

export interface TennisConfig {
  format: TennisFormat;
  setsToWin: number;
  gamesPerSet: number;
  useAdvantage: boolean;
  useTiebreak: boolean;
  tiebreakAt: number;
  tiebreakPoints: number;
  
  // Anexo V - Procedimentos Alternativos
  useNoAd?: boolean;              // Método No-Ad (ponto decisivo em 40-40)
  useAlternateTiebreakSides?: boolean;  // Troca lados: após 1º ponto, depois a cada 4
  useNoLet?: boolean;             // Regra No-Let (saque na rede está em jogo)
}

export interface GameState {
  points: Record<Player, GamePoint | number>; // number para tiebreaks
  server: Player;
  isTiebreak: boolean;
  isMatchTiebreak?: boolean;
  winner?: Player;
  isNoAdDecidingPoint?: boolean;  // Anexo V: Ponto decisivo do método No-Ad
}

export interface SetState {
  games: Record<Player, number>;
  tiebreakScore?: Record<Player, number>;
  winner?: Player;
}

export interface MatchState {
  sets: Record<Player, number>;
  currentSet: number;
  currentSetState: SetState;
  currentGame: GameState;
  server: Player;
  winner?: Player;
  isFinished: boolean;
  config: TennisConfig;
  completedSets?: Array<{ setNumber: number; games: Record<Player, number>; winner: Player; tiebreakScore?: Record<Player, number> }>;
  // Optional metadata managed by the UI/backend
  startedAt?: string; // ISO timestamp
  endedAt?: string; // ISO timestamp
  durationSeconds?: number; // total duration in seconds
  viewLog?: Array<{
    viewedAt: string;
    startedAt?: string;
    endedAt?: string;
    durationSeconds?: number;
    // allow extra fields if needed
    [key: string]: unknown;
  }>; // entries added when a card/view is opened
}

// === SISTEMA DE ANÁLISE DETALHADA DE PONTOS ===

export type ServeType = 'ACE' | 'FAULT_FIRST' | 'DOUBLE_FAULT' | 'SERVICE_WINNER';
export type PointResultType = 'WINNER' | 'UNFORCED_ERROR' | 'FORCED_ERROR';
export type ShotType = 'FOREHAND' | 'BACKHAND' | 'VOLLEY' | 'SMASH' | 'SLICE' | 'DROP_SHOT' | 'LOB' | 'PASSING_SHOT';

export interface PointDetails {
  // Informações do Saque
  serve?: {
    type: ServeType;
    isFirstServe: boolean;
    serveEffect?: 'Chapado' | 'Cortado' | 'TopSpin';
    direction?: 'Fechado' | 'Aberto';
  };
  
  // Resultado do Ponto
  result: {
    winner: Player;
    type: PointResultType;
    finalShot?: ShotType;
  };
  
  // Duração do Rally (número de trocas)
  rally: {
    ballExchanges: number; // Número de trocas de bola
  };
  
  // Timestamp para análise
  timestamp: number;
}

export interface EnhancedMatchState extends MatchState {
  pointsHistory?: PointDetails[];
}