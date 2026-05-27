import { vi } from 'vitest';
import '@testing-library/jest-dom';

// CSS mocking desabilitado — Vite handle CSS imports

// Adiciona variável de ambiente DATABASE_URL para testes Prisma
process.env.DATABASE_URL =
  'postgresql://postgres:123456@localhost:5432/racket_mvp?schema=public&sslmode=disable';

// Armazena as funções originais do console
const originalWarn = console.warn;
const originalError = console.error;

// Configuração centralizada de mocks para testes
const setupGlobalMocks = () => {
  // Mock global para fetch
  global.fetch = vi.fn();

  // Mock global para localStorage com persistência interna
  const createLocalStorageMock = () => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = String(value);
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
      get length() {
        return Object.keys(store).length;
      },
      key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    };
  };
  const localStorageMock = createLocalStorageMock();
  Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  // Mock global para console.warn e console.error para reduzir ruído nos testes
  console.warn = vi.fn();
  console.error = vi.fn();
};

// Configura mocks globais
setupGlobalMocks(); // Função utilitária para resetar mocks globais

// Mock global de PrismaClient ANTES de qualquer importação
vi.mock('@prisma/client', () => {
  class PrismaClient {
    match = {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    };
    matchAnnotationSession = {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    };
    user = {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    };
    $connect = vi.fn();
    $disconnect = vi.fn();
  }
  return { PrismaClient };
});

(globalThis as any).resetGlobalMocks = () => {
  vi.clearAllMocks();
  console.warn = originalWarn;
  console.error = originalError;
};
// Também define em global para máxima compatibilidade
try {
  (global as any).resetGlobalMocks = (globalThis as any).resetGlobalMocks;
} catch {}
// Debug: Confirma registro global
if (
  typeof (globalThis as any).resetGlobalMocks !== 'function' &&
  typeof (global as any).resetGlobalMocks !== 'function'
) {
  // eslint-disable-next-line no-console
  console.error('resetGlobalMocks NÃO está disponível no global!');
} else {
  // eslint-disable-next-line no-console
  console.log('resetGlobalMocks registrada no global/globalThis.');
}
