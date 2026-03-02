// frontend/api/clubs/[clubId]/stats.js
// GET /api/clubs/:clubId/stats — Estatísticas resumidas do clube (GESTOR only)

import prisma from "../../_lib/prisma.js";
import {
  handleCors,
  requireClubAccess,
  sendJson,
  methodNotAllowed,
} from "../../_lib/authMiddleware.js";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  // Extrair clubId da rota
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathParts = url.pathname.split("/");
  const clubId = pathParts[3]; // /api/clubs/:clubId/stats

  if (req.method !== "GET") {
    return methodNotAllowed(res, ["GET"]);
  }

  // Verificar autenticação + acesso ao clube + role GESTOR
  const ctx = requireClubAccess(req, res, clubId, "GESTOR", "ADMIN");
  if (!ctx) return;

  try {
    // Contagem total de membros
    const totalMembers = await prisma.clubMembership.count({
      where: { clubId, status: "ACTIVE" },
    });

    // Contagem de partidas por status
    const matchesByStatus = await prisma.match.groupBy({
      by: ["status"],
      where: { clubId },
      _count: { id: true },
    });

    const totalMatches = matchesByStatus.reduce(
      (sum, g) => sum + g._count.id,
      0,
    );

    // Contagem de torneios por status
    const tournamentsByStatus = await prisma.tournament.groupBy({
      by: ["status"],
      where: { clubId },
      _count: { id: true },
    });

    const totalTournaments = tournamentsByStatus.reduce(
      (sum, g) => sum + g._count.id,
      0,
    );

    // Partidas recentes (últimas 5)
    const recentMatches = await prisma.match.findMany({
      where: { clubId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        playerP1: true,
        playerP2: true,
        status: true,
        score: true,
        format: true,
        createdAt: true,
        visibility: true,
      },
    });

    // Membros recentes (últimos 5) - excluindo ADMINs e o próprio usuário
    const recentMembers = await prisma.clubMembership.findMany({
      where: {
        clubId,
        role: { not: "ADMIN" }, // ADMINs são agnósticos a clubes
        userId: { not: ctx.userId }, // não exibir o próprio usuário
      },
      orderBy: { joinedAt: "desc" },
      take: 5,
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    const stats = {
      totalMembers,
      totalMatches,
      matchesByStatus: matchesByStatus.map((g) => ({
        status: g.status,
        count: g._count.id,
      })),
      totalTournaments,
      tournamentsByStatus: tournamentsByStatus.map((g) => ({
        status: g.status,
        count: g._count.id,
      })),
      recentMatches,
      recentMembers: recentMembers.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt,
      })),
    };

    return sendJson(res, 200, stats);
  } catch (err) {
    console.error("[clubs stats GET]", err);
    return sendJson(res, 500, {
      error: err.message || "Internal server error",
    });
  }
}
