import { vi } from 'vitest'
import '@testing-library/jest-dom'

// Adiciona variável de ambiente DATABASE_URL para testes Prisma
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/testdb';

// Mock global de PrismaClient para evitar inicialização real em testes
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
const originalWarn = console.warn;
const originalError = console.error;
console.warn = vi.fn();
console.error = vi.fn();

// Função utilitária para resetar mocks globais
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