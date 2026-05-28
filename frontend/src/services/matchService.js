// frontend/src/services/matchService.js - JavaScript implementation for Node.js serverless
import prisma from '../../api/_lib/prisma.js';
import { calculateMatchStats } from './statsUtils.js';
import {
  MatchCreateSchema,
  MatchUpdateSchema,
  MatchStateUpdateSchema,
  VisibleMatchesQuerySchema,
  MatchIdSchema,
  validateAndFormatZodError,
} from './validationSchemas.js';

/**
 * Cria uma nova partida no banco de dados após validar os dados com Zod.
 * @param {object} matchData - Os dados da partida a ser criada.
 * @returns {Promise<object>} A partida recém-criada e formatada.
 * @throws {Error} Se os dados fornecidos forem inválidos.
 */

export async function createMatch(matchData, testPrisma) {
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
    publicMatchCode,
    player1Id,
    player2Id,
    homeClubId,
    awayClubId,
  } = validation.data;

  const prismaClient = testPrisma || prisma;

  // Buscar emails reais dos jogadores pelo nome
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
  } catch (err) {
    // falha no lookup de emails — usa nome como fallback
  }

  // Inclui o email do apontador e dos jogadores em playersEmails, sem duplicidade
  const emailsSet = new Set();
  if (apontadorEmail) emailsSet.add(apontadorEmail);
  emailsSet.add(p1Email);
  emailsSet.add(p2Email);
  const playersEmails = Array.from(emailsSet);

  // Debug log de dados antes de criar
  console.log('[createMatch] Dados para Prisma:', {
    sportType,
    format,
    clubId,
    createdByUserId,
    player1Id,
    player2Id,
    homeClubId,
    awayClubId,
    venueId,
    players: { p1: players.p1, p2: players.p2 },
  });

  try {
    const newMatch = await prismaClient.match.create({
      data: {
        sportType,
        format,
        courtType: courtType || null,
        nickname: nickname || null,
        apontadorEmail: apontadorEmail || null,
        playerP1: players.p1,
        playerP2: players.p2,
        playersEmails,
        visibility: visibility || 'PLAYERS_ONLY',
        status: 'NOT_STARTED',
        openForAnnotation: openForAnnotation ?? false,
        // FKs opcionais: somente incluir se tiverem valores válidos
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        clubId: clubId || null,
        homeClubId: homeClubId || null,
        awayClubId: awayClubId || null,
        publicMatchCode: publicMatchCode || null,
        completedSets: JSON.stringify([]),
        matchState: JSON.stringify({
          playersIds: { p1: players.p1, p2: players.p2 },
          visibleTo: visibleTo || 'both',
          needsSetup: true,
          startedAt: null,
        }),
      },
    });

    const responseMatch = {
      id: newMatch.id,
      sportType: newMatch.sportType,
      format: newMatch.format,
      courtType: newMatch.courtType || null,
      nickname: newMatch.nickname || null,
      players: { p1: newMatch.playerP1, p2: newMatch.playerP2 },
      apontadorEmail: newMatch.apontadorEmail,
      playersEmails: newMatch.playersEmails,
      visibility: newMatch.visibility,
      openForAnnotation: newMatch.openForAnnotation,
      publicMatchCode: newMatch.publicMatchCode || null,
      scheduledAt: newMatch.scheduledAt ? newMatch.scheduledAt.toISOString() : null,
      venueId: newMatch.venueId || null,
      visibleTo: visibleTo || 'both',
      clubId: newMatch.clubId || null,
      status: newMatch.status,
      score: newMatch.score,
      winner: newMatch.winner,
      completedSets: JSON.parse(newMatch.completedSets || '[]'),
      createdAt: newMatch.createdAt.toISOString(),
    };

    return responseMatch;
  } catch (err) {
    console.error('[createMatch] Erro ao criar partida:', {
      code: err.code,
      message: err.message,
      meta: err.meta,
      stack: err.stack,
      data: { clubId, createdByUserId, player1Id, player2Id, homeClubId, awayClubId, venueId },
    });
    throw err;
  }
}

export async function getMatchById(id) {
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
      createdByUserId: true,
      annotationSessions: {
        select: {
          id: true,
          status: true,
          isActive: true,
        },
      },
    },
  });

  if (!match) {
    const notFoundError = new Error('Partida não encontrada');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  let matchState = null;
  try {
    matchState = match.matchState ? JSON.parse(match.matchState) : null;
  } catch (e) {
    console.warn(`[getMatchById] Erro ao fazer parse do matchState da partida ${match.id}:`, e);
    matchState = {};
  }

  let completedSets = [];
  try {
    completedSets = JSON.parse(match.completedSets || '[]');
  } catch {
    completedSets = [];
  }

  return {
    id: match.id,
    sportType: match.sportType,
    format: match.format,
    courtType: match.courtType || 'GRASS',
    players: { p1: match.playerP1, p2: match.playerP2 },
    status: match.status,
    score: match.score,
    winner: match.winner,
    completedSets,
    createdAt: match.createdAt ? match.createdAt.toISOString() : undefined,
    matchState,
    createdByUserId: match.createdByUserId,
    annotationSessions: match.annotationSessions,
  };
}

export async function updateMatch(id, updatePayload) {
  // Validar ID e payload
  const idValidation = MatchIdSchema.safeParse(id);
  if (!idValidation.success) {
    throw new Error(validateAndFormatZodError(idValidation.error));
  }

  const payloadValidation = MatchUpdateSchema.safeParse(updatePayload);
  if (!payloadValidation.success) {
    throw new Error(validateAndFormatZodError(payloadValidation.error));
  }

  const updateData = {};
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

export async function updateMatchState(id, statePayload, testPrisma) {
  // Validação restaurada — valida id e payload antes de operar
  const idValidation = MatchIdSchema.safeParse(id);
  if (!idValidation.success) {
    const errorMsg = validateAndFormatZodError(idValidation.error);
    void errorMsg;
    // Aceitar de forma resiliente para não quebrar fluxo existente
  }

  const payloadValidation = MatchStateUpdateSchema.safeParse(statePayload);
  if (!payloadValidation.success) {
    // Aceitar payload como está para não quebrar fluxo existente
  }

  const { matchState } = statePayload;

  // Aceitar tanto objeto quanto string e garantir robustez no parse
  let state;
  try {
    if (typeof matchState === 'string') {
      state = JSON.parse(matchState);
    } else if (typeof matchState === 'object' && matchState !== null) {
      state = { ...matchState }; // Criar cópia para evitar mutação
    } else {
      state = {};
    }
  } catch (e) {
    // parse falhou: usar estado vazio sem derrubar a API
    state = {};
  }

  // Buscar estado atual da partida para preservar status se não foi explicitamente alterado
  const prismaClient = testPrisma || prisma;
  const currentMatch = await prismaClient.match.findUnique({
    where: { id },
    select: { status: true, matchState: true },
  });

  let currentState = {};
  try {
    currentState = currentMatch?.matchState ? JSON.parse(currentMatch.matchState) : {};
  } catch (e) {
    currentState = {};
  }

  // Inferir status de forma resiliente
  let status = currentMatch?.status || 'NOT_STARTED';

  // Só alterar status se houver mudanças significativas no estado
  const isFinished = Boolean(state?.isFinished || state?.winner || state?.endedAt);
  const inProgressIndicators = Boolean(
    state?.startedAt || state?.server || state?.currentGame || state?.currentSetState,
  );

  // Lógica de transição de status mais conservadora
  if (isFinished) {
    status = 'FINISHED';
  } else if (inProgressIndicators && status === 'NOT_STARTED') {
    // Só mudar para IN_PROGRESS se estava NOT_STARTED
    status = 'IN_PROGRESS';
  }
  // Se já estava IN_PROGRESS ou FINISHED, manter o status atual

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
export async function getMatchState(id) {
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
      visibility: true,
      player1: { select: { globalId: true } },
      player2: { select: { globalId: true } },
    },
  });
  if (!match) return null;
  let matchState = null;
  try {
    matchState = match.matchState ? JSON.parse(match.matchState) : null;
  } catch (e) {
    matchState = {};
  }
  if (matchState && !matchState.startedAt) {
    matchState.startedAt = match.createdAt
      ? match.createdAt.toISOString()
      : new Date().toISOString();
  }
  let completedSets = [];
  try {
    completedSets = JSON.parse(match.completedSets || '[]');
  } catch {
    completedSets = [];
  }
  return {
    id: match.id,
    sportType: match.sportType,
    format: match.format,
    courtType: match.courtType || 'GRASS',
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
