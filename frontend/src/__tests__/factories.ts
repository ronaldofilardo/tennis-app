// frontend/src/__tests__/factories.ts
// === AREA 6: Testes — Factories de Dados ===
// Fábricas para gerar objetos de partida, atleta e clube nos testes.
// Facilita criar cenários complexos (ex: "partida premium vs. free")
// sem repetir código boilerplate.

import type {
  MatchState,
  TennisConfig,
  GameState,
  SetState,
  PointDetails,
  RallyDetails,
} from "../core/scoring/types";
import type { Athlete } from "../types/athlete";

// Contadores para IDs únicos por execução de teste
let _athleteCounter = 0;
let _matchCounter = 0;
let _clubCounter = 0;
let _pointCounter = 0;

/** Reseta contadores entre testes. Chamar em beforeEach. */
export function resetFactoryCounters(): void {
  _athleteCounter = 0;
  _matchCounter = 0;
  _clubCounter = 0;
  _pointCounter = 0;
}

// ===========================
// === FACTORY: TennisConfig ===
// ===========================

/**
 * Cria um TennisConfig de teste com padrões seguros.
 */
export function createMockTennisConfig(
  overrides: Partial<TennisConfig> = {},
): TennisConfig {
  return {
    format: "BEST_OF_3",
    setsToWin: 2,
    gamesPerSet: 6,
    useAdvantage: true,
    useTiebreak: true,
    tiebreakAt: 6,
    tiebreakPoints: 7,
    useNoAd: false,
    useAlternateTiebreakSides: false,
    useNoLet: false,
    ...overrides,
  };
}

// ===========================
// === FACTORY: GameState ====
// ===========================

export function createMockGameState(
  overrides: Partial<GameState> = {},
): GameState {
  return {
    points: { PLAYER_1: "0", PLAYER_2: "0" },
    server: "PLAYER_1",
    isTiebreak: false,
    isMatchTiebreak: false,
    winner: undefined,
    isNoAdDecidingPoint: false,
    ...overrides,
  };
}

// ===========================
// === FACTORY: SetState =====
// ===========================

export function createMockSetState(
  overrides: Partial<SetState> = {},
): SetState {
  return {
    games: { PLAYER_1: 0, PLAYER_2: 0 },
    tiebreakScore: undefined,
    winner: undefined,
    ...overrides,
  };
}

// ===========================
// === FACTORY: MatchState ===
// ===========================

/**
 * Cria um MatchState inicial com padrões para testes.
 */
export function createMockMatchState(
  overrides: Partial<MatchState> = {},
): MatchState {
  return {
    sets: { PLAYER_1: 0, PLAYER_2: 0 },
    currentSet: 1,
    currentSetState: createMockSetState(),
    currentGame: createMockGameState(),
    server: "PLAYER_1",
    winner: undefined,
    isFinished: false,
    config: createMockTennisConfig(),
    completedSets: [],
    startedAt: new Date().toISOString(),
    endedAt: undefined,
    durationSeconds: undefined,
    viewLog: [],
    ...overrides,
  };
}

/**
 * Cria um MatchState com a partida em andamento (3-2 no primeiro set).
 */
export function createMockMatchStateInProgress(): MatchState {
  return createMockMatchState({
    currentSetState: createMockSetState({
      games: { PLAYER_1: 3, PLAYER_2: 2 },
    }),
  });
}

/**
 * Cria um MatchState com a partida finalizada.
 */
export function createMockMatchStateFinished(
  winner: "PLAYER_1" | "PLAYER_2" = "PLAYER_1",
): MatchState {
  return createMockMatchState({
    sets: {
      PLAYER_1: winner === "PLAYER_1" ? 2 : 0,
      PLAYER_2: winner === "PLAYER_2" ? 2 : 0,
    },
    winner,
    isFinished: true,
    endedAt: new Date().toISOString(),
    completedSets: [
      {
        setNumber: 1,
        games: {
          PLAYER_1: winner === "PLAYER_1" ? 6 : 4,
          PLAYER_2: winner === "PLAYER_2" ? 6 : 4,
        },
        winner,
      },
      {
        setNumber: 2,
        games: {
          PLAYER_1: winner === "PLAYER_1" ? 6 : 4,
          PLAYER_2: winner === "PLAYER_2" ? 6 : 4,
        },
        winner,
      },
    ],
  });
}

/**
 * Cria um MatchState em tiebreak (6-6).
 */
export function createMockMatchStateInTiebreak(): MatchState {
  return createMockMatchState({
    currentSetState: createMockSetState({
      games: { PLAYER_1: 6, PLAYER_2: 6 },
    }),
    currentGame: createMockGameState({
      isTiebreak: true,
      points: { PLAYER_1: 0, PLAYER_2: 0 },
    }),
  });
}

// ===========================
// === FACTORY: Athlete ======
// ===========================

/**
 * Cria um Athlete de teste.
 */
export function createMockAthlete(overrides: Partial<Athlete> = {}): Athlete {
  _athleteCounter++;
  return {
    id: `test_athlete_${_athleteCounter}`,
    name: `Atleta ${_athleteCounter}`,
    email: `atleta${_athleteCounter}@teste.com`,
    clubId: undefined,
    metadata: {},
    tags: [],
    ...overrides,
  };
}

/**
 * Cria um Athlete de clube premium (para cenários multi-tenant).
 */
export function createMockPremiumAthlete(
  overrides: Partial<Athlete> = {},
): Athlete {
  return createMockAthlete({
    clubId: "club_premium_001",
    tags: ["premium", "verified"],
    metadata: { plan: "premium", verified: true },
    ...overrides,
  });
}

/**
 * Cria um Athlete de clube free.
 */
export function createMockFreeAthlete(
  overrides: Partial<Athlete> = {},
): Athlete {
  return createMockAthlete({
    clubId: "club_free_001",
    tags: ["free"],
    metadata: { plan: "free" },
    ...overrides,
  });
}

// ===========================
// === FACTORY: Club =========
// ===========================

export interface MockClub {
  id: string;
  name: string;
  plan: "free" | "premium" | "enterprise";
  ownerId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Cria um clube de teste.
 */
export function createMockClub(overrides: Partial<MockClub> = {}): MockClub {
  _clubCounter++;
  return {
    id: `club_test_${_clubCounter}`,
    name: `Clube de Teste ${_clubCounter}`,
    plan: "free",
    ownerId: `owner_${_clubCounter}`,
    metadata: {},
    ...overrides,
  };
}

export function createMockPremiumClub(
  overrides: Partial<MockClub> = {},
): MockClub {
  return createMockClub({ plan: "premium", ...overrides });
}

export function createMockEnterpriseClub(
  overrides: Partial<MockClub> = {},
): MockClub {
  return createMockClub({ plan: "enterprise", ...overrides });
}

// ===========================
// === FACTORY: Match ========
// ===========================

export interface MockMatchApiData {
  id: string;
  sportType: string;
  format: string;
  courtType?: string;
  players: { p1: string; p2: string };
  status: "NOT_STARTED" | "IN_PROGRESS" | "FINISHED";
  matchState?: MatchState;
  apontadorEmail?: string;
  playersEmails?: string[];
  visibleTo?: string;
  clubId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Cria uma partida de API de teste.
 */
export function createMockMatchApiData(
  overrides: Partial<MockMatchApiData> = {},
): MockMatchApiData {
  _matchCounter++;
  return {
    id: `match_test_${_matchCounter}`,
    sportType: "TENNIS",
    format: "BEST_OF_3",
    courtType: "HARD",
    players: { p1: "Jogador 1", p2: "Jogador 2" },
    status: "NOT_STARTED",
    matchState: undefined,
    apontadorEmail: "apontador@teste.com",
    playersEmails: ["play1@teste.com", "play2@teste.com"],
    visibleTo: "both",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Cria uma partida entre clube premium e clube free.
 * Útil para testar cenários multi-tenant.
 */
export function createMockCrossClubMatch(): MockMatchApiData {
  return createMockMatchApiData({
    players: { p1: "Atleta Premium", p2: "Atleta Free" },
    matchState: createMockMatchStateInProgress(),
    status: "IN_PROGRESS",
  });
}

// ===========================
// === FACTORY: PointDetails =
// ===========================

/**
 * Cria um PointDetails de teste (winner player 1).
 */
export function createMockPointDetails(
  winner: "PLAYER_1" | "PLAYER_2" = "PLAYER_1",
  overrides: Partial<PointDetails> = {},
): PointDetails {
  _pointCounter++;
  return {
    result: {
      winner,
      type: "WINNER",
      finalShot: "FOREHAND",
    },
    shotPlayer: winner,
    rally: { ballExchanges: 3 },
    timestamp: Date.now() + _pointCounter,
    ...overrides,
  };
}

/**
 * Cria um PointDetails de Ace.
 */
export function createMockAcePoint(
  server: "PLAYER_1" | "PLAYER_2" = "PLAYER_1",
): PointDetails {
  return createMockPointDetails(server, {
    serve: {
      type: "ACE",
      isFirstServe: true,
      serveEffect: "Chapado",
      direction: "Fechado",
    },
    rally: { ballExchanges: 0 },
  });
}

/**
 * Cria um PointDetails de Dupla Falta.
 */
export function createMockDoubleFaultPoint(
  server: "PLAYER_1" | "PLAYER_2" = "PLAYER_1",
): PointDetails {
  const winner: "PLAYER_1" | "PLAYER_2" =
    server === "PLAYER_1" ? "PLAYER_2" : "PLAYER_1";
  return createMockPointDetails(winner, {
    serve: {
      type: "DOUBLE_FAULT",
      isFirstServe: false,
    },
    rally: { ballExchanges: 0 },
  });
}

/**
 * Cria um RallyDetails de teste.
 */
export function createMockRallyDetails(
  overrides: Partial<RallyDetails> = {},
): RallyDetails {
  return {
    vencedor: "sacador",
    situacao: "fundo",
    tipo: "winner",
    golpe: "FH",
    efeito: "topspin",
    direcao: "cruzada",
    ...overrides,
  };
}

// ===========================
// === Cenários de Teste =====
// ===========================

/**
 * Cria todos os dados para um cenário de teste completo.
 * "Partida entre clube premium e clube free".
 */
export function createMultiTenantScenario() {
  const premiumClub = createMockPremiumClub({ name: "Clube Premium Alfa" });
  const freeClub = createMockClub({ name: "Clube Free Beta" });
  const premiumAthlete = createMockPremiumAthlete({
    clubId: premiumClub.id,
    name: "Rafael Premium",
  });
  const freeAthlete = createMockFreeAthlete({
    clubId: freeClub.id,
    name: "Lucas Free",
  });
  const match = createMockMatchApiData({
    players: { p1: premiumAthlete.name, p2: freeAthlete.name },
    status: "IN_PROGRESS",
    matchState: createMockMatchStateInProgress(),
  });

  return { premiumClub, freeClub, premiumAthlete, freeAthlete, match };
}

export default {
  createMockTennisConfig,
  createMockGameState,
  createMockSetState,
  createMockMatchState,
  createMockMatchStateInProgress,
  createMockMatchStateFinished,
  createMockMatchStateInTiebreak,
  createMockAthlete,
  createMockPremiumAthlete,
  createMockFreeAthlete,
  createMockClub,
  createMockPremiumClub,
  createMockEnterpriseClub,
  createMockMatchApiData,
  createMockCrossClubMatch,
  createMockPointDetails,
  createMockAcePoint,
  createMockDoubleFaultPoint,
  createMockRallyDetails,
  createMultiTenantScenario,
  resetFactoryCounters,
};
