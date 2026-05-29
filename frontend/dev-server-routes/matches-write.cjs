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

module.exports = function registerMatchWriteRoutes(app) {
  app.patch('/api/matches/:id', async (req, res) => {
    try {
      const ctx = await extractCtx(req);
      if (!ctx) return res.status(401).json({ error: 'Authentication required' });
      const match = await prisma.match.findUnique({
        where: { id: req.params.id },
        select: { id: true, createdByUserId: true },
      });
      if (!match) return res.status(404).json({ error: 'Partida não encontrada' });
      if (match.createdByUserId !== ctx.userId && ctx.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Apenas o criador da partida pode editar os dados' });
      }
      const { nickname, visibility, openForAnnotation } = req.body || {};
      const data = {};

      if (nickname !== undefined) data.nickname = nickname || null;
      if (visibility !== undefined) data.visibility = visibility;
      if (openForAnnotation !== undefined) data.openForAnnotation = Boolean(openForAnnotation);
      const updated = await prisma.match.update({
        where: { id: req.params.id },
        data,
        select: MATCH_SELECT_FULL,
      });
      res.json(formatMatchFromDB(updated));
    } catch (error) {
      console.error(`[PATCH /api/matches/${req.params.id}/metadata] Erro:`, error);
      res.status(500).json({ error: 'Erro ao atualizar dados da partida' });
    }
  });

  // GET /api/matches/:id/sessions — lista sessões de anotação de uma partida
  app.get('/api/matches/:id/sessions', async (req, res) => {
    try {
      const ctx = await extractCtx(req);
      if (!ctx) return res.status(401).json({ error: 'Authentication required' });

      const match = await prisma.match.findUnique({
        where: { id: req.params.id },
        select: { id: true },
      });
      if (!match) return res.status(404).json({ error: 'Partida não encontrada' });

      const sessions = await prisma.matchAnnotationSession.findMany({
        where: { matchId: req.params.id },
        select: {
          id: true,
          matchId: true,
          annotatorUserId: true,
          startedAt: true,
          endedAt: true,
          matchStateSnapshot: true,
          finalStateSnapshot: true,
          isActive: true,
          status: true,
          createdAt: true,
        },
      });

      res.json(sessions);
    } catch (error) {
      console.error(`[GET /api/matches/${req.params.id}/sessions] Erro:`, error);
      res.status(500).json({ error: 'Erro ao buscar sessões de anotação' });
    }
  });

  // POST /api/matches/:id/sessions — inicia/cria sessão de anotação
  app.post('/api/matches/:id/sessions', async (req, res) => {
    try {
      console.log(`[POST /api/matches/${req.params.id}/sessions] Iniciado`);
      const ctx = await extractCtx(req);
      if (!ctx) {
        console.warn(`[POST /sessions] ❌ Autenticação falhou`);
        return res.status(401).json({ error: 'Authentication required' });
      }
      console.log(`[POST /sessions] ✓ Usuário: ${ctx.userId}`);

      const match = await prisma.match.findUnique({
        where: { id: req.params.id },
        select: { id: true, matchState: true },
      });
      if (!match) {
        console.warn(`[POST /sessions] ❌ Partida ${req.params.id} não encontrada`);
        return res.status(404).json({ error: 'Partida não encontrada' });
      }
      console.log(`[POST /sessions] ✓ Partida encontrada: ${req.params.id}`);

      // Garantir que o usuário existe no banco (evita FK constraint em dev)
      const userInDb = await prisma.user.findUnique({ where: { id: ctx.userId } });
      if (!userInDb) {
        try {
          await prisma.user.create({
            data: {
              id: ctx.userId,
              email: ctx.email,
              name: ctx.email.split('@')[0],
              passwordHash: '__dev_placeholder__',
            },
          });
          console.warn(`[POST /sessions] ⚠️ Usuário ${ctx.userId} reconstituído no banco via JWT`);
        } catch (createErr) {
          // Email já existe com outro ID — redireciona para o usuário existente
          const userByEmail = await prisma.user.findUnique({ where: { email: ctx.email } });
          if (userByEmail) {
            ctx.userId = userByEmail.id;
            console.warn(`[POST /sessions] ⚠️ Redirecionando para userId existente: ${ctx.userId}`);
          } else {
            console.error(`[POST /sessions] ❌ Falha ao reconstituir usuário:`, createErr.message);
            throw createErr;
          }
        }
      }

      // Verificar se já há uma sessão ativa do mesmo anotador
      const existingSession = await prisma.matchAnnotationSession.findFirst({
        where: {
          matchId: req.params.id,
          annotatorUserId: ctx.userId,
          status: 'IN_PROGRESS',
        },
      });

      if (existingSession) {
        console.log(`[POST /sessions] ✓ Sessão já existe: ${existingSession.id}`);
        // Retornar a sessão existente
        return res.json(existingSession);
      }

      // Criar nova sessão
      console.log(`[POST /sessions] 🔄 Criando nova sessão para userId=${ctx.userId}`);
      const session = await prisma.matchAnnotationSession.create({
        data: {
          matchId: req.params.id,
          annotatorUserId: ctx.userId,
          matchStateSnapshot: match.matchState || null,
          isActive: true,
          status: 'IN_PROGRESS',
        },
      });

      console.log(`[POST /sessions] ✅ Nova sessão criada: ${session.id}`);
      res.json(session);
    } catch (error) {
      console.error(`[POST /api/matches/${req.params.id}/sessions] ❌ Erro:`, error.message);
      console.error(`[POST /sessions] Stack:`, error.stack);
      res.status(500).json({ error: 'Erro ao criar sessão de anotação', details: error.message });
    }
  });

  // POST /api/matches/:id/sessions/:sessionId/abandon — marca sessão como ABANDONED (beforeunload)
  app.post('/api/matches/:id/sessions/:sessionId/abandon', async (req, res) => {
    try {
      const ctx = await extractCtx(req);
      if (!ctx) {
        console.warn(`[POST /abandon] ❌ Autenticação falhou`);
        return res.status(401).json({ error: 'Authentication required' });
      }

      const session = await prisma.matchAnnotationSession.findUnique({
        where: { id: req.params.sessionId },
        select: {
          id: true,
          matchId: true,
          annotatorUserId: true,
          isActive: true,
          status: true,
        },
      });

      if (!session || session.matchId !== req.params.id) {
        console.warn(`[POST /abandon] ❌ Sessão ${req.params.sessionId} não encontrada`);
        return res.status(404).json({ error: 'Session not found' });
      }

      // Só o anotador ou ADMIN pode marcar como ABANDONED
      if (session.annotatorUserId !== ctx.userId && ctx.role !== 'ADMIN') {
        console.warn(
          `[POST /abandon] ❌ Autorização negada para ${ctx.userId} em sessão de ${session.annotatorUserId}`,
        );
        return res.status(403).json({
          error: 'Only the annotator or admin can abandon a session',
        });
      }

      // Se já foi finalizada, não faz nada (idempotent)
      if (session.status === 'COMPLETED' || session.status === 'ABANDONED') {
        console.log(
          `[POST /abandon] ℹ️ Sessão ${session.id} já está ${session.status} (idempotent)`,
        );
        return res.json({
          message: 'Session already ended',
          id: session.id,
          status: session.status,
        });
      }

      const matchStateSnapshot = req.body?.matchStateSnapshot
        ? typeof req.body.matchStateSnapshot === 'string'
          ? req.body.matchStateSnapshot
          : JSON.stringify(req.body.matchStateSnapshot)
        : null;

      const updated = await prisma.matchAnnotationSession.update({
        where: { id: req.params.sessionId },
        data: {
          status: 'ABANDONED',
          isActive: false,
          endedAt: new Date(),
          ...(matchStateSnapshot ? { matchStateSnapshot } : {}),
        },
        include: {
          annotator: { select: { id: true, name: true, email: true } },
        },
      });

      console.log(
        `[POST /abandon] ✅ Sessão ${session.id} marcada como ABANDONED via beforeunload`,
      );
      res.json(updated);
    } catch (error) {
      console.error(
        `[POST /api/matches/${req.params.id}/sessions/${req.params.sessionId}/abandon] ❌ Erro:`,
        error.message,
      );
      res.status(500).json({
        error: 'Erro ao marcar sessão como ABANDONED',
        details: error.message,
      });
    }
  });

  // PATCH /api/matches/:id/sessions/:sessionId — encerra ou marca sessão como ABANDONED
  app.patch('/api/matches/:id/sessions/:sessionId', async (req, res) => {
    try {
      const ctx = await extractCtx(req);
      if (!ctx) return res.status(401).json({ error: 'Authentication required' });

      const session = await prisma.matchAnnotationSession.findUnique({
        where: { id: req.params.sessionId },
        select: { id: true, matchId: true, annotatorUserId: true, isActive: true },
      });
      if (!session || session.matchId !== req.params.id) {
        return res.status(404).json({ error: 'Sessão não encontrada' });
      }
      if (session.annotatorUserId !== ctx.userId && ctx.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Apenas o anotador pode encerrar a sessão' });
      }
      if (!session.isActive) {
        // Idempotente: retornar 200 ao invés de 400.
        // Evita race condition entre React cleanup PATCH e beforeunload fetch keepalive.
        return res.json({ id: session.id, status: session.status, alreadyEnded: true });
      }

      const newStatus = req.body?.status || 'COMPLETED';
      if (!['COMPLETED', 'ABANDONED', 'IN_PROGRESS'].includes(newStatus)) {
        return res.status(400).json({ error: 'Status inválido' });
      }

      const match = await prisma.match.findUnique({
        where: { id: req.params.id },
        select: { matchState: true },
      });

      const updateData = {
        status: newStatus,
        ...(newStatus === 'ABANDONED' && {
          isActive: false,
          // Garantir que matchStateSnapshot é sempre uma STRING (JSON)
          matchStateSnapshot: (() => {
            const snapshot = req.body?.matchStateSnapshot;
            if (snapshot) {
              // Se é string, usa direto; se é object, stringify
              return typeof snapshot === 'string' ? snapshot : JSON.stringify(snapshot);
            }
            // Fallback para matchState da partida (converter para string se for object)
            if (match?.matchState) {
              return typeof match.matchState === 'string'
                ? match.matchState
                : JSON.stringify(match.matchState);
            }
            return null;
          })(),
        }),
        ...(newStatus === 'COMPLETED' && {
          isActive: false,
          endedAt: new Date(),
          finalStateSnapshot: req.body?.finalState
            ? JSON.stringify(req.body.finalState)
            : match?.matchState || null,
        }),
      };

      const updated = await prisma.matchAnnotationSession.update({
        where: { id: req.params.sessionId },
        data: updateData,
      });

      console.log(
        `[PATCH /sessions/${req.params.sessionId}] ✅ Status → ${newStatus}`,
        newStatus === 'ABANDONED'
          ? `(snapshot length: ${updateData.matchStateSnapshot?.length || 0})`
          : '',
      );
      res.json(updated);
    } catch (error) {
      console.error(
        `[PATCH /api/matches/${req.params.id}/sessions/${req.params.sessionId}] Erro:`,
        error.message,
      );
      res.status(500).json({ error: 'Erro ao atualizar sessão', details: error.message });
    }
  });

  // POST /api/matches/:id/claim — salva partida no histórico do usuário logado
};
