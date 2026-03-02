// frontend/src/__tests__/api-contracts.test.ts
// === AREA 6: Testes de Contrato (Contract Testing) ===
// Valida se o frontend respeita o schema da API rigidamente.
// Em White Label, o backend é compartilhado — quebras de contrato afetam TODOS os clubes.

import { describe, it, expect, beforeEach } from "vitest";

import {
  MatchApiResponseSchema,
  MatchStateSchema,
  PointDetailsSchema,
  PlayerStatsSchema,
  TennisConfigSchema,
} from "../schemas/contracts";

import {
  createMockMatchApiData,
  createMockMatchState,
  createMockPointDetails,
  createMockTennisConfig,
  createMockAcePoint,
  createMockDoubleFaultPoint,
  createMultiTenantScenario,
  resetFactoryCounters,
} from "./factories";

import {
  expectMatchesSchema,
  validateMatchCreatePayload,
  setupTestContext,
} from "./test-utils";

// =====================================================
// === Isolamento de Contexto ===
// =====================================================

beforeEach(() => {
  setupTestContext();
  resetFactoryCounters();
});

// =====================================================
// === Contratos de MatchState ===
// =====================================================

describe("Contract: MatchState", () => {
  it("estado inicial deve respeitar o schema", () => {
    const state = createMockMatchState();
    expectMatchesSchema(state, MatchStateSchema);
  });

  it("estado em andamento deve respeitar o schema", () => {
    const state = createMockMatchState({
      currentSetState: {
        games: { PLAYER_1: 5, PLAYER_2: 3 },
      },
    });
    expectMatchesSchema(state, MatchStateSchema);
  });

  it("estado finalizado deve respeitar o schema", () => {
    const state = createMockMatchState({
      winner: "PLAYER_1",
      isFinished: true,
      sets: { PLAYER_1: 2, PLAYER_2: 0 },
      endedAt: new Date().toISOString(),
    });
    expectMatchesSchema(state, MatchStateSchema);
  });

  it("estado de tiebreak deve respeitar o schema", () => {
    const state = createMockMatchState({
      currentSetState: {
        games: { PLAYER_1: 6, PLAYER_2: 6 },
      },
      currentGame: {
        points: { PLAYER_1: 5, PLAYER_2: 6 },
        server: "PLAYER_1",
        isTiebreak: true,
        isMatchTiebreak: false,
      },
    });
    expectMatchesSchema(state, MatchStateSchema);
  });

  it("deve rejeitar MatchState sem campos obrigatórios", () => {
    const invalid = { sets: { PLAYER_1: 0 }, currentSet: 1 }; // incompleto
    const result = MatchStateSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

// =====================================================
// === Contratos de TennisConfig ===
// =====================================================

describe("Contract: TennisConfig", () => {
  it("config padrão deve respeitar o schema", () => {
    const config = createMockTennisConfig();
    expectMatchesSchema(config, TennisConfigSchema);
  });

  it("config MATCH_TIEBREAK deve respeitar o schema", () => {
    const config = createMockTennisConfig({
      format: "MATCH_TIEBREAK",
      setsToWin: 1,
      gamesPerSet: 1,
      tiebreakPoints: 10,
    });
    expectMatchesSchema(config, TennisConfigSchema);
  });

  it("deve aceitar formato FAST4", () => {
    const config = createMockTennisConfig({
      format: "FAST4",
      gamesPerSet: 4,
      useNoAd: true,
    });
    expectMatchesSchema(config, TennisConfigSchema);
  });
});

// =====================================================
// === Contratos de PointDetails ===
// =====================================================

describe("Contract: PointDetails", () => {
  it("ponto winner deve respeitar o schema", () => {
    const point = createMockPointDetails("PLAYER_1");
    expectMatchesSchema(point, PointDetailsSchema);
  });

  it("ponto Ace deve respeitar o schema", () => {
    const point = createMockAcePoint("PLAYER_1");
    expectMatchesSchema(point, PointDetailsSchema);
  });

  it("ponto Dupla Falta deve respeitar o schema", () => {
    const point = createMockDoubleFaultPoint("PLAYER_2");
    expectMatchesSchema(point, PointDetailsSchema);
  });

  it("ponto sem serve (rally longo) deve respeitar o schema", () => {
    const point = createMockPointDetails("PLAYER_2", {
      rally: { ballExchanges: 15 },
    });
    expectMatchesSchema(point, PointDetailsSchema);
  });
});

// =====================================================
// === Contratos de MatchApiResponse ===
// =====================================================

describe("Contract: MatchApiResponse", () => {
  it("resposta API de partida nova deve respeitar o schema", () => {
    const matchData = createMockMatchApiData();
    const apiResponse = {
      id: matchData.id,
      sportType: matchData.sportType,
      format: matchData.format,
      players: matchData.players,
      status: matchData.status,
    };
    expectMatchesSchema(apiResponse, MatchApiResponseSchema);
  });

  it("resposta API com matchState aninhado deve respeitar o schema", () => {
    const matchData = createMockMatchApiData({
      status: "IN_PROGRESS",
      matchState: createMockMatchState(),
    });
    const apiResponse = {
      id: matchData.id,
      sportType: matchData.sportType,
      format: matchData.format,
      players: matchData.players,
      status: matchData.status,
      matchState: matchData.matchState,
    };
    expectMatchesSchema(apiResponse, MatchApiResponseSchema);
  });

  it("deve rejeitar resposta sem id", () => {
    const invalidResponse = {
      sportType: "TENNIS",
      format: "BEST_OF_3",
      players: { p1: "P1", p2: "P2" },
      status: "NOT_STARTED",
    };
    const result = MatchApiResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });
});

// =====================================================
// === Contratos de Payload de Criação ===
// =====================================================

describe("Contract: Match Create Payload", () => {
  it("payload válido deve ser aceito", () => {
    const payload = {
      sportType: "TENNIS",
      format: "BEST_OF_3",
      players: { p1: "Jogador 1", p2: "Jogador 2" },
      apontadorEmail: "apontador@teste.com",
      courtType: "HARD",
    };
    expect(validateMatchCreatePayload(payload)).toBe(true);
  });

  it("payload sem apontadorEmail deve ser rejeitado", () => {
    const payload = {
      sportType: "TENNIS",
      format: "BEST_OF_3",
      players: { p1: "Jogador 1", p2: "Jogador 2" },
      // apontadorEmail ausente
    };
    expect(validateMatchCreatePayload(payload)).toBe(false);
  });

  it("payload sem players deve ser rejeitado", () => {
    const payload = {
      sportType: "TENNIS",
      format: "BEST_OF_3",
      apontadorEmail: "test@test.com",
    };
    expect(validateMatchCreatePayload(payload)).toBe(false);
  });

  it("payload com players sem p2 deve ser rejeitado", () => {
    const payload = {
      sportType: "TENNIS",
      format: "BEST_OF_3",
      players: { p1: "Jogador 1" },
      apontadorEmail: "test@test.com",
    };
    expect(validateMatchCreatePayload(payload)).toBe(false);
  });
});

// =====================================================
// === Cenários Multi-Tenant ===
// =====================================================

describe("Contract: Multi-Tenant Scenario", () => {
  it("cenário premium vs free deve gerar dados válidos", () => {
    const { premiumClub, freeClub, premiumAthlete, freeAthlete, match } =
      createMultiTenantScenario();

    // Clubes devem ter IDs únicos
    expect(premiumClub.id).not.toBe(freeClub.id);

    // Atletas devem ter IDs únicos
    expect(premiumAthlete.id).not.toBe(freeAthlete.id);

    // Atletas devem ter clubIds corretos
    expect(premiumAthlete.clubId).toBe(premiumClub.id);
    expect(freeAthlete.clubId).toBe(freeClub.id);

    // A partida deve ter dados válidos
    expect(match.players.p1).toBe(premiumAthlete.name);
    expect(match.players.p2).toBe(freeAthlete.name);

    // O estado da partida deve respeitar o schema
    if (match.matchState) {
      expectMatchesSchema(match.matchState, MatchStateSchema);
    }
  });

  it("múltiplos testes devem ter IDs isolados (sem vazamento)", () => {
    const match1 = createMockMatchApiData();
    const match2 = createMockMatchApiData();
    expect(match1.id).not.toBe(match2.id);
  });
});
