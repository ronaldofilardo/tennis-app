// frontend/api/_handlers/_matches-root.js
// Rotas raiz /api/matches (GET lista, POST criar)

import { requireAuth, sendJson, methodNotAllowed } from '../_lib/authMiddleware.js';
import { requireActiveSubscription } from '../_lib/subscriptionMiddleware.js';
import { getAllMatches, createMatch } from '../../src/services/matchService.js';
import { validateMatchApiResponse } from '../../src/schemas/contracts.js';
import { generatePublicMatchCode } from '../../src/utils/codeGenerator.js';
import prisma from '../_lib/prisma.js';

/**
 * Lida com rotas raiz /api/matches (GET e POST).
 */
export async function handleRootRoutes(req, res, url) {
  // ─── /api/matches (root) ─────────────────────────────────────────────────
  const ctx = requireAuth(req, res);
  if (!ctx) return;

  if (req.method === 'GET') {
    const result = await getAllMatches(ctx.clubId, ctx.role, ctx.userId);
    const validated = result.map((match) => {
      const validation = validateMatchApiResponse(match);
      if (!validation.success) {
        throw new Error(`Contrato de API violado: ${validation.error.message}`);
      }
      return { ...match, contractVersion: '1.0.0' };
    });
    return sendJson(res, 200, validated);
  }

  if (req.method === 'POST') {
    // SPECTATOR não pode criar partidas
    if (ctx.role === 'SPECTATOR')
      return sendJson(res, 403, {
        error: 'Spectators cannot create matches',
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
          status: { not: 'FINISHED' },
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
          code: 'DUPLICATE_MATCH',
          existing: {
            id: existing.id,
            scheduledAt: existing.scheduledAt,
            creatorName: existing.createdBy?.name || existing.createdBy?.email || 'outro usuário',
          },
        });
      }
    }

    // ── Validação abrangente de Foreign Keys ──────────────────────────────────
    let derivedHomeClubId;
    let derivedAwayClubId;
    let validPlayer1Id;
    let validPlayer2Id;
    const { venueId } = req.body;

    // Validar player1Id e derivar homeClubId
    if (player1Id) {
      const p1 = await prisma.athleteProfile.findUnique({
        where: { id: player1Id },
        select: { clubId: true },
      });
      if (!p1) {
        return sendJson(res, 400, {
          error: `Atleta jogador 1 não encontrado (ID: ${player1Id}). Verifique se o ID é válido.`,
        });
      }
      derivedHomeClubId = p1.clubId ?? undefined;
      validPlayer1Id = player1Id;
    }

    // Validar player2Id e derivar awayClubId
    if (player2Id) {
      const p2 = await prisma.athleteProfile.findUnique({
        where: { id: player2Id },
        select: { clubId: true },
      });
      if (!p2) {
        return sendJson(res, 400, {
          error: `Atleta jogador 2 não encontrado (ID: ${player2Id}). Verifique se o ID é válido.`,
        });
      }
      derivedAwayClubId = p2.clubId ?? undefined;
      validPlayer2Id = player2Id;
    }

    // Validar clubId do contexto se fornecido
    if (ctx.clubId) {
      const club = await prisma.club.findUnique({
        where: { id: ctx.clubId },
        select: { id: true },
      });
      if (!club) {
        return sendJson(res, 400, {
          error: `Clube não encontrado (ID: ${ctx.clubId}). Verifique sua sessão.`,
        });
      }
    }

    // Validar createdByUserId do contexto se fornecido
    if (ctx.userId) {
      const user = await prisma.user.findUnique({
        where: { id: ctx.userId },
        select: { id: true },
      });
      if (!user) {
        return sendJson(res, 400, {
          error: `Usuário não encontrado (ID: ${ctx.userId}). Verifique sua sessão.`,
        });
      }
    }

    // Validar venueId se fornecido (com fallback gracioso se tabela não existir)
    if (venueId) {
      try {
        const venue = await prisma.venue.findUnique({
          where: { id: venueId },
          select: { id: true },
        });
        if (!venue) {
          return sendJson(res, 400, {
            error: `Local de jogo não encontrado (ID: ${venueId}). Verifique se o ID é válido.`,
          });
        }
      } catch (err) {
        // Se tabela Venue não existe, continuar normalmente
        if (err.code !== 'P1000' && !err.message?.includes('no such table')) {
          throw err;
        }
      }
    }

    const matchData = {
      ...req.body,
      clubId: ctx.clubId,
      createdByUserId: ctx.userId,
      homeClubId: derivedHomeClubId,
      awayClubId: derivedAwayClubId,
      // Somente incluir player IDs se foram validados
      ...(validPlayer1Id && { player1Id: validPlayer1Id }),
      ...(validPlayer2Id && { player2Id: validPlayer2Id }),
      // Novos metadados de contexto (sanitizar para evitar injeção)
      tournamentName: req.body.tournamentName
        ? String(req.body.tournamentName).slice(0, 200)
        : undefined,
      roundName: req.body.roundName ? String(req.body.roundName).slice(0, 200) : undefined,
      bracketType: ['ELIMINATION', 'GROUPS', 'SWISS'].includes(req.body.bracketType)
        ? req.body.bracketType
        : undefined,
      temperature:
        req.body.temperature !== undefined && req.body.temperature !== null
          ? Number(req.body.temperature)
          : undefined,
      humidity:
        req.body.humidity !== undefined && req.body.humidity !== null
          ? Number(req.body.humidity)
          : undefined,
      // Gerar identificador público único para a partida
      publicMatchCode: generatePublicMatchCode(),
    };

    // Retry logic: se o código gerado já existir (colisão rara), tentar novamente
    let result;
    let retries = 0;
    const maxRetries = 10;
    while (retries < maxRetries) {
      try {
        console.log('[POST /api/matches] Tentativa de criar match com dados:', {
          num_attempt: retries + 1,
          ctx: { userId: ctx.userId, clubId: ctx.clubId, role: ctx.role },
          matchData: {
            sportType: matchData.sportType,
            format: matchData.format,
            clubId: matchData.clubId,
            createdByUserId: matchData.createdByUserId,
            player1Id: matchData.player1Id,
            player2Id: matchData.player2Id,
            homeClubId: matchData.homeClubId,
            awayClubId: matchData.awayClubId,
            venueId: matchData.venueId,
            players: matchData.players,
          },
        });
        result = await createMatch(matchData);
        break;
      } catch (err) {
        if (err.code === 'P2002' && err.meta?.target?.includes('publicMatchCode')) {
          // Colisão de código único, gerar novo e tentar novamente
          matchData.publicMatchCode = generatePublicMatchCode();
          retries++;
        } else {
          throw err;
        }
      }
    }

    if (!result) {
      return sendJson(res, 500, {
        error: 'Falha ao gerar identificador único para partida após múltiplas tentativas',
      });
    }

    const validation = validateMatchApiResponse(result);
    if (!validation.success) {
      throw new Error(`Contrato de API violado na criação: ${validation.error.message}`);
    }
    return sendJson(res, 201, { ...result, contractVersion: '1.0.0' });
  }

  return methodNotAllowed(res, ['GET', 'POST']);
}
