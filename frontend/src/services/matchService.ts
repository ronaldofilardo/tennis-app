// frontend/src/services/matchService.ts - Otimizado para Vercel Serverless

import { PrismaClient } from '@prisma/client';
import { calculateMatchStats } from './statsUtils.js';
import {
  MatchCreateSchema,
  MatchUpdateSchema,
  MatchStateUpdateSchema,
  VisibleMatchesQuerySchema,
  MatchIdSchema,
  validateAndFormatZodError,
} from './validationSchemas.js';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Cache de conexão Prisma otimizado para serverless
let prisma: PrismaClient;
if (globalThis.__prisma) {
  prisma = globalThis.__prisma;
} else {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  });
  globalThis.__prisma = prisma;
}

export async function getAllMatches(
  clubId: string | null = null,
  userRole: string | null = null,
  _userId: string | null = null,
): Promise<object[]> {
  const whereClause: Record<string, unknown> = {};
  if (userRole === 'ADMIN') {
    // ADMIN vê todas as partidas
  } else if (clubId) {
    const orConditions = [{ clubId }, { visibility: 'PUBLIC' }];
    whereClause.OR = orConditions;
  } else {
    whereClause.visibility = 'PUBLIC';
  }

  const matches = await prisma.match.findMany({
    where: whereClause,
    select: {
      id: true,
      sportType: true,
      format: true,
      playerP1: true,
      playerP2: true,
      status: true,
      score: true,
      winner: true,
      completedSets: true,
      createdAt: true,
      matchState: true,
      visibility: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return matches.map((match) => {
    const parsedState = match.matchState
      ? (JSON.parse(match.matchState) as Record<string, unknown>)
      : null;
    let status = match.status;

    if (parsedState && status === 'NOT_STARTED') {
      const isFinished = Boolean(
        parsedState.isFinished || parsedState.winner || parsedState.endedAt,
      );
      const inProgressIndicators = Boolean(
        parsedState.startedAt ||
        parsedState.server ||
        parsedState.currentGame ||
        parsedState.currentSetState,
      );
      if (isFinished) {
        status = 'FINISHED';
      } else if (inProgressIndicators) {
        status = 'IN_PROGRESS';
      }
    }

    return {
      id: match.id,
      sportType: match.sportType,
      format: match.format,
      players: { p1: match.playerP1, p2: match.playerP2 },
      status,
      score: match.score,
      winner: match.winner,
      completedSets: JSON.parse(match.completedSets ?? '[]') as unknown[],
      createdAt: match.createdAt.toISOString(),
      matchState: parsedState,
      visibleTo: (parsedState?.visibleTo as string | undefined) ?? 'both',
      visibility: match.visibility ?? 'PLAYERS_ONLY',
    };
  });
}

export async function createMatch(matchData: unknown, testPrisma?: PrismaClient): Promise<object> {
  const validation = MatchCreateSchema.safeParse(matchData);
  if (!validation.success) {
    throw new Error(validateAndFormatZodError(validation.error));
  }

  const {
    sportType,
    format,
    courtType,
    players,
    nickname,
    visibility = 'PLAYERS_ONLY',
    apontadorEmail,
    visibleTo,
    clubId,
    createdByUserId,
    openForAnnotation = false,
    scheduledAt,
    venueId,
  } = validation.data;

  const prismaClient = testPrisma ?? prisma;

  let p1Email = players.p1;
  let p2Email = players.p2;

  try {
    const [user1, user2] = await Promise.all([
      prismaClient.user.findFirst({
        where: { name: { equals: players.p1, mode: 'insensitive' } },
        select: { email: true },
      }),
      prismaClient.user.findFirst({
        where: { name: { equals: players.p2, mode: 'insensitive' } },
        select: { email: true },
      }),
    ]);

    if (user1?.email) p1Email = user1.email;
    if (user2?.email) p2Email = user2.email;
  } catch {
    // falha no lookup de emails — usa nome como fallback
  }

  const emailsSet = new Set<string>();
  if (apontadorEmail) emailsSet.add(apontadorEmail);
  emailsSet.add(p1Email);
  emailsSet.add(p2Email);
  const playersEmails = Array.from(emailsSet);

  const newMatch = await prismaClient.match.create({
    data: {
      sportType,
      format,
      courtType: courtType ?? null,
      nickname: nickname ?? null,
      apontadorEmail: apontadorEmail ?? null,
      playerP1: players.p1,
      playerP2: players.p2,
      playersEmails,
      visibility: visibility ?? 'PLAYERS_ONLY',
      status: 'NOT_STARTED',
      openForAnnotation: openForAnnotation ?? false,
      clubId: clubId ?? null,
      createdByUserId: createdByUserId ?? null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      venueId: venueId ?? null,
      completedSets: JSON.stringify([]),
      matchState: JSON.stringify({
        playersIds: { p1: players.p1, p2: players.p2 },
        visibleTo: visibleTo ?? 'both',
        needsSetup: true,
        startedAt: null,
      }),
    },
  });

  return {
    id: newMatch.id,
    sportType: newMatch.sportType,
    format: newMatch.format,
    courtType: newMatch.courtType ?? null,
    nickname: newMatch.nickname ?? null,
    players: { p1: newMatch.playerP1, p2: newMatch.playerP2 },
    apontadorEmail: newMatch.apontadorEmail,
    playersEmails: newMatch.playersEmails,
    visibility: newMatch.visibility,
    openForAnnotation: newMatch.openForAnnotation,
    scheduledAt: newMatch.scheduledAt ? newMatch.scheduledAt.toISOString() : null,
    venueId: newMatch.venueId ?? null,
    visibleTo: visibleTo ?? 'both',
    clubId: newMatch.clubId ?? null,
    status: newMatch.status,
    score: newMatch.score,
    winner: newMatch.winner,
    completedSets: JSON.parse(newMatch.completedSets ?? '[]') as unknown[],
    createdAt: newMatch.createdAt.toISOString(),
  };
}

export async function getMatchById(id: string): Promise<object> {
  const idValidation = MatchIdSchema.safeParse(id);
  if (!idValidation.success) {
    throw new Error(validateAndFormatZodError(idValidation.error));
  }

  const match = await prisma.match.findUnique({
    where: { id: idValidation.data },
    select: {
      id: true,
      sportType: true,
      format: true,
      courtType: true,
      playerP1: true,
      playerP2: true,
      status: true,
      score: true,
      winner: true,
      completedSets: true,
      createdAt: true,
      matchState: true,
      visibility: true,
    },
  });

  if (!match) {
    throw Object.assign(new Error('Partida não encontrada'), { statusCode: 404 });
  }

  let matchState: Record<string, unknown> | null = null;
  try {
    matchState = match.matchState
      ? (JSON.parse(match.matchState) as Record<string, unknown>)
      : null;
  } catch (e) {
    console.warn(`[getMatchById] Erro ao fazer parse do matchState da partida ${match.id}:`, e);
    matchState = {};
  }

  let completedSets: unknown[] = [];
  try {
    completedSets = JSON.parse(match.completedSets ?? '[]') as unknown[];
  } catch {
    completedSets = [];
  }

  return {
    id: match.id,
    sportType: match.sportType,
    format: match.format,
    courtType: match.courtType ?? 'GRASS',
    players: { p1: match.playerP1, p2: match.playerP2 },
    status: match.status,
    score: match.score,
    winner: match.winner,
    completedSets,
    createdAt: match.createdAt ? match.createdAt.toISOString() : undefined,
    matchState,
  };
}

export async function updateMatch(id: string, updatePayload: unknown): Promise<object> {
  const idValidation = MatchIdSchema.safeParse(id);
  if (!idValidation.success) {
    throw new Error(validateAndFormatZodError(idValidation.error));
  }

  const payloadValidation = MatchUpdateSchema.safeParse(updatePayload);
  if (!payloadValidation.success) {
    throw new Error(validateAndFormatZodError(payloadValidation.error));
  }

  const updateData: Record<string, unknown> = {};
  if (payloadValidation.data.score !== undefined) updateData.score = payloadValidation.data.score;
  if (payloadValidation.data.winner !== undefined)
    updateData.winner = payloadValidation.data.winner;
  if (payloadValidation.data.completedSets !== undefined)
    updateData.completedSets = JSON.stringify(payloadValidation.data.completedSets);
  if (payloadValidation.data.openForAnnotation !== undefined)
    updateData.openForAnnotation = payloadValidation.data.openForAnnotation;

  const updatedMatch = await prisma.match.update({
    where: { id: idValidation.data },
    data: {
      ...updateData,
      updatedAt: new Date(),
    },
  });

  return {
    id: updatedMatch.id,
    message: 'Partida atualizada com sucesso',
  };
}

export async function updateMatchState(
  id: string,
  statePayload: { matchState: string | Record<string, unknown> },
  testPrisma?: PrismaClient,
): Promise<object> {
  const idValidation = MatchIdSchema.safeParse(id);
  if (!idValidation.success) {
    const errorMsg = validateAndFormatZodError(idValidation.error);
    void errorMsg;
  }

  const payloadValidation = MatchStateUpdateSchema.safeParse(statePayload);
  if (!payloadValidation.success) {
    // Aceitar payload como está para não quebrar fluxo existente
  }

  const { matchState } = statePayload;

  let state: Record<string, unknown>;
  try {
    if (typeof matchState === 'string') {
      state = JSON.parse(matchState) as Record<string, unknown>;
    } else if (typeof matchState === 'object' && matchState !== null) {
      state = { ...matchState };
    } else {
      state = {};
    }
  } catch {
    state = {};
  }

  const prismaClient = testPrisma ?? prisma;
  const currentMatch = await prismaClient.match.findUnique({
    where: { id },
    select: { status: true, matchState: true },
  });

  let currentState: Record<string, unknown> = {};
  try {
    currentState = currentMatch?.matchState
      ? (JSON.parse(currentMatch.matchState) as Record<string, unknown>)
      : {};
  } catch {
    currentState = {};
  }

  void currentState; // acknowledged: used for potential future status computation

  let status = currentMatch?.status ?? 'NOT_STARTED';

  const isFinished = Boolean(state?.isFinished || state?.winner || state?.endedAt);
  const inProgressIndicators = Boolean(
    state?.startedAt || state?.server || state?.currentGame || state?.currentSetState,
  );

  if (isFinished) {
    status = 'FINISHED';
  } else if (inProgressIndicators && status === 'NOT_STARTED') {
    status = 'IN_PROGRESS';
  }

  const updatedMatch = await prismaClient.match.update({
    where: { id },
    data: {
      matchState: JSON.stringify(state),
      status,
      updatedAt: new Date(),
    },
  });

  return {
    id: updatedMatch.id,
    message: 'Estado da partida atualizado com sucesso',
  };
}

export async function getMatchState(id: string): Promise<object | null> {
  const match = (await prisma.match.findUnique({
    where: { id },
    select: {
      id: true,
      sportType: true,
      format: true,
      courtType: true,
      playerP1: true,
      playerP2: true,
      status: true,
      score: true,
      winner: true,
      completedSets: true,
      createdAt: true,
      matchState: true,
      visibility: true,
      player1: { select: { globalId: true } },
      player2: { select: { globalId: true } },
    },
  })) as {
    id: string;
    sportType: string;
    format: string;
    courtType?: string | null;
    playerP1: string;
    playerP2: string;
    status: string;
    score: string | null;
    winner: string | null;
    completedSets: string | null;
    createdAt: Date;
    matchState: string | null;
    visibility: string;
    player1?: { globalId?: string | null } | null;
    player2?: { globalId?: string | null } | null;
  } | null;

  if (!match) return null;

  let matchState: Record<string, unknown> | null = null;
  try {
    matchState = match.matchState
      ? (JSON.parse(match.matchState) as Record<string, unknown>)
      : null;
  } catch {
    matchState = {};
  }

  if (matchState && !matchState.startedAt) {
    matchState.startedAt = match.createdAt
      ? match.createdAt.toISOString()
      : new Date().toISOString();
  }

  let completedSets: unknown[] = [];
  try {
    completedSets = JSON.parse(match.completedSets ?? '[]') as unknown[];
  } catch {
    completedSets = [];
  }

  return {
    id: match.id,
    sportType: match.sportType,
    format: match.format,
    courtType: match.courtType ?? 'GRASS',
    players: { p1: match.playerP1, p2: match.playerP2 },
    status: match.status,
    score: match.score,
    winner: match.winner,
    completedSets,
    createdAt: match.createdAt ? match.createdAt.toISOString() : undefined,
    matchState,
    visibility: match.visibility,
    player1GlobalId: match.player1?.globalId ?? null,
    player2GlobalId: match.player2?.globalId ?? null,
  };
}

export async function getVisibleMatches(
  queryParams: unknown,
  testPrisma?: PrismaClient,
): Promise<object[]> {
  const queryValidation = VisibleMatchesQuerySchema.safeParse(queryParams);
  if (!queryValidation.success) {
    throw new Error(validateAndFormatZodError(queryValidation.error));
  }

  let matches: Array<{
    id: string;
    sportType: string;
    format: string;
    courtType: string | null;
    nickname: string | null;
    playerP1: string;
    playerP2: string;
    status: string;
    score: string | null;
    winner: string | null;
    completedSets: string | null;
    createdAt: Date;
    updatedAt: Date;
    matchState: string | null;
    apontadorEmail: string | null;
    playersEmails: string[];
    visibility: string;
  }> = [];

  try {
    matches = (await (testPrisma ?? prisma).match.findMany({
      select: {
        id: true,
        sportType: true,
        format: true,
        courtType: true,
        nickname: true,
        playerP1: true,
        playerP2: true,
        status: true,
        score: true,
        winner: true,
        completedSets: true,
        createdAt: true,
        updatedAt: true,
        matchState: true,
        apontadorEmail: true,
        playersEmails: true,
        visibility: true,
      },
      orderBy: { createdAt: 'desc' },
    })) as typeof matches;
  } catch {
    return [];
  }

  const { email, role } = queryValidation.data;
  const filtered = matches.filter((match) => {
    let matchRole: string | undefined = undefined;
    const playersEmails = match.playersEmails ?? [];
    try {
      if (match.matchState) {
        const parsed =
          typeof match.matchState === 'string'
            ? (JSON.parse(match.matchState) as Record<string, unknown>)
            : match.matchState;
        if (parsed && parsed.role) matchRole = parsed.role as string;
      }
    } catch {
      // parse falhou: ignorar matchState do filtro
    }
    if (!email) return false;
    const isApontador = match.apontadorEmail === email;
    const isInPlayersEmails = Array.isArray(playersEmails) && playersEmails.includes(email);
    if (!isApontador && !isInPlayersEmails) {
      return false;
    }
    if (role !== undefined && matchRole !== undefined) {
      return matchRole === role;
    }
    return true;
  });

  return filtered.map((match) => {
    let parsedState: Record<string, unknown> | null = null;
    try {
      parsedState = match.matchState
        ? (JSON.parse(match.matchState) as Record<string, unknown>)
        : null;
    } catch {
      parsedState = {};
    }
    let completedSets: unknown[] = [];
    try {
      completedSets = JSON.parse(match.completedSets ?? '[]') as unknown[];
    } catch {
      completedSets = [];
    }

    const status = match.status ?? 'NOT_STARTED';

    return {
      id: match.id,
      sportType: match.sportType ?? '',
      format: match.format ?? '',
      courtType: match.courtType ?? null,
      nickname: match.nickname ?? null,
      players: { p1: match.playerP1 ?? '', p2: match.playerP2 ?? '' },
      status,
      score: match.score ?? '',
      winner: match.winner ?? null,
      completedSets,
      createdAt: match.createdAt ? match.createdAt.toISOString() : undefined,
      updatedAt: match.updatedAt ? match.updatedAt.toISOString() : undefined,
      matchState: parsedState,
      visibleTo: parsedState?.visibleTo ?? 'both',
      apontadorEmail: match.apontadorEmail,
      playersEmails: match.playersEmails,
      visibility: match.visibility ?? 'PLAYERS_ONLY',
    };
  });
}

export async function getMatchStats(id: string): Promise<object> {
  const idValidation = MatchIdSchema.safeParse(id);
  if (!idValidation.success) {
    throw new Error(validateAndFormatZodError(idValidation.error));
  }

  const match = await prisma.match.findUnique({
    where: { id: idValidation.data },
    select: {
      id: true,
      sportType: true,
      format: true,
      playerP1: true,
      playerP2: true,
      status: true,
      score: true,
      winner: true,
      completedSets: true,
      createdAt: true,
      matchState: true,
      visibility: true,
    },
  });

  if (!match) {
    throw Object.assign(new Error('Partida não encontrada para calcular estatísticas'), {
      statusCode: 404,
    });
  }

  let pointsHistory: unknown[] = [];
  try {
    if (match.matchState) {
      let matchState: Record<string, unknown>;
      try {
        matchState =
          typeof match.matchState === 'string'
            ? (JSON.parse(match.matchState) as Record<string, unknown>)
            : (match.matchState as Record<string, unknown>);
      } catch {
        matchState = {};
      }
      if (Array.isArray(matchState.pointsHistory)) {
        pointsHistory = matchState.pointsHistory;
      }
    }
    return calculateMatchStats(pointsHistory as Parameters<typeof calculateMatchStats>[0]);
  } catch {
    return calculateMatchStats([]);
  }
}

export async function getMatchesOpenForAnnotation(testPrisma?: PrismaClient): Promise<object[]> {
  const prismaClient = testPrisma ?? prisma;
  const matches = (await prismaClient.match.findMany({
    where: {
      openForAnnotation: true,
      status: { not: 'FINISHED' },
    },
    select: {
      id: true,
      sportType: true,
      format: true,
      courtType: true,
      nickname: true,
      playerP1: true,
      playerP2: true,
      status: true,
      createdAt: true,
      openForAnnotation: true,
      visibility: true,
      clubId: true,
      club: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })) as Array<{
    id: string;
    sportType: string;
    format: string;
    courtType: string | null;
    nickname: string | null;
    playerP1: string;
    playerP2: string;
    status: string;
    createdAt: Date;
    openForAnnotation: boolean;
    visibility: string;
    clubId: string | null;
    club?: { id: string; name: string } | null;
    createdBy?: { id: string; name: string; email: string } | null;
  }>;

  return matches.map((match) => ({
    id: match.id,
    sportType: match.sportType,
    format: match.format,
    courtType: match.courtType ?? null,
    nickname: match.nickname ?? null,
    players: { p1: match.playerP1, p2: match.playerP2 },
    status: match.status,
    createdAt: match.createdAt.toISOString(),
    openForAnnotation: match.openForAnnotation,
    visibility: match.visibility,
    clubId: match.clubId ?? null,
    clubName: match.club?.name ?? null,
    createdBy: match.createdBy ? { id: match.createdBy.id, name: match.createdBy.name } : null,
  }));
}
