/**
 * Script de migração de dados legados para o novo sistema de roles.
 *
 * Executa as seguintes atualizações no banco de dados:
 *   - ClubMembership: PLAYER / player  → ATHLETE
 *   - ClubMembership: annotator        → SPECTATOR
 *   - Match: visibility NULL / ''      → PLAYERS_ONLY
 *
 * Uso:
 *   $env:DATABASE_URL="postgresql://postgres:123456@localhost:5432/racket_mvp?schema=public&sslmode=disable"
 *   node scripts/migrate-roles.js
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Migração de dados legados ===\n");

  // ─────────────────────────────────────────────────────────────────────────
  // 1. ClubMembership: PLAYER / player → ATHLETE
  // ─────────────────────────────────────────────────────────────────────────
  const playerToAthlete = await prisma.clubMembership.updateMany({
    where: { role: { in: ["PLAYER", "player"] } },
    data: { role: "ATHLETE" },
  });
  console.log(
    `✅ ClubMembership PLAYER → ATHLETE: ${playerToAthlete.count} registro(s) atualizado(s)`,
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 2. ClubMembership: annotator → SPECTATOR
  // ─────────────────────────────────────────────────────────────────────────
  const annotatorToSpectator = await prisma.clubMembership.updateMany({
    where: { role: "annotator" },
    data: { role: "SPECTATOR" },
  });
  console.log(
    `✅ ClubMembership annotator → SPECTATOR: ${annotatorToSpectator.count} registro(s) atualizado(s)`,
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Match: visibility '' → PLAYERS_ONLY
  //    (visibility é NOT NULL com default, então apenas string vazia é possível)
  // ─────────────────────────────────────────────────────────────────────────
  const emptyVisibility = await prisma.match.updateMany({
    where: { visibility: "" },
    data: { visibility: "PLAYERS_ONLY" },
  });
  console.log(
    `✅ Match visibility '' → PLAYERS_ONLY: ${emptyVisibility.count} registro(s) atualizado(s)`,
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 4. User: role legado (se coluna existir no schema futuro)
  //    Apenas como referência — User.role não é gerenciado no schema atual.
  // ─────────────────────────────────────────────────────────────────────────

  console.log("\n✔ Migração concluída com sucesso.");
}

main()
  .catch((e) => {
    console.error("❌ Erro durante a migração:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
