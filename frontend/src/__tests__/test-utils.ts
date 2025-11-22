// frontend/src/__tests__/test-utils.ts
import { vi } from 'vitest';

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
  vi.mock('@prisma/client', () => ({
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
  Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  // Mock global para console.warn e console.error para reduzir ruído nos testes
  console.warn = vi.fn();
  console.error = vi.fn();
};