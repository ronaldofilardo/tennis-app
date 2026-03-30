// frontend/api/_lib/prisma.ts
// Instância compartilhada do PrismaClient para Vercel Serverless.
// Evita criar múltiplas conexões em hot-reloads e re-invocações.

import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (globalThis.__prisma) {
  prisma = globalThis.__prisma;
} else {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
  });
  globalThis.__prisma = prisma;
}

export default prisma;
