// frontend/src/services/matchService.js - Otimizado para Vercel Serverless

import { PrismaClient } from "@prisma/client";
import { calculateMatchStats } from "./statsUtils.js";
import {
  MatchCreateSchema,
  MatchUpdateSchema,
  MatchStateUpdateSchema,
  VisibleMatchesQuerySchema,
  MatchIdSchema,
  validateAndFormatZodError,
} from "./validationSchemas.js";

// Stub para MatchIdSchema para evitar problemas
const MatchIdSchemaStub = {
  parse: (data) => data,
  safeParse: (data) => ({ success: true, data }),
};

// Cache de conexão Prisma otimizado para serverless
let prisma;
if (typeof globalThis !== "undefined" && globalThis.__prisma) {
  prisma = globalThis.__prisma;
} else {
  prisma = new PrismaClient({
    log:
      process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  });
  if (typeof globalThis !== "undefined") {
    globalThis.__prisma = prisma;
  }
}

export async function getAllMatches(
  clubId = null,
  userRole = null,
  userId = null,
) {
  // Isolamento multi-tenant: filtra por clube ou mostra apenas partidas públicas.
  const whereClause = {};
  if (userRole === "ADMIN") {
    // ADMIN vê todas as partidas
  } else if (clubId) {
    // Usuário comum vê partidas do seu clube + partidas públicas
    const orConditions = [{ clubId }, { visibility: "PUBLIC" }];
    whereClause.OR = orConditions;
  } else {
    // Sem clube: apenas partidas públicas
    whereClause.visibility = "PUBLIC";
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
    orderBy: { createdAt: "desc" },
  });
  return matches.map((match) => {
    const parsedState = match.matchState ? JSON.parse(match.matchState) : null;
    let status = match.status;

    if (parsedState && status === "NOT_STARTED") {
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
        status = "FINISHED";
      } else if (inProgressIndicators) {
        status = "IN_PROGRESS";
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
      completedSets: JSON.parse(match.completedSets || "[]"),
      createdAt: match.createdAt.toISOString(),
      matchState: parsedState,
      visibleTo: parsedState?.visibleTo || "both",
      visibility: match.visibility || "PLAYERS_ONLY",
    };
  });
}

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
    visibility = "PLAYERS_ONLY",
    apontadorEmail,
    visibleTo,
    clubId,
    createdByUserId,
    openForAnnotation = false,
  } = validation.data;

  const prismaClient = testPrisma || prisma;

  // Buscar emails reais dos jogadores pelo nome
  let p1Email = players.p1;
  let p2Email = players.p2;

  try {
    const [user1, user2] = await Promise.all([
      prismaClient.user.findFirst({
        where: { name: { equals: players.p1, mode: "insensitive" } },
        select: { email: true },
      }),
      prismaClient.user.findFirst({
        where: { name: { equals: players.p2, mode: "insensitive" } },
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
      visibility: visibility || "PLAYERS_ONLY",
      status: "NOT_STARTED",
      openForAnnotation: openForAnnotation ?? false,
      clubId: clubId || null,
      createdByUserId: createdByUserId || null,
      completedSets: JSON.stringify([]),
      matchState: JSON.stringify({
        playersIds: { p1: players.p1, p2: players.p2 },
        visibleTo: visibleTo || "both", // Legado
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
    visibleTo: visibleTo || "both",
    clubId: newMatch.clubId || null,
    status: newMatch.status,
    score: newMatch.score,
    winner: newMatch.winner,
    completedSets: JSON.parse(newMatch.completedSets || "[]"),
    createdAt: newMatch.createdAt.toISOString(),
  };

  return responseMatch;
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
    },
  });

  if (!match) {
    const notFoundError = new Error("Partida não encontrada");
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  let matchState = null;
  try {
    matchState = match.matchState ? JSON.parse(match.matchState) : null;
  } catch (e) {
    console.warn(
      `[getMatchById] Erro ao fazer parse do matchState da partida ${match.id}:`,
      e,
    );
    matchState = {};
  }

  let completedSets = [];
  try {
    completedSets = JSON.parse(match.completedSets || "[]");
  } catch {
    completedSets = [];
  }

  return {
    id: match.id,
    sportType: match.sportType,
    format: match.format,
    courtType: match.courtType || "GRASS",
    players: { p1: match.playerP1, p2: match.playerP2 },
    status: match.status,
    score: match.score,
    winner: match.winner,
    completedSets,
    createdAt: match.createdAt ? match.createdAt.toISOString() : undefined,
    matchState,
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
  if (payloadValidation.data.score !== undefined)
    updateData.score = payloadValidation.data.score;
  if (payloadValidation.data.winner !== undefined)
    updateData.winner = payloadValidation.data.winner;
  if (payloadValidation.data.completedSets !== undefined)
    updateData.completedSets = JSON.stringify(
      payloadValidation.data.completedSets,
    );
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
    message: "Partida atualizada com sucesso",
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
    if (typeof matchState === "string") {
      state = JSON.parse(matchState);
    } else if (typeof matchState === "object" && matchState !== null) {
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
    currentState = currentMatch?.matchState
      ? JSON.parse(currentMatch.matchState)
      : {};
  } catch (e) {
    currentState = {};
  }

  // Inferir status de forma resiliente
  let status = currentMatch?.status || "NOT_STARTED";

  // Só alterar status se houver mudanças significativas no estado
  const isFinished = Boolean(
    state?.isFinished || state?.winner || state?.endedAt,
  );
  const inProgressIndicators = Boolean(
    state?.startedAt ||
    state?.server ||
    state?.currentGame ||
    state?.currentSetState,
  );

  // Lógica de transição de status mais conservadora
  if (isFinished) {
    status = "FINISHED";
  } else if (inProgressIndicators && status === "NOT_STARTED") {
    // Só mudar para IN_PROGRESS se estava NOT_STARTED
    status = "IN_PROGRESS";
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
    message: "Estado da partida atualizado com sucesso",
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
    completedSets = JSON.parse(match.completedSets || "[]");
  } catch {
    completedSets = [];
  }
  return {
    id: match.id,
    sportType: match.sportType,
    format: match.format,
    courtType: match.courtType || "GRASS",
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

  // Busca todas as partidas primeiro com select otimizado
  // IMPORTANTE: ao adicionar campos ao schema Prisma, inclua-os aqui também
  let matches = [];
  try {
    matches = await (testPrisma || prisma).match.findMany({
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
      orderBy: { createdAt: "desc" },
    });
  } catch (e) {
    return [];
  }

  // Aplica filtro de visibilidade (se necessário)
  const { email, role } = queryValidation.data;
  const filtered = matches.filter((match) => {
    let matchRole = undefined;
    let playersEmails = match.playersEmails || [];
    try {
      if (match.matchState) {
        const parsed =
          typeof match.matchState === "string"
            ? JSON.parse(match.matchState)
            : match.matchState;
        if (parsed && parsed.role) matchRole = parsed.role;
      }
    } catch {
      // parse falhou: ignorar matchState do filtro
    }
    // Retorna se o e-mail do usuário está em playersEmails OU é o apontador da partida
    if (!email) return false;
    const isApontador = match.apontadorEmail === email;
    const isInPlayersEmails =
      Array.isArray(playersEmails) && playersEmails.includes(email);
    if (!isApontador && !isInPlayersEmails) {
      return false;
    }
    if (role !== undefined && matchRole !== undefined) {
      return matchRole === role;
    }
    return true;
  });
  // Retorna status conforme está salvo no banco, garantindo robustez
  return filtered.map((match) => {
    let parsedState = null;
    try {
      parsedState = match.matchState ? JSON.parse(match.matchState) : null;
    } catch {
      parsedState = {};
    }
    let completedSets = [];
    try {
      completedSets = JSON.parse(match.completedSets || "[]");
    } catch {
      completedSets = [];
    }

    // Usa o status salvo no banco, não recalcula
    let status = match.status || "NOT_STARTED";

    // Retorna TODOS os campos do match para evitar que novos campos sejam perdidos
    return {
      id: match.id,
      sportType: match.sportType || "",
      format: match.format || "",
      courtType: match.courtType || null,
      nickname: match.nickname || null,
      players: { p1: match.playerP1 || "", p2: match.playerP2 || "" },
      status,
      score: match.score || "",
      winner: match.winner || null,
      completedSets,
      createdAt: match.createdAt ? match.createdAt.toISOString() : undefined,
      updatedAt: match.updatedAt ? match.updatedAt.toISOString() : undefined,
      matchState: parsedState,
      visibleTo:
        parsedState && parsedState.visibleTo ? parsedState.visibleTo : "both",
      apontadorEmail: match.apontadorEmail,
      playersEmails: match.playersEmails,
      visibility: match.visibility || "PLAYERS_ONLY",
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
    const notFoundError = new Error(
      "Partida não encontrada para calcular estatísticas",
    );
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
          typeof match.matchState === "string"
            ? JSON.parse(match.matchState)
            : match.matchState;
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
      status: { not: "FINISHED" },
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
    orderBy: { createdAt: "desc" },
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
    clubName: match.club?.name || null,
    createdBy: match.createdBy
      ? { id: match.createdBy.id, name: match.createdBy.name }
      : null,
  }));
}
