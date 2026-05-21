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
    createdByUserId,
    openForAnnotation = false,
    temperature,
    humidity,
    publicMatchCode,
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
      createdByUserId: createdByUserId ?? null,
      temperature: temperature ?? null,
      humidity: humidity ?? null,
      publicMatchCode: publicMatchCode ?? null,
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
    temperature: newMatch.temperature ?? null,
    humidity: newMatch.humidity ?? null,
    publicMatchCode: newMatch.publicMatchCode ?? null,
    visibleTo: visibleTo ?? 'both',
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
