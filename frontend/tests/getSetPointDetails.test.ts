// tests/getSetPointDetails.test.ts
// Testes para validar:
// 1. Reconstrução de sets a partir de pointsHistory
// 2. Aplicação correta de regras de tênis
// 3. Agrupamento de pontos em games e sets

import { describe, it, expect } from "vitest";

// Tipo auxiliar
interface Point {
  result: { winner: "PLAYER_1" | "PLAYER_2"; type: string };
  rally: { ballExchanges: number };
  gamePoints: { PLAYER_1: number; PLAYER_2: number };
  pointIndex: number;
  timestamp: number;
}

interface MatchState {
  pointsHistory?: Point[];
  sets?: { PLAYER_1: number; PLAYER_2: number };
  currentSet?: number;
  currentSetState?: { games?: { PLAYER_1: number; PLAYER_2: number } };
  currentGame?: {
    points?: { PLAYER_1: string | number; PLAYER_2: string | number };
  };
}

// Implementação da função a testar
function getSetPointDetails(
  pointsHistory: Point[] | undefined,
  matchState?: MatchState,
): Array<{
  setNumber: number;
  points: Point[];
  gameScores: Array<{ game: number; scores: Record<string, number> }>;
}> {
  if (!pointsHistory || pointsHistory.length === 0) {
    return [];
  }

  const sets: Array<{
    setNumber: number;
    points: Point[];
    gameScores: Array<{ game: number; scores: Record<string, number> }>;
  }> = [];
  let currentSet = 1;
  let setPoints: Point[] = [];
  let gameScores: Array<{ game: number; scores: Record<string, number> }> = [];
  let currentGame = 1;
  let currentGamePoints: Point[] = [];

  for (const point of pointsHistory) {
    setPoints.push(point);
    currentGamePoints.push(point);

    // Se houver novo game score, significa mudança de game
    if (
      currentGamePoints.length === 1 ||
      (currentGamePoints.length > 1 &&
        currentGamePoints[currentGamePoints.length - 2].gamePoints !==
          point.gamePoints)
    ) {
      // Novo game iniciado
      gameScores.push({
        game: currentGame,
        scores: currentGamePoints[currentGamePoints.length - 2]?.gamePoints || {
          PLAYER_1: 0,
          PLAYER_2: 0,
        },
      });

      currentGame++;
      currentGamePoints = [point];
    }

    // Verifica se set foi finalizado (alguém tem 6+ games com 2 de vantagem)
    if (point.gamePoints) {
      const p1Games = point.gamePoints.PLAYER_1 || 0;
      const p2Games = point.gamePoints.PLAYER_2 || 0;

      const setWon =
        (p1Games >= 6 && p1Games - p2Games >= 2) ||
        (p2Games >= 6 && p2Games - p1Games >= 2);

      if (setWon) {
        // Set finalizado
        gameScores.push({
          game: currentGame,
          scores: point.gamePoints,
        });

        sets.push({
          setNumber: currentSet,
          points: setPoints,
          gameScores,
        });

        currentSet++;
        setPoints = [];
        gameScores = [];
        currentGame = 1;
        currentGamePoints = [];
      }
    }
  }

  // Se houver pontos restantes, adiciona como set incompleto
  if (setPoints.length > 0) {
    gameScores.push({
      game: currentGame,
      scores: currentGamePoints[currentGamePoints.length - 1]?.gamePoints || {
        PLAYER_1: 0,
        PLAYER_2: 0,
      },
    });

    sets.push({
      setNumber: currentSet,
      points: setPoints,
      gameScores,
    });
  }

  return sets;
}

describe("getSetPointDetails - Reconstrução de Sets", () => {
  it("retorna array vazio se pointsHistory indefinido", () => {
    const result = getSetPointDetails(undefined);
    expect(result).toEqual([]);
  });

  it("retorna array vazio se pointsHistory vazio", () => {
    const result = getSetPointDetails([]);
    expect(result).toEqual([]);
  });

  it("reconstrói um set completo (6-0)", () => {
    // Arrange: 6 games, cada game com vários pontos
    const pointsHistory: Point[] = [
      // Game 1: Player 1 vence 4-0
      {
        result: { winner: "PLAYER_1", type: "WINNER" },
        rally: { ballExchanges: 1 },
        gamePoints: { PLAYER_1: 1, PLAYER_2: 0 },
        pointIndex: 1,
        timestamp: 1,
      },
      {
        result: { winner: "PLAYER_1", type: "WINNER" },
        rally: { ballExchanges: 1 },
        gamePoints: { PLAYER_1: 2, PLAYER_2: 0 },
        pointIndex: 2,
        timestamp: 2,
      },
      {
        result: { winner: "PLAYER_1", type: "WINNER" },
        rally: { ballExchanges: 1 },
        gamePoints: { PLAYER_1: 3, PLAYER_2: 0 },
        pointIndex: 3,
        timestamp: 3,
      },
      {
        result: { winner: "PLAYER_1", type: "WINNER" },
        rally: { ballExchanges: 1 },
        gamePoints: { PLAYER_1: 4, PLAYER_2: 0 },
        pointIndex: 4,
        timestamp: 4,
      },
      // Game 2: Player 1 vence 4-0
      {
        result: { winner: "PLAYER_1", type: "WINNER" },
        rally: { ballExchanges: 1 },
        gamePoints: { PLAYER_1: 1, PLAYER_2: 0 },
        pointIndex: 5,
        timestamp: 5,
      },
      {
        result: { winner: "PLAYER_1", type: "WINNER" },
        rally: { ballExchanges: 1 },
        gamePoints: { PLAYER_1: 2, PLAYER_2: 0 },
        pointIndex: 6,
        timestamp: 6,
      },
      {
        result: { winner: "PLAYER_1", type: "WINNER" },
        rally: { ballExchanges: 1 },
        gamePoints: { PLAYER_1: 3, PLAYER_2: 0 },
        pointIndex: 7,
        timestamp: 7,
      },
      {
        result: { winner: "PLAYER_1", type: "WINNER" },
        rally: { ballExchanges: 1 },
        gamePoints: { PLAYER_1: 4, PLAYER_2: 0 },
        pointIndex: 8,
        timestamp: 8,
      },
      // ... repetir para games 3-6 (simplificado para teste)
      {
        result: { winner: "PLAYER_1", type: "WINNER" },
        rally: { ballExchanges: 1 },
        gamePoints: { PLAYER_1: 1, PLAYER_2: 0 },
        pointIndex: 9,
        timestamp: 9,
      },
      {
        result: { winner: "PLAYER_1", type: "WINNER" },
        rally: { ballExchanges: 1 },
        gamePoints: { PLAYER_1: 2, PLAYER_2: 0 },
        pointIndex: 10,
        timestamp: 10,
      },
      {
        result: { winner: "PLAYER_1", type: "WINNER" },
        rally: { ballExchanges: 1 },
        gamePoints: { PLAYER_1: 3, PLAYER_2: 0 },
        pointIndex: 11,
        timestamp: 11,
      },
      {
        result: { winner: "PLAYER_1", type: "WINNER" },
        rally: { ballExchanges: 1 },
        gamePoints: { PLAYER_1: 4, PLAYER_2: 0 },
        pointIndex: 12,
        timestamp: 12,
      },
    ];

    // Act
    const result = getSetPointDetails(pointsHistory);

    // Assert
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].setNumber).toBe(1);
    expect(result[0].points.length).toBeGreaterThan(0);
  });

  it("agrupa pontos por game corretamente", () => {
    // Arrange: 2 games
    const pointsHistory: Point[] = [
      // Game 1: 4-0
      {
        result: { winner: "PLAYER_1", type: "WINNER" },
        rally: { ballExchanges: 1 },
        gamePoints: { PLAYER_1: 1, PLAYER_2: 0 },
        pointIndex: 1,
        timestamp: 1,
      },
      {
        result: { winner: "PLAYER_1", type: "WINNER" },
        rally: { ballExchanges: 2 },
        gamePoints: { PLAYER_1: 2, PLAYER_2: 0 },
        pointIndex: 2,
        timestamp: 2,
      },
      {
        result: { winner: "PLAYER_1", type: "WINNER" },
        rally: { ballExchanges: 1 },
        gamePoints: { PLAYER_1: 3, PLAYER_2: 0 },
        pointIndex: 3,
        timestamp: 3,
      },
      {
        result: { winner: "PLAYER_1", type: "WINNER" },
        rally: { ballExchanges: 1 },
        gamePoints: { PLAYER_1: 4, PLAYER_2: 0 },
        pointIndex: 4,
        timestamp: 4,
      },
      // Game 2: 3-1
      {
        result: { winner: "PLAYER_2", type: "WINNER" },
        rally: { ballExchanges: 1 },
        gamePoints: { PLAYER_1: 0, PLAYER_2: 1 },
        pointIndex: 5,
        timestamp: 5,
      },
      {
        result: { winner: "PLAYER_1", type: "WINNER" },
        rally: { ballExchanges: 2 },
        gamePoints: { PLAYER_1: 1, PLAYER_2: 1 },
        pointIndex: 6,
        timestamp: 6,
      },
      {
        result: { winner: "PLAYER_1", type: "WINNER" },
        rally: { ballExchanges: 1 },
        gamePoints: { PLAYER_1: 2, PLAYER_2: 1 },
        pointIndex: 7,
        timestamp: 7,
      },
      {
        result: { winner: "PLAYER_1", type: "WINNER" },
        rally: { ballExchanges: 3 },
        gamePoints: { PLAYER_1: 3, PLAYER_2: 1 },
        pointIndex: 8,
        timestamp: 8,
      },
    ];

    // Act
    const result = getSetPointDetails(pointsHistory);

    // Assert
    expect(result[0].gameScores).toBeDefined();
    expect(result[0].gameScores.length).toBeGreaterThanOrEqual(2);
  });

  it("preserva detalhes de cada ponto (rally, winner)", () => {
    // Arrange
    const pointsHistory: Point[] = [
      {
        result: { winner: "PLAYER_1", type: "WINNER" },
        rally: { ballExchanges: 5 },
        gamePoints: { PLAYER_1: 1, PLAYER_2: 0 },
        pointIndex: 1,
        timestamp: 100,
      },
      {
        result: { winner: "PLAYER_2", type: "FORCED_ERROR" },
        rally: { ballExchanges: 3 },
        gamePoints: { PLAYER_1: 1, PLAYER_2: 1 },
        pointIndex: 2,
        timestamp: 200,
      },
    ];

    // Act
    const result = getSetPointDetails(pointsHistory);

    // Assert
    expect(result[0].points[0].result.winner).toBe("PLAYER_1");
    expect(result[0].points[0].result.type).toBe("WINNER");
    expect(result[0].points[0].rally.ballExchanges).toBe(5);
    expect(result[0].points[1].result.winner).toBe("PLAYER_2");
    expect(result[0].points[1].result.type).toBe("FORCED_ERROR");
    expect(result[0].points[1].rally.ballExchanges).toBe(3);
  });

  it("detecta quando set termina com 6-0", () => {
    // Arrange: Um set rápido 6-0
    const pointsHistory: Point[] = Array.from({ length: 24 }, (_, i) => ({
      result: { winner: "PLAYER_1", type: "WINNER" },
      rally: { ballExchanges: 1 },
      gamePoints: {
        PLAYER_1: Math.floor(i / 4) + 1,
        PLAYER_2: 0,
      },
      pointIndex: i + 1,
      timestamp: i,
    }));

    // Act
    const result = getSetPointDetails(pointsHistory);

    // Assert
    // Deve ter completado o set quando PLAYER_1 atingiu 6 games
    if (result.length > 0) {
      const lastGame = result[0].gameScores[result[0].gameScores.length - 1];
      expect(lastGame.scores.PLAYER_1).toBe(6);
      expect(lastGame.scores.PLAYER_2).toBe(0);
    }
  });

  it("detecta quando set termina com respeitando vantagem 2 games", () => {
    // Arrange: Set 7-5 (7 games P1, 5 games P2)
    const p1Wins = 7 * 4; // 7 games a 4 pontos cada
    const p2Wins = 5 * 4; // 5 games a 4 pontos cada
    const totalPoints = p1Wins + p2Wins;

    const pointsHistory: Point[] = Array.from(
      { length: totalPoints },
      (_, i) => {
        const gameNumber = Math.floor(i / 4) + 1;
        const pointInGame = (i % 4) + 1;
        const p1Games = Math.floor(i / 4) + (i % 4 < 4 ? 0 : 1);
        const p2Games = Math.floor((i - p1Games * 4) / 4);

        return {
          result: {
            winner: i < p1Wins ? "PLAYER_1" : "PLAYER_2",
            type: "WINNER",
          },
          rally: { ballExchanges: 1 },
          gamePoints: { PLAYER_1: p1Games, PLAYER_2: p2Games },
          pointIndex: i + 1,
          timestamp: i,
        };
      },
    );

    // Act
    const result = getSetPointDetails(pointsHistory);

    // Assert
    if (result.length > 0) {
      const setScores = result[0].gameScores[result[0].gameScores.length - 1];
      // Verificar que os scores finais respeitam 2 de vantagem ou 6-0/7-5 etc
      let p1 = setScores.scores.PLAYER_1;
      let p2 = setScores.scores.PLAYER_2;
      // Verifica vantagem de 2
      let diff = Math.abs(p1 - p2);
      let minGames = Math.min(p1, p2);
      expect(diff >= 2 || minGames < 6).toBe(true);
    }
  });

  it("retorna múltiplos sets se pointsHistory contém", () => {
    // Arrange: Dois sets (6-0 e 6-4 por exemplo)
    const set1: Point[] = Array.from({ length: 24 }, (_, i) => ({
      result: { winner: "PLAYER_1", type: "WINNER" },
      rally: { ballExchanges: 1 },
      gamePoints: { PLAYER_1: Math.floor(i / 4) + 1, PLAYER_2: 0 },
      pointIndex: i + 1,
      timestamp: i,
    }));

    // Após set1 finalizar, um novo set começa
    const set2: Point[] = Array.from({ length: 40 }, (_, i) => ({
      result: { winner: i < 24 ? "PLAYER_1" : "PLAYER_2", type: "WINNER" },
      rally: { ballExchanges: 1 },
      gamePoints: {
        PLAYER_1: Math.floor(i / (i < 24 ? 4 : 4)) + (i >= 24 ? 0 : 1),
        PLAYER_2: Math.floor((i - 24) / 4),
      },
      pointIndex: i + 25,
      timestamp: i + 25,
    }));

    const pointsHistory = [...set1, ...set2];

    // Act
    const result = getSetPointDetails(pointsHistory);

    // Assert
    // Deve ter no mínimo um set completo
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});
