// frontend/api/tournaments.js
// Router consolidado — todas as rotas /api/tournaments/*
//   GET    /api/tournaments                        → lista torneios do clube
//   POST   /api/tournaments                        → cria torneio
//   GET    /api/tournaments/:id                    → detalhe do torneio
//   PATCH  /api/tournaments/:id                    → atualiza torneio
//   POST   /api/tournaments/:id?action=add-entry   → inscreve atleta
//   POST   /api/tournaments/:id?action=generate    → gera chaveamento

import prisma from "../_lib/prisma.js";
import {
  handleCors,
  requireAuth,
  sendJson,
  methodNotAllowed,
} from "../_lib/authMiddleware.js";
import { generateBracket } from "../../src/services/tournamentService.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function getTournamentId(url) {
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[2] || null; // /api/tournaments/:id
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const ctx = requireAuth(req, res);
  if (!ctx) return;

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const tournamentId = getTournamentId(url);
  const action = url.searchParams.get("action");

  // ─── /api/tournaments/:id ─────────────────────────────────────────────────
  if (tournamentId) {
    // GET — detalhes completos do torneio
    if (req.method === "GET") {
      try {
        const tournament = await prisma.tournament.findUnique({
          where: { id: tournamentId },
          include: {
            categories: {
              include: {
                entries: {
                  include: {
                    athlete: {
                      select: {
                        id: true,
                        name: true,
                        nickname: true,
                        clubId: true,
                        ranking: true,
                      },
                    },
                  },
                  orderBy: { seed: "asc" },
                },
              },
            },
            matches: {
              select: {
                id: true,
                playerP1: true,
                playerP2: true,
                player1Id: true,
                player2Id: true,
                status: true,
                winner: true,
                roundNumber: true,
                bracketPosition: true,
                categoryId: true,
                completedSets: true,
              },
              orderBy: [{ roundNumber: "desc" }, { bracketPosition: "asc" }],
            },
            organizers: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
            _count: { select: { entries: true, matches: true } },
          },
        });
        if (!tournament)
          return sendJson(res, 404, { error: "Tournament not found" });
        return sendJson(res, 200, tournament);
      } catch (err) {
        console.error("[tournaments/:id GET]", err);
        return sendJson(res, 500, { error: "Internal server error" });
      }
    }

    // PATCH — atualiza dados do torneio
    if (req.method === "PATCH") {
      try {
        if (!["ADMIN", "COACH"].includes(ctx.role))
          return sendJson(res, 403, { error: "Insufficient permissions" });
        const {
          name,
          description,
          startDate,
          endDate,
          status,
          maxPlayers,
          rules,
          courtType,
        } = req.body || {};
        const updateData = {};
        if (name !== undefined) updateData.name = name.trim();
        if (description !== undefined)
          updateData.description = description?.trim() || null;
        if (startDate !== undefined)
          updateData.startDate = startDate ? new Date(startDate) : null;
        if (endDate !== undefined)
          updateData.endDate = endDate ? new Date(endDate) : null;
        if (status !== undefined) {
          const valid = [
            "DRAFT",
            "REGISTRATION",
            "IN_PROGRESS",
            "FINISHED",
            "CANCELLED",
          ];
          if (!valid.includes(status))
            return sendJson(res, 400, { error: `Invalid status: ${status}` });
          updateData.status = status;
        }
        if (maxPlayers !== undefined)
          updateData.maxPlayers = maxPlayers ? parseInt(maxPlayers) : null;
        if (rules !== undefined)
          updateData.rules = rules ? JSON.stringify(rules) : null;
        if (courtType !== undefined) updateData.courtType = courtType || null;
        const updated = await prisma.tournament.update({
          where: { id: tournamentId },
          data: updateData,
          include: {
            categories: true,
            _count: { select: { entries: true, matches: true } },
          },
        });
        return sendJson(res, 200, updated);
      } catch (err) {
        console.error("[tournaments/:id PATCH]", err);
        return sendJson(res, 500, { error: "Internal server error" });
      }
    }

    // POST — ações sobre o torneio
    if (req.method === "POST") {
      if (action === "add-entry") {
        try {
          const { athleteId, categoryId, seed } = req.body || {};
          if (!athleteId)
            return sendJson(res, 400, { error: "athleteId is required" });
          const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            select: {
              status: true,
              maxPlayers: true,
              _count: { select: { entries: true } },
            },
          });
          if (!tournament)
            return sendJson(res, 404, { error: "Tournament not found" });
          if (!["DRAFT", "REGISTRATION"].includes(tournament.status))
            return sendJson(res, 400, {
              error: "Tournament is not accepting registrations",
            });
          if (
            tournament.maxPlayers &&
            tournament._count.entries >= tournament.maxPlayers
          )
            return sendJson(res, 400, { error: "Tournament is full" });
          const entry = await prisma.tournamentEntry.create({
            data: {
              tournamentId,
              athleteId,
              categoryId: categoryId || null,
              seed: seed ? parseInt(seed) : null,
              status: "REGISTERED",
            },
            include: {
              athlete: {
                select: { id: true, name: true, nickname: true, clubId: true },
              },
            },
          });
          return sendJson(res, 201, entry);
        } catch (err) {
          if (err.code === "P2002")
            return sendJson(res, 409, {
              error: "Athlete already registered in this category",
            });
          console.error("[tournaments add-entry]", err);
          return sendJson(res, 500, { error: "Internal server error" });
        }
      }

      if (action === "generate") {
        try {
          if (!["ADMIN", "COACH"].includes(ctx.role))
            return sendJson(res, 403, { error: "Insufficient permissions" });
          const { categoryId } = req.body || {};
          const result = await generateBracket(
            prisma,
            tournamentId,
            categoryId,
          );
          await prisma.tournament.update({
            where: { id: tournamentId },
            data: { status: "IN_PROGRESS" },
          });
          return sendJson(res, 200, result);
        } catch (err) {
          console.error("[tournaments generate]", err);
          return sendJson(res, 400, {
            error: err.message || "Failed to generate bracket",
          });
        }
      }

      return sendJson(res, 400, {
        error: "Unknown action. Use: add-entry, generate",
      });
    }

    return methodNotAllowed(res, ["GET", "PATCH", "POST"]);
  }

  // ─── /api/tournaments (root) ──────────────────────────────────────────────
  if (req.method === "GET") {
    try {
      const status = url.searchParams.get("status") || null;
      const where = {};
      if (ctx.clubId) where.clubId = ctx.clubId;
      if (status) where.status = status;
      const tournaments = await prisma.tournament.findMany({
        where,
        include: {
          categories: {
            select: { id: true, name: true, gender: true, ageGroup: true },
          },
          _count: { select: { entries: true, matches: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return sendJson(
        res,
        200,
        tournaments.map((t) => ({
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
          totalEntries: t._count.entries,
          totalMatches: t._count.matches,
        })),
      );
    } catch (err) {
      console.error("[tournaments GET]", err);
      return sendJson(res, 500, { error: "Internal server error" });
    }
  }

  if (req.method === "POST") {
    try {
      if (!["ADMIN", "GESTOR", "COACH"].includes(ctx.role))
        return sendJson(res, 403, {
          error: "Insufficient permissions to create tournament",
        });
      const {
        name,
        description,
        startDate,
        endDate,
        format,
        sportType,
        courtType,
        maxPlayers,
        isInternal = false,
        registrationType = "INVITE_ONLY",
      } = req.body || {};
      if (!name || !format)
        return sendJson(res, 400, { error: "name and format are required" });
      const tournament = await prisma.tournament.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          format,
          sportType: sportType || "TENNIS",
          courtType: courtType || null,
          maxPlayers: maxPlayers ? parseInt(maxPlayers) : null,
          isInternal,
          registrationType,
          status: "DRAFT",
          clubId: ctx.clubId || null,
        },
        include: {
          categories: true,
          _count: { select: { entries: true, matches: true } },
        },
      });
      return sendJson(res, 201, tournament);
    } catch (err) {
      console.error("[tournaments POST]", err);
      return sendJson(res, 500, { error: "Internal server error" });
    }
  }

  return methodNotAllowed(res, ["GET", "POST"]);
}
