// frontend/api/admin/users.js
// GET /api/admin/users — Lista todos os usuários com contagens (ADMIN only)

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
          _count: {
            select: {
              memberships: true,
              createdMatches: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const result = {
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
    };

    return sendJson(res, 200, result);
  } catch (err) {
    console.error("[admin users GET]", err);
    return sendJson(res, 500, {
      error: err.message || "Internal server error",
    });
  }
}
