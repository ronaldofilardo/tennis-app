// frontend/api/_handlers/_matches-id.js
// Rotas /api/matches/:id (comparison, share, state, stats, tournament-suggestions, CRUD)

import { requireAuth, sendJson, methodNotAllowed } from '../_lib/authMiddleware.js';
import {
  getMatchById,
  updateMatch,
  getMatchState,
  updateMatchState,
  getMatchStats,
} from '../../src/services/matchService.js';
import prisma from '../_lib/prisma.js';
import { generateComparison, createDashboardShares } from './_matches-helpers.js';

/**
 * Lida com rotas /api/matches/:id (comparison, share, state, stats, tournament, CRUD).
 * Retorna true se a rota foi tratada, false caso contrário.
 */
export async function handleIdRoutes(req, res, url, parsedPath) {
  const { id, sub, subId, isMetadata, isClaim, isTournamentSuggestions } = parsedPath;
    // ─── /api/matches/:id/comparison ─────────────────────────────────────────
    if (id && sub === 'comparison') {
      const ctx = requireAuth(req, res);
      if (!ctx) return;
      if (req.method === 'GET') {
        const comp = await prisma.matchAnnotationComparison.findFirst({
          where: { matchId: id },
          orderBy: { updatedAt: 'desc' },
        });
        if (!comp) return sendJson(res, 404, { error: 'No comparison found' });
        return sendJson(res, 200, comp);
      }
      if (req.method === 'POST') {
        const comp = await generateComparison(id);
        if (!comp) return sendJson(res, 422, { error: 'Need at least 2 completed sessions' });
        return sendJson(res, 200, comp);
      }
      return methodNotAllowed(res, ['GET', 'POST']);
    }

    // ─── /api/matches/:id/share ───────────────────────────────────────────────
    if (id && sub === 'share') {
      const ctx = requireAuth(req, res);
      if (!ctx) return;

      // PATCH /api/matches/:id/share/:shareId → aceitar ou rejeitar
      if (subId && req.method === 'PATCH') {
        const { status: newStatus } = req.body;
        if (!['ACCEPTED', 'REJECTED'].includes(newStatus))
          return sendJson(res, 400, { error: 'status must be ACCEPTED or REJECTED' });
        const share = await prisma.matchDashboardShare.findUnique({
          where: { id: subId },
          select: { id: true, matchId: true, targetUserId: true, targetClubId: true },
        });
        if (!share || share.matchId !== id) return sendJson(res, 404, { error: 'Share not found' });
        // Apenas o próprio usuário ou membro do clube pode responder
        if (share.targetUserId && share.targetUserId !== ctx.userId && ctx.role !== 'ADMIN')
          return sendJson(res, 403, { error: 'Cannot respond to this share' });
        const updated = await prisma.matchDashboardShare.update({
          where: { id: subId },
          data: { status: newStatus, respondedAt: new Date() },
        });
        return sendJson(res, 200, updated);
      }

      // POST /api/matches/:id/share → criar shares para todos os stakeholders
      if (req.method === 'POST') {
        await createDashboardShares(id);
        const shares = await prisma.matchDashboardShare.findMany({
          where: { matchId: id },
        });
        return sendJson(res, 201, shares);
      }

      // GET /api/matches/:id/share → listar shares da partida
      if (req.method === 'GET') {
        const shares = await prisma.matchDashboardShare.findMany({
          where: { matchId: id },
          orderBy: { notifiedAt: 'desc' },
        });
        return sendJson(res, 200, shares);
      }

      return methodNotAllowed(res, ['GET', 'POST', 'PATCH']);
    }

    // ─── /api/matches/:id/state ──────────────────────────────────────────────
    if (id && sub === 'state') {
      const ctx = requireAuth(req, res);
      if (!ctx) return;
      if (ctx.role !== 'ADMIN') {
        const match = await getMatchById(id);
        if (match?.clubId && match.clubId !== ctx.clubId && match.visibility !== 'PUBLIC') {
          return sendJson(res, 403, { error: 'Access denied to this match' });
        }
      }
      if (req.method === 'GET') return sendJson(res, 200, await getMatchState(id));
      if (req.method === 'PATCH') {
        // SPECTATOR não pode alterar estado
        if (ctx.role === 'SPECTATOR')
          return sendJson(res, 403, {
            error: 'Spectators cannot modify matches',
          });
        // Partida finalizada é imutável
        const current = await prisma.match.findUnique({
          where: { id },
          select: { status: true },
        });
        if (current?.status === 'FINISHED')
          return sendJson(res, 409, { error: 'Match already finished' });
        // Cross-club PUBLIC: somente leitura
        const matchData = await getMatchById(id);
        if (matchData?.clubId && matchData.clubId !== ctx.clubId && ctx.role !== 'ADMIN')
          return sendJson(res, 403, {
            error: 'Cross-club matches are read-only',
          });
        const result = await updateMatchState(id, req.body);
        // Ao finalizar partida, criar compartilhamentos automáticos
        const newStatus = req.body?.status || req.body?.matchState?.status;
        if (newStatus === 'FINISHED' || result?.status === 'FINISHED') {
          setImmediate(async () => {
            try {
              await createDashboardShares(id);
            } catch {
              /* silently fail */
            }
          });
        }
        return sendJson(res, 200, result);
      }
      return methodNotAllowed(res, ['GET', 'PATCH']);
    }

    // ─── GET /api/matches/:id/stats ──────────────────────────────────────────
    if (id && sub === 'stats') {
      const ctx = requireAuth(req, res);
      if (!ctx) return;
      if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
      if (ctx.role !== 'ADMIN') {
        const match = await getMatchById(id);
        if (match?.clubId && match.clubId !== ctx.clubId && match.visibility !== 'PUBLIC') {
          return sendJson(res, 403, { error: 'Access denied to this match' });
        }
      }
      return sendJson(res, 200, await getMatchStats(id));
    }

    // ─── GET /api/matches/tournament-suggestions ──────────────────────────────
    // Retorna sugestões de torneios e rodadas já usadas pelo clube do usuário
    if (isTournamentSuggestions) {
      if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
      const ctx = requireAuth(req, res);
      if (!ctx) return;
      const tournamentFilter = url.searchParams.get('tournamentName');
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
      return sendJson(res, 200, {
        tournaments: tournaments.map((t) => t.tournamentName).filter(Boolean),
        rounds: rounds.map((r) => r.roundName).filter(Boolean),
      });
    }

    // ─── /api/matches/:id ────────────────────────────────────────────────────
    if (id) {
      const ctx = requireAuth(req, res);
      if (!ctx) {
        console.debug('[MatchesHandler] Auth failed or not provided');
        return;
      }
      console.debug(
        '[MatchesHandler] /api/matches/:id - id:',
        id,
        'method:',
        req.method,
        'userId:',
        ctx.userId,
      );

      // POST /api/matches/:id/claim — salva partida no histórico do usuário
      if (isClaim && req.method === 'POST') {
        const matchExists = await prisma.match.findUnique({ where: { id }, select: { id: true } });
        if (!matchExists) return sendJson(res, 404, { error: 'Match not found' });
        const existing = await prisma.matchDashboardShare.findFirst({
          where: { matchId: id, targetUserId: ctx.userId },
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
              matchId: id,
              targetUserId: ctx.userId,
              shareType: 'ANNOTATION',
              status: 'ACCEPTED',
              respondedAt: new Date(),
            },
          });
        }
        return sendJson(res, 200, { ok: true, shareId: share.id, status: share.status });
      }

      // PATCH /api/matches/:id/metadata — atualiza metadados editáveis pelo criador (GESTOR/ADMIN)
      if (isMetadata && req.method === 'PATCH') {
        const match = await prisma.match.findUnique({
          where: { id },
          select: { createdByUserId: true },
        });
        if (!match) return sendJson(res, 404, { error: 'Match not found' });

        // Apenas criador com role GESTOR/ADMIN pode editar
        const isCreator = match.createdByUserId === ctx.userId;
        const isManagerRole = ctx.role === 'GESTOR' || ctx.role === 'ADMIN';

        if (!isCreator || !isManagerRole) {
          return sendJson(res, 403, {
            error: 'Apenas o criador (gestor) da partida pode editar os dados',
          });
        }

        const {
          scheduledAt,
          venueId,
          nickname,
          visibility,
          openForAnnotation,
          tournamentName,
          roundName,
          bracketType,
          temperature,
          humidity,
        } = req.body ?? {};
        const data = {};
        if (scheduledAt !== undefined)
          data.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
        if (venueId !== undefined) data.venueId = venueId || null;
        if (nickname !== undefined) data.nickname = nickname || null;
        if (visibility !== undefined) data.visibility = visibility;
        if (openForAnnotation !== undefined) data.openForAnnotation = Boolean(openForAnnotation);
        if (tournamentName !== undefined) data.tournamentName = tournamentName || null;
        if (roundName !== undefined) data.roundName = roundName || null;
        if (bracketType !== undefined) data.bracketType = bracketType || null;
        if (temperature !== undefined)
          data.temperature = temperature !== null ? Number(temperature) : null;
        if (humidity !== undefined) data.humidity = humidity !== null ? Number(humidity) : null;
        const updated = await prisma.match.update({ where: { id }, data });
        return sendJson(res, 200, updated);
      }

      if (req.method === 'GET') {
        const match = await getMatchById(id);
        if (match && ctx.role !== 'ADMIN') {
          if (match.clubId && match.clubId !== ctx.clubId && match.visibility !== 'PUBLIC') {
            return sendJson(res, 403, { error: 'Access denied to this match' });
          }
        }
        return sendJson(res, 200, match);
      }
      if (req.method === 'PATCH') {
        console.debug(
          '[EndMatch] PATCH request received - req.body:',
          JSON.stringify(req.body),
          'action:',
          req.body?.action,
        );
        // Ação especial: encerrar partida manualmente pelo criador
        if (req.body?.action === 'endMatch') {
          console.debug(
            '[EndMatch] Processing endMatch action for matchId:',
            id,
            'userId:',
            ctx.userId,
          );
          const matchToEnd = await prisma.match.findUnique({
            where: { id },
            select: { createdByUserId: true, status: true, matchState: true },
          });
          console.debug('[EndMatch] Match query result:', {
            found: !!matchToEnd,
            createdByUserId: matchToEnd?.createdByUserId,
            status: matchToEnd?.status,
            matchId: id,
          });
          if (!matchToEnd) {
            console.error('[EndMatch] Match not found in database! matchId:', id);
            return sendJson(res, 404, { error: 'Match not found', matchId: id });
          }
          if (matchToEnd.createdByUserId !== ctx.userId && ctx.role !== 'ADMIN') {
            console.debug(
              '[EndMatch] Access denied - createdByUserId:',
              matchToEnd.createdByUserId,
              'ctx.userId:',
              ctx.userId,
            );
            return sendJson(res, 403, { error: 'Apenas o criador pode encerrar a partida' });
          }
          if (matchToEnd.status === 'FINISHED') {
            return sendJson(res, 409, { error: 'Match already finished' });
          }

          // Capturar snapshot do estado final
          const finalStateSnapshot = matchToEnd.matchState;

          // Atualizar match para FINISHED
          const endedMatch = await prisma.match.update({
            where: { id },
            data: {
              status: 'FINISHED',
              endedAt: new Date(),
              ...(req.body.winner !== undefined ? { winner: req.body.winner } : {}),
              ...(req.body.score !== undefined ? { score: req.body.score } : {}),
            },
          });

          // Encerrar apenas sessões ATIVAS (IN_PROGRESS + isActive=true)
          // Sessões ABANDONED já foram encerradas pelo anotador — não sobrescrever
          const inProgressSessions = await prisma.matchAnnotationSession.findMany({
            where: { matchId: id, status: 'IN_PROGRESS', isActive: true },
          });

          if (inProgressSessions.length > 0) {
            await prisma.matchAnnotationSession.updateMany({
              where: { matchId: id, status: 'IN_PROGRESS', isActive: true },
              data: {
                status: 'COMPLETED',
                isActive: false,
                endedAt: new Date(),
                finalStateSnapshot: finalStateSnapshot,
              },
            });
          }

          // Gerar comparativo se houver 2+ sessões completadas
          setImmediate(async () => {
            try {
              const completedCount = await prisma.matchAnnotationSession.count({
                where: { matchId: id, status: 'COMPLETED' },
              });
              if (completedCount >= 2) {
                await generateComparison(id);
              }
              await createDashboardShares(id);
            } catch {
              /* silently fail */
            }
          });

          return sendJson(res, 200, endedMatch);
        }

        // Ação especial: reabrir partida finalizada para continuar anotação
        if (req.body?.action === 'reopenMatch') {
          const matchToReopen = await prisma.match.findUnique({
            where: { id },
            select: {
              createdByUserId: true,
              status: true,
              matchAnnotationSessions: {
                select: { id: true, status: true, annotatorUserId: true },
              },
            },
          });
          if (!matchToReopen) return sendJson(res, 404, { error: 'Match not found' });

          // Permite criador ou qualquer anotador da partida
          const isCreator = matchToReopen.createdByUserId === ctx.userId;
          const isAnnotator = matchToReopen.matchAnnotationSessions?.some(
            (s) => s.annotatorUserId === ctx.userId,
          );

          if (!isCreator && !isAnnotator && ctx.role !== 'ADMIN') {
            return sendJson(res, 403, {
              error: 'Access denied - only creator or annotators can reopen',
            });
          }

          if (matchToReopen.status !== 'FINISHED') {
            return sendJson(res, 409, { error: 'Match is not finished' });
          }

          // Reabrir: mudar status de FINISHED para IN_PROGRESS
          const reopenedMatch = await prisma.match.update({
            where: { id },
            data: {
              status: 'IN_PROGRESS',
              endedAt: null,
            },
          });

          // Se houver uma sessão COMPLETED do anotador atual, reativá-la
          const userSession = await prisma.matchAnnotationSession.findFirst({
            where: {
              matchId: id,
              annotatorUserId: ctx.userId,
              status: 'COMPLETED',
            },
          });

          if (userSession) {
            await prisma.matchAnnotationSession.update({
              where: { id: userSession.id },
              data: {
                status: 'IN_PROGRESS',
                isActive: true,
                endedAt: null,
              },
            });
          }

          return sendJson(res, 200, reopenedMatch);
        }

        if (ctx.role === 'SPECTATOR')
          return sendJson(res, 403, {
            error: 'Spectators cannot modify matches',
          });
        const existing = await getMatchById(id);
        if (existing && ctx.role !== 'ADMIN') {
          if (existing.clubId && existing.clubId !== ctx.clubId) {
            return sendJson(res, 403, { error: 'Access denied to this match' });
          }
        }
        // Partida finalizada é imutável
        const currentStatus = await prisma.match.findUnique({
          where: { id },
          select: { status: true },
        });
        if (currentStatus?.status === 'FINISHED')
          return sendJson(res, 409, { error: 'Match already finished' });
        console.debug(
          '[PATCH Fallback] No action matched (not endMatch or reopenMatch), calling updateMatch',
        );
        return sendJson(res, 200, await updateMatch(id, req.body));
      }
      if (req.method === 'DELETE') {
        const match = await prisma.match.findUnique({
          where: { id },
          select: { createdByUserId: true, status: true },
        });
        if (!match) return sendJson(res, 404, { error: 'Match not found' });
        if (match.createdByUserId !== ctx.userId && ctx.role !== 'ADMIN') {
          return sendJson(res, 403, {
            error: 'Apenas o criador ou administrador pode excluir a partida',
          });
        }
        // Criador e admin podem deletar partidas em qualquer estado
        await prisma.match.delete({ where: { id } });
        return sendJson(res, 200, { success: true });
      }
      return methodNotAllowed(res, ['GET', 'PATCH', 'DELETE']);
    }


  return false; // rota não tratada
}

