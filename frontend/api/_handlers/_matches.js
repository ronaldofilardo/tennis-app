// frontend/api/matches.js
// Router consolidado — todas as rotas /api/matches/*
//   GET    /api/matches                    → lista partidas do clube
//   POST   /api/matches                    → cria partida
//   GET    /api/matches/visible            → partidas visíveis (auth opcional)
//   GET    /api/matches/:id                → detalhe da partida
//   PATCH  /api/matches/:id                → atualiza partida
//   GET    /api/matches/:id/state          → estado da partida
//   PATCH  /api/matches/:id/state          → atualiza estado
//   GET    /api/matches/:id/stats          → estatísticas

import {
  getAllMatches,
  createMatch,
  getMatchById,
  updateMatch,
  getMatchState,
  updateMatchState,
  getMatchStats,
  getVisibleMatches,
  getMatchesOpenForAnnotation,
} from "../../src/services/matchService.js";
import {
  handleCors,
  requireAuth,
  sendJson,
  methodNotAllowed,
} from "../_lib/authMiddleware.js";
import { validateMatchApiResponse } from "../../src/schemas/contracts.js";
import { requireActiveSubscription } from "../_lib/subscriptionMiddleware.js";
import prisma from "../_lib/prisma.js";

/**
 * Gera (ou atualiza) o comparativo de anotações para uma partida.
 * Agrega todas as sessões COMPLETED e compara ponto-a-ponto.
 */
async function generateComparison(matchId) {
  const sessions = await prisma.matchAnnotationSession.findMany({
    where: { matchId, status: "COMPLETED" },
    select: {
      id: true,
      annotatorUserId: true,
      finalStateSnapshot: true,
      annotator: { select: { id: true, name: true } },
    },
  });

  if (sessions.length < 2) return null;

  // Parsear snapshots e extrair histórico de pontos
  const sessionData = sessions
    .map((s) => {
      try {
        const state = s.finalStateSnapshot ? JSON.parse(s.finalStateSnapshot) : null;
        const history = state?.pointsHistory || [];
        return { sessionId: s.id, annotatorId: s.annotatorUserId, annotatorName: s.annotator?.name || s.annotatorUserId, history };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  // Construir comparativo ponto-a-ponto
  const maxLen = Math.max(...sessionData.map((s) => s.history.length), 0);
  const points = [];
  for (let i = 0; i < maxLen; i++) {
    const bySession = {};
    let consensus = true;
    let firstWinner = null;
    for (const sd of sessionData) {
      const pt = sd.history[i] || null;
      bySession[sd.annotatorId] = pt;
      if (pt) {
        if (firstWinner === null) firstWinner = pt.winner;
        else if (pt.winner !== firstWinner) consensus = false;
      }
    }
    points.push({ index: i, consensus, sessions: bySession });
  }

  const payload = { sessions: sessionData.map((s) => ({ id: s.sessionId, annotatorId: s.annotatorId, name: s.annotatorName })), points };

  // Upsert comparativo
  const existing = await prisma.matchAnnotationComparison.findFirst({ where: { matchId } });
  if (existing) {
    return prisma.matchAnnotationComparison.update({
      where: { id: existing.id },
      data: { payload, status: "PUBLISHED", updatedAt: new Date() },
    });
  }
  return prisma.matchAnnotationComparison.create({
    data: { matchId, payload, status: "PUBLISHED" },
  });
}

/**
 * Cria MatchDashboardShare para todos os stakeholders de uma partida.
 */
async function createDashboardShares(matchId) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      createdByUserId: true,
      player1: { select: { userId: true, clubId: true } },
      player2: { select: { userId: true, clubId: true } },
      homeClubId: true,
      awayClubId: true,
      clubId: true,
    },
  });
  if (!match) return;

  const sharesData = [];
  const addedUsers = new Set();
  const addedClubs = new Set();

  const addUser = (userId) => {
    if (userId && !addedUsers.has(userId)) {
      addedUsers.add(userId);
      sharesData.push({ matchId, targetUserId: userId, shareType: "ANNOTATION" });
    }
  };
  const addClub = (clubId) => {
    if (clubId && !addedClubs.has(clubId)) {
      addedClubs.add(clubId);
      sharesData.push({ matchId, targetClubId: clubId, shareType: "ANNOTATION" });
    }
  };

  addUser(match.createdByUserId);
  addUser(match.player1?.userId);
  addUser(match.player2?.userId);
  addClub(match.clubId);
  addClub(match.homeClubId);
  addClub(match.awayClubId);

  if (sharesData.length > 0) {
    await prisma.matchDashboardShare.createMany({ data: sharesData, skipDuplicates: true });
  }
}

function parsePath(url) {
  const parts = url.pathname.split("/").filter(Boolean);
  // parts: [api, matches, ?id|special, ?sub, ?subId, ?action]
  const seg = parts[2] || null;
  const sub = parts[3] || null;
  const subId = parts[4] || null;
  const action = parts[5] || null;
  const isVisible = seg === "visible";
  const isOpenForAnnotation = seg === "open-for-annotation";
  const isDiscover = seg === "discover";
  const isMyShares = seg === "my-shares";
  const isAnnotatedForMe = seg === "annotated-for-me";
  const isAnnotatedByMe = seg === "annotated-by-me";
  const isMyCompleted = seg === "my-completed";
  const isSpecialSeg = isVisible || isOpenForAnnotation || isDiscover || isMyShares || isAnnotatedForMe || isAnnotatedByMe || isMyCompleted;
  const id = !isSpecialSeg ? seg : null;
  const isMetadata = sub === "metadata";
  const isClaim = sub === "claim";
  return { id, sub, subId, action, isVisible, isOpenForAnnotation, isDiscover, isMyShares, isAnnotatedForMe, isAnnotatedByMe, isMyCompleted, isMetadata, isClaim };
}

export default async function handler(req, res) {
  try {
    if (handleCors(req, res)) return;

    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const { id, sub, subId, action, isVisible, isOpenForAnnotation, isDiscover, isMyShares, isAnnotatedForMe, isAnnotatedByMe, isMyCompleted, isMetadata, isClaim } = parsePath(url);

    // ─── GET /api/matches/my-shares ───────────────────────────────────────────
    // Retorna MatchDashboardShare PENDING destinados ao usuário logado (ou ao seu clube)
    if (isMyShares) {
      if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
      const ctx = requireAuth(req, res);
      if (!ctx) return;
      const shares = await prisma.matchDashboardShare.findMany({
        where: {
          status: "PENDING",
          OR: [
            { targetUserId: ctx.userId },
            ...(ctx.clubId ? [{ targetClubId: ctx.clubId }] : []),
          ],
        },
        include: {
          match: {
            select: {
              id: true,
              sportType: true,
              playerP1: true,
              playerP2: true,
              status: true,
              scheduledAt: true,
              player1: { select: { id: true, name: true } },
              player2: { select: { id: true, name: true } },
              club: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { notifiedAt: "desc" },
      });
      return sendJson(res, 200, shares);
    }

    // ─── GET /api/matches/my-completed ───────────────────────────────────────
    if (isMyCompleted) {
      if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
      const ctx = requireAuth(req, res);
      if (!ctx) return;
      const profile = await prisma.athleteProfile.findFirst({ where: { userId: ctx.userId } });
      const matches = await prisma.match.findMany({
        where: {
          status: "FINISHED",
          OR: [
            { createdByUserId: ctx.userId },
            ...(profile ? [{ player1Id: profile.id }, { player2Id: profile.id }] : []),
            { playersEmails: { has: ctx.email } },
          ],
        },
        select: {
          id: true,
          sportType: true,
          format: true,
          courtType: true,
          playerP1: true,
          playerP2: true,
          scheduledAt: true,
          createdAt: true,
          player1: { select: { id: true, name: true } },
          player2: { select: { id: true, name: true } },
          _count: { select: { annotationSessions: { where: { status: "COMPLETED" } } } },
        },
        orderBy: { updatedAt: "desc" },
        take: 30,
      });
      return sendJson(res, 200, matches.map((m) => ({
        id: m.id,
        sportType: m.sportType,
        format: m.format,
        courtType: m.courtType,
        playerP1: m.playerP1,
        playerP2: m.playerP2,
        scheduledAt: m.scheduledAt,
        createdAt: m.createdAt,
        player1: m.player1,
        player2: m.player2,
        annotationCount: m._count.annotationSessions,
      })));
    }

    // ─── GET /api/matches/annotated-for-me ───────────────────────────────────
    if (isAnnotatedForMe) {
      if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
      const ctx = requireAuth(req, res);
      if (!ctx) return;

      const profile = await prisma.athleteProfile.findFirst({ where: { userId: ctx.userId } });

      const matches = await prisma.match.findMany({
        where: {
          annotationSessions: { some: { status: "COMPLETED" } },
          OR: [
            ...(profile ? [{ player1Id: profile.id }, { player2Id: profile.id }] : []),
            { playersEmails: { has: ctx.email } },
            { apontadorEmail: ctx.email },
            { dashboardShares: { some: { targetUserId: ctx.userId } } },
          ],
        },
        select: {
          id: true,
          sportType: true,
          format: true,
          courtType: true,
          playerP1: true,
          playerP2: true,
          scheduledAt: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          player1: { select: { id: true, name: true } },
          player2: { select: { id: true, name: true } },
          club: { select: { id: true, name: true } },
          annotationSessions: {
            where: { status: "COMPLETED" },
            select: {
              id: true,
              annotatorUserId: true,
              endedAt: true,
              finalStateSnapshot: true,
              annotator: { select: { id: true, name: true } },
            },
            orderBy: { endedAt: "desc" },
          },
          dashboardShares: {
            where: { targetUserId: ctx.userId },
            orderBy: { notifiedAt: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 30,
      });

      const enriched = matches.map((m) => ({
        id: m.id,
        sportType: m.sportType,
        format: m.format,
        courtType: m.courtType,
        playerP1: m.playerP1,
        playerP2: m.playerP2,
        scheduledAt: m.scheduledAt,
        status: m.status,
        createdAt: m.createdAt,
        player1: m.player1,
        player2: m.player2,
        club: m.club,
        completedAnnotations: m.annotationSessions.map((s) => ({
          id: s.id,
          annotatorId: s.annotatorUserId,
          annotatorName: s.annotator?.name ?? "Anotador",
          endedAt: s.endedAt,
          hasFinalState: !!s.finalStateSnapshot,
        })),
        comparisonAvailable: m.annotationSessions.length >= 2,
        myShare: m.dashboardShares[0] ?? null,
        isNew: !m.dashboardShares[0] || m.dashboardShares[0].status === "PENDING",
      }));

      return sendJson(res, 200, enriched);
    }

    // ─── GET /api/matches/annotated-by-me ────────────────────────────────────
    if (isAnnotatedByMe) {
      if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
      const ctx = requireAuth(req, res);
      if (!ctx) return;

      const sessions = await prisma.matchAnnotationSession.findMany({
        where: { annotatorUserId: ctx.userId, status: "COMPLETED" },
        include: {
          match: {
            select: {
              id: true,
              sportType: true,
              format: true,
              courtType: true,
              playerP1: true,
              playerP2: true,
              scheduledAt: true,
              status: true,
              createdAt: true,
              player1: { select: { id: true, name: true } },
              player2: { select: { id: true, name: true } },
              club: { select: { id: true, name: true } },
              annotationSessions: {
                where: { status: "COMPLETED" },
                select: {
                  id: true,
                  annotatorUserId: true,
                  endedAt: true,
                  annotator: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: { endedAt: "desc" },
        take: 30,
      });

      const result = sessions.map((s) => ({
        ...s.match,
        mySession: {
          id: s.id,
          endedAt: s.endedAt,
          hasFinalState: !!s.finalStateSnapshot,
        },
        completedAnnotations: s.match.annotationSessions.map((sa) => ({
          id: sa.id,
          annotatorId: sa.annotatorUserId,
          annotatorName: sa.annotator?.name ?? "Anotador",
          endedAt: sa.endedAt,
        })),
        comparisonAvailable: s.match.annotationSessions.length >= 2,
      }));

      return sendJson(res, 200, result);
    }

    // ─── GET /api/matches/visible ────────────────────────────────────────────
    if (isVisible) {
      if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
      // Email e role vêm do JWT (Authorization header) — nunca de query string
      // (query string fica em logs de servidor, histórico do browser, etc.)
      const ctx = requireAuth(req, res);
      if (!ctx) return;
      const result = await getVisibleMatches({
        email: ctx.email,
        role: ctx.role ?? undefined,
      });
      return sendJson(res, 200, result);
    }

    // ─── GET /api/matches/open-for-annotation ────────────────────────────────
    if (isOpenForAnnotation) {
      if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
      const ctx = requireAuth(req, res);
      if (!ctx) return;
      const result = await getMatchesOpenForAnnotation();
      return sendJson(res, 200, result);
    }

    // ─── GET /api/matches/discover ────────────────────────────────────────────
    // Partidas públicas abertas para anotação por qualquer usuário logado.
    // Suporta filtros: sportType, clubId, dateFrom, dateTo
    if (isDiscover) {
      if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
      const ctx = requireAuth(req, res);
      if (!ctx) return;
      const sp = url.searchParams;
      const whereClause = {
        visibility: "PUBLIC",
        openForAnnotation: true,
        status: { not: "FINISHED" },
        ...(sp.get("sportType") ? { sportType: sp.get("sportType") } : {}),
        ...(sp.get("clubId") ? { clubId: sp.get("clubId") } : {}),
        ...(sp.get("dateFrom") || sp.get("dateTo")
          ? {
              scheduledAt: {
                ...(sp.get("dateFrom") ? { gte: new Date(sp.get("dateFrom")) } : {}),
                ...(sp.get("dateTo") ? { lte: new Date(sp.get("dateTo")) } : {}),
              },
            }
          : {}),
      };
      const matches = await prisma.match.findMany({
        where: whereClause,
        select: {
          id: true,
          sportType: true,
          format: true,
          courtType: true,
          scheduledAt: true,
          status: true,
          visibility: true,
          openForAnnotation: true,
          playerP1: true,
          playerP2: true,
          player1: { select: { id: true, name: true, globalId: true, clubId: true } },
          player2: { select: { id: true, name: true, globalId: true, clubId: true } },
          club: { select: { id: true, name: true, slug: true } },
          homeClub: { select: { id: true, name: true, slug: true } },
          awayClub: { select: { id: true, name: true, slug: true } },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { annotationSessions: true } },
        },
        orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
        take: 50,
      });
      return sendJson(res, 200, matches);
    }

    // ─── /api/matches/:id/sessions ───────────────────────────────────────────
    // POST   /api/matches/:id/sessions              → inicia sessão de anotação
    // GET    /api/matches/:id/sessions              → lista sessões da partida
    // PATCH  /api/matches/:id/sessions/:sessionId   → encerra sessão (endedAt)
    // POST   /api/matches/:id/sessions/:sessionId/endorse → endossa sessão
    if (id && sub === "sessions") {
      const ctx = requireAuth(req, res);
      if (!ctx) return;

      // GET /api/matches/:id/sessions/:sessionId/report-data → dados de relatório
      if (subId && action === "report-data" && req.method === "GET") {
        const session = await prisma.matchAnnotationSession.findUnique({
          where: { id: subId },
          include: {
            match: {
              select: {
                id: true,
                sportType: true,
                format: true,
                courtType: true,
                playerP1: true,
                playerP2: true,
                scheduledAt: true,
                player1: { select: { name: true } },
                player2: { select: { name: true } },
                club: { select: { name: true } },
              },
            },
            annotator: { select: { id: true, name: true } },
          },
        });
        if (!session || session.matchId !== id)
          return sendJson(res, 404, { error: "Session not found" });
        return sendJson(res, 200, {
          session: {
            id: session.id,
            annotatorName: session.annotator?.name ?? "Anotador",
            endedAt: session.endedAt,
            finalStateSnapshot: session.finalStateSnapshot
              ? JSON.parse(session.finalStateSnapshot)
              : null,
          },
          match: session.match,
        });
      }

      // Endosso: POST /api/matches/:id/sessions/:sessionId/endorse
      if (subId && action === "endorse" && req.method === "POST") {
        const session = await prisma.matchAnnotationSession.findUnique({
          where: { id: subId },
          select: { id: true, matchId: true, isActive: true },
        });
        if (!session || session.matchId !== id)
          return sendJson(res, 404, { error: "Session not found" });
        // Só pode endossar sessão encerrada
        if (session.isActive)
          return sendJson(res, 400, {
            error: "Cannot endorse an active session",
          });
        const endorsement = await prisma.annotationEndorsement.create({
          data: { sessionId: subId, endorsedByUserId: ctx.userId },
          include: {
            endorsedBy: { select: { id: true, name: true, email: true } },
          },
        });
        return sendJson(res, 201, endorsement);
      }

      // PATCH /api/matches/:id/sessions/:sessionId → encerrar sessão
      if (subId && req.method === "PATCH") {
        const session = await prisma.matchAnnotationSession.findUnique({
          where: { id: subId },
          select: {
            id: true,
            matchId: true,
            annotatorUserId: true,
            isActive: true,
          },
        });
        if (!session || session.matchId !== id)
          return sendJson(res, 404, { error: "Session not found" });
        // Só o anotador ou ADMIN pode encerrar
        if (session.annotatorUserId !== ctx.userId && ctx.role !== "ADMIN")
          return sendJson(res, 403, {
            error: "Only the annotator or admin can end a session",
          });
        if (!session.isActive)
          return sendJson(res, 400, { error: "Session already ended" });
        // Capturar snapshot do matchState atual como finalStateSnapshot
        const match = await prisma.match.findUnique({
          where: { id },
          select: { matchState: true },
        });
        const updated = await prisma.matchAnnotationSession.update({
          where: { id: subId },
          data: {
            isActive: false,
            status: "COMPLETED",
            endedAt: new Date(),
            finalStateSnapshot: req.body?.finalState
              ? JSON.stringify(req.body.finalState)
              : (match?.matchState || null),
          },
        });

        // Verificar se há múltiplas sessões COMPLETED para gerar comparativo
        const completedSessions = await prisma.matchAnnotationSession.count({
          where: { matchId: id, status: "COMPLETED" },
        });
        if (completedSessions >= 2) {
          // Reagendar geração de comparativo (assíncrono — não bloqueia resposta)
          setImmediate(async () => {
            try {
              await generateComparison(id);
            } catch { /* silently fail — comparativo pode ser regenerado */ }
          });
        }

        return sendJson(res, 200, updated);
      }

      // GET /api/matches/:id/sessions → listar sessões
      if (req.method === "GET") {
        const sessions = await prisma.matchAnnotationSession.findMany({
          where: { matchId: id },
          include: {
            annotator: { select: { id: true, name: true, email: true } },
            endorsements: {
              include: { endorsedBy: { select: { id: true, name: true } } },
            },
          },
          orderBy: { createdAt: "desc" },
        });
        return sendJson(res, 200, sessions);
      }

      // POST /api/matches/:id/sessions → iniciar nova sessão (multi-anotador)
      if (req.method === "POST") {
        // Verificar se a partida existe e não está finalizada
        const match = await prisma.match.findUnique({
          where: { id },
          select: { status: true, clubId: true, openForAnnotation: true },
        });
        if (!match) return sendJson(res, 404, { error: "Match not found" });
        if (match.status === "FINISHED")
          return sendJson(res, 409, { error: "Match already finished" });

        // Partida aberta: qualquer autenticado (não SPECTATOR de plataforma) pode anotar
        // Partida fechada: respeita role de clube (comportamento original)
        if (!match.openForAnnotation && ctx.role === "SPECTATOR")
          return sendJson(res, 403, {
            error: "Spectators cannot annotate matches",
          });

        // Multi-anotador: NÃO desativar sessões existentes
        // Cada anotador tem sua própria sessão independente
        // Se o usuário já tem sessão ativa, retornar a existente
        const existingSession = await prisma.matchAnnotationSession.findFirst({
          where: { matchId: id, annotatorUserId: ctx.userId, isActive: true },
          include: {
            annotator: { select: { id: true, name: true, email: true } },
          },
        });
        if (existingSession) return sendJson(res, 200, existingSession);

        // Criar nova sessão ativa para este anotador
        const session = await prisma.matchAnnotationSession.create({
          data: {
            matchId: id,
            annotatorUserId: ctx.userId,
            isActive: true,
            status: "IN_PROGRESS",
          },
          include: {
            annotator: { select: { id: true, name: true, email: true } },
          },
        });
        return sendJson(res, 201, session);
      }

      return methodNotAllowed(res, ["GET", "POST", "PATCH"]);
    }

    // ─── /api/matches/:id/comparison ─────────────────────────────────────────
    if (id && sub === "comparison") {
      const ctx = requireAuth(req, res);
      if (!ctx) return;
      if (req.method === "GET") {
        const comp = await prisma.matchAnnotationComparison.findFirst({
          where: { matchId: id },
          orderBy: { updatedAt: "desc" },
        });
        if (!comp) return sendJson(res, 404, { error: "No comparison found" });
        return sendJson(res, 200, comp);
      }
      if (req.method === "POST") {
        const comp = await generateComparison(id);
        if (!comp) return sendJson(res, 422, { error: "Need at least 2 completed sessions" });
        return sendJson(res, 200, comp);
      }
      return methodNotAllowed(res, ["GET", "POST"]);
    }

    // ─── /api/matches/:id/share ───────────────────────────────────────────────
    if (id && sub === "share") {
      const ctx = requireAuth(req, res);
      if (!ctx) return;

      // PATCH /api/matches/:id/share/:shareId → aceitar ou rejeitar
      if (subId && req.method === "PATCH") {
        const { status: newStatus } = req.body;
        if (!["ACCEPTED", "REJECTED"].includes(newStatus))
          return sendJson(res, 400, { error: "status must be ACCEPTED or REJECTED" });
        const share = await prisma.matchDashboardShare.findUnique({
          where: { id: subId },
          select: { id: true, matchId: true, targetUserId: true, targetClubId: true },
        });
        if (!share || share.matchId !== id)
          return sendJson(res, 404, { error: "Share not found" });
        // Apenas o próprio usuário ou membro do clube pode responder
        if (share.targetUserId && share.targetUserId !== ctx.userId && ctx.role !== "ADMIN")
          return sendJson(res, 403, { error: "Cannot respond to this share" });
        const updated = await prisma.matchDashboardShare.update({
          where: { id: subId },
          data: { status: newStatus, respondedAt: new Date() },
        });
        return sendJson(res, 200, updated);
      }

      // POST /api/matches/:id/share → criar shares para todos os stakeholders
      if (req.method === "POST") {
        await createDashboardShares(id);
        const shares = await prisma.matchDashboardShare.findMany({
          where: { matchId: id },
        });
        return sendJson(res, 201, shares);
      }

      // GET /api/matches/:id/share → listar shares da partida
      if (req.method === "GET") {
        const shares = await prisma.matchDashboardShare.findMany({
          where: { matchId: id },
          orderBy: { notifiedAt: "desc" },
        });
        return sendJson(res, 200, shares);
      }

      return methodNotAllowed(res, ["GET", "POST", "PATCH"]);
    }

    // ─── /api/matches/:id/state ──────────────────────────────────────────────
    if (id && sub === "state") {
      const ctx = requireAuth(req, res);
      if (!ctx) return;
      if (ctx.role !== "ADMIN") {
        const match = await getMatchById(id);
        if (
          match?.clubId &&
          match.clubId !== ctx.clubId &&
          match.visibility !== "PUBLIC"
        ) {
          return sendJson(res, 403, { error: "Access denied to this match" });
        }
      }
      if (req.method === "GET")
        return sendJson(res, 200, await getMatchState(id));
      if (req.method === "PATCH") {
        // SPECTATOR não pode alterar estado
        if (ctx.role === "SPECTATOR")
          return sendJson(res, 403, {
            error: "Spectators cannot modify matches",
          });
        // Partida finalizada é imutável
        const current = await prisma.match.findUnique({
          where: { id },
          select: { status: true },
        });
        if (current?.status === "FINISHED")
          return sendJson(res, 409, { error: "Match already finished" });
        // Cross-club PUBLIC: somente leitura
        const matchData = await getMatchById(id);
        if (
          matchData?.clubId &&
          matchData.clubId !== ctx.clubId &&
          ctx.role !== "ADMIN"
        )
          return sendJson(res, 403, {
            error: "Cross-club matches are read-only",
          });
        const result = await updateMatchState(id, req.body);
        // Ao finalizar partida, criar compartilhamentos automáticos
        const newStatus = req.body?.status || req.body?.matchState?.status;
        if (newStatus === "FINISHED" || result?.status === "FINISHED") {
          setImmediate(async () => {
            try { await createDashboardShares(id); } catch { /* silently fail */ }
          });
        }
        return sendJson(res, 200, result);
      }
      return methodNotAllowed(res, ["GET", "PATCH"]);
    }

    // ─── GET /api/matches/:id/stats ──────────────────────────────────────────
    if (id && sub === "stats") {
      const ctx = requireAuth(req, res);
      if (!ctx) return;
      if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
      if (ctx.role !== "ADMIN") {
        const match = await getMatchById(id);
        if (
          match?.clubId &&
          match.clubId !== ctx.clubId &&
          match.visibility !== "PUBLIC"
        ) {
          return sendJson(res, 403, { error: "Access denied to this match" });
        }
      }
      return sendJson(res, 200, await getMatchStats(id));
    }

    // ─── /api/matches/:id ────────────────────────────────────────────────────
    if (id) {
      const ctx = requireAuth(req, res);
      if (!ctx) return;

      // POST /api/matches/:id/claim — salva partida no histórico do usuário
      if (isClaim && req.method === "POST") {
        const matchExists = await prisma.match.findUnique({ where: { id }, select: { id: true } });
        if (!matchExists) return sendJson(res, 404, { error: "Match not found" });
        const existing = await prisma.matchDashboardShare.findFirst({
          where: { matchId: id, targetUserId: ctx.userId },
        });
        let share;
        if (existing) {
          share = await prisma.matchDashboardShare.update({
            where: { id: existing.id },
            data: { status: "ACCEPTED", respondedAt: new Date() },
          });
        } else {
          share = await prisma.matchDashboardShare.create({
            data: {
              matchId: id,
              targetUserId: ctx.userId,
              shareType: "ANNOTATION",
              status: "ACCEPTED",
              respondedAt: new Date(),
            },
          });
        }
        return sendJson(res, 200, { ok: true, shareId: share.id, status: share.status });
      }

      // PATCH /api/matches/:id/metadata — atualiza metadados editáveis pelo criador
      if (isMetadata && req.method === "PATCH") {
        const match = await prisma.match.findUnique({
          where: { id },
          select: { createdByUserId: true },
        });
        if (!match) return sendJson(res, 404, { error: "Match not found" });
        if (match.createdByUserId !== ctx.userId && ctx.role !== "ADMIN") {
          return sendJson(res, 403, { error: "Apenas o criador da partida pode editar os dados" });
        }
        const { scheduledAt, venueId, nickname, visibility, openForAnnotation } = req.body ?? {};
        const data = {};
        if (scheduledAt !== undefined) data.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
        if (venueId !== undefined) data.venueId = venueId || null;
        if (nickname !== undefined) data.nickname = nickname || null;
        if (visibility !== undefined) data.visibility = visibility;
        if (openForAnnotation !== undefined) data.openForAnnotation = Boolean(openForAnnotation);
        const updated = await prisma.match.update({ where: { id }, data });
        return sendJson(res, 200, updated);
      }

      if (req.method === "GET") {
        const match = await getMatchById(id);
        if (match && ctx.role !== "ADMIN") {
          if (
            match.clubId &&
            match.clubId !== ctx.clubId &&
            match.visibility !== "PUBLIC"
          ) {
            return sendJson(res, 403, { error: "Access denied to this match" });
          }
        }
        return sendJson(res, 200, match);
      }
      if (req.method === "PATCH") {
        // SPECTATOR não pode alterar partidas
        if (ctx.role === "SPECTATOR")
          return sendJson(res, 403, {
            error: "Spectators cannot modify matches",
          });
        const existing = await getMatchById(id);
        if (existing && ctx.role !== "ADMIN") {
          if (existing.clubId && existing.clubId !== ctx.clubId) {
            return sendJson(res, 403, { error: "Access denied to this match" });
          }
        }
        // Partida finalizada é imutável
        const currentStatus = await prisma.match.findUnique({
          where: { id },
          select: { status: true },
        });
        if (currentStatus?.status === "FINISHED")
          return sendJson(res, 409, { error: "Match already finished" });
        return sendJson(res, 200, await updateMatch(id, req.body));
      }
      return methodNotAllowed(res, ["GET", "PATCH"]);
    }

    // ─── /api/matches (root) ─────────────────────────────────────────────────
    const ctx = requireAuth(req, res);
    if (!ctx) return;

    if (req.method === "GET") {
      const result = await getAllMatches(ctx.clubId, ctx.role, ctx.userId);
      const validated = result.map((match) => {
        const validation = validateMatchApiResponse(match);
        if (!validation.success) {
          throw new Error(
            `Contrato de API violado: ${validation.error.message}`,
          );
        }
        return { ...match, contractVersion: "1.0.0" };
      });
      return sendJson(res, 200, validated);
    }

    if (req.method === "POST") {
      // SPECTATOR não pode criar partidas
      if (ctx.role === "SPECTATOR")
        return sendJson(res, 403, {
          error: "Spectators cannot create matches",
        });
      const subCheck = await requireActiveSubscription(req, res, ctx);
      if (!subCheck) return;

      // ── Detecção de partida duplicada ──────────────────────────────────────
      // Se player1Id e player2Id informados + scheduledAt, verificar duplicata
      const { player1Id, player2Id, scheduledAt, force } = req.body;
      if (player1Id && player2Id && scheduledAt && !force) {
        const scheduledDate = new Date(scheduledAt);
        const windowMs = 30 * 60 * 1000; // ±30 minutos
        const existing = await prisma.match.findFirst({
          where: {
            status: { not: "FINISHED" },
            scheduledAt: {
              gte: new Date(scheduledDate.getTime() - windowMs),
              lte: new Date(scheduledDate.getTime() + windowMs),
            },
            OR: [
              { player1Id, player2Id },
              { player1Id: player2Id, player2Id: player1Id },
            ],
          },
          select: {
            id: true,
            scheduledAt: true,
            createdBy: { select: { name: true, email: true } },
          },
        });
        if (existing) {
          return sendJson(res, 409, {
            code: "DUPLICATE_MATCH",
            existing: {
              id: existing.id,
              scheduledAt: existing.scheduledAt,
              creatorName:
                existing.createdBy?.name || existing.createdBy?.email || "outro usuário",
            },
          });
        }
      }

      // ── Auto-derivar homeClubId / awayClubId dos atletas ──────────────────
      let derivedHomeClubId;
      let derivedAwayClubId;
      if (player1Id) {
        const p1 = await prisma.athleteProfile.findUnique({
          where: { id: player1Id },
          select: { clubId: true },
        });
        derivedHomeClubId = p1?.clubId ?? undefined;
      }
      if (player2Id) {
        const p2 = await prisma.athleteProfile.findUnique({
          where: { id: player2Id },
          select: { clubId: true },
        });
        derivedAwayClubId = p2?.clubId ?? undefined;
      }

      const matchData = {
        ...req.body,
        clubId: ctx.clubId,
        createdByUserId: ctx.userId,
        homeClubId: derivedHomeClubId,
        awayClubId: derivedAwayClubId,
      };
      const result = await createMatch(matchData);
      const validation = validateMatchApiResponse(result);
      if (!validation.success) {
        throw new Error(
          `Contrato de API violado na criação: ${validation.error.message}`,
        );
      }
      return sendJson(res, 201, { ...result, contractVersion: "1.0.0" });
    }

    return methodNotAllowed(res, ["GET", "POST"]);
  } catch (error) {
    console.error("Erro interno em matches:", error);
    const msg =
      error instanceof Error
        ? error.message
        : error != null
          ? String(error)
          : "Internal server error";
    return sendJson(res, 500, { error: msg });
  }
}
