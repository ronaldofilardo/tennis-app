#!/usr/bin/env node
"use strict";
const { Client } = require("pg");
const PROD_URL =
  "postgresql://neondb_owner:npg_pqYCRmvU2LD1@ep-damp-wave-ac2b16w3-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function main() {
  const c = new Client({ connectionString: PROD_URL });
  await c.connect();

  const orphanMembers = await c.query(`
    SELECT COUNT(*) FROM club_memberships cm
    WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = cm."userId")
       OR NOT EXISTS (SELECT 1 FROM clubs cl WHERE cl.id = cm."clubId")
  `);
  const orphanAthletes = await c.query(`
    SELECT COUNT(*) FROM athlete_profiles ap
    WHERE ap."userId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = ap."userId")
  `);
  const orphanMatches = await c.query(`
    SELECT COUNT(*) FROM matches m
    WHERE (m."clubId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clubs cl WHERE cl.id = m."clubId"))
       OR (m."player1Id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM athlete_profiles ap WHERE ap.id = m."player1Id"))
       OR (m."player2Id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM athlete_profiles ap WHERE ap.id = m."player2Id"))
  `);

  console.log("=== Integridade Referencial (PROD) ===");
  const mk = orphanMembers.rows[0].count;
  const ak = orphanAthletes.rows[0].count;
  const mmk = orphanMatches.rows[0].count;
  console.log("club_memberships órfãs:  ", mk, mk === "0" ? "✅" : "❌");
  console.log("athlete_profiles órfãs:  ", ak, ak === "0" ? "✅" : "❌");
  console.log("matches órfãos:          ", mmk, mmk === "0" ? "✅" : "❌");

  const users = await c.query(
    'SELECT email, name FROM users ORDER BY "createdAt"',
  );
  console.log("\nUsuários no PROD:");
  users.rows.forEach((u) => console.log("  -", u.name, "<" + u.email + ">"));

  const clubs = await c.query("SELECT name, slug FROM clubs");
  console.log("\nClubes no PROD:");
  clubs.rows.forEach((cl) => console.log("  -", cl.name, "(" + cl.slug + ")"));

  await c.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
