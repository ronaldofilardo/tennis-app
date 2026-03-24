// Script para preencher globalId nos registros existentes no PROD
// antes de tornar a coluna NOT NULL
const { PrismaClient } = require("@prisma/client");
const { randomBytes } = require("crypto");

// Gerar um cuid-like usando crypto nativo
function generateId() {
  return randomBytes(16).toString("hex");
}

const prisma = new PrismaClient();

async function main() {
  console.log("\n=== PREENCHENDO globalId nos AthleteProfiles ===\n");

  const rows = await prisma.$queryRawUnsafe(
    `SELECT id FROM athlete_profiles WHERE "globalId" IS NULL`,
  );

  console.log(`Registros sem globalId: ${rows.length}`);

  for (const row of rows) {
    const gid = generateId();
    await prisma.$queryRawUnsafe(
      `UPDATE athlete_profiles SET "globalId" = $1 WHERE id = $2`,
      gid,
      row.id,
    );
    console.log(`  ✅ id=${row.id} → globalId=${gid}`);
  }

  const remaining = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS cnt FROM athlete_profiles WHERE "globalId" IS NULL`,
  );
  console.log(`\nRestam registros sem globalId: ${Number(remaining[0].cnt)}`);

  if (Number(remaining[0].cnt) === 0) {
    console.log("✅ Todos os registros têm globalId. Pronto para NOT NULL.");
  } else {
    console.error("❌ Ainda há registros sem globalId!");
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
