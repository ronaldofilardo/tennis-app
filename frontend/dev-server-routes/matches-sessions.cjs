const { getMatchService, extractCtx, prisma } = require('./helpers.cjs');

// REGRA: ao adicionar campo ao schema.prisma, adicione aqui também.
const MATCH_SELECT_FULL = {
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
  apontadorEmail: true,
  playersEmails: true,
  matchState: true,
  completedSets: true,
  createdAt: true,
  updatedAt: true,
  createdByUserId: true,
  visibility: true,
  openForAnnotation: true,
};

// ─── Função auxiliar: formata partida do banco para a API ────────────────────
// REGRA: inclua TODOS os campos do schema.prisma aqui.
function formatMatchFromDB(match) {
  let matchState = null;
  try {
    matchState = match.matchState ? JSON.parse(match.matchState) : null;
  } catch (e) {
    console.warn(`Erro ao parsear matchState da partida ${match.id}:`, e.message);
    matchState = {};
  }

  let completedSets = [];
  try {
    completedSets = JSON.parse(match.completedSets || '[]');
  } catch (e) {
    console.warn(`Erro ao parsear completedSets da partida ${match.id}:`, e.message);
    completedSets = [];
  }

  return {
    id: match.id,
    sportType: match.sportType || '',
    format: match.format || '',
    courtType: match.courtType || null,
    nickname: match.nickname || null,
    score: match.score || null,
    winner: match.winner || null,
    players: { p1: match.playerP1 || '', p2: match.playerP2 || '' },
    status: match.status || 'NOT_STARTED',
    apontadorEmail: match.apontadorEmail || null,
    playersEmails: match.playersEmails || [],
    matchState,
    completedSets,
    createdAt: match.createdAt ? match.createdAt.toISOString() : null,
    updatedAt: match.updatedAt ? match.updatedAt.toISOString() : null,
    visibleTo: matchState?.visibleTo || 'both',
    createdByUserId: match.createdByUserId || null,
  };
}

module.exports = function registerMatchSessionRoutes(app) {
  app.get('/api/matches/my-completed', async (req, res) => {
    try {
      const ctx = await extractCtx(req);
      if (!ctx) return res.status(401).json({ error: 'Authentication required' });

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
          status: true,
          createdAt: true,
          createdByUserId: true,
          player1: { select: { id: true, name: true } },
          player2: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 30,
      });

      const result = matches.map((m) => ({
        id: m.id,
        sportType: m.sportType,
        format: m.format,
        courtType: m.courtType,
        playerP1: m.playerP1,
        playerP2: m.playerP2,
        status: m.status,
        createdAt: m.createdAt ? m.createdAt.toISOString() : null,
        createdByUserId: m.createdByUserId,
        annotationCount: 0,
        player1: m.player1,
        player2: m.player2,
      }));

      res.json(result);
    } catch (error) {
      console.error('[GET /api/matches/my-completed] Erro:', error);
      res.status(500).json({ error: 'Erro ao buscar partidas concluídas' });
    }
  });

  // Partidas anotadas onde o usuário logado é jogador
  app.get('/api/matches/annotated-for-me', async (req, res) => {
    try {
      const ctx = await extractCtx(req);
      if (!ctx) return res.status(401).json({ error: 'Authentication required' });

      const profile = await prisma.athleteProfile.findFirst({ where: { userId: ctx.userId } });

      const matches = await prisma.match.findMany({
        where: {
          // Sessões completadas: status='COMPLETED' OU encerradas (isActive=false + endedAt)
          annotationSessions: {
            some: {
              OR: [{ status: 'COMPLETED' }, { isActive: false, endedAt: { not: null } }],
            },
          },
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
          status: true,
          createdAt: true,
          updatedAt: true,
          player1: { select: { id: true, name: true } },
          player2: { select: { id: true, name: true } },
          annotationSessions: {
            where: {
              OR: [{ status: 'COMPLETED' }, { isActive: false, endedAt: { not: null } }],
            },
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
        status: m.status,
        createdAt: m.createdAt,
        player1: m.player1,
        player2: m.player2,
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

      res.json(enriched);
    } catch (error) {
      console.error('[GET /api/matches/annotated-for-me] Erro:', error);
      res.status(500).json({ error: 'Erro ao buscar partidas anotadas para o usuário' });
    }
  });

  // Partidas que o usuário logado anotou
  app.get('/api/matches/annotated-by-me', async (req, res) => {
    try {
      const ctx = await extractCtx(req);
      if (!ctx) return res.status(401).json({ error: 'Authentication required' });

      // Cleanup: fechar sessões órfãs (IN_PROGRESS) do usuário em partidas já FINISHED
      // Corrige dados históricos criados antes do fix no handleEndMatch
      await prisma.matchAnnotationSession.updateMany({
        where: {
          annotatorUserId: ctx.userId,
          status: 'IN_PROGRESS',
          isActive: true,
          match: { status: 'FINISHED' },
        },
        data: {
          status: 'COMPLETED',
          isActive: false,
          endedAt: new Date(),
        },
      });

      const sessions = await prisma.matchAnnotationSession.findMany({
        where: {
          annotatorUserId: ctx.userId,
          OR: [{ status: 'COMPLETED' }, { isActive: false, endedAt: { not: null } }],
        },
        include: {
          match: {
            select: {
              id: true,
              sportType: true,
              format: true,
              courtType: true,
              playerP1: true,
              playerP2: true,
              status: true,
              createdAt: true,
              player1: { select: { id: true, name: true } },
              player2: { select: { id: true, name: true } },
              annotationSessions: {
                where: {
                  OR: [{ status: 'COMPLETED' }, { isActive: false, endedAt: { not: null } }],
                },
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

      res.json(result);
    } catch (error) {
      console.error('[GET /api/matches/annotated-by-me] Erro:', error);
      res.status(500).json({ error: 'Erro ao buscar anotações realizadas' });
    }
  });

  // Dados de relatório de uma sessão específica
  app.get('/api/matches/:id/sessions/:sessionId/report-data', async (req, res) => {
    try {
      const ctx = await extractCtx(req);
      if (!ctx) return res.status(401).json({ error: 'Authentication required' });

      const session = await prisma.matchAnnotationSession.findUnique({
        where: { id: req.params.sessionId },
        include: {
          match: {
            select: {
              id: true,
              sportType: true,
              format: true,
              courtType: true,
              playerP1: true,
              playerP2: true,
              matchState: true,
              player1: { select: { name: true } },
              player2: { select: { name: true } },
            },
          },
          annotator: { select: { id: true, name: true } },
        },
      });

      if (!session || session.matchId !== req.params.id) {
        return res.status(404).json({ error: 'Sessão não encontrada' });
      }

      // Tenta usar o finalStateSnapshot da sessão.
      // Fallback: usa o matchState da partida (salvo a cada ponto via syncState).
      let snapshotData = null;
      if (session.finalStateSnapshot) {
        try {
          snapshotData = JSON.parse(session.finalStateSnapshot);
        } catch {
          snapshotData = null;
        }
      }
      if (!snapshotData && session.match.matchState) {
        try {
          snapshotData =
            typeof session.match.matchState === 'string'
              ? JSON.parse(session.match.matchState)
              : session.match.matchState;
        } catch {
          snapshotData = null;
        }
      }

      // Remover matchState do objeto match antes de enviar (não é necessário no frontend)
      const { matchState: _ms, ...matchWithoutState } = session.match;

      res.json({
        session: {
          id: session.id,
          annotatorName: session.annotator?.name ?? 'Anotador',
          endedAt: session.endedAt,
          finalStateSnapshot: snapshotData,
        },
        match: matchWithoutState,
      });
    } catch (error) {
      console.error(
        `[GET /api/matches/${req.params.id}/sessions/${req.params.sessionId}/report-data] Erro:`,
        error,
      );
      res.status(500).json({ error: 'Erro ao buscar dados do relatório' });
    }
  });
};
