import { vi } from 'vitest'
import '@testing-library/jest-dom'
import { setupGlobalMocks } from './src/__tests__/test-utils'

// Adiciona variável de ambiente DATABASE_URL para testes Prisma
process.env.DATABASE_URL = 'postgresql://postgres:123456@localhost:5432/racket_mvp?schema=public&sslmode=disable';

// Mock global de PrismaClient ANTES de qualquer importação
vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    match: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };

  return {
    PrismaClient: vi.fn(() => mockPrismaClient),
  };
});

// Configura mocks globais
setupGlobalMocks()// Função utilitária para resetar mocks globais
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
if (typeof (globalThis as any).resetGlobalMocks !== 'function' && typeof (global as any).resetGlobalMocks !== 'function') {
  // eslint-disable-next-line no-console
  console.error('resetGlobalMocks NÃO está disponível no global!');
} else {
  // eslint-disable-next-line no-console
  console.log('resetGlobalMocks registrada no global/globalThis.');
}