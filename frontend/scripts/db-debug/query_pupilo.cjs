const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log('\n=== BUSCANDO USUÁRIO "PUPILO" ===');
  const pupilo = await prisma.user.findFirst({
    where: {
      name: { contains: "Pupilo", mode: "insensitive" },
    },
  });

  if (!pupilo) {
    console.log('❌ Usuário "Pupilo" não encontrado');
    const users = await prisma.user.findMany({ take: 10 });
    console.log("Usuários no banco:");
    users.forEach((u) => console.log(`  - ${u.name} (${u.email})`));
  } else {
    console.log(`✅ Encontrado: ${pupilo.name} (${pupilo.email})`);

    console.log("\n=== PARTIDAS ONDE PUPILO É PLAYER ===");
    const matchesAsPlayer = await prisma.match.findMany({
      where: {
        OR: [{ playerP1: pupilo.name }, { playerP2: pupilo.name }],
      },
      select: {
        id: true,
        playerP1: true,
        playerP2: true,
        playersEmails: true,
        apontadorEmail: true,
        status: true,
        createdAt: true,
      },
      take: 10,
    });

    console.log(`Encontradas ${matchesAsPlayer.length} partidas:`);
    matchesAsPlayer.forEach((m, i) => {
      console.log(`\n  ${i + 1}. ${m.playerP1} vs ${m.playerP2}`);
      console.log(`     ID: ${m.id}`);
      console.log(`     playersEmails: ${JSON.stringify(m.playersEmails)}`);
      console.log(`     apontadorEmail: ${m.apontadorEmail}`);
      console.log(`     status: ${m.status}`);
      console.log(
        `     ❌ ERRO: Email do Pupilo ${pupilo.email} NÃO está em playersEmails!`,
      );
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
