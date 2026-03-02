// frontend/api/clubs.js
// GET  /api/clubs       — Lista clubes do usuário autenticado
// POST /api/clubs       — Cria novo clube (usuário vira ADMIN)

import { createClub } from "../src/services/authService.js";
import prisma from "./_lib/prisma.js";
import {
  handleCors,
  requireAuth,
  sendJson,
  methodNotAllowed,
} from "./_lib/authMiddleware.js";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const ctx = requireAuth(req, res);
  if (!ctx) return;

  // GET — lista clubes do usuário
  if (req.method === "GET") {
    try {
      const memberships = await prisma.clubMembership.findMany({
        where: { userId: ctx.userId },
        include: {
          club: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              planType: true,
              createdAt: true,
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      });

      const clubs = memberships.map((m) => ({
        ...m.club,
        role: m.role,
        joinedAt: m.joinedAt,
      }));

      return sendJson(res, 200, clubs);
    } catch (err) {
      console.error("[clubs GET]", err);
      return sendJson(res, 500, { error: "Internal server error" });
    }
  }

  // POST — cria novo clube
  if (req.method === "POST") {
    try {
      const { name, slug } = req.body || {};

      if (!name || !slug) {
        return sendJson(res, 400, { error: "name and slug are required" });
      }

      // Normaliza slug
      const normalizedSlug = slug
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      if (normalizedSlug.length < 3) {
        return sendJson(res, 400, {
          error: "slug must be at least 3 characters",
        });
      }

      const club = await createClub({
        name,
        slug: normalizedSlug,
        userId: ctx.userId,
      });

      return sendJson(res, 201, club);
    } catch (err) {
      if (err.message === "SLUG_EXISTS") {
        return sendJson(res, 409, { error: "Club slug already exists" });
      }
      console.error("[clubs POST]", err);
      return sendJson(res, 500, { error: "Internal server error" });
    }
  }

  return methodNotAllowed(res, ["GET", "POST"]);
}
