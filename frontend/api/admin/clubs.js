// frontend/api/admin/clubs.js
// GET /api/admin/clubs — Lista todos os clubes com contagens (ADMIN only)

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
    const url = new URL(req.url, `http://${req.headers.host}`);
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "20", 10),
      100,
    );
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);
    const search = url.searchParams.get("search") || "";

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
            select: {
              memberships: true,
              matches: true,
              tournaments: true,
            },
          },
        },
      }),
      prisma.club.count({ where }),
    ]);

    const result = {
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
    };

    return sendJson(res, 200, result);
  } catch (err) {
    console.error("[admin clubs GET]", err);
    return sendJson(res, 500, {
      error: err.message || "Internal server error",
    });
  }
}
