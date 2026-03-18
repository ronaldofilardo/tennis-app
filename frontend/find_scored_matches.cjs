const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("\n=== PROCURANDO PARTIDAS COM PONTOS ANOTADOS ===");

  const matches = await prisma.match.findMany({
    select: {
      id: true,
      playerP1: true,
      playerP2: true,
      status: true,
      score: true,
      winner: true,
      matchState: true,
      completedSets: true,
      createdAt: true,
    },
    take: 20,
  });

  console.log(`\nAnalisando ${matches.length} partidas...\n`);

  for (const match of matches) {
    let matchState = null;
    let hasPointsHistory = false;
    let pointCount = 0;

    try {
      if (match.matchState) {
        matchState =
          typeof match.matchState === "string"
            ? JSON.parse(match.matchState)
            : match.matchState;

        if (
          matchState.pointsHistory &&
          Array.isArray(matchState.pointsHistory)
        ) {
          hasPointsHistory = true;
          pointCount = matchState.pointsHistory.length;
        }
      }
    } catch (err) {
      // falhou ao parsear
    }

    if (hasPointsHistory && pointCount > 0) {
      console.log(`✅ ENCONTRADA: ${match.playerP1} vs ${match.playerP2}`);
      console.log(`   ID: ${match.id}`);
      console.log(`   Status: ${match.status}`);
      console.log(`   Placar: ${match.score}`);
      console.log(`   Vencedor: ${match.winner}`);
      console.log(`   Pontos anotados: ${pointCount}`);
      console.log(`   Criada em: ${match.createdAt}\n`);

      // Mostrar alguns pontos como exemplo
      console.log(`   Exemplos de pontos:`);
      matchState.pointsHistory.slice(0, 5).forEach((p, idx) => {
        console.log(
          `     ${idx + 1}. Vencedor: ${p.result?.winner} | Tipo: ${p.result?.type} | Rally: ${p.rally?.ballExchanges} trocas`,
        );
      });

      console.log("\n---\n");
    }
  }

  console.log("Busca concluída.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Erro:", e.message);
    process.exit(1);
  });
