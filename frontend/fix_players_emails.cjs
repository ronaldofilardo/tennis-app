const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("\n=== BUSCANDO EMAILS DOS JOGADORES ===");

  // Buscar todos os usuários para mapping nome -> email
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
  });

  const nameToEmail = {};
  users.forEach((u) => {
    nameToEmail[u.name?.toLowerCase() || ""] = u.email;
  });

  console.log("\nMapeamento Nome -> Email:");
  Object.entries(nameToEmail).forEach(([name, email]) => {
    if (name) console.log(`  ${name} -> ${email}`);
  });

  console.log("\n=== CORRIGINDO PARTIDAS ===");

  // Buscar todas as partidas com playerP1 e playerP2
  const matches = await prisma.match.findMany({
    select: {
      id: true,
      playerP1: true,
      playerP2: true,
      playersEmails: true,
      apontadorEmail: true,
      status: true,
    },
  });

  console.log(`\nEncontradas ${matches.length} partidas para processar.`);

  let updated = 0;
  for (const match of matches) {
    const correctEmails = new Set();

    // Adicionar email do apontador se existir
    if (match.apontadorEmail) {
      correctEmails.add(match.apontadorEmail);
    }

    // Adicionar emails dos jogadores
    const p1Email = nameToEmail[match.playerP1?.toLowerCase() || ""];
    const p2Email = nameToEmail[match.playerP2?.toLowerCase() || ""];

    if (p1Email) correctEmails.add(p1Email);
    if (p2Email) correctEmails.add(p2Email);

    const correctEmailsArray = Array.from(correctEmails);
    const isChanged =
      JSON.stringify(correctEmailsArray) !==
      JSON.stringify(match.playersEmails);

    if (isChanged) {
      await prisma.match.update({
        where: { id: match.id },
        data: { playersEmails: correctEmailsArray },
      });

      updated++;
      console.log(`\n✅ Partida ${match.id}`);
      console.log(`   ${match.playerP1} vs ${match.playerP2}`);
      console.log(`   Antes:  ${JSON.stringify(match.playersEmails)}`);
      console.log(`   Depois: ${JSON.stringify(correctEmailsArray)}`);
    }
  }

  console.log(`\n✨ Total de partidas atualizadas: ${updated}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Erro:", e.message);
    process.exit(1);
  });
