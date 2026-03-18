const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("\n=== EXEMPLO DETALHADO DE PARTIDA ANOTADA ===\n");

  // Usar a partida SCORED_REVIEW como exemplo
  const matchId = "cmmks0eb70001hpoglfhladss";

  const match = await prisma.match.findUnique({
    where: { id: matchId },
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
      scorerId: true,
      scorerName: true,
      scorerStatus: true,
    },
  });

  if (!match) {
    console.log("❌ Partida não encontrada");
    process.exit(1);
  }

  console.log("📋 INFORMAÇÕES GERAIS DA PARTIDA");
  console.log(`  ID: ${match.id}`);
  console.log(`  ${match.playerP1} vs ${match.playerP2}`);
  console.log(`  Status: ${match.status}`);
  console.log(`  Placar: ${match.score}`);
  console.log(
    `  Vencedor: ${match.winner === "PLAYER_1" ? match.playerP1 : match.playerP2}`,
  );
  console.log(`  Scorer ID: ${match.scorerId || "N/A"}`);
  console.log(`  Scorer Name: ${match.scorerName || "N/A"}`);
  console.log(`  Scorer Status: ${match.scorerStatus || "N/A"}`);
  console.log(
    `  Criada em: ${new Date(match.createdAt).toLocaleString("pt-BR")}`,
  );

  let matchState = null;
  let completedSets = [];

  try {
    if (match.matchState) {
      matchState =
        typeof match.matchState === "string"
          ? JSON.parse(match.matchState)
          : match.matchState;
    }
    if (match.completedSets) {
      completedSets =
        typeof match.completedSets === "string"
          ? JSON.parse(match.completedSets)
          : match.completedSets;
    }
  } catch (err) {
    console.error("Erro ao parsear dados:", err.message);
  }

  console.log("\n📊 SETS COMPLETOS");
  if (completedSets.length > 0) {
    completedSets.forEach((set, idx) => {
      console.log(
        `  Set ${set.setNumber}: ${set.games.PLAYER_1} - ${set.games.PLAYER_2} (${set.winner === "PLAYER_1" ? match.playerP1 : match.playerP2})`,
      );
    });
  } else {
    console.log("  Nenhum set completado");
  }

  console.log("\n⚽ TIMELINE DOS PONTOS (21 pontos anotados)");
  if (matchState?.pointsHistory && Array.isArray(matchState.pointsHistory)) {
    matchState.pointsHistory.forEach((point, idx) => {
      const playerName =
        point.result?.winner === "PLAYER_1" ? match.playerP1 : match.playerP2;
      const resultType = point.result?.type || "Ponto";
      const rallies = point.rally?.ballExchanges || 0;

      let icon = "⚪";
      if (resultType === "ACE") icon = "🎯";
      else if (resultType === "WINNER") icon = "✨";
      else if (resultType.includes("ERROR")) icon = "❌";

      const num = String(idx + 1).padStart(2);
      const name = playerName.padEnd(15);
      const type = resultType.padEnd(18);
      const msg = `  ${num} ${icon} ${name} - ${type} (${rallies} trocas)`;
      console.log(msg);
    });

    console.log("\n📈 ESTATÍSTICAS DO HISTÓRICO");
    const p1Wins = matchState.pointsHistory.filter(
      (p) => p.result?.winner === "PLAYER_1",
    ).length;
    const p2Wins = matchState.pointsHistory.filter(
      (p) => p.result?.winner === "PLAYER_2",
    ).length;
    const aces = matchState.pointsHistory.filter(
      (p) => p.result?.type === "ACE",
    ).length;
    const winners = matchState.pointsHistory.filter(
      (p) => p.result?.type === "WINNER",
    ).length;
    const errors = matchState.pointsHistory.filter((p) =>
      p.result?.type?.includes("ERROR"),
    ).length;

    console.log(`  Pontos P1: ${p1Wins}`);
    console.log(`  Pontos P2: ${p2Wins}`);
    console.log(`  Aces: ${aces}`);
    console.log(`  Winners: ${winners}`);
    console.log(`  Erros: ${errors}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Erro:", e.message);
    process.exit(1);
  });
