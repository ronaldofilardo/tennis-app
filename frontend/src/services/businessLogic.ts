// frontend/src/services/businessLogic.ts - Lógica de negócio compartilhada

import { PrismaClient } from '@prisma/client';
import type { ServerResponse } from 'node:http';

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

interface MatchRecord {
  id: string;
  sportType: string;
  format: string;
  playerP1: string;
  playerP2: string;
  status: string;
  score: string | null;
  winner: string | null;
  completedSets: string | null;
  createdAt: Date;
  matchState: string | null;
}

// Função compartilhada para buscar partida por ID com validação
export async function findMatchById(id: string): Promise<MatchRecord> {
  const match = await prisma.match.findUnique({
    where: { id },
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
    },
  });

  if (!match) {
    throw Object.assign(new Error('Partida não encontrada'), { statusCode: 404 });
  }

  return match;
}

// Função compartilhada para parse seguro do matchState
export function safeParseMatchState(
  matchStateString: string | null | undefined,
): Record<string, unknown> | null {
  if (!matchStateString) return null;

  try {
    return JSON.parse(matchStateString) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// Função compartilhada para parse seguro do completedSets
export function safeParseCompletedSets(completedSetsString: string | null | undefined): unknown[] {
  if (!completedSetsString) return [];

  try {
    return JSON.parse(completedSetsString) as unknown[];
  } catch {
    return [];
  }
}

// Função compartilhada para determinar status da partida baseado no estado
export function determineMatchStatus(
  match: { status: string },
  parsedState: Record<string, unknown> | null,
): string {
  let status = match.status;

  if (parsedState && status === 'NOT_STARTED') {
    const isFinished = Boolean(parsedState.isFinished || parsedState.winner || parsedState.endedAt);
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

  return status;
}

// Função compartilhada para formatar resposta de partida
export function formatMatchResponse(
  match: MatchRecord,
  parsedState: Record<string, unknown> | null = null,
  completedSets: unknown[] | null = null,
): Record<string, unknown> {
  const state = parsedState ?? safeParseMatchState(match.matchState);
  const sets = completedSets ?? safeParseCompletedSets(match.completedSets);
  const status = determineMatchStatus(match, state);

  return {
    id: match.id,
    sportType: match.sportType,
    format: match.format,
    players: { p1: match.playerP1, p2: match.playerP2 },
    status,
    score: match.score,
    winner: match.winner,
    completedSets: sets,
    createdAt: match.createdAt ? match.createdAt.toISOString() : undefined,
    matchState: state,
    visibleTo: state?.visibleTo ?? 'both',
  };
}

// Função compartilhada para headers CORS
// SECURITY: Nunca usar '*' — que permite qualquer origem. Em dev, restringir ao
// endereço do Vite. Em produção, ALLOWED_ORIGIN deve ser configurado explicitamente.
const _allowedOriginBL =
  process.env.ALLOWED_ORIGIN ??
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173');

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': _allowedOriginBL,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Função compartilhada para timeout de 8 segundos (Vercel)
export function createTimeoutHandler(res: {
  status: (code: number) => { json: (data: object) => void };
}): ReturnType<typeof setTimeout> {
  return setTimeout(() => {
    res.status(504).json({ error: 'Timeout na requisição' });
  }, 8000);
}

// Função compartilhada para lidar com CORS preflight
export function handleCors(res: ServerResponse): void {
  Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));
}

// Função compartilhada para tratamento de erros
export function handleApiError(
  error: Error & { statusCode?: number; details?: unknown },
  res: { status: (code: number) => { json: (data: object) => void } },
  timeout: ReturnType<typeof setTimeout>,
  _context = '',
): void {
  clearTimeout(timeout);

  const statusCode = error?.statusCode ?? 500;
  const errorResponse: Record<string, unknown> = {
    error: error?.message ?? 'Erro interno',
    ...(error?.details ? { details: error.details } : {}),
  };

  res.status(statusCode).json(errorResponse);
}
