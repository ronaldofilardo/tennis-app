// frontend/api/admin.js
// Router consolidado — todas as rotas /api/admin/* (ADMIN only)
//   GET /api/admin/clubs  → lista todos os clubes com contagens
//   GET /api/admin/stats  → estatísticas globais da plataforma
//   GET /api/admin/users  → lista todos os usuários

import prisma from "./_lib/prisma.js";
import {
  handleCors,
  requireRole,
  sendJson,
  methodNotAllowed,
} from "./_lib/authMiddleware.js";

function getSection(url) {
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[2] || null; // [api, admin, section]
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const ctx = requireRole(req, res, "ADMIN");
  if (!ctx) return;

  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const section = getSection(url);

  const limit = Math.min(
    parseInt(url.searchParams.get("limit") || "20", 10),
    100,
  );
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);
  const search = url.searchParams.get("search") || "";

  // ─── GET /api/admin/clubs ─────────────────────────────────────────────────
  if (section === "clubs") {
    try {
      const where = search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { slug: { contains: search, mode: "insensitive" } },
            ],
          }
        : {};
      const [clubs, total] = await Promise.all([
        prisma.club.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: offset,
          take: limit,
          select: {
            id: true,
            name: true,
            slug: true,
            planType: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: { memberships: true, matches: true, tournaments: true },
            },
          },
        }),
        prisma.club.count({ where }),
      ]);
      return sendJson(res, 200, {
        clubs: clubs.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          planType: c.planType,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          memberCount: c._count.memberships,
          matchCount: c._count.matches,
          tournamentCount: c._count.tournaments,
        })),
        total,
        limit,
        offset,
      });
    } catch (err) {
      console.error("[admin/clubs]", err);
      return sendJson(res, 500, {
        error: err.message || "Internal server error",
      });
    }
  }

  // ─── GET /api/admin/users ─────────────────────────────────────────────────
  if (section === "users") {
    try {
      const where = search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {};
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: offset,
          take: limit,
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            _count: { select: { memberships: true, createdMatches: true } },
          },
        }),
        prisma.user.count({ where }),
      ]);
      return sendJson(res, 200, {
        users: users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          isActive: u.isActive,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
          clubCount: u._count.memberships,
          matchCount: u._count.createdMatches,
        })),
        total,
        limit,
        offset,
      });
    } catch (err) {
      console.error("[admin/users]", err);
      return sendJson(res, 500, {
        error: err.message || "Internal server error",
      });
    }
  }

  // ─── GET /api/admin/stats ─────────────────────────────────────────────────
  if (section === "stats") {
    try {
      const now = new Date();
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalUsers,
        totalClubs,
        newUsersThisMonth,
        newClubsThisMonth,
        activeUsersLastWeek,
        clubsByPlan,
        membershipsByRole,
        topClubsByMembers,
        recentClubs,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.club.count(),
        prisma.user.count({ where: { createdAt: { gte: firstDayOfMonth } } }),
        prisma.club.count({ where: { createdAt: { gte: firstDayOfMonth } } }),
        prisma.user.count({ where: { updatedAt: { gte: oneWeekAgo } } }),
        prisma.club.groupBy({ by: ["planType"], _count: { id: true } }),
        prisma.clubMembership.groupBy({ by: ["role"], _count: { id: true } }),
        prisma.club.findMany({
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
        }),
        prisma.club.findMany({
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
        }),
      ]);

      return sendJson(res, 200, {
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
      });
    } catch (err) {
      console.error("[admin/stats]", err);
      return sendJson(res, 500, {
        error: err.message || "Internal server error",
      });
    }
  }

  return sendJson(res, 404, { error: "Unknown admin section" });
}
