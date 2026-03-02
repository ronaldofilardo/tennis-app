// frontend/api/_lib/prisma.js
// Instância compartilhada do PrismaClient para Vercel Serverless.
// Evita criar múltiplas conexões em hot-reloads e re-invocações.

import { PrismaClient } from "@prisma/client";

/** @type {PrismaClient} */
let prisma;

if (typeof globalThis !== "undefined" && globalThis.__prisma) {
  prisma = globalThis.__prisma;
} else {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
  });
  if (typeof globalThis !== "undefined") {
    globalThis.__prisma = prisma;
  }
}

export default prisma;
