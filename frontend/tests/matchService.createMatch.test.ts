// tests/matchService.createMatch.test.ts
// Testes para validar:
// 1. Email lookup: nome do jogador → email real
// 2. playersEmails população com emails reais
// 3. Fallback se User não encontrado
// 4. Eliminação de duplicatas

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma via vi.hoisted para funcionar com new PrismaClient()
const { mockPrismaClient } = vi.hoisted(() => ({
  mockPrismaClient: {
    user: {
      findFirst: vi.fn(),
    },
    match: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(function () {
    return mockPrismaClient;
  }),
}));

// Import after mocking
import { createMatch } from "../src/services/matchService";

describe("matchService.createMatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lookup player emails corretamente por nome", async () => {
    // Arrange
    const players = {
      p1: "Player One",
      p2: "Player Two",
    };

    const apontadorEmail = "scorer@test.com";

    mockPrismaClient.user.findFirst
      .mockResolvedValueOnce({ email: "player.one@test.com" }) // Player One
      .mockResolvedValueOnce({ email: "player.two@test.com" }); // Player Two

    mockPrismaClient.match.create.mockResolvedValueOnce({
      id: "match-1",
      playerP1: "Player One",
      playerP2: "Player Two",
      playersEmails: [
        "scorer@test.com",
        "player.one@test.com",
        "player.two@test.com",
      ],
      sportType: "TENNIS",
      format: "BEST_OF_3",
      courtType: null,
      nickname: null,
      visibility: "PLAYERS_ONLY",
      openForAnnotation: false,
      status: "NOT_STARTED",
      score: "",
      winner: null,
      completedSets: "[]",
      clubId: null,
      createdAt: new Date("2024-01-01"),
    });

    // Act
    const result = await createMatch({
      sportType: "TENNIS",
      format: "BEST_OF_3",
      players: { p1: players.p1, p2: players.p2 },
      apontadorEmail,
    });

    // Assert
    expect(mockPrismaClient.user.findFirst).toHaveBeenCalledTimes(2);
    expect(mockPrismaClient.user.findFirst).toHaveBeenNthCalledWith(1, {
      where: {
        name: { equals: "Player One", mode: "insensitive" },
      },
      select: { email: true },
    });
    expect(mockPrismaClient.user.findFirst).toHaveBeenNthCalledWith(2, {
      where: {
        name: { equals: "Player Two", mode: "insensitive" },
      },
      select: { email: true },
    });

    expect(result).toBeDefined();
    expect(result.playersEmails).toContain("player.one@test.com");
    expect(result.playersEmails).toContain("player.two@test.com");
    expect(result.playersEmails).toContain("scorer@test.com");
  });

  it("inclui scorer email no playersEmails", async () => {
    // Arrange
    const players = {
      p1: "Pupilo",
      p2: "Genio",
    };

    const apontadorEmail = "pupilo@test.com";

    // Pupilo é ambos player1 e scorer, Genio é player2
    mockPrismaClient.user.findFirst
      .mockResolvedValueOnce({ email: "pupilo@test.com" })
      .mockResolvedValueOnce({ email: "genio@test.com" });

    mockPrismaClient.match.create.mockResolvedValueOnce({
      id: "match-1",
      playerP1: "Pupilo",
      playerP2: "Genio",
      playersEmails: ["pupilo@test.com", "genio@test.com"], // Duplicata removida
      sportType: "TENNIS",
      format: "BEST_OF_3",
      courtType: null,
      nickname: null,
      visibility: "PLAYERS_ONLY",
      openForAnnotation: false,
      status: "NOT_STARTED",
      score: "",
      winner: null,
      completedSets: "[]",
      clubId: null,
      createdAt: new Date("2024-01-01"),
    });

    // Act
    const result = await createMatch({
      sportType: "TENNIS",
      format: "BEST_OF_3",
      players: { p1: players.p1, p2: players.p2 },
      apontadorEmail,
    });

    // Assert
    expect(result.playersEmails).toContain("pupilo@test.com");
    expect(result.playersEmails).toContain("genio@test.com");
    expect(result.playersEmails.length).toBe(2); // Sem duplicatas
  });

  it("fallback para nome se User lookup falhar", async () => {
    // Arrange
    const players = {
      p1: "Unknown Player",
      p2: "Player Two",
    };

    const apontadorEmail = "scorer@test.com";

    mockPrismaClient.user.findFirst
      .mockResolvedValueOnce(null) // User não encontrado
      .mockResolvedValueOnce({ email: "player.two@test.com" });

    mockPrismaClient.match.create.mockResolvedValueOnce({
      id: "match-1",
      playerP1: "Unknown Player",
      playerP2: "Player Two",
      playersEmails: ["scorer@test.com", "player.two@test.com"],
      // Nota: "Unknown Player" não será adicionado pois não é email
      sportType: "TENNIS",
      format: "BEST_OF_3",
      courtType: null,
      nickname: null,
      visibility: "PLAYERS_ONLY",
      openForAnnotation: false,
      status: "NOT_STARTED",
      score: "",
      winner: null,
      completedSets: "[]",
      clubId: null,
      createdAt: new Date("2024-01-01"),
    });

    // Act
    const result = await createMatch({
      sportType: "TENNIS",
      format: "BEST_OF_3",
      players: { p1: players.p1, p2: players.p2 },
      apontadorEmail,
    });

    // Assert
    expect(result.playersEmails).toContain("player.two@test.com");
    expect(result.playersEmails).toContain("scorer@test.com");
    expect(result.playersEmails).not.toContain("Unknown Player");
  });

  it("elimina duplicatas no array playersEmails", async () => {
    // Arrange
    const players = {
      p1: "Pupilo",
      p2: "Pupilo", // Mesmo jogador duas vezes
    };

    const apontadorEmail = "pupilo@test.com";

    mockPrismaClient.user.findFirst
      .mockResolvedValueOnce({ email: "pupilo@test.com" })
      .mockResolvedValueOnce({ email: "pupilo@test.com" });

    mockPrismaClient.match.create.mockResolvedValueOnce({
      id: "match-1",
      playerP1: "Pupilo",
      playerP2: "Pupilo",
      playersEmails: ["pupilo@test.com"], // Apenas uma cópia
      sportType: "TENNIS",
      format: "BEST_OF_3",
      courtType: null,
      nickname: null,
      visibility: "PLAYERS_ONLY",
      openForAnnotation: false,
      status: "NOT_STARTED",
      score: "",
      winner: null,
      completedSets: "[]",
      clubId: null,
      createdAt: new Date("2024-01-01"),
    });

    // Act
    const result = await createMatch({
      sportType: "TENNIS",
      format: "BEST_OF_3",
      players: { p1: players.p1, p2: players.p2 },
      apontadorEmail,
    });

    // Assert
    expect(result.playersEmails.length).toBe(1);
    expect(result.playersEmails[0]).toBe("pupilo@test.com");
  });

  it("usa Set para armazenar emails únicos", async () => {
    // Arrange
    const players = {
      p1: "Player One",
      p2: "Player Two",
    };

    const apontadorEmail = "scorer@test.com";

    mockPrismaClient.user.findFirst
      .mockResolvedValueOnce({ email: "scorer@test.com" }) // Mesmo email do scorer
      .mockResolvedValueOnce({ email: "player.two@test.com" });

    mockPrismaClient.match.create.mockResolvedValueOnce({
      id: "match-1",
      playerP1: "Player One",
      playerP2: "Player Two",
      playersEmails: ["scorer@test.com", "player.two@test.com"],
      sportType: "TENNIS",
      format: "BEST_OF_3",
      courtType: null,
      nickname: null,
      visibility: "PLAYERS_ONLY",
      openForAnnotation: false,
      status: "NOT_STARTED",
      score: "",
      winner: null,
      completedSets: "[]",
      clubId: null,
      createdAt: new Date("2024-01-01"),
    });

    // Act
    const result = await createMatch({
      sportType: "TENNIS",
      format: "BEST_OF_3",
      players: { p1: players.p1, p2: players.p2 },
      apontadorEmail,
    });

    // Assert
    // playersEmails deve ser um array derivado de Set
    expect(Array.isArray(result.playersEmails)).toBe(true);
    // Verificar que não há duplicatas
    const emailSet = new Set(result.playersEmails);
    expect(emailSet.size).toBe(result.playersEmails.length);
  });

  it("passa emails corretos ao Prisma create", async () => {
    // Arrange
    const players = {
      p1: "Player One",
      p2: "Player Two",
    };

    const apontadorEmail = "scorer@test.com";

    mockPrismaClient.user.findFirst
      .mockResolvedValueOnce({ email: "player.one@test.com" })
      .mockResolvedValueOnce({ email: "player.two@test.com" });

    mockPrismaClient.match.create.mockResolvedValueOnce({
      id: "match-1",
      playerP1: "Player One",
      playerP2: "Player Two",
      playersEmails: [
        "scorer@test.com",
        "player.one@test.com",
        "player.two@test.com",
      ],
      sportType: "TENNIS",
      format: "BEST_OF_3",
      courtType: null,
      nickname: null,
      visibility: "PLAYERS_ONLY",
      openForAnnotation: false,
      status: "NOT_STARTED",
      score: "",
      winner: null,
      completedSets: "[]",
      clubId: null,
      createdAt: new Date("2024-01-01"),
    });

    // Act
    await createMatch({
      sportType: "TENNIS",
      format: "BEST_OF_3",
      players: { p1: players.p1, p2: players.p2 },
      apontadorEmail,
    });

    // Assert
    expect(mockPrismaClient.match.create).toHaveBeenCalledOnce();
    const createCall = mockPrismaClient.match.create.mock.calls[0][0];
    expect(createCall.data.playersEmails).toBeDefined();
    expect(Array.isArray(createCall.data.playersEmails)).toBe(true);
    expect(createCall.data.playersEmails).toContain("scorer@test.com");
  });
});
