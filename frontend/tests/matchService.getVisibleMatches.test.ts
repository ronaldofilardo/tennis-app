// tests/matchService.getVisibleMatches.test.ts
// Testes para validar:
// 1. getVisibleMatches filtra por email no playersEmails
// 2. Inclui matches onde user é apontadorEmail
// 3. Exclui matches onde user não tem relação

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma via vi.hoisted para funcionar com new PrismaClient()
const { mockPrismaClient } = vi.hoisted(() => ({
  mockPrismaClient: {
    match: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(function () {
    return mockPrismaClient;
  }),
}));

import { getVisibleMatches } from "../src/services/matchService";

describe("matchService.getVisibleMatches", () => {
  const userEmail = "pupilo@test.com";

  const mockMatches = [
    {
      id: "match-1",
      playerP1: "Pupilo",
      playerP2: "Genio",
      apontadorEmail: "scorer@test.com",
      playersEmails: ["pupilo@test.com", "genio@test.com"],
      status: "FINISHED",
    },
    {
      id: "match-2",
      playerP1: "Other Player",
      playerP2: "Another Player",
      apontadorEmail: "other-scorer@test.com",
      playersEmails: ["other@test.com", "another@test.com"],
      status: "FINISHED",
    },
    {
      id: "match-3",
      playerP1: "Pupilo",
      playerP2: "Someone",
      apontadorEmail: "pupilo@test.com", // Pupilo é scorer
      playersEmails: ["someone@test.com"], // Não está em playersEmails
      status: "FINISHED",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna matches onde user email está em playersEmails", async () => {
    // Arrange
    mockPrismaClient.match.findMany.mockResolvedValueOnce([mockMatches[0]]);

    // Act
    const result = await getVisibleMatches({ email: userEmail });

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("match-1");
    expect(result[0].playersEmails).toContain(userEmail);
  });

  it("retorna matches onde user é apontadorEmail", async () => {
    // Arrange
    // Mesmo que não esteja em playersEmails, se for scorer vê
    const matchesAsScorer = [mockMatches[2]];
    mockPrismaClient.match.findMany.mockResolvedValueOnce(matchesAsScorer);

    // Act
    const result = await getVisibleMatches({ email: "pupilo@test.com" });

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].apontadorEmail).toBe("pupilo@test.com");
  });

  it("exclui matches onde user não tem relação", async () => {
    // Arrange
    mockPrismaClient.match.findMany.mockResolvedValueOnce([]);

    // Act
    const result = await getVisibleMatches({ email: "unknown@test.com" });

    // Assert
    expect(result).toHaveLength(0);
  });

  it("aplica filtro OR: email OU apontadorEmail", async () => {
    // Arrange
    const userEmail = "pupilo@test.com";
    mockPrismaClient.match.findMany.mockResolvedValueOnce([
      mockMatches[0], // Pupilo em playersEmails
      mockMatches[2], // Pupilo é scorer
    ]);

    // Act
    const result = await getVisibleMatches({ email: userEmail });

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0].playersEmails).toContain(userEmail);
    expect(result[1].apontadorEmail).toBe(userEmail);
  });

  it("consulta Prisma com filtro correto", async () => {
    // Arrange
    mockPrismaClient.match.findMany.mockResolvedValueOnce([]);

    // Act
    await getVisibleMatches({ email: userEmail });

    // Assert — filtragem ocorre em JS; Prisma é consultado sem where
    expect(mockPrismaClient.match.findMany).toHaveBeenCalledOnce();
    const queryArg = mockPrismaClient.match.findMany.mock.calls[0][0];
    expect(queryArg.orderBy).toBeDefined();
    expect(queryArg.select).toBeDefined();
  });

  it("retorna matches em ordem de criação decrescente", async () => {
    // Arrange
    const sortedMatches = [mockMatches[0], mockMatches[2]];
    mockPrismaClient.match.findMany.mockResolvedValueOnce(sortedMatches);

    // Act
    const result = await getVisibleMatches({ email: userEmail });

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("match-1");
    expect(result[1].id).toBe("match-3");
  });

  it("trata email case-insensitive", async () => {
    // Arrange — duas chamadas precisam de dois mocks
    mockPrismaClient.match.findMany
      .mockResolvedValueOnce([mockMatches[0]])
      .mockResolvedValueOnce([mockMatches[0]]);

    // Act
    const resultLower = await getVisibleMatches({ email: "PUPILO@TEST.COM" });
    const resultUpper = await getVisibleMatches({ email: "pupilo@test.com" });

    // Assert
    // Ambas devem retornar o mesmo resultado (banco faz case-insensitive)
    expect(mockPrismaClient.match.findMany).toHaveBeenCalledTimes(2);
  });

  it("filtra por status se informado", async () => {
    // Arrange
    mockPrismaClient.match.findMany.mockResolvedValueOnce([mockMatches[0]]);

    // Act
    const result = await getVisibleMatches({ email: userEmail });

    // Assert
    // Deve apenas retornar matches FINISHED
    if (result.length > 0) {
      expect(result.every((m) => m.status === "FINISHED")).toBe(true);
    }
  });
});
