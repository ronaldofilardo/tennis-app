// frontend/api/_handlers/_matches-sessions.js
// Rotas /api/matches/:id/sessions (iniciar, encerrar, listar, abandonar, endossar)

import { requireAuth, sendJson, methodNotAllowed } from '../_lib/authMiddleware.js';
import prisma from '../_lib/prisma.js';
import { generateComparison } from './_matches-helpers.js';

/**
 * Lida com rotas /api/matches/:id/sessions.
 * Retorna true se a rota foi tratada, false caso contrário.
 */
export async function handleSessionRoutes(req, res, url, parsedPath) {
  const { id, sub, subId, action } = parsedPath;
    // ─── /api/matches/:id/sessions ───────────────────────────────────────────
    // POST   /api/matches/:id/sessions              → inicia sessão de anotação
    // GET    /api/matches/:id/sessions              → lista sessões da partida
    // PATCH  /api/matches/:id/sessions/:sessionId   → encerra sessão (endedAt)
    // POST   /api/matches/:id/sessions/:sessionId/endorse → endossa sessão
    if (id && sub === 'sessions') {
      const ctx = requireAuth(req, res);
      if (!ctx) return;

      // GET /api/matches/:id/sessions/:sessionId/report-data → dados de relatório
      if (subId && action === 'report-data' && req.method === 'GET') {
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
                clubId: true,
              },
            },
            annotator: { select: { id: true, name: true } },
          },
        });
        if (!session || session.matchId !== id)
          return sendJson(res, 404, { error: 'Session not found' });
        return sendJson(res, 200, {
          session: {
            id: session.id,
            annotatorName: session.annotator?.name ?? 'Anotador',
            endedAt: session.endedAt,
            finalStateSnapshot: session.finalStateSnapshot
              ? JSON.parse(session.finalStateSnapshot)
              : null,
          },
          match: session.match,
        });
      }

      // Endosso: POST /api/matches/:id/sessions/:sessionId/endorse
      if (subId && action === 'endorse' && req.method === 'POST') {
        const session = await prisma.matchAnnotationSession.findUnique({
          where: { id: subId },
          select: { id: true, matchId: true, isActive: true },
        });
        if (!session || session.matchId !== id)
          return sendJson(res, 404, { error: 'Session not found' });
        // Só pode endossar sessão encerrada
        if (session.isActive)
          return sendJson(res, 400, {
            error: 'Cannot endorse an active session',
          });
        const endorsement = await prisma.annotationEndorsement.create({
          data: { sessionId: subId, endorsedByUserId: ctx.userId },
          include: {
            endorsedBy: { select: { id: true, name: true, email: true } },
          },
        });
        return sendJson(res, 201, endorsement);
      }

      // Abandono rápido: POST /api/matches/:id/sessions/:sessionId/abandon
      // Usado por beforeunload (navigator.sendBeacon) para marcar como ABANDONED rapidamente
      if (subId && action === 'abandon' && req.method === 'POST') {
        try {
          const session = await prisma.matchAnnotationSession.findUnique({
            where: { id: subId },
            select: {
              id: true,
              matchId: true,
              annotatorUserId: true,
              isActive: true,
              status: true,
            },
          });
          if (!session || session.matchId !== id)
            return sendJson(res, 404, { error: 'Session not found' });

          // Só o anotador ou ADMIN pode marcar como ABANDONED
          if (session.annotatorUserId !== ctx.userId && ctx.role !== 'ADMIN')
            return sendJson(res, 403, {
              error: 'Only the annotator or admin can abandon a session',
            });

          // Se já foi finalizada, não faz nada (idempotent)
          if (session.status === 'COMPLETED' || session.status === 'ABANDONED') {
            return sendJson(res, 200, {
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
            where: { id: subId },
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

          return sendJson(res, 200, updated);
        } catch (error) {
          console.error(`[POST /api/matches/${id}/sessions/${subId}/abandon] Erro:`, error);
          return sendJson(res, 500, {
            error: 'Erro ao marcar sessão como ABANDONED',
          });
        }
      }

      // PATCH /api/matches/:id/sessions/:sessionId → encerrar ou marcar como ABANDONED
      if (subId && req.method === 'PATCH') {
        const session = await prisma.matchAnnotationSession.findUnique({
          where: { id: subId },
          select: {
            id: true,
            matchId: true,
            annotatorUserId: true,
            isActive: true,
            status: true,
          },
        });
        if (!session || session.matchId !== id)
          return sendJson(res, 404, { error: 'Session not found' });
        // Só o anotador ou ADMIN pode encerrar/marcar como ABANDONED
        if (session.annotatorUserId !== ctx.userId && ctx.role !== 'ADMIN')
          return sendJson(res, 403, {
            error: 'Only the annotator or admin can end a session',
          });
        // Idempotente: se já finalizada, retornar 200 sem erro.
        // Isso evita race condition entre React cleanup PATCH e beforeunload fetch keepalive.
        if (session.status === 'COMPLETED' || session.status === 'ABANDONED')
          return sendJson(res, 200, { id: session.id, status: session.status, alreadyEnded: true });

        // Validar status se fornecido
        const newStatus = req.body?.status || 'COMPLETED';
        if (!['COMPLETED', 'ABANDONED', 'IN_PROGRESS'].includes(newStatus))
          return sendJson(res, 400, { error: 'Invalid status' });

        // Capturar snapshot do matchState atual como finalStateSnapshot (para COMPLETED)
        // Para ABANDONED, usar matchStateSnapshot se fornecido
        const match = await prisma.match.findUnique({
          where: { id },
          select: { matchState: true },
        });

        const updateData = {
          status: newStatus,
          ...(newStatus === 'IN_PROGRESS' && { isActive: true }),
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
          where: { id: subId },
          data: updateData,
          include: {
            annotator: { select: { id: true, name: true, email: true } },
          },
        });

        // Verificar se há múltiplas sessões COMPLETED para gerar comparativo (só para COMPLETED)
        if (newStatus === 'COMPLETED') {
          const completedSessions = await prisma.matchAnnotationSession.count({
            where: { matchId: id, status: 'COMPLETED' },
          });
          if (completedSessions >= 2) {
            // Reagendar geração de comparativo (assíncrono — não bloqueia resposta)
            setImmediate(async () => {
              try {
                await generateComparison(id);
              } catch {
                /* silently fail — comparativo pode ser regenerado */
              }
            });
          }
        }

        return sendJson(res, 200, updated);
      }

      // GET /api/matches/:id/sessions → listar sessões
      if (req.method === 'GET') {
        const sessions = await prisma.matchAnnotationSession.findMany({
          where: { matchId: id },
          select: {
            id: true,
            annotatorUserId: true,
            isActive: true,
            startedAt: true,
            endedAt: true,
            matchStateSnapshot: true,
            status: true,
            createdAt: true,
            annotator: { select: { id: true, name: true, email: true } },
            endorsements: {
              include: { endorsedBy: { select: { id: true, name: true } } },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
        return sendJson(res, 200, sessions);
      }

      // POST /api/matches/:id/sessions → iniciar (ou retomar) sessão
      if (req.method === 'POST') {
        // Verificar se a partida existe e não está finalizada
        const match = await prisma.match.findUnique({
          where: { id },
          select: { status: true, clubId: true, openForAnnotation: true },
        });
        if (!match) return sendJson(res, 404, { error: 'Match not found' });
        if (match.status === 'FINISHED')
          return sendJson(res, 409, { error: 'Match already finished' });

        // Partida aberta: qualquer autenticado (não SPECTATOR de plataforma) pode anotar
        // Partida fechada: respeita role de clube (comportamento original)
        if (!match.openForAnnotation && ctx.role === 'SPECTATOR')
          return sendJson(res, 403, {
            error: 'Spectators cannot annotate matches',
          });

        // ─── 1. Consolidar sessions: buscar TODAS e reutilizar / eliminar duplicatas ───
        // Permite anotador retomar infinitamente sem criar orphaned sessions
        const allSessions = await prisma.matchAnnotationSession.findMany({
          where: {
            matchId: id,
            annotatorUserId: ctx.userId,
          },
          include: {
            annotator: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (allSessions.length > 0) {
          const mostRecentSession = allSessions[0];
          const olderSessions = allSessions.slice(1);

          // Marcar sessions antigas como ABANDONED para consolidar
          if (olderSessions.length > 0) {
            await prisma.matchAnnotationSession.updateMany({
              where: {
                id: { in: olderSessions.map((s) => s.id) },
              },
              data: {
                status: 'ABANDONED',
                isActive: false,
                endedAt: new Date(),
              },
            });
          }

          // autoStarted=true: carregamento automático do scoreboard (não reativa sessão suspensa)
          // Mantém isActive=false para que a partida continue em "anotações suspensas" no dashboard
          const autoStarted = req.body?.autoStarted === true;
          if (autoStarted && mostRecentSession.isActive === false) {
            return sendJson(res, 200, {
              ...mostRecentSession,
              suspended: true,
              previousState: mostRecentSession.matchStateSnapshot
                ? JSON.parse(mostRecentSession.matchStateSnapshot)
                : null,
            });
          }

          // Reativar a mais recente se estava suspensa (preservar snapshot até confirmar sucesso)
          const reactivatedSession = await prisma.matchAnnotationSession.update({
            where: { id: mostRecentSession.id },
            data: {
              isActive: true,
              status: 'IN_PROGRESS',
            },
            include: {
              annotator: { select: { id: true, name: true, email: true } },
            },
          });

          // Flag: true se estava suspensa, false se já ativa
          const wasSuspended = mostRecentSession.isActive === false;

          return sendJson(res, 200, {
            ...reactivatedSession,
            suspended: wasSuspended,
            previousState:
              wasSuspended && mostRecentSession.matchStateSnapshot
                ? JSON.parse(mostRecentSession.matchStateSnapshot)
                : null,
          });
        }

        // ─── 2. Criar NOVA sessão (nenhuma encontrada) ────────────────────────────
        const session = await prisma.matchAnnotationSession.create({
          data: {
            matchId: id,
            annotatorUserId: ctx.userId,
            isActive: true,
            status: 'IN_PROGRESS',
          },
          include: {
            annotator: { select: { id: true, name: true, email: true } },
          },
        });
        return sendJson(res, 201, session);
      }

      return methodNotAllowed(res, ['GET', 'POST', 'PATCH']);
    }


  return false; // rota não tratada
}

