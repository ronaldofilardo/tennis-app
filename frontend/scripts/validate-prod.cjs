// Script de validação pré-migração — verifica estado do PROD antes de db push
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("\n=== VALIDAÇÃO PRÉ-MIGRAÇÃO (PROD) ===\n");

  const [statuses, visibilities, roles, athleteCount, matchCount] =
    await Promise.all([
      prisma.$queryRawUnsafe(
        "SELECT DISTINCT status FROM club_memberships ORDER BY status",
      ),
      prisma.$queryRawUnsafe(
        "SELECT DISTINCT visibility FROM matches ORDER BY visibility",
      ),
      prisma.$queryRawUnsafe(
        "SELECT DISTINCT role FROM club_memberships ORDER BY role",
      ),
      prisma.$queryRawUnsafe("SELECT COUNT(*) AS cnt FROM athlete_profiles"),
      prisma.$queryRawUnsafe("SELECT COUNT(*) AS cnt FROM matches"),
    ]);

  console.log(
    "club_memberships.status:",
    statuses.map((r) => r.status).join(", "),
  );
  console.log(
    "matches.visibility:",
    visibilities.map((r) => r.visibility).join(", "),
  );
  console.log("club_memberships.role:", roles.map((r) => r.role).join(", "));
  console.log("athlete_profiles total:", Number(athleteCount[0].cnt));
  console.log("matches total:", Number(matchCount[0].cnt));

  // Verificar valores inválidos em roles
  const VALID_ROLES = ["ADMIN", "GESTOR", "COACH", "ATHLETE", "SPECTATOR"];
  const invalidRoles = roles
    .map((r) => r.role)
    .filter((r) => !VALID_ROLES.includes(r));
  if (invalidRoles.length > 0) {
    console.warn("\n⚠️  ROLES INVÁLIDAS ENCONTRADAS:", invalidRoles);
    console.warn("   Execute scripts/migrate-roles.js antes de continuar!\n");
  } else {
    console.log("\n✅ Todos os roles são válidos");
  }

  // Verificar colunas legadas ainda presentes
  const legacyCols = await prisma.$queryRawUnsafe(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'matches'
      AND column_name IN ('scorerId','scorerName','scorerStatus','isCentralMatch','originatedFromCentralMatchId')
  `);
  if (legacyCols.length > 0) {
    console.log(
      "\n📋 Colunas legadas presentes em matches (serão removidas):",
      legacyCols.map((c) => c.column_name).join(", "),
    );
  } else {
    console.log("✅ Nenhuma coluna legada em matches");
  }

  // Verificar se globalId já existe em athlete_profiles
  const globalIdExists = await prisma.$queryRawUnsafe(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'athlete_profiles' AND column_name = 'globalId'
  `);
  if (globalIdExists.length > 0) {
    console.log("✅ globalId já existe em athlete_profiles");
  } else {
    console.log(
      "\n⚠️  globalId NÃO existe em athlete_profiles — será criado como NOT NULL",
    );
    console.log(
      "   Prisma usará @default(cuid()) para preencher todos os registros existentes",
    );
  }
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
