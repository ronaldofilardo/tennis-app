// frontend/src/services/tournamentService.ts
// Lógica de chaveamento e gerenciamento de torneios — Fase 3
// Suporta: Eliminação Simples, Eliminação Dupla, Round Robin, Fase de Grupos

import type { PrismaClient, MatchStatus } from '@prisma/client';

interface AthleteProfile {
  id: string;
  name: string;
  nickname?: string | null;
}

interface TournamentEntry {
  id: string;
  seed?: number | null;
  createdAt: Date;
  athlete: AthleteProfile;
}

interface Tournament {
  id: string;
  sportType?: string | null;
  format: string;
  courtType?: string | null;
  clubId?: string | null;
  categories: Array<{
    id: string;
    name: string;
    bracketType?: string | null;
  }>;
}

interface MatchData {
  sportType: string;
  format: string;
  courtType?: string | null;
  apontadorEmail: string;
  playerP1: string;
  playerP2: string;
  player1Id?: string;
  player2Id?: string;
  playersEmails: string[];
  clubId?: string | null;
  tournamentId: string;
  categoryId?: string | null;
  roundNumber: number;
  bracketPosition: number;
  status: MatchStatus;
  nickname?: string;
}

/**
 * Gera chaveamento para um torneio (ou uma categoria específica).
 */
export async function generateBracket(
  prisma: PrismaClient,
  tournamentId: string,
  categoryId: string | null = null,
): Promise<{ matches: unknown[]; rounds: number; totalMatches: number }> {
  const tournament = (await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      categories: true,
    },
  })) as Tournament | null;

  if (!tournament) throw new Error('Tournament not found');

  const categoriesToProcess = categoryId
    ? tournament.categories.filter((c) => c.id === categoryId)
    : tournament.categories.length > 0
      ? tournament.categories
      : [null];

  const allMatches: unknown[] = [];

  for (const category of categoriesToProcess) {
    const where: { tournamentId: string; categoryId?: string } = { tournamentId };
    if (category) where.categoryId = category.id;

    const entries = (await prisma.tournamentEntry.findMany({
      where,
      include: {
        athlete: { select: { id: true, name: true, nickname: true } },
      },
      orderBy: [{ seed: 'asc' }, { createdAt: 'asc' }],
    })) as TournamentEntry[];

    if (entries.length < 2) {
      throw new Error(
        `Not enough entries${category ? ` in category "${category.name}"` : ''}: need at least 2, got ${entries.length}`,
      );
    }

    const format =
      (category as { bracketType?: string | null } | null)?.bracketType ?? tournament.format;
    let matches: MatchData[];

    switch (format) {
      case 'SINGLE_ELIMINATION':
        matches = generateSingleElimination(entries, tournament, category);
        break;
      case 'ROUND_ROBIN':
        matches = generateRoundRobin(entries, tournament, category);
        break;
      case 'GROUP_STAGE':
        matches = generateGroupStage(entries, tournament, category);
        break;
      default:
        matches = generateSingleElimination(entries, tournament, category);
    }

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

function generateSingleElimination(
  entries: TournamentEntry[],
  tournament: Tournament,
  category: { id: string; name: string } | null,
): MatchData[] {
  const n = entries.length;
  const totalSlots = nextPowerOfTwo(n);
  const totalRounds = Math.log2(totalSlots);

  const seededOrder = seedBracket(entries, totalSlots);
  const matches: MatchData[] = [];

  let bracketPosition = 1;
  const roundNumber = totalRounds;

  for (let i = 0; i < seededOrder.length; i += 2) {
    const entry1 = seededOrder[i];
    const entry2 = seededOrder[i + 1];

    if (!entry1 && !entry2) continue;
    if (!entry1 || !entry2) continue; // Bye

    matches.push({
      sportType: tournament.sportType ?? 'TENNIS',
      format: 'BEST_OF_3',
      courtType: tournament.courtType ?? null,
      apontadorEmail: '',
      playerP1: entry1.athlete.name,
      playerP2: entry2.athlete.name,
      player1Id: entry1.athlete.id,
      player2Id: entry2.athlete.id,
      playersEmails: [],
      clubId: tournament.clubId,
      tournamentId: tournament.id,
      categoryId: category?.id ?? null,
      roundNumber,
      bracketPosition: bracketPosition++,
      status: 'NOT_STARTED',
    });
  }

  for (let round = totalRounds - 1; round >= 1; round--) {
    const matchesInRound = Math.pow(2, round - 1);
    for (let pos = 1; pos <= matchesInRound; pos++) {
      matches.push({
        sportType: tournament.sportType ?? 'TENNIS',
        format: 'BEST_OF_3',
        courtType: tournament.courtType ?? null,
        apontadorEmail: '',
        playerP1: 'A definir',
        playerP2: 'A definir',
        playersEmails: [],
        clubId: tournament.clubId,
        tournamentId: tournament.id,
        categoryId: category?.id ?? null,
        roundNumber: round,
        bracketPosition: pos,
        status: 'NOT_STARTED',
      });
    }
  }

  return matches;
}

function generateRoundRobin(
  entries: TournamentEntry[],
  tournament: Tournament,
  category: { id: string } | null,
): MatchData[] {
  const matches: MatchData[] = [];
  let roundNumber = 1;

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      matches.push({
        sportType: tournament.sportType ?? 'TENNIS',
        format: 'BEST_OF_3',
        courtType: tournament.courtType ?? null,
        apontadorEmail: '',
        playerP1: entries[i].athlete.name,
        playerP2: entries[j].athlete.name,
        player1Id: entries[i].athlete.id,
        player2Id: entries[j].athlete.id,
        playersEmails: [],
        clubId: tournament.clubId,
        tournamentId: tournament.id,
        categoryId: category?.id ?? null,
        roundNumber,
        bracketPosition: matches.length + 1,
        status: 'NOT_STARTED',
      });
      roundNumber++;
    }
  }

  return matches;
}

function generateGroupStage(
  entries: TournamentEntry[],
  tournament: Tournament,
  category: { id: string } | null,
): MatchData[] {
  const groupSize = 4;
  const numGroups = Math.ceil(entries.length / groupSize);
  const groups: TournamentEntry[][] = Array.from({ length: numGroups }, () => []);

  entries.forEach((entry, index) => {
    const groupIndex = index % numGroups;
    groups[groupIndex].push(entry);
  });

  const matches: MatchData[] = [];

  groups.forEach((group, groupIdx) => {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        matches.push({
          sportType: tournament.sportType ?? 'TENNIS',
          format: 'BEST_OF_3',
          courtType: tournament.courtType ?? null,
          apontadorEmail: '',
          playerP1: group[i].athlete.name,
          playerP2: group[j].athlete.name,
          player1Id: group[i].athlete.id,
          player2Id: group[j].athlete.id,
          playersEmails: [],
          clubId: tournament.clubId,
          tournamentId: tournament.id,
          categoryId: category?.id ?? null,
          roundNumber: 100 + groupIdx,
          bracketPosition: matches.length + 1,
          status: 'NOT_STARTED',
          nickname: `Grupo ${String.fromCharCode(65 + groupIdx)}`,
        });
      }
    }
  });

  return matches;
}

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function seedBracket(entries: TournamentEntry[], totalSlots: number): (TournamentEntry | null)[] {
  const bracket: (TournamentEntry | null)[] = new Array(totalSlots).fill(null);
  const positions = generateSeedPositions(totalSlots);

  entries.forEach((entry, entryIndex) => {
    const slotIndex = positions[entryIndex];
    if (slotIndex !== undefined && slotIndex < totalSlots) {
      bracket[slotIndex] = entry;
    }
  });

  return bracket;
}

function generateSeedPositions(size: number): number[] {
  if (size === 1) return [0];
  if (size === 2) return [0, 1];

  const result = [0, 1];
  let step = 2;

  while (result.length < size) {
    const temp: number[] = [];
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
 */
export async function advanceWinner(
  prisma: PrismaClient,
  matchId: string,
  winnerId: string,
): Promise<unknown> {
  const match = (await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      tournamentId: true,
      categoryId: true,
      roundNumber: true,
      bracketPosition: true,
    },
  })) as {
    tournamentId?: string | null;
    categoryId?: string | null;
    roundNumber?: number | null;
    bracketPosition?: number | null;
  } | null;

  if (!match || !match.tournamentId || !match.roundNumber) return null;

  const nextRound = match.roundNumber - 1;
  if (nextRound < 1) return null;

  const nextPosition = Math.ceil((match.bracketPosition ?? 1) / 2);

  const nextMatch = await prisma.match.findFirst({
    where: {
      tournamentId: match.tournamentId,
      categoryId: match.categoryId,
      roundNumber: nextRound,
      bracketPosition: nextPosition,
    },
  });

  if (!nextMatch) return null;

  const isOddPosition = (match.bracketPosition ?? 1) % 2 === 1;

  const winner = (await prisma.athleteProfile.findUnique({
    where: { id: winnerId },
    select: { name: true },
  })) as { name?: string } | null;

  const updateData = isOddPosition
    ? { player1Id: winnerId, playerP1: winner?.name ?? 'Vencedor' }
    : { player2Id: winnerId, playerP2: winner?.name ?? 'Vencedor' };

  const updated = await prisma.match.update({
    where: { id: nextMatch.id },
    data: updateData,
  });

  return updated;
}
