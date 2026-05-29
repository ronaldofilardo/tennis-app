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

module.exports = function registerMatchActionRoutes(app) {
  app.post('/api/matches/:id/claim', async (req, res) => {
    try {
      const ctx = await extractCtx(req);
      if (!ctx) return res.status(401).json({ error: 'Authentication required' });

      const match = await prisma.match.findUnique({
        where: { id: req.params.id },
        select: { id: true },
      });
      if (!match) return res.status(404).json({ error: 'Partida não encontrada' });

      const existing = await prisma.matchDashboardShare.findFirst({
        where: { matchId: req.params.id, targetUserId: ctx.userId },
      });

      let share;
      if (existing) {
        share = await prisma.matchDashboardShare.update({
          where: { id: existing.id },
          data: { status: 'ACCEPTED', respondedAt: new Date() },
        });
      } else {
        share = await prisma.matchDashboardShare.create({
          data: {
            matchId: req.params.id,
            targetUserId: ctx.userId,
            shareType: 'ANNOTATION',
            status: 'ACCEPTED',
            respondedAt: new Date(),
          },
        });
      }

      res.json({ ok: true, shareId: share.id, status: share.status });
    } catch (error) {
      console.error(`[POST /api/matches/${req.params.id}/claim] Erro:`, error);
      res.status(500).json({ error: 'Erro ao salvar partida no histórico' });
    }
  });

  // GET /api/matches/discover — partidas públicas disponíveis para anotação (ANTES de :id!)
  app.get('/api/matches/discover', async (req, res) => {
    try {
      const ctx = await extractCtx(req);
      if (!ctx) return res.status(401).json({ error: 'Authentication required' });

      const sp = new URL(`http://localhost${req.url}`).searchParams;
      const matches = await prisma.match.findMany({
        where: {
          visibility: 'PUBLIC',
          openForAnnotation: true,
          status: { not: 'FINISHED' },
          ...(sp.get('sportType') ? { sportType: sp.get('sportType') } : {}),
          ...(sp.get('clubId') ? { clubId: sp.get('clubId') } : {}),
        },
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
          player1: { select: { id: true, name: true } },
          player2: { select: { id: true, name: true } },
          club: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
        take: 50,
      });
      res.json(matches);
    } catch (error) {
      console.error('[GET /api/matches/discover] Erro:', error);
      res.status(500).json({ error: 'Erro ao carregar partidas disponíveis' });
    }
  });

  // GET /api/matches/tournament-suggestions — sugestões de torneios (ANTES de :id!)
  app.get('/api/matches/tournament-suggestions', async (req, res) => {
    try {
      const ctx = await extractCtx(req);
      if (!ctx) return res.status(401).json({ error: 'Authentication required' });

      const sp = new URL(`http://localhost${req.url}`).searchParams;
      const tournamentFilter = sp.get('tournamentName');

      const [tournaments, rounds] = await Promise.all([
        prisma.match.findMany({
          where: {
            clubId: ctx.clubId ?? undefined,
            tournamentName: { not: null },
          },
          distinct: ['tournamentName'],
          select: { tournamentName: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        prisma.match.findMany({
          where: {
            clubId: ctx.clubId ?? undefined,
            roundName: { not: null },
            ...(tournamentFilter ? { tournamentName: tournamentFilter } : {}),
          },
          distinct: ['roundName'],
          select: { roundName: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
      ]);

      res.json({
        tournaments: tournaments.map((t) => t.tournamentName).filter(Boolean),
        rounds: rounds.map((r) => r.roundName).filter(Boolean),
      });
    } catch (error) {
      console.error('[GET /api/matches/tournament-suggestions] Erro:', error);
      res.status(500).json({ error: 'Erro ao buscar sugestões de torneios' });
    }
  });

  // Buscar partida específica (rota genérica — deve ficar DEPOIS de rotas estáticas)
  app.get('/api/matches/:id', async (req, res) => {
    try {
      const match = await prisma.match.findUnique({
        where: { id: req.params.id },
        select: MATCH_SELECT_FULL,
      });
      if (!match) return res.status(404).json({ error: 'Partida não encontrada' });
      res.json(formatMatchFromDB(match));
    } catch (error) {
      console.error(`[GET /api/matches/${req.params.id}] Erro:`, error);
      res.status(500).json({ error: 'Erro ao buscar partida' });
    }
  });

  // Atualizar partida com ações especiais (endMatch, reopen, etc.)
  app.patch('/api/matches/:id', async (req, res) => {
    try {
      const ctx = await extractCtx(req);
      if (!ctx) return res.status(401).json({ error: 'Authentication required' });

      console.debug(
        '[dev-server PATCH /api/matches/:id] req.body:',
        JSON.stringify(req.body),
        'action:',
        req.body?.action,
      );

      // Ação especial: encerrar partida manualmente
      if (req.body?.action === 'endMatch') {
        console.debug(
          '[dev-server endMatch] Processing for matchId:',
          req.params.id,
          'userId:',
          ctx.userId,
        );
        const matchToEnd = await prisma.match.findUnique({
          where: { id: req.params.id },
          select: { createdByUserId: true, status: true, matchState: true },
        });

        if (!matchToEnd) {
          return res.status(404).json({ error: 'Match not found', matchId: req.params.id });
        }

        if (matchToEnd.createdByUserId !== ctx.userId && ctx.role !== 'ADMIN') {
          return res.status(403).json({ error: 'Apenas o criador pode encerrar a partida' });
        }

        if (matchToEnd.status === 'FINISHED') {
          return res.status(409).json({ error: 'Match already finished' });
        }

        // Atualizar match para FINISHED
        const endedMatch = await prisma.match.update({
          where: { id: req.params.id },
          data: {
            status: 'FINISHED',
            endedAt: new Date(),
            ...(req.body.winner !== undefined ? { winner: req.body.winner } : {}),
          },
        });

        // Finalizar todas as sessions deste match
        await prisma.matchAnnotationSession.updateMany({
          where: { matchId: req.params.id, isActive: true },
          data: { isActive: false, status: 'COMPLETED', endedAt: new Date() },
        });

        console.debug('[dev-server endMatch] Match ended successfully:', endedMatch.id);
        return res.json(formatMatchFromDB(endedMatch));
      }

      // Ação especial: reabrir partida finalizada
      if (req.body?.action === 'reopenMatch') {
        console.debug('[dev-server reopenMatch] Processing for matchId:', req.params.id);
        const matchToReopen = await prisma.match.findUnique({
          where: { id: req.params.id },
          select: { createdByUserId: true, status: true },
        });

        if (!matchToReopen) {
          return res.status(404).json({ error: 'Match not found' });
        }

        if (matchToReopen.createdByUserId !== ctx.userId && ctx.role !== 'ADMIN') {
          return res.status(403).json({ error: 'Apenas o criador pode reabrir a partida' });
        }

        if (matchToReopen.status !== 'FINISHED') {
          return res.status(400).json({ error: 'Only finished matches can be reopened' });
        }

        const reopenedMatch = await prisma.match.update({
          where: { id: req.params.id },
          data: { status: 'IN_PROGRESS', endedAt: null, winner: null },
        });

        console.debug('[dev-server reopenMatch] Match reopened successfully:', reopenedMatch.id);
        return res.json(formatMatchFromDB(reopenedMatch));
      }

      // Fallback: delegue ao updateMatch service
      const svc = await getMatchService();
      const updated = await svc.updateMatch(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error(`[PATCH /api/matches/${req.params.id}] Erro:`, error);
      res.status(500).json({ error: 'Erro ao atualizar partida', details: error.message });
    }
  });

  // Estatísticas de uma partida — delega ao matchService.js
  app.get('/api/matches/:id/stats', async (req, res) => {
    try {
      const svc = await getMatchService();
      const stats = await svc.getMatchStats(req.params.id);
      res.json(stats);
    } catch (error) {
      console.error(`[GET /api/matches/${req.params.id}/stats] Erro:`, error);
      // Fallback: retorna stats básicas se o service falhar
      res.json({
        totalPoints: 0,
        player1: {},
        player2: {},
        match: {},
        pointsHistory: [],
      });
    }
  });

  // Sistema de revisão removido na migration 20260317180000_remove_scorer_review_system

  // GET /api/matches/:id/reviews — removido, retorna vazio para compatibilidade
  app.get('/api/matches/:id/reviews', async (req, res) => {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: 'Authentication required' });
    return res.json([]);
  });

  // PATCH /api/matches/:id/reviews/:reviewId — removido
  app.patch('/api/matches/:id/reviews/:reviewId', (_req, res) => {
    return res.status(410).json({ error: 'Sistema de revisão removido' });
  });

  // GET /api/reviews/pending — removido, retorna vazio para compatibilidade
  app.get('/api/reviews/pending', async (req, res) => {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: 'Authentication required' });
    return res.json([]);
  });

  // POST /api/matches/download-review — removido
  app.post('/api/matches/download-review', (_req, res) => {
    return res.status(410).json({ error: 'Sistema de revisão removido' });
  });

  // DELETE /api/matches/:id/local-only — remove cópia privada (central intacta)
  app.delete('/api/matches/:id/local-only', async (req, res) => {
    try {
      const ctx = await extractCtx(req);
      if (!ctx) return res.status(401).json({ error: 'Authentication required' });

      const match = await prisma.match.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          createdByUserId: true,
        },
      });
      if (!match) return res.status(404).json({ error: 'Partida não encontrada' });
      if (match.createdByUserId !== ctx.userId)
        return res.status(403).json({ error: 'Sem permissão para remover esta partida' });

      await prisma.match.delete({ where: { id: req.params.id } });
      res.json({ message: 'Cópia local removida com sucesso.' });
    } catch (error) {
      console.error('[DELETE /api/matches/:id/local-only] Erro:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // DELETE /api/matches/:id — exclui partida (apenas criador ou ADMIN)
  app.delete('/api/matches/:id', async (req, res) => {
    try {
      const ctx = await extractCtx(req);
      if (!ctx) return res.status(401).json({ error: 'Authentication required' });

      const match = await prisma.match.findUnique({
        where: { id: req.params.id },
        select: { id: true, createdByUserId: true, status: true },
      });
      if (!match) return res.status(404).json({ error: 'Match not found' });
      if (match.createdByUserId !== ctx.userId && ctx.role !== 'ADMIN') {
        return res
          .status(403)
          .json({ error: 'Apenas o criador ou administrador pode excluir a partida' });
      }
      // Criador e admin podem deletar partidas em qualquer estado
      await prisma.match.delete({ where: { id: req.params.id } });
      return res.json({ success: true });
    } catch (error) {
      console.error('[DELETE /api/matches/:id] Erro:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Fallback SPA
};
