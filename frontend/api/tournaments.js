// frontend/api/tournaments.js
// GET  /api/tournaments          — Lista torneios do clube ativo
// POST /api/tournaments          — Cria novo torneio

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

  // ========================================================
  // GET /api/tournaments?status=...
  // ========================================================
  if (req.method === "GET") {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const status = url.searchParams.get("status") || null;

      const where = {};
      // Se tem clube ativo, mostra torneios do clube
      if (ctx.clubId) {
        where.clubId = ctx.clubId;
      }
      if (status) {
        where.status = status;
      }

      const tournaments = await prisma.tournament.findMany({
        where,
        include: {
          categories: {
            select: { id: true, name: true, gender: true, ageGroup: true },
          },
          _count: {
            select: { entries: true, matches: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const result = tournaments.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        startDate: t.startDate,
        endDate: t.endDate,
        format: t.format,
        sportType: t.sportType,
        courtType: t.courtType,
        status: t.status,
        maxPlayers: t.maxPlayers,
        categories: t.categories,
        entriesCount: t._count.entries,
        matchesCount: t._count.matches,
        createdAt: t.createdAt,
      }));

      res.writeHead(200, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      return res.end(JSON.stringify(result));
    } catch (err) {
      console.error("[tournaments GET]", err);
      res.writeHead(500, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      return res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }

  // ========================================================
  // POST /api/tournaments — Cria torneio
  // Requer: ADMIN ou COACH no clube
  // ========================================================
  if (req.method === "POST") {
    try {
      if (!ctx.clubId) {
        res.writeHead(400, {
          ...corsHeaders,
          "Content-Type": "application/json",
        });
        return res.end(
          JSON.stringify({
            error: "clubId is required. Select an active club.",
          }),
        );
      }

      // Verificar role
      // Competitive tournaments: GESTOR only
      // Internal tournaments (isInternal=true): COACH
      const { isInternal } = req.body || {};

      if (isInternal && ctx.role === "COACH") {
        // COACH pode criar apenas torneios internos (treino)
      } else if (!isInternal && ctx.role === "GESTOR") {
        // GESTOR pode criar torneios competitivos
      } else {
        res.writeHead(403, {
          ...corsHeaders,
          "Content-Type": "application/json",
        });
        return res.end(
          JSON.stringify({
            error:
              "COACH can only create internal tournaments, GESTOR creates competitive tournaments",
          }),
        );
      }

      const {
        name,
        description,
        startDate,
        endDate,
        format,
        sportType,
        courtType,
        maxPlayers,
        rules,
        categories,
        registrationType,
        isInternal,
      } = req.body || {};

      if (!name || name.trim().length < 3) {
        res.writeHead(400, {
          ...corsHeaders,
          "Content-Type": "application/json",
        });
        return res.end(
          JSON.stringify({ error: "name is required (min 3 chars)" }),
        );
      }

      const validFormats = [
        "SINGLE_ELIMINATION",
        "DOUBLE_ELIMINATION",
        "ROUND_ROBIN",
        "GROUP_STAGE",
      ];
      if (format && !validFormats.includes(format)) {
        res.writeHead(400, {
          ...corsHeaders,
          "Content-Type": "application/json",
        });
        return res.end(
          JSON.stringify({
            error: `format must be one of: ${validFormats.join(", ")}`,
          }),
        );
      }

      // Criar torneio com categorias em uma transação
      const tournament = await prisma.$transaction(async (tx) => {
        const created = await tx.tournament.create({
          data: {
            clubId: ctx.clubId,
            name: name.trim(),
            description: description?.trim() || null,
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            format: format || "SINGLE_ELIMINATION",
            sportType: sportType || "TENNIS",
            courtType: courtType || null,
            maxPlayers: maxPlayers ? parseInt(maxPlayers) : null,
            rules: rules ? JSON.stringify(rules) : null,
            registrationType: registrationType || "INVITE_ONLY",
            isInternal: isInternal === true,
          },
        });

        // Criar categorias se fornecidas
        if (categories && Array.isArray(categories) && categories.length > 0) {
          await tx.tournamentCategory.createMany({
            data: categories.map((cat) => ({
              tournamentId: created.id,
              name: cat.name,
              gender: cat.gender || null,
              ageGroup: cat.ageGroup || null,
              maxPlayers: cat.maxPlayers ? parseInt(cat.maxPlayers) : null,
              bracketType: cat.bracketType || "SINGLE_ELIMINATION",
            })),
          });
        }

        // Adicionar criador como organizador
        await tx.tournamentOrganizer.create({
          data: {
            userId: ctx.userId,
            tournamentId: created.id,
            role: "ORGANIZER",
          },
        });

        return tx.tournament.findUnique({
          where: { id: created.id },
          include: {
            categories: true,
            organizers: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        });
      });

      res.writeHead(201, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      return res.end(JSON.stringify(tournament));
    } catch (err) {
      console.error("[tournaments POST]", err);
      res.writeHead(500, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      return res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }

  res.writeHead(405, { ...corsHeaders, "Content-Type": "application/json" });
  return res.end(JSON.stringify({ error: "Method not allowed" }));
}
