#!/usr/bin/env node
/**
 * export-dev-data.cjs
 * Exporta dados do banco DEV (racket_mvp) para JSON.
 * Escopo: clubs, users, club_memberships, athlete_profiles, matches
 */

"use strict";

const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const DEV_URL = "postgresql://postgres:123456@localhost:5432/racket_mvp";
const OUTPUT_FILE = path.join(__dirname, "dev-data-export.json");

async function main() {
  const client = new Client({ connectionString: DEV_URL });
  await client.connect();
  console.log("🔗 Conectado ao DEV (racket_mvp)");

  const data = {};

  // ── 1. clubs ──────────────────────────────────────────────
  const clubs = await client.query(`
    SELECT id, name, slug, "planType", "inviteCode",
           "defaultVisibility", "defaultScoreMode", "billingModel",
           "createdAt", "updatedAt"
    FROM clubs
    ORDER BY "createdAt"
  `);
  data.clubs = clubs.rows;
  console.log(`✅ clubs: ${clubs.rows.length} registros`);

  // ── 2. users ──────────────────────────────────────────────
  const users = await client.query(`
    SELECT id, email, name, "passwordHash", "avatarUrl",
           "isActive", "createdAt", "updatedAt"
    FROM users
    ORDER BY "createdAt"
  `);
  data.users = users.rows;
  console.log(`✅ users: ${users.rows.length} registros`);

  // ── 3. club_memberships ───────────────────────────────────
  const memberships = await client.query(`
    SELECT id, "userId", "clubId", role, "invitedByUserId",
           status, "guardianEmail", "guardianConsentAt",
           "dataExportRequestedAt", "deletionRequestedAt",
           "asaasPaymentId", "alsoCoach", "joinedAt"
    FROM club_memberships
    ORDER BY "joinedAt"
  `);
  data.club_memberships = memberships.rows;
  console.log(`✅ club_memberships: ${memberships.rows.length} registros`);

  // ── 4. athlete_profiles ───────────────────────────────────
  const athletes = await client.query(`
    SELECT id, "globalId", "userId", name, nickname, "birthDate",
           phone, ranking, category, gender, "clubId", "isPublic",
           cpf, entity, "fatherName", "fatherCpf",
           "motherName", "motherCpf", "docRgUrl", "docMedicalCertUrl",
           "createdAt", "updatedAt"
    FROM athlete_profiles
    ORDER BY "createdAt"
  `);
  data.athlete_profiles = athletes.rows;
  console.log(`✅ athlete_profiles: ${athletes.rows.length} registros`);

  // ── 5. matches ────────────────────────────────────────────
  const matches = await client.query(`
    SELECT id, "sportType", format, nickname, "courtType",
           "apontadorEmail", "playerP1", "playerP2", "playersEmails",
           "createdByUserId", "clubId", "player1Id", "player2Id",
           "tournamentId", "categoryId", "roundNumber", "bracketPosition",
           visibility, status, score, winner,
           "createdAt", "updatedAt", "completedSets", "matchState"
    FROM matches
    ORDER BY "createdAt"
  `);
  data.matches = matches.rows;
  console.log(`✅ matches: ${matches.rows.length} registros`);

  await client.end();

  // Salvar JSON
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2), "utf8");
  console.log(`\n📦 Export salvo em: ${OUTPUT_FILE}`);

  // Resumo
  console.log("\n=== RESUMO ===");
  for (const [table, rows] of Object.entries(data)) {
    console.log(`  ${table}: ${rows.length}`);
  }
}

main().catch((err) => {
  console.error("❌ Erro:", err.message);
  process.exit(1);
});
