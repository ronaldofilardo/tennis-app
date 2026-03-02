// frontend/api/matches/[id]/scorer.js
// POST /api/matches/:id/scorer  — Solicita um marcador comunitário
// PATCH /api/matches/:id/scorer — Marca aceita/recusa a solicitação

import {
  requestScorer,
  respondScorerRequest,
} from "../../src/services/authService.js";
import {
  handleCors,
  requireAuth,
  sendJson,
  methodNotAllowed,
} from "../../_lib/authMiddleware.js";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const ctx = requireAuth(req, res);
  if (!ctx) return;

  // Extrair ID da partida da rota
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathParts = url.pathname.split("/");
  const matchId = pathParts[3]; // /api/matches/:id/scorer

  // ========================================================
  // POST /api/matches/:id/scorer
  // Cria solicitação de marcador comunitário
  // ========================================================
  if (req.method === "POST") {
    try {
      const { scorerId } = req.body || {};
      if (!scorerId) {
        res.writeHead(400, {
          ...corsHeaders,
          "Content-Type": "application/json",
        });
        return res.end(JSON.stringify({ error: "scorerId is required" }));
      }

      const result = await requestScorer({
        matchId,
        scorerId,
        createdByUserId: ctx.userId,
      });

      res.writeHead(200, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      return res.end(JSON.stringify(result));
    } catch (err) {
      console.error("[matches scorer POST]", err);
      const statusCode = err.message?.includes("UNAUTHORIZED") ? 403 : 400;
      res.writeHead(statusCode, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      return res.end(
        JSON.stringify({ error: err.message || "Invalid request" }),
      );
    }
  }

  // ========================================================
  // PATCH /api/matches/:id/scorer
  // Scorer responde à solicitação
  // ========================================================
  if (req.method === "PATCH") {
    try {
      const { status } = req.body || {};
      if (!["ACCEPTED", "DECLINED"].includes(status)) {
        res.writeHead(400, {
          ...corsHeaders,
          "Content-Type": "application/json",
        });
        return res.end(
          JSON.stringify({ error: "status must be ACCEPTED or DECLINED" }),
        );
      }

      const result = await respondScorerRequest({
        matchId,
        scorerId: ctx.userId,
        status,
      });

      res.writeHead(200, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      return res.end(JSON.stringify(result));
    } catch (err) {
      console.error("[matches scorer PATCH]", err);
      const statusCode = err.message?.includes("UNAUTHORIZED") ? 403 : 400;
      res.writeHead(statusCode, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      return res.end(
        JSON.stringify({ error: err.message || "Invalid request" }),
      );
    }
  }

  res.writeHead(405, { ...corsHeaders, "Content-Type": "application/json" });
  return res.end(JSON.stringify({ error: "Method not allowed" }));
}
