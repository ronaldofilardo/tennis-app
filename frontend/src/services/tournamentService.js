// frontend/src/services/tournamentService.js
// Lógica de chaveamento e gerenciamento de torneios — Fase 3
// Suporta: Eliminação Simples, Eliminação Dupla, Round Robin, Fase de Grupos

/**
 * Gera chaveamento para um torneio (ou uma categoria específica).
 * Cria as partidas (Match) vinculadas ao torneio.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} tournamentId
 * @param {string|null} categoryId — se null, gera para todas as categorias
 * @returns {Promise<{ matches: object[], rounds: number }>}
 */
export async function generateBracket(prisma, tournamentId, categoryId = null) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      categories: true,
    },
  });

  if (!tournament) throw new Error("Tournament not found");

  // Se tem categories, gera por categoria
  const categoriesToProcess = categoryId
    ? tournament.categories.filter((c) => c.id === categoryId)
    : tournament.categories.length > 0
      ? tournament.categories
      : [null]; // null = sem categorias, gera direto

  const allMatches = [];

  for (const category of categoriesToProcess) {
    const where = { tournamentId };
    if (category) where.categoryId = category.id;

    const entries = await prisma.tournamentEntry.findMany({
      where,
      include: {
        athlete: { select: { id: true, name: true, nickname: true } },
      },
      orderBy: [{ seed: "asc" }, { createdAt: "asc" }],
    });

    if (entries.length < 2) {
      throw new Error(
        `Not enough entries${category ? ` in category "${category.name}"` : ""}: need at least 2, got ${entries.length}`,
      );
    }

    const format = category?.bracketType || tournament.format;
    let matches;

    switch (format) {
      case "SINGLE_ELIMINATION":
        matches = generateSingleElimination(entries, tournament, category);
        break;
      case "ROUND_ROBIN":
        matches = generateRoundRobin(entries, tournament, category);
        break;
      case "GROUP_STAGE":
        matches = generateGroupStage(entries, tournament, category);
        break;
      default:
        matches = generateSingleElimination(entries, tournament, category);
    }

    // Criar partidas no banco
    for (const matchData of matches) {
      const created = await prisma.match.create({ data: matchData });
      allMatches.push(created);
    }
  }

  return {
    matches: allMatches,
    rounds: Math.ceil(Math.log2(allMatches.length + 1)),
    totalMatches: allMatches.length,
  };
}

/**
 * Gera chaveamento de eliminação simples (mata-mata).
 *
 * Seeding: Cabeças-de-chave são distribuídos para evitar confrontos prematuros.
 *   Seed 1 vs último, Seed 2 vs penúltimo, etc.
 *
 * @param {Array} entries — inscrições ordenadas por seed
 * @param {object} tournament
 * @param {object|null} category
 * @returns {Array<object>} dados de partidas para inserção
 */
function generateSingleElimination(entries, tournament, category) {
  const n = entries.length;
  const totalSlots = nextPowerOfTwo(n);
  const totalRounds = Math.log2(totalSlots);
  const byes = totalSlots - n; // Jogadores com bye na 1ª rodada

  // Distribuir jogadores no bracket usando seeding
  const seededOrder = seedBracket(entries, totalSlots);
  const matches = [];

  // Gerar partidas da 1ª rodada
  let bracketPosition = 1;
  const roundNumber = totalRounds; // Round mais alto = primeira rodada

  for (let i = 0; i < seededOrder.length; i += 2) {
    const entry1 = seededOrder[i];
    const entry2 = seededOrder[i + 1];

    if (!entry1 && !entry2) continue; // Slot vazio

    // Se um dos dois é bye, não cria partida (vencedor avança automaticamente)
    if (!entry1 || !entry2) {
      // Bye — o jogador presente avança. A partida da próxima rodada será ajustada depois.
      continue;
    }

    matches.push({
      sportType: tournament.sportType || "TENNIS",
      format: "BEST_OF_3", // Padrão para torneio
      courtType: tournament.courtType || null,
      apontadorEmail: "", // Será definido pelo organizador
      playerP1: entry1.athlete.name,
      playerP2: entry2.athlete.name,
      player1Id: entry1.athlete.id,
      player2Id: entry2.athlete.id,
      playersEmails: [],
      clubId: tournament.clubId,
      tournamentId: tournament.id,
      categoryId: category?.id || null,
      roundNumber,
      bracketPosition: bracketPosition++,
      status: "NOT_STARTED",
    });
  }

  // Gerar partidas das rodadas subsequentes (vazias, sem jogadores)
  for (let round = totalRounds - 1; round >= 1; round--) {
    const matchesInRound = Math.pow(2, round - 1);
    for (let pos = 1; pos <= matchesInRound; pos++) {
      matches.push({
        sportType: tournament.sportType || "TENNIS",
        format: "BEST_OF_3",
        courtType: tournament.courtType || null,
        apontadorEmail: "",
        playerP1: "A definir",
        playerP2: "A definir",
        playersEmails: [],
        clubId: tournament.clubId,
        tournamentId: tournament.id,
        categoryId: category?.id || null,
        roundNumber: round,
        bracketPosition: pos,
        status: "NOT_STARTED",
      });
    }
  }

  return matches;
}

/**
 * Gera Round Robin (todos contra todos).
 * @param {Array} entries
 * @param {object} tournament
 * @param {object|null} category
 * @returns {Array<object>}
 */
function generateRoundRobin(entries, tournament, category) {
  const matches = [];
  let roundNumber = 1;

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      matches.push({
        sportType: tournament.sportType || "TENNIS",
        format: "BEST_OF_3",
        courtType: tournament.courtType || null,
        apontadorEmail: "",
        playerP1: entries[i].athlete.name,
        playerP2: entries[j].athlete.name,
        player1Id: entries[i].athlete.id,
        player2Id: entries[j].athlete.id,
        playersEmails: [],
        clubId: tournament.clubId,
        tournamentId: tournament.id,
        categoryId: category?.id || null,
        roundNumber,
        bracketPosition: matches.length + 1,
        status: "NOT_STARTED",
      });
    }
  }

  return matches;
}

/**
 * Gera Fase de Grupos (divide em grupos, round robin dentro, mata-mata depois).
 * @param {Array} entries
 * @param {object} tournament
 * @param {object|null} category
 * @returns {Array<object>}
 */
function generateGroupStage(entries, tournament, category) {
  const groupSize = 4; // Padrão: grupos de 4
  const numGroups = Math.ceil(entries.length / groupSize);
  const groups = Array.from({ length: numGroups }, () => []);

  // Distribuir jogadores nos grupos (snake draft para equilíbrio)
  entries.forEach((entry, index) => {
    const groupIndex = index % numGroups;
    groups[groupIndex].push(entry);
  });

  const matches = [];

  // Gerar Round Robin dentro de cada grupo
  groups.forEach((group, groupIdx) => {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        matches.push({
          sportType: tournament.sportType || "TENNIS",
          format: "BEST_OF_3",
          courtType: tournament.courtType || null,
          apontadorEmail: "",
          playerP1: group[i].athlete.name,
          playerP2: group[j].athlete.name,
          player1Id: group[i].athlete.id,
          player2Id: group[j].athlete.id,
          playersEmails: [],
          clubId: tournament.clubId,
          tournamentId: tournament.id,
          categoryId: category?.id || null,
          roundNumber: 100 + groupIdx, // Rodadas de grupo usam 100+
          bracketPosition: matches.length + 1,
          status: "NOT_STARTED",
          nickname: `Grupo ${String.fromCharCode(65 + groupIdx)}`, // Grupo A, B, C...
        });
      }
    }
  });

  return matches;
}

// ========================================================
// Utilidades
// ========================================================

/**
 * Próxima potência de 2 >= n.
 * @param {number} n
 * @returns {number}
 */
function nextPowerOfTwo(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Distribui jogadores no bracket usando seeding padrão de tênis.
 * Seed 1 e 2 são colocados em lados opostos.
 * Byes vão para as posições dos seeds mais altos.
 *
 * @param {Array} entries
 * @param {number} totalSlots
 * @returns {Array} array com entries ou null (bye)
 */
function seedBracket(entries, totalSlots) {
  const bracket = new Array(totalSlots).fill(null);

  // Posições padrão de seeding (para bracket de 8: [1,8,4,5,2,7,3,6])
  const positions = generateSeedPositions(totalSlots);

  entries.forEach((entry, entryIndex) => {
    const slotIndex = positions[entryIndex];
    if (slotIndex !== undefined && slotIndex < totalSlots) {
      bracket[slotIndex] = entry;
    }
  });

  return bracket;
}

/**
 * Gera posições de seeding para um bracket.
 * Garante que seed 1 e 2 se encontram apenas na final.
 *
 * @param {number} size — potência de 2
 * @returns {number[]} array de índices no bracket
 */
function generateSeedPositions(size) {
  if (size === 1) return [0];
  if (size === 2) return [0, 1];

  const result = [0, 1];
  let step = 2;

  while (result.length < size) {
    const temp = [];
    for (let i = 0; i < result.length; i++) {
      temp.push(result[i]);
      temp.push(step * 2 - 1 - result[i]);
    }
    result.length = 0;
    result.push(...temp);
    step *= 2;
  }

  return result.slice(0, size);
}

/**
 * Avança o vencedor de uma partida para a próxima rodada do torneio.
 * Deve ser chamado quando uma partida é finalizada.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} matchId
 * @param {string} winnerId — athleteId do vencedor
 * @returns {Promise<object|null>} próxima partida ou null se era a final
 */
export async function advanceWinner(prisma, matchId, winnerId) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      tournamentId: true,
      categoryId: true,
      roundNumber: true,
      bracketPosition: true,
    },
  });

  if (!match || !match.tournamentId || !match.roundNumber) return null;

  const nextRound = match.roundNumber - 1;
  if (nextRound < 1) return null; // Era a final

  const nextPosition = Math.ceil(match.bracketPosition / 2);

  // Encontrar a partida da próxima rodada
  const nextMatch = await prisma.match.findFirst({
    where: {
      tournamentId: match.tournamentId,
      categoryId: match.categoryId,
      roundNumber: nextRound,
      bracketPosition: nextPosition,
    },
  });

  if (!nextMatch) return null;

  // Determinar se o vencedor entra como P1 ou P2
  const isOddPosition = match.bracketPosition % 2 === 1;

  const winner = await prisma.athleteProfile.findUnique({
    where: { id: winnerId },
    select: { name: true },
  });

  const updateData = isOddPosition
    ? { player1Id: winnerId, playerP1: winner?.name || "Vencedor" }
    : { player2Id: winnerId, playerP2: winner?.name || "Vencedor" };

  const updated = await prisma.match.update({
    where: { id: nextMatch.id },
    data: updateData,
  });

  return updated;
}
