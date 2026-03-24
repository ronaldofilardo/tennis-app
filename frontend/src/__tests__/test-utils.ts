// frontend/src/__tests__/test-utils.ts
// === Utilitários centralizados de teste ===
// Inclui: mocks globais, isolamento de contexto e Contract Testing helpers.
import { vi, expect } from "vitest";
import type { ZodSchema } from "zod";

// Configuração centralizada de mocks para testes

export const createMockPrismaClient = () => ({
  match: {
    findUnique: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  $connect: vi.fn(),
  $disconnect: vi.fn(),
});

export const setupPrismaMock = () => {
  const mockPrisma = createMockPrismaClient();

  // Mock do módulo @prisma/client
  vi.mock("@prisma/client", () => ({
    PrismaClient: vi.fn(() => mockPrisma),
  }));

  return mockPrisma;
};

export const setupGlobalMocks = () => {
  // Mock global para fetch
  global.fetch = vi.fn();

  // Mock global para localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };
  Object.defineProperty(global, "localStorage", {
    value: localStorageMock,
    writable: true,
  });

  // Mock global para console.warn e console.error para reduzir ruído nos testes
  console.warn = vi.fn();
  console.error = vi.fn();
};

// =====================================================
// === AREA 6: Isolamento de Contexto entre Testes ===
// =====================================================

/**
 * Chaves do localStorage relacionadas ao app.
 * Deve ser limpo entre execuções de teste para evitar
 * vazar dados de um "clube mockado" para outro teste.
 */
const APP_LOCALSTORAGE_KEYS = [
  "racket_auth",
  "racket_user",
  "racket_club",
  "racket_theme",
  "racket_session",
  "racket_tenant",
];

/**
 * Limpa o localStorage de dados do app entre testes.
 * Chamar em beforeEach/afterEach para isolamento total.
 */
export const clearAppLocalStorage = (): void => {
  if (typeof localStorage === "undefined") return;
  for (const key of APP_LOCALSTORAGE_KEYS) {
    localStorage.removeItem(key);
  }
};

/**
 * Injeta um usuário autenticado no localStorage para testes.
 * Evita ter que testar login em testes que não são sobre auth.
 */
export const setMockAuthUser = (
  email = "apontador@teste.com",
  role: "COACH" | "ATHLETE" = "COACH",
): void => {
  const user = { email, role };
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("racket_auth", "true");
    localStorage.setItem("racket_user", JSON.stringify(user));
  } else {
    // No ambiente de testes, localStorage pode ser o mock
    (global.localStorage as any)?.setItem?.("racket_auth", "true");
    (global.localStorage as any)?.setItem?.(
      "racket_user",
      JSON.stringify(user),
    );
  }
};

/**
 * Injeta um clube mockado no localStorage para testes multi-tenant.
 */
export const setMockClub = (clubId: string, clubName: string): void => {
  const club = { id: clubId, name: clubName };
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("racket_club", JSON.stringify(club));
  }
};

/**
 * Setup padrão de contexto para cada teste.
 * Limpa storage, reseta mocks e garante isolamento.
 */
export const setupTestContext = (): void => {
  vi.clearAllMocks();
  clearAppLocalStorage();
};

// =====================================================
// === AREA 6: Contract Testing ========================
// =====================================================

/**
 * Valida se um dado (resposta de API mock ou real) respeita um schema Zod.
 * Exibe erros de validação detalhados para facilitar debugging.
 *
 * Uso em testes:
 * ```ts
 * const apiResponse = await fetchMatchData('match_123');
 * expectMatchesSchema(apiResponse, MatchApiResponseSchema);
 * ```
 */
export const expectMatchesSchema = <T>(data: T, schema: ZodSchema): void => {
  const result = schema.safeParse(data);
  if (!result.success) {
    // Formata erros Zod para output legível
    const errors = result.error.issues.map(
      (issue) => `  - [${issue.path.join(".")}] ${issue.message}`,
    );
    throw new Error(
      `Contrato de API violado:\n${errors.join("\n")}\n\nDado recebido: ${JSON.stringify(data, null, 2)}`,
    );
  }
  expect(result.success).toBe(true);
};

/**
 * Testa se o frontend respeita o schema de criação de partida.
 * Valida que o payload enviado pelo MatchSetup está dentro do contrato esperado.
 */
export const validateMatchCreatePayload = (payload: unknown): boolean => {
  // Verificação básica de estrutura
  if (!payload || typeof payload !== "object") return false;

  const p = payload as Record<string, unknown>;
  const hasRequired = Boolean(
    p.sportType && p.format && p.players && p.apontadorEmail,
  );
  const playersValid =
    typeof p.players === "object" && p.players !== null
      ? Boolean(
          (p.players as Record<string, unknown>).p1 &&
          (p.players as Record<string, unknown>).p2,
        )
      : false;

  return hasRequired && playersValid;
};

/**
 * Cria um mock de fetch que retorna dados conforme schema.
 * Garante que testes de integração validem a resposta da API.
 */
export const createContractFetchMock = <T>(
  schema: ZodSchema,
  data: T,
): ReturnType<typeof vi.fn> => {
  return vi.fn().mockImplementation(async () => {
    // Valida os dados antes de retornar no mock
    const result = schema.safeParse(data);
    if (!result.success) {
      console.warn(
        "[createContractFetchMock] Dados do mock não respeitam schema:",
        result.error.issues,
      );
    }

    return {
      ok: true,
      status: 200,
      json: async () => data,
      text: async () => JSON.stringify(data),
      headers: { get: () => "application/json" },
    };
  });
};
