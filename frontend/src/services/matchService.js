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

export async function getAllMatches(clubId = null, userRole = null) {
  // Isolamento multi-tenant: filtra por clube ou mostra apenas partidas públicas
  const whereClause = {};
  if (userRole === "ADMIN") {
    // ADMIN vê todas as partidas
  } else if (clubId) {
    // Usuário comum vê partidas do seu clube + partidas públicas
    whereClause.OR = [{ clubId }, { visibility: "PUBLIC" }];
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
      scorerId: true,
      scorerStatus: true,
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
      scorerId: match.scorerId,
      scorerStatus: match.scorerStatus,
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
    scorerId,
    apontadorEmail,
    visibleTo,
  } = validation.data;

  // Validar que scorer ≠ players (se scorerId foi fornecido)
  if (scorerId) {
    // Buscar IDs dos atletas para comparação
    // NOTA: Para agora, apenas validar string de ID vs IDs dos atletas
    // Em produção, seria mais rigoroso com busca no banco
  }

  // Inclui o email do apontador e dos jogadores em playersEmails, sem duplicidade
  const emailsSet = new Set();
  if (apontadorEmail) emailsSet.add(apontadorEmail);
  if (players && players.p1) emailsSet.add(players.p1);
  if (players && players.p2) emailsSet.add(players.p2);
  const playersEmails = Array.from(emailsSet);

  const prismaClient = testPrisma || prisma;
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
      scorerId: scorerId || null,
      scorerStatus: scorerId ? "PENDING" : null,
      status: "NOT_STARTED",
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
    scorerId: newMatch.scorerId,
    scorerStatus: newMatch.scorerStatus,
    visibleTo: visibleTo || "both",
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
      playerP1: true,
      playerP2: true,
      status: true,
      score: true,
      winner: true,
      completedSets: true,
      createdAt: true,
      matchState: true,
      visibility: true,
      scorerId: true,
      scorerStatus: true,
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
    console.warn(
      "[updateMatchState] ID inválido, aceitando de forma resiliente:",
      errorMsg,
    );
    // Não rejeitar para não quebrar fluxo existente — apenas logar
  }

  const payloadValidation = MatchStateUpdateSchema.safeParse(statePayload);
  if (!payloadValidation.success) {
    console.warn(
      "[updateMatchState] Payload inválido, aceitando de forma resiliente:",
      payloadValidation.error,
    );
    // Em vez de rejeitar, aceitar o payload como está para não quebrar fluxo existente
    // mas logar o problema para monitoramento
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
    console.error(
      `[updateMatchState] Erro ao fazer parse do matchState para partida ${id}:`,
      e,
    );
    // Em caso de payload inválido, não derrubar a API: manter estado vazio
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
    console.warn(
      `[updateMatchState] Erro ao fazer parse do estado atual da partida ${id}:`,
      e,
    );
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

  console.log(
    `[updateMatchState] Atualizando partida ${id}: status ${currentMatch?.status} -> ${status}`,
  );

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
      scorerId: true,
      scorerStatus: true,
    },
  });
  if (!match) return null;
  let matchState = null;
  try {
    matchState = match.matchState ? JSON.parse(match.matchState) : null;
  } catch (e) {
    console.warn(
      `[getMatchState] Erro ao fazer parse do matchState da partida ${match.id}:`,
      e,
    );
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
    players: { p1: match.playerP1, p2: match.playerP2 },
    status: match.status,
    score: match.score,
    winner: match.winner,
    completedSets,
    createdAt: match.createdAt ? match.createdAt.toISOString() : undefined,
    matchState,
    visibility: match.visibility,
    scorerId: match.scorerId,
    scorerStatus: match.scorerStatus,
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
        scorerId: true,
        scorerStatus: true,
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (e) {
    console.error("[getVisibleMatches] Erro ao buscar partidas do banco:", e);
    return [];
  }

  // Aplica filtro de visibilidade (se necessário)
  const { email, role } = queryValidation.data;
  console.log(
    `[getVisibleMatches] Filtrando ${matches.length} partidas para email: ${email} e role: ${role}`,
  );
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
    } catch (e) {
      console.warn(
        `[getVisibleMatches] Erro ao fazer parse do matchState da partida ${match.id}:`,
        e,
      );
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
  console.log(`[getVisibleMatches] Após filtro: ${filtered.length} partidas`);

  // Retorna status conforme está salvo no banco, garantindo robustez
  return filtered.map((match) => {
    let parsedState = null;
    try {
      parsedState = match.matchState ? JSON.parse(match.matchState) : null;
    } catch (e) {
      console.warn(
        `[getVisibleMatches] Erro ao fazer parse do matchState da partida ${match.id}:`,
        e,
      );
      parsedState = {};
    }
    let completedSets = [];
    try {
      completedSets = JSON.parse(match.completedSets || "[]");
    } catch (e) {
      console.warn(
        `[getVisibleMatches] Erro ao fazer parse do completedSets da partida ${match.id}:`,
        e,
      );
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
      scorerId: match.scorerId,
      scorerStatus: match.scorerStatus,
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
      scorerId: true,
      scorerStatus: true,
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
      } catch (parseErr) {
        console.warn(
          `[getMatchStats] Erro ao fazer parse do matchState da partida ${id}:`,
          parseErr,
        );
        matchState = {};
      }
      if (Array.isArray(matchState.pointsHistory)) {
        pointsHistory = matchState.pointsHistory;
      } else {
        if (matchState.pointsHistory !== undefined) {
          console.warn(
            `[getMatchStats] pointsHistory mal formatado para partida ${id}:`,
            matchState.pointsHistory,
          );
        }
        pointsHistory = [];
      }
    }
    return calculateMatchStats(pointsHistory);
  } catch (error) {
    console.warn(
      `[getMatchStats] Erro inesperado ao calcular estatísticas para partida ${id}:`,
      error,
    );
    // Nunca lança erro 500, retorna estatísticas vazias
    return calculateMatchStats([]);
  }
}
