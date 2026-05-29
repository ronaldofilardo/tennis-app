// frontend/api/_handlers/_matches-special-routes.js
// Rotas especiais GET de /api/matches (my-shares, my-completed, suspended-sessions, etc.)

import { requireAuth, sendJson, methodNotAllowed } from '../_lib/authMiddleware.js';
import { getVisibleMatches, getMatchesOpenForAnnotation } from '../../src/services/matchService.js';
import prisma from '../_lib/prisma.js';

/**
 * Lida com rotas GET especiais de /api/matches.
 * Retorna true se a rota foi tratada, false caso contrário.
 */
export async function handleSpecialRoutes(req, res, url, parsedPath) {
  const {
    isMyShares,
    isMyCompleted,
    isSuspendedSessions,
    isAnnotatedForMe,
    isAnnotatedByMe,
    isVisible,
    isOpenForAnnotation,
    isDiscover,
    id,
    sub,
  } = parsedPath;
  // ─── GET /api/matches/my-shares ───────────────────────────────────────────
  // Retorna MatchDashboardShare PENDING destinados ao usuário logado (ou ao seu clube)
  if (isMyShares) {
    if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
    const ctx = requireAuth(req, res);
    if (!ctx) return;
    const shares = await prisma.matchDashboardShare.findMany({
      where: {
        status: 'PENDING',
        OR: [{ targetUserId: ctx.userId }, ...(ctx.clubId ? [{ targetClubId: ctx.clubId }] : [])],
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
            clubId: true,
          },
        },
      },
      orderBy: { notifiedAt: 'desc' },
    });
    return sendJson(res, 200, shares);
  }

  // ─── GET /api/matches/my-completed ───────────────────────────────────────
  if (isMyCompleted) {
    if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
    const ctx = requireAuth(req, res);
    if (!ctx) return;
    const profile = await prisma.athleteProfile.findFirst({ where: { userId: ctx.userId } });
    const matches = await prisma.match.findMany({
      where: {
        status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'FINISHED'] },
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
        _count: { select: { annotationSessions: { where: { status: 'COMPLETED' } } } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    });
    return sendJson(
      res,
      200,
      matches.map((m) => ({
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
      })),
    );
  }

  // ─── GET /api/matches/suspended-sessions ────────────────────────────────
  // Retorna partidas com sessões suspensas (ABANDONED ou IN_PROGRESS inativo) do usuário
  if (isSuspendedSessions) {
    if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
    const ctx = requireAuth(req, res);
    if (!ctx) return;

    // Encontra todas as sessões suspensas do usuário (ABANDONED ou IN_PROGRESS com isActive=false)
    // Inclui partidas FINISHED: anotador pode ter sessão suspensa em partida encerrada por terceiro
    const suspendedSessions = await prisma.matchAnnotationSession.findMany({
      where: {
        annotator: {
          email: ctx.email,
        },
        isActive: false,
        status: { in: ['IN_PROGRESS', 'ABANDONED'] },
      },
      select: {
        id: true,
        matchId: true,
        matchStateSnapshot: true,
        match: {
          select: {
            id: true,
            sportType: true,
            format: true,
            courtType: true,
            nickname: true,
            playerP1: true,
            playerP2: true,
            player1: { select: { id: true, name: true } },
            player2: { select: { id: true, name: true } },
            status: true,
            scheduledAt: true,
            createdAt: true,
            apontadorEmail: true,
            playersEmails: true,
            completedSets: true,
            score: true,
            matchState: true,
            visibility: true,
          },
        },
        createdAt: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // ─── Deduplication: Keep only the most recent session per matchId ───
    const deduplicatedByMatch = new Map();
    for (const session of suspendedSessions) {
      if (!deduplicatedByMatch.has(session.matchId)) {
        deduplicatedByMatch.set(session.matchId, session);
      }
    }

    const result = Array.from(deduplicatedByMatch.values()).map((session) => {
      const m = session.match;
      // Parse matchState (stored as String? in DB) so DashboardMatchCard receives an object
      let matchState = null;
      try {
        matchState = m.matchState ? JSON.parse(m.matchState) : null;
      } catch {
        matchState = null;
      }
      // Parse completedSets (stored as String? in DB) so card receives an array
      let completedSets = [];
      try {
        completedSets = m.completedSets ? JSON.parse(m.completedSets) : [];
      } catch {
        completedSets = [];
      }
      return {
        id: m.id,
        sportType: m.sportType || '',
        format: m.format || '',
        courtType: m.courtType || null,
        nickname: m.nickname || null,
        score: m.score || null,
        players: {
          p1: m.player1?.name || m.playerP1 || '',
          p2: m.player2?.name || m.playerP2 || '',
        },
        status: m.status || 'NOT_STARTED',
        apontadorEmail: m.apontadorEmail || null,
        playersEmails: m.playersEmails || [],
        matchState,
        completedSets,
        createdAt: m.createdAt ? (m.createdAt.toISOString?.() ?? m.createdAt) : null,
        scheduledAt: m.scheduledAt ? (m.scheduledAt.toISOString?.() ?? m.scheduledAt) : null,
        visibility: m.visibility || 'PLAYERS_ONLY',
        suspendedSessionId: session.id,
        suspendedAt: session.createdAt,
        suspendedStatus: session.status,
        matchStateSnapshot: session.matchStateSnapshot
          ? typeof session.matchStateSnapshot === 'string'
            ? session.matchStateSnapshot
            : JSON.stringify(session.matchStateSnapshot)
          : null,
      };
    });

    console.log(
      `[GET /suspended-sessions] Before dedup: ${suspendedSessions.length} sessions, After: ${result.length} matches`,
    );

    return sendJson(res, 200, result);
  }

  // ─── GET /api/matches/annotated-for-me ───────────────────────────────────
  if (isAnnotatedForMe) {
    if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
    const ctx = requireAuth(req, res);
    if (!ctx) return;

    const profile = await prisma.athleteProfile.findFirst({ where: { userId: ctx.userId } });

    const matches = await prisma.match.findMany({
      where: {
        annotationSessions: { some: { status: 'COMPLETED' } },
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
        clubId: true,
        annotationSessions: {
          where: { status: 'COMPLETED' },
          select: {
            id: true,
            annotatorUserId: true,
            endedAt: true,
            finalStateSnapshot: true,
            annotator: { select: { id: true, name: true } },
          },
          orderBy: { endedAt: 'desc' },
        },
        dashboardShares: {
          where: { targetUserId: ctx.userId },
          orderBy: { notifiedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
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
        annotatorName: s.annotator?.name ?? 'Anotador',
        endedAt: s.endedAt,
        hasFinalState: !!s.finalStateSnapshot,
      })),
      comparisonAvailable: m.annotationSessions.length >= 2,
      myShare: m.dashboardShares[0] ?? null,
      isNew: !m.dashboardShares[0] || m.dashboardShares[0].status === 'PENDING',
    }));

    return sendJson(res, 200, enriched);
  }

  // ─── GET /api/matches/annotated-by-me ────────────────────────────────────
  if (isAnnotatedByMe) {
    if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
    const ctx = requireAuth(req, res);
    if (!ctx) return;

    const sessions = await prisma.matchAnnotationSession.findMany({
      where: { annotatorUserId: ctx.userId, status: 'COMPLETED' },
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
            clubId: true,
            annotationSessions: {
              where: { status: 'COMPLETED' },
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
      orderBy: { endedAt: 'desc' },
      take: 30,
    });

    const result = sessions.map((s) => ({
      ...s.match,
      mySession: {
        id: s.id,
        endedAt: s.endedAt,
        hasFinalState: !!s.finalStateSnapshot,
        finalStateSnapshot: s.finalStateSnapshot
          ? typeof s.finalStateSnapshot === 'string'
            ? s.finalStateSnapshot
            : JSON.stringify(s.finalStateSnapshot)
          : null,
        matchStateSnapshot: s.matchStateSnapshot
          ? typeof s.matchStateSnapshot === 'string'
            ? s.matchStateSnapshot
            : JSON.stringify(s.matchStateSnapshot)
          : null,
      },
      completedAnnotations: s.match.annotationSessions.map((sa) => ({
        id: sa.id,
        annotatorId: sa.annotatorUserId,
        annotatorName: sa.annotator?.name ?? 'Anotador',
        endedAt: sa.endedAt,
      })),
      comparisonAvailable: s.match.annotationSessions.length >= 2,
    }));

    return sendJson(res, 200, result);
  }

  // ─── GET /api/matches/visible ────────────────────────────────────────────
  if (isVisible) {
    if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
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
    if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
    const ctx = requireAuth(req, res);
    if (!ctx) return;
    const result = await getMatchesOpenForAnnotation();
    return sendJson(res, 200, result);
  }

  // ─── GET /api/matches/discover ────────────────────────────────────────────
  // Partidas públicas abertas para anotação por qualquer usuário logado.
  // Suporta filtros: sportType, clubId, dateFrom, dateTo
  if (isDiscover) {
    if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
    const ctx = requireAuth(req, res);
    if (!ctx) return;
    const sp = url.searchParams;
    const whereClause = {
      visibility: 'PUBLIC',
      openForAnnotation: true,
      status: { not: 'FINISHED' },
      ...(sp.get('sportType') ? { sportType: sp.get('sportType') } : {}),
      ...(sp.get('clubId') ? { clubId: sp.get('clubId') } : {}),
      ...(sp.get('dateFrom') || sp.get('dateTo')
        ? {
            scheduledAt: {
              ...(sp.get('dateFrom') ? { gte: new Date(sp.get('dateFrom')) } : {}),
              ...(sp.get('dateTo') ? { lte: new Date(sp.get('dateTo')) } : {}),
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
        publicMatchCode: true,
        playerP1: true,
        playerP2: true,
        player1: { select: { id: true, name: true, globalId: true, clubId: true } },
        player2: { select: { id: true, name: true, globalId: true, clubId: true } },
        clubId: true,
        homeClubId: true,
        awayClubId: true,
        createdBy: { select: { id: true, name: true } },
        _count: { select: { annotationSessions: true } },
      },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
      take: 50,
    });
    return sendJson(res, 200, matches);
  }

  // ─── GET /api/matches/by-code/:code ──────────────────────────────────────
  // Localiza uma partida pelo publicMatchCode para anotação
  if (id === 'by-code' && sub) {
    if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
    const ctx = requireAuth(req, res);
    if (!ctx) return;

    const code = sub.toUpperCase();
    const match = await prisma.match.findUnique({
      where: { publicMatchCode: code },
      select: {
        id: true,
        sportType: true,
        format: true,
        courtType: true,
        scheduledAt: true,
        status: true,
        visibility: true,
        openForAnnotation: true,
        publicMatchCode: true,
        playerP1: true,
        playerP2: true,
        player1: { select: { id: true, name: true, globalId: true } },
        player2: { select: { id: true, name: true, globalId: true } },
        clubId: true,
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!match) {
      return sendJson(res, 404, { error: 'Partida não encontrada com este código' });
    }

    // Verificar se a partida está aberta para anotação
    if (!match.openForAnnotation || match.visibility !== 'PUBLIC') {
      return sendJson(res, 403, { error: 'Partida não está disponível para anotação' });
    }

    return sendJson(res, 200, match);
  }

  return false; // rota não tratada
}
