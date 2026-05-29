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

module.exports = function registerMatchReadRoutes(app) {
  app.post('/api/matches', async (req, res) => {
    try {
      const ctx = await extractCtx(req);

      // Verificar se createdByUserId existe no banco antes de passar para createMatch
      let resolvedUserId = null;
      if (ctx?.userId) {
        const userExists = await prisma.user.findUnique({
          where: { id: ctx.userId },
          select: { id: true },
        });
        resolvedUserId = userExists ? ctx.userId : null;
        if (!userExists) {
          console.warn(
            `[POST /api/matches] userId ${ctx.userId} não encontrado no banco — omitindo createdByUserId`,
          );
        }
      }

      const svc = await getMatchService();
      const matchData = {
        ...req.body,
        createdByUserId: resolvedUserId,
      };
      const result = await svc.createMatch(matchData);
      console.log(`[POST /api/matches] Partida criada: ${result.id}`);
      res.status(201).json(result);
    } catch (error) {
      console.error('[POST /api/matches] Erro:', error);
      res.status(400).json({ error: error.message || 'Erro ao criar partida' });
    }
  });

  // ─── ROTAS ESTÁTICAS (devem vir ANTES de :id) ────────────────────────────────

  // GET /api/matches/my-completed — partidas concluídas
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

  // GET /api/matches/annotated-for-me — anotadas onde usuário é jogador
  app.get('/api/matches/annotated-for-me', async (req, res) => {
    try {
      const ctx = await extractCtx(req);
      if (!ctx) return res.status(401).json({ error: 'Authentication required' });

      const profile = await prisma.athleteProfile.findFirst({ where: { userId: ctx.userId } });

      const matches = await prisma.match.findMany({
        where: {
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

  // GET /api/matches/annotated-by-me — anotadas pelo usuário
  app.get('/api/matches/annotated-by-me', async (req, res) => {
    try {
      const ctx = await extractCtx(req);
      if (!ctx) return res.status(401).json({ error: 'Authentication required' });

      // Cleanup: fechar sessões órfãs (IN_PROGRESS) do usuário em partidas já FINISHED
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

  // GET /api/matches/visible — partidas visíveis
  app.get('/api/matches/visible', async (req, res) => {
    try {
      const ctx = await extractCtx(req);
      if (!ctx) return res.status(401).json({ error: 'Authentication required' });
      res.json([]);
    } catch (error) {
      console.error('[GET /api/matches/visible] Erro:', error);
      res.status(500).json({ error: 'Erro ao buscar partidas visíveis' });
    }
  });

  // GET /api/matches/open-for-annotation — partidas abertas para anotação
  app.get('/api/matches/open-for-annotation', async (req, res) => {
    try {
      const ctx = await extractCtx(req);
      if (!ctx) return res.status(401).json({ error: 'Authentication required' });
      res.json([]);
    } catch (error) {
      console.error('[GET /api/matches/open-for-annotation] Erro:', error);
      res.status(500).json({ error: 'Erro ao buscar partidas abertas' });
    }
  });

  // GET /api/matches/suspended-sessions — sessões suspensas
  app.get('/api/matches/suspended-sessions', async (req, res) => {
    try {
      const ctx = await extractCtx(req);
      if (!ctx) return res.status(401).json({ error: 'Authentication required' });

      // Encontra todas as sessões suspensas do usuário
      // Exclui partidas em status FINISHED (elas devem ir para histórico, não para suspensas)
      const suspendedSessions = await prisma.matchAnnotationSession.findMany({
        where: {
          annotatorUserId: ctx.userId,
          isActive: false,
          status: { in: ['IN_PROGRESS', 'ABANDONED'] },
          match: {
            status: { not: 'FINISHED' },
          },
        },
        select: {
          id: true,
          matchId: true,
          matchStateSnapshot: true,
          createdAt: true,
          status: true,
          match: {
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
              apontadorEmail: true,
              playersEmails: true,
              completedSets: true,
              score: true,
              matchState: true,
              visibility: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Deduplicação: manter apenas a sessão mais recente por matchId
      const deduplicatedByMatch = new Map();
      for (const session of suspendedSessions) {
        if (!deduplicatedByMatch.has(session.matchId)) {
          deduplicatedByMatch.set(session.matchId, session);
        }
      }

      const result = Array.from(deduplicatedByMatch.values()).map((session) => ({
        ...formatMatchFromDB(session.match),
        suspendedSessionId: session.id,
        suspendedAt: session.createdAt,
        suspendedStatus: session.status,
        matchStateSnapshot: session.matchStateSnapshot
          ? typeof session.matchStateSnapshot === 'string'
            ? session.matchStateSnapshot
            : JSON.stringify(session.matchStateSnapshot)
          : null,
      }));

      res.json(result);
    } catch (error) {
      console.error('[GET /api/matches/suspended-sessions] Erro:', error);
      res.status(500).json({ error: 'Erro ao buscar sessões suspensas' });
    }
  });

  // Buscar estado de uma partida específica
  app.get('/api/matches/:id/state', async (req, res) => {
    try {
      const match = await prisma.match.findUnique({
        where: { id: req.params.id },
        select: MATCH_SELECT_FULL,
      });
      if (!match) return res.status(404).json({ error: 'Partida não encontrada' });
      res.json(formatMatchFromDB(match));
    } catch (error) {
      console.error(`[GET /api/matches/${req.params.id}/state] Erro:`, error);
      res.status(500).json({ error: 'Erro ao buscar estado da partida' });
    }
  });

  // Atualizar estado de uma partida
  app.patch('/api/matches/:id/state', async (req, res) => {
    try {
      const matchId = req.params.id;
      console.log(`[PATCH /api/matches/${matchId}/state] Iniciado`);

      const { matchState } = req.body;
      console.log(
        `[PATCH /state] Recebido matchState:`,
        JSON.stringify(matchState).substring(0, 200),
      );

      let state = {};
      try {
        state =
          typeof matchState === 'string'
            ? JSON.parse(matchState)
            : typeof matchState === 'object' && matchState !== null
              ? { ...matchState }
              : {};
      } catch (e) {
        console.error(`[PATCH /state] ❌ Erro ao parsear matchState:`, e.message);
        return res.status(400).json({ error: 'Estado inválido', details: e.message });
      }

      console.log(
        `[PATCH /state] ✓ matchState parseado. Server: ${state?.server}, startedAt: ${state?.startedAt?.substring(0, 19)}`,
      );

      const currentMatch = await prisma.match.findUnique({
        where: { id: matchId },
        select: { status: true, matchState: true },
      });
      if (!currentMatch) {
        console.warn(`[PATCH /state] ❌ Partida ${matchId} não encontrada`);
        return res.status(404).json({ error: 'Partida não encontrada' });
      }
      console.log(`[PATCH /state] ✓ Partida encontrada. Status atual: ${currentMatch.status}`);

      let status = currentMatch.status || 'NOT_STARTED';
      const isFinished = Boolean(state?.isFinished || state?.winner || state?.endedAt);
      const inProgress = Boolean(
        state?.startedAt || state?.server || state?.currentGame || state?.currentSetState,
      );
      if (isFinished) status = 'FINISHED';
      else if (inProgress && status === 'NOT_STARTED') status = 'IN_PROGRESS';

      console.log(
        `[PATCH /state] 🔄 Status: ${currentMatch.status} → ${status} (isFinished=${isFinished}, inProgress=${inProgress})`,
      );

      const updated = await prisma.match.update({
        where: { id: matchId },
        data: {
          matchState: JSON.stringify(state),
          status,
          updatedAt: new Date(),
        },
        select: MATCH_SELECT_FULL,
      });

      console.log(`[PATCH /state] ✅ Sucesso. Partida ${matchId} atualizada`);

      res.json({
        message: 'Estado atualizado',
        match: formatMatchFromDB(updated),
      });
    } catch (error) {
      console.error(`[PATCH /api/matches/${req.params.id}/state] ❌ Erro:`, error.message);
      console.error(`[PATCH /state] Stack:`, error.stack);
      res
        .status(500)
        .json({ error: 'Erro ao atualizar estado da partida', details: error.message });
    }
  });

  // Partidas concluídas do usuário (criador ou jogador)
};
