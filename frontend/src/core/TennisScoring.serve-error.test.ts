import { TennisScoring } from "./scoring/TennisScoring";
import type { Player, TennisFormat } from "./scoring/types";
import { describe, test, expect } from "vitest";

describe("TennisScoring - PointDetails com Serve Error (errorType, firstFault)", () => {
  const PLAYER_1: Player = "PLAYER_1";
  const PLAYER_2: Player = "PLAYER_2";

  function createMatch(
    format: TennisFormat = "BEST_OF_3",
    server: Player = PLAYER_1,
  ) {
    return new TennisScoring(server, format);
  }

  test('Aceita PointDetails com serve.errorType="out" no 1º saque', () => {
    const match = createMatch();
    const pointDetails = {
      serve: {
        type: "OUT" as const,
        isFirstServe: true,
        errorType: "out" as const,
        serveEffect: "TopSpin" as const,
        direction: "Aberto" as const,
      },
      result: { winner: PLAYER_2, type: "FORCED_ERROR" as const },
      rally: { ballExchanges: 1 },
    };

    // Não deve lançar erro ao adicionar ponto com errorType
    expect(() => match.addPoint(PLAYER_2, pointDetails)).not.toThrow();
    expect(match.getState().pointsHistory).toHaveLength(1);
    expect(match.getState().pointsHistory[0]).toMatchObject({
      serve: expect.objectContaining({ errorType: "out" }),
    });
  });

  test('Aceita PointDetails com serve.errorType="net" no 1º saque', () => {
    const match = createMatch();
    const pointDetails = {
      serve: {
        type: "NET" as const,
        isFirstServe: true,
        errorType: "net" as const,
        serveEffect: "Slice" as const,
        direction: "Fechado" as const,
      },
      result: { winner: PLAYER_2, type: "FORCED_ERROR" as const },
      rally: { ballExchanges: 1 },
    };

    expect(() => match.addPoint(PLAYER_2, pointDetails)).not.toThrow();
    expect(match.getState().pointsHistory[0]).toMatchObject({
      serve: expect.objectContaining({ errorType: "net" }),
    });
  });

  test("Aceita PointDetails com serve.firstFault para dupla falta (2º saque com erro)", () => {
    const match = createMatch();
    const pointDetails = {
      serve: {
        type: "DOUBLE_FAULT" as const,
        isFirstServe: false,
        errorType: "out" as const,
        firstFault: {
          errorType: "out" as const,
          serveEffect: "TopSpin" as const,
          direction: "Centro" as const,
        },
      },
      result: { winner: PLAYER_2, type: "FORCED_ERROR" as const },
      rally: { ballExchanges: 1 },
    };

    expect(() => match.addPoint(PLAYER_2, pointDetails)).not.toThrow();
    expect(match.getState().pointsHistory[0]).toMatchObject({
      serve: expect.objectContaining({
        type: "DOUBLE_FAULT",
        errorType: "out",
        firstFault: expect.objectContaining({
          errorType: "out",
        }),
      }),
    });
  });

  test("Preserva serveEffect e direction em firstFault para dupla falta", () => {
    const match = createMatch();
    const pointDetails = {
      serve: {
        type: "DOUBLE_FAULT" as const,
        isFirstServe: false,
        errorType: "net" as const,
        serveEffect: "Flat" as const,
        direction: "Aberto" as const,
        firstFault: {
          errorType: "out" as const,
          serveEffect: "TopSpin" as const,
          direction: "Fechado" as const,
        },
      },
      result: { winner: PLAYER_2, type: "FORCED_ERROR" as const },
      rally: { ballExchanges: 1 },
    };

    match.addPoint(PLAYER_2, pointDetails);
    const recorded = match.getState().pointsHistory[0];

    // 2º saque tem seus próprios detalhes
    expect(recorded.serve.errorType).toBe("net");
    expect(recorded.serve.serveEffect).toBe("Flat");
    expect(recorded.serve.direction).toBe("Aberto");

    // firstFault tem os detalhes do 1º saque
    expect(recorded.serve.firstFault?.errorType).toBe("out");
    expect(recorded.serve.firstFault?.serveEffect).toBe("TopSpin");
    expect(recorded.serve.firstFault?.direction).toBe("Fechado");
  });

  test("Dupla falta marca ponto para o adversário", () => {
    const match = createMatch();
    const pointDetails = {
      serve: {
        type: "DOUBLE_FAULT" as const,
        isFirstServe: false,
        errorType: "out" as const,
        firstFault: {
          errorType: "net" as const,
        },
      },
      result: { winner: PLAYER_2, type: "FORCED_ERROR" as const },
      rally: { ballExchanges: 1 },
    };

    match.addPoint(PLAYER_2, pointDetails);
    const state = match.getState();

    // PLAYER_2 deve ter 1 ponto (15)
    expect(state.currentGame.points.PLAYER_2).toBe("15");
    expect(state.currentGame.points.PLAYER_1).toBe("0");
  });

  test("Permite fluxo completo: 1º falta Out + 2º falta Net = Dupla Falta", () => {
    const match = createMatch();

    // 1º falta: Out
    const firstFault = {
      serve: {
        type: "OUT" as const,
        isFirstServe: true,
        errorType: "out" as const,
        serveEffect: "TopSpin" as const,
        direction: "Centro" as const,
      },
      result: { winner: PLAYER_2, type: "FORCED_ERROR" as const },
      rally: { ballExchanges: 1 },
    };

    match.addPoint(PLAYER_2, firstFault);
    expect(match.getState().pointsHistory).toHaveLength(1);

    // 2º falta: Net com referência à primeira falta
    const secondFault = {
      serve: {
        type: "DOUBLE_FAULT" as const,
        isFirstServe: false,
        errorType: "net" as const,
        serveEffect: "Slice" as const,
        direction: "Aberto" as const,
        firstFault: {
          errorType: "out" as const,
          serveEffect: "TopSpin" as const,
          direction: "Centro" as const,
        },
      },
      result: { winner: PLAYER_2, type: "FORCED_ERROR" as const },
      rally: { ballExchanges: 1 },
    };

    match.addPoint(PLAYER_2, secondFault);
    expect(match.getState().pointsHistory).toHaveLength(2);

    // Verificar que ambas as faltas estão registradas
    expect(match.getState().pointsHistory[0].serve.errorType).toBe("out");
    expect(match.getState().pointsHistory[1].serve.type).toBe("DOUBLE_FAULT");
    expect(match.getState().pointsHistory[1].serve.firstFault?.errorType).toBe(
      "out",
    );
  });
});
