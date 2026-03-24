#!/usr/bin/env node
/**
 * import-prod-data.cjs
 * Limpa todos os dados do PROD e importa dados exportados do DEV.
 * OPERAÇÃO DESTRUTIVA — requer confirmação explícita.
 *
 * Uso: node scripts/import-prod-data.cjs --confirm
 */

"use strict";

const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const PROD_URL =
  "postgresql://neondb_owner:npg_pqYCRmvU2LD1@ep-damp-wave-ac2b16w3-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const EXPORT_FILE = path.join(__dirname, "dev-data-export.json");

// Proteção — deve passar --confirm explicitamente
if (!process.argv.includes("--confirm")) {
  console.error(
    "❌ OPERAÇÃO DESTRUTIVA. Execute com --confirm para prosseguir.",
  );
  process.exit(1);
}

function toTsOrNull(val) {
  return val ? new Date(val) : null;
}

async function main() {
  // Carregar dados exportados
  if (!fs.existsSync(EXPORT_FILE)) {
    console.error(`❌ Arquivo de export não encontrado: ${EXPORT_FILE}`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(EXPORT_FILE, "utf8"));

  console.log("📦 Dados carregados:");
  for (const [table, rows] of Object.entries(data)) {
    console.log(`  ${table}: ${rows.length}`);
  }

  const client = new Client({ connectionString: PROD_URL });
  await client.connect();
  console.log("\n🔗 Conectado ao PROD (neondb)");

  await client.query("BEGIN");
  console.log("\n🗑  Fase 1: Limpando PROD (TRUNCATE CASCADE)...");

  try {
    // Truncate em ordem reversa de FK dependency
    await client.query("TRUNCATE TABLE matches CASCADE");
    await client.query("TRUNCATE TABLE tournament_entries CASCADE");
    await client.query("TRUNCATE TABLE tournament_organizers CASCADE");
    await client.query("TRUNCATE TABLE tournament_categories CASCADE");
    await client.query("TRUNCATE TABLE tournaments CASCADE");
    await client.query("TRUNCATE TABLE athlete_profiles CASCADE");
    await client.query("TRUNCATE TABLE club_memberships CASCADE");
    await client.query("TRUNCATE TABLE invoices CASCADE");
    await client.query("TRUNCATE TABLE subscriptions CASCADE");
    await client.query("TRUNCATE TABLE users CASCADE");
    await client.query("TRUNCATE TABLE clubs CASCADE");
    console.log("✅ Todas as tabelas limpas");

    // ── 1. clubs ──────────────────────────────────────────────
    console.log("\n📥 Inserindo clubs...");
    for (const r of data.clubs) {
      await client.query(
        `INSERT INTO clubs (id, name, slug, "planType", "inviteCode",
           "defaultVisibility", "defaultScoreMode", "billingModel",
           "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          r.id,
          r.name,
          r.slug,
          r.planType,
          r.inviteCode,
          r.defaultVisibility,
          r.defaultScoreMode,
          r.billingModel,
          toTsOrNull(r.createdAt),
          toTsOrNull(r.updatedAt),
        ],
      );
    }
    console.log(`  ✅ ${data.clubs.length} clubs inseridos`);

    // ── 2. users ──────────────────────────────────────────────
    console.log("📥 Inserindo users...");
    for (const r of data.users) {
      await client.query(
        `INSERT INTO users (id, email, name, "passwordHash", "avatarUrl",
           "isActive", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          r.id,
          r.email,
          r.name,
          r.passwordHash,
          r.avatarUrl,
          r.isActive,
          toTsOrNull(r.createdAt),
          toTsOrNull(r.updatedAt),
        ],
      );
    }
    console.log(`  ✅ ${data.users.length} users inseridos`);

    // ── 3. club_memberships ───────────────────────────────────
    console.log("📥 Inserindo club_memberships...");
    for (const r of data.club_memberships) {
      await client.query(
        `INSERT INTO club_memberships
           (id, "userId", "clubId", role, "invitedByUserId",
            status, "guardianEmail", "guardianConsentAt",
            "dataExportRequestedAt", "deletionRequestedAt",
            "asaasPaymentId", "alsoCoach", "joinedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          r.id,
          r.userId,
          r.clubId,
          r.role,
          r.invitedByUserId,
          r.status,
          r.guardianEmail,
          toTsOrNull(r.guardianConsentAt),
          toTsOrNull(r.dataExportRequestedAt),
          toTsOrNull(r.deletionRequestedAt),
          r.asaasPaymentId,
          r.alsoCoach,
          toTsOrNull(r.joinedAt),
        ],
      );
    }
    console.log(`  ✅ ${data.club_memberships.length} memberships inseridos`);

    // ── 4. athlete_profiles ───────────────────────────────────
    console.log("📥 Inserindo athlete_profiles...");
    for (const r of data.athlete_profiles) {
      await client.query(
        `INSERT INTO athlete_profiles
           (id, "globalId", "userId", name, nickname, "birthDate",
            phone, ranking, category, gender, "clubId", "isPublic",
            cpf, entity, "fatherName", "fatherCpf",
            "motherName", "motherCpf", "docRgUrl", "docMedicalCertUrl",
            "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
                 $13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
        [
          r.id,
          r.globalId,
          r.userId,
          r.name,
          r.nickname,
          toTsOrNull(r.birthDate),
          r.phone,
          r.ranking,
          r.category,
          r.gender,
          r.clubId,
          r.isPublic,
          r.cpf,
          r.entity,
          r.fatherName,
          r.fatherCpf,
          r.motherName,
          r.motherCpf,
          r.docRgUrl,
          r.docMedicalCertUrl,
          toTsOrNull(r.createdAt),
          toTsOrNull(r.updatedAt),
        ],
      );
    }
    console.log(
      `  ✅ ${data.athlete_profiles.length} athlete_profiles inseridos`,
    );

    // ── 5. matches ────────────────────────────────────────────
    console.log("📥 Inserindo matches...");
    for (const r of data.matches) {
      await client.query(
        `INSERT INTO matches
           (id, "sportType", format, nickname, "courtType",
            "apontadorEmail", "playerP1", "playerP2", "playersEmails",
            "createdByUserId", "clubId", "player1Id", "player2Id",
            "tournamentId", "categoryId", "roundNumber", "bracketPosition",
            visibility, status, score, winner,
            "createdAt", "updatedAt", "completedSets", "matchState")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
                 $14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)`,
        [
          r.id,
          r.sportType,
          r.format,
          r.nickname,
          r.courtType,
          r.apontadorEmail,
          r.playerP1,
          r.playerP2,
          r.playersEmails,
          r.createdByUserId,
          r.clubId,
          r.player1Id,
          r.player2Id,
          r.tournamentId,
          r.categoryId,
          r.roundNumber,
          r.bracketPosition,
          r.visibility,
          r.status,
          r.score,
          r.winner,
          toTsOrNull(r.createdAt),
          toTsOrNull(r.updatedAt),
          r.completedSets,
          r.matchState,
        ],
      );
    }
    console.log(`  ✅ ${data.matches.length} matches inseridos`);

    await client.query("COMMIT");
    console.log("\n✅ COMMIT efetuado — dados importados com sucesso!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n❌ ROLLBACK — erro durante import:", err.message);
    await client.end();
    process.exit(1);
  }

  await client.end();

  console.log("\n=== RESUMO FINAL ===");
  console.log("Dados importados no PROD:");
  for (const [table, rows] of Object.entries(data)) {
    console.log(`  ${table}: ${rows.length}`);
  }
}

main().catch((err) => {
  console.error("❌ Erro fatal:", err.message);
  process.exit(1);
});
