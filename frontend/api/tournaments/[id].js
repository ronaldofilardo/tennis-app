// frontend/api/tournaments/[id].js
// GET    /api/tournaments/:id                    — Detalhes do torneio
// PATCH  /api/tournaments/:id                    — Atualiza torneio
// POST   /api/tournaments/:id?action=add-entry   — Inscreve atleta
// POST   /api/tournaments/:id?action=generate    — Gera chaveamento

import prisma from "../_lib/prisma.js";
import {
  handleCors,
  requireAuth,
  sendJson,
  methodNotAllowed,
} from "../_lib/authMiddleware.js";
import { generateBracket } from "../../src/services/tournamentService.js";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const ctx = requireAuth(req, res);
  if (!ctx) return;

  // Extrair ID e action da URL
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathParts = url.pathname.split("/");
  const tournamentId = pathParts[pathParts.length - 1];
  const action = url.searchParams.get("action");

  if (!tournamentId) {
    res.writeHead(400, { ...corsHeaders, "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "tournament id is required" }));
  }

  // ========================================================
  // GET — Detalhes completos do torneio (com inscrições e chaves)
  // ========================================================
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

      if (!tournament) {
        res.writeHead(404, {
          ...corsHeaders,
          "Content-Type": "application/json",
        });
        return res.end(JSON.stringify({ error: "Tournament not found" }));
      }

      res.writeHead(200, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      return res.end(JSON.stringify(tournament));
    } catch (err) {
      console.error("[tournaments/id GET]", err);
      res.writeHead(500, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      return res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }

  // ========================================================
  // PATCH — Atualiza dados do torneio (status, datas, etc)
  // ========================================================
  if (req.method === "PATCH") {
    try {
      if (!["ADMIN", "COACH"].includes(ctx.role)) {
        res.writeHead(403, {
          ...corsHeaders,
          "Content-Type": "application/json",
        });
        return res.end(JSON.stringify({ error: "Insufficient permissions" }));
      }

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
        const validStatuses = [
          "DRAFT",
          "REGISTRATION",
          "IN_PROGRESS",
          "FINISHED",
          "CANCELLED",
        ];
        if (!validStatuses.includes(status)) {
          res.writeHead(400, {
            ...corsHeaders,
            "Content-Type": "application/json",
          });
          return res.end(
            JSON.stringify({ error: `Invalid status: ${status}` }),
          );
        }
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

      res.writeHead(200, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      return res.end(JSON.stringify(updated));
    } catch (err) {
      console.error("[tournaments/id PATCH]", err);
      res.writeHead(500, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      return res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }

  // ========================================================
  // POST — Ações sobre o torneio
  // ========================================================
  if (req.method === "POST") {
    // --- Inscrever atleta ---
    if (action === "add-entry") {
      try {
        const { athleteId, categoryId, seed } = req.body || {};

        if (!athleteId) {
          res.writeHead(400, {
            ...corsHeaders,
            "Content-Type": "application/json",
          });
          return res.end(JSON.stringify({ error: "athleteId is required" }));
        }

        // Verificar se o torneio aceita inscrições
        const tournament = await prisma.tournament.findUnique({
          where: { id: tournamentId },
          select: {
            status: true,
            maxPlayers: true,
            _count: { select: { entries: true } },
          },
        });

        if (!tournament) {
          res.writeHead(404, {
            ...corsHeaders,
            "Content-Type": "application/json",
          });
          return res.end(JSON.stringify({ error: "Tournament not found" }));
        }

        if (!["DRAFT", "REGISTRATION"].includes(tournament.status)) {
          res.writeHead(400, {
            ...corsHeaders,
            "Content-Type": "application/json",
          });
          return res.end(
            JSON.stringify({
              error: "Tournament is not accepting registrations",
            }),
          );
        }

        if (
          tournament.maxPlayers &&
          tournament._count.entries >= tournament.maxPlayers
        ) {
          res.writeHead(400, {
            ...corsHeaders,
            "Content-Type": "application/json",
          });
          return res.end(JSON.stringify({ error: "Tournament is full" }));
        }

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

        res.writeHead(201, {
          ...corsHeaders,
          "Content-Type": "application/json",
        });
        return res.end(JSON.stringify(entry));
      } catch (err) {
        if (err.code === "P2002") {
          res.writeHead(409, {
            ...corsHeaders,
            "Content-Type": "application/json",
          });
          return res.end(
            JSON.stringify({
              error: "Athlete already registered in this category",
            }),
          );
        }
        console.error("[tournaments/id add-entry]", err);
        res.writeHead(500, {
          ...corsHeaders,
          "Content-Type": "application/json",
        });
        return res.end(JSON.stringify({ error: "Internal server error" }));
      }
    }

    // --- Gerar chaveamento ---
    if (action === "generate") {
      try {
        if (!["ADMIN", "COACH"].includes(ctx.role)) {
          res.writeHead(403, {
            ...corsHeaders,
            "Content-Type": "application/json",
          });
          return res.end(JSON.stringify({ error: "Insufficient permissions" }));
        }

        const { categoryId } = req.body || {};

        const result = await generateBracket(prisma, tournamentId, categoryId);

        // Atualizar status do torneio para IN_PROGRESS
        await prisma.tournament.update({
          where: { id: tournamentId },
          data: { status: "IN_PROGRESS" },
        });

        res.writeHead(200, {
          ...corsHeaders,
          "Content-Type": "application/json",
        });
        return res.end(JSON.stringify(result));
      } catch (err) {
        console.error("[tournaments/id generate]", err);
        res.writeHead(400, {
          ...corsHeaders,
          "Content-Type": "application/json",
        });
        return res.end(
          JSON.stringify({
            error: err.message || "Failed to generate bracket",
          }),
        );
      }
    }

    res.writeHead(400, { ...corsHeaders, "Content-Type": "application/json" });
    return res.end(
      JSON.stringify({ error: "Unknown action. Use: add-entry, generate" }),
    );
  }

  res.writeHead(405, { ...corsHeaders, "Content-Type": "application/json" });
  return res.end(JSON.stringify({ error: "Method not allowed" }));
}
