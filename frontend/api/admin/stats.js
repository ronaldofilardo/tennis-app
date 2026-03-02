// frontend/api/admin/stats.js
// GET /api/admin/stats — Estatísticas globais da plataforma (ADMIN only)

import prisma from "../_lib/prisma.js";
import {
  handleCors,
  requireRole,
  sendJson,
  methodNotAllowed,
} from "../_lib/authMiddleware.js";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const ctx = requireRole(req, res, "ADMIN");
  if (!ctx) return;

  if (req.method !== "GET") {
    return methodNotAllowed(res, ["GET"]);
  }

  try {
    // Datas de referência
    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Contagens globais de usuários e clubes
    const [totalUsers, totalClubs] = await Promise.all([
      prisma.user.count(),
      prisma.club.count(),
    ]);

    // Crescimento: novos este mês
    const [newUsersThisMonth, newClubsThisMonth] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: firstDayOfMonth } } }),
      prisma.club.count({ where: { createdAt: { gte: firstDayOfMonth } } }),
    ]);

    // Usuários ativos na última semana
    const activeUsersLastWeek = await prisma.user.count({
      where: { updatedAt: { gte: oneWeekAgo } },
    });

    // Clubes por plano (foco financeiro)
    const clubsByPlan = await prisma.club.groupBy({
      by: ["planType"],
      _count: { id: true },
    });

    // Memberships por papel (distribuição de usuários)
    const membershipsByRole = await prisma.clubMembership.groupBy({
      by: ["role"],
      _count: { id: true },
    });

    // Top 10 clubes por membros
    const topClubsByMembers = await prisma.club.findMany({
      take: 10,
      orderBy: { memberships: { _count: "desc" } },
      select: {
        id: true,
        name: true,
        slug: true,
        planType: true,
        createdAt: true,
        _count: { select: { memberships: true } },
      },
    });

    // 5 clubes mais recentes
    const recentClubs = await prisma.club.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        slug: true,
        planType: true,
        createdAt: true,
        _count: { select: { memberships: true } },
      },
    });

    const stats = {
      totalUsers,
      totalClubs,
      newUsersThisMonth,
      newClubsThisMonth,
      activeUsersLastWeek,
      clubsByPlan: clubsByPlan.map((g) => ({
        plan: g.planType,
        count: g._count.id,
      })),
      membershipsByRole: membershipsByRole.map((g) => ({
        role: g.role,
        count: g._count.id,
      })),
      topClubsByMembers: topClubsByMembers.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        planType: c.planType,
        createdAt: c.createdAt,
        memberCount: c._count.memberships,
      })),
      recentClubs: recentClubs.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        planType: c.planType,
        createdAt: c.createdAt,
        memberCount: c._count.memberships,
      })),
    };

    return sendJson(res, 200, stats);
  } catch (err) {
    console.error("[admin stats GET]", err);
    return sendJson(res, 500, {
      error: err.message || "Internal server error",
    });
  }
}
