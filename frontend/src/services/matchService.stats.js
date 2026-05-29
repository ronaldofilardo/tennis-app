// frontend/src/services/matchService.stats.js
// Funções de consulta e estatísticas de partidas

import prisma from '../../api/_lib/prisma.js';
import { calculateMatchStats } from './statsUtils.js';
import {
  MatchIdSchema,
  VisibleMatchesQuerySchema,
  validateAndFormatZodError,
} from './validationSchemas.js';
export async function getVisibleMatches(queryParams, testPrisma) {
  // Validar query parameters
  const queryValidation = VisibleMatchesQuerySchema.safeParse(queryParams);
  if (!queryValidation.success) {
    throw new Error(validateAndFormatZodError(queryValidation.error));
  }

  const { email, role } = queryValidation.data;

  // Busca partidas otimizada: filtro no banco de dados, não em memória
  // IMPORTANTE: ao adicionar campos ao schema Prisma, inclua-os aqui também
  let matches = [];
  try {
    matches = await (testPrisma || prisma).match.findMany({
      where: email
        ? {
            OR: [
              { apontadorEmail: email },
              { playersEmails: { has: email } },
              { visibility: 'PUBLIC' }, // Mostrar también partidas públicas
            ],
          }
        : undefined,
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
      take: 200, // Limita a 200 partidas recentes (não usar limit infinito)
    });
  } catch (e) {
    return [];
  }

  // Aplica filtro de role se necessário (parse mínimo)
  const filtered = role
    ? matches.filter((match) => {
        let matchRole = undefined;
        try {
          if (match.matchState) {
            const parsed =
              typeof match.matchState === 'string'
                ? JSON.parse(match.matchState)
                : match.matchState;
            if (parsed && parsed.role) matchRole = parsed.role;
          }
        } catch {
          // parse falhou: ignorar matchState do filtro
        }
        return matchRole === role;
      })
    : matches;

  // Filtro client-side por email — garante resultado correto mesmo quando o mock/DB não aplica WHERE
  const emailFiltered = email
    ? filtered.filter((m) => m.playersEmails?.includes(email) || m.apontadorEmail === email)
    : filtered;

  // Retorna status conforme está salvo no banco, garantindo robustez
  return emailFiltered.map((match) => {
    let parsedState = null;
    try {
      parsedState = match.matchState ? JSON.parse(match.matchState) : null;
    } catch {
      parsedState = {};
    }
    let completedSets = [];
    try {
      completedSets = JSON.parse(match.completedSets || '[]');
    } catch {
      completedSets = [];
    }

    // Usa o status salvo no banco, não recalcula
    let status = match.status || 'NOT_STARTED';

    // Retorna TODOS os campos do match para evitar que novos campos sejam perdidos
    return {
      id: match.id,
      sportType: match.sportType || '',
      format: match.format || '',
      courtType: match.courtType || null,
      nickname: match.nickname || null,
      players: { p1: match.playerP1 || '', p2: match.playerP2 || '' },
      status,
      score: match.score || '',
      winner: match.winner || null,
      completedSets,
      createdAt: match.createdAt ? match.createdAt.toISOString() : undefined,
      updatedAt: match.updatedAt ? match.updatedAt.toISOString() : undefined,
      matchState: parsedState,
      visibleTo: parsedState && parsedState.visibleTo ? parsedState.visibleTo : 'both',
      apontadorEmail: match.apontadorEmail,
      playersEmails: match.playersEmails,
      visibility: match.visibility || 'PLAYERS_ONLY',
    };
  });
}
export async function getMatchStats(id) {
  // Validar ID da partida
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
    const notFoundError = new Error('Partida não encontrada para calcular estatísticas');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  // Extrair pointsHistory do matchState com fallback seguro
  let pointsHistory = [];
  try {
    if (match.matchState) {
      let matchState;
      try {
        matchState =
          typeof match.matchState === 'string' ? JSON.parse(match.matchState) : match.matchState;
      } catch {
        matchState = {};
      }
      if (Array.isArray(matchState.pointsHistory)) {
        pointsHistory = matchState.pointsHistory;
      } else {
        pointsHistory = [];
      }
    }
    return calculateMatchStats(pointsHistory);
  } catch {
    // retorna estatísticas vazias se houver erro
    return calculateMatchStats([]);
  }
}

/**
 * Busca partidas marcadas como abertas para anotação (openForAnnotation=true)
 * que ainda não foram finalizadas.
 * Qualquer usuário autenticado (não SPECTATOR) pode listar e anotar.
 */
export async function getMatchesOpenForAnnotation(testPrisma) {
  const prismaClient = testPrisma || prisma;
  const matches = await prismaClient.match.findMany({
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
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return matches.map((match) => ({
    id: match.id,
    sportType: match.sportType,
    format: match.format,
    courtType: match.courtType || null,
    nickname: match.nickname || null,
    players: { p1: match.playerP1, p2: match.playerP2 },
    status: match.status,
    createdAt: match.createdAt.toISOString(),
    openForAnnotation: match.openForAnnotation,
    visibility: match.visibility,
    clubId: match.clubId || null,
    createdBy: match.createdBy ? { id: match.createdBy.id, name: match.createdBy.name } : null,
  }));
}

export async function getAllMatches(clubId, role, userId) {
  const where = {};
  if (role !== 'ADMIN') {
    if (clubId) where.clubId = clubId;
    else if (userId) where.createdByUserId = userId;
  }
  const matches = await prisma.match.findMany({
    where,
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
      clubId: true,
      createdByUserId: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return matches.map((m) => {
    let parsedState = null;
    try {
      parsedState = m.matchState ? JSON.parse(m.matchState) : null;
    } catch {}
    let completedSets = [];
    try {
      completedSets = JSON.parse(m.completedSets || '[]');
    } catch {}
    return {
      id: m.id,
      sportType: m.sportType || '',
      format: m.format || '',
      courtType: m.courtType || null,
      nickname: m.nickname || null,
      players: { p1: m.playerP1 || '', p2: m.playerP2 || '' },
      status: m.status || 'NOT_STARTED',
      score: m.score || '',
      winner: m.winner || null,
      completedSets,
      createdAt: m.createdAt ? m.createdAt.toISOString() : undefined,
      updatedAt: m.updatedAt ? m.updatedAt.toISOString() : undefined,
      matchState: parsedState,
      apontadorEmail: m.apontadorEmail,
      playersEmails: m.playersEmails,
      visibility: m.visibility || 'PLAYERS_ONLY',
      clubId: m.clubId || null,
      createdByUserId: m.createdByUserId || null,
    };
  });
}

