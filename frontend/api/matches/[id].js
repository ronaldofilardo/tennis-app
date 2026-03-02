// frontend/api/matches/[id].js - Serverless Function para Match por ID
// SEGURO: Usa authMiddleware para autenticação e isolamento por clubId

import { getMatchById, updateMatch } from "../../src/services/matchService.js";
import {
  handleCors,
  requireAuth,
  sendJson,
  methodNotAllowed,
  corsHeaders,
} from "../_lib/authMiddleware.js";

export default async function handler(req, res) {
  try {
    if (handleCors(req, res)) return;

    const ctx = requireAuth(req, res);
    if (!ctx) return;

    const { id } = req.query;

    if (!id) {
      return sendJson(res, 400, { error: "ID da partida é obrigatório" });
    }

    if (req.method === "GET") {
      const match = await getMatchById(id);

      // Verificar isolamento: só pode ver partida do seu clube, pública, ou se for ADMIN
      if (match && ctx.role !== "ADMIN") {
        if (match.clubId && match.clubId !== ctx.clubId && match.visibility !== "PUBLIC") {
          return sendJson(res, 403, { error: "Access denied to this match" });
        }
      }

      return sendJson(res, 200, match);
    }

    if (req.method === "PATCH") {
      // Verificar que a partida pertence ao clube do usuário
      const existing = await getMatchById(id);
      if (existing && ctx.role !== "ADMIN") {
        if (existing.clubId && existing.clubId !== ctx.clubId) {
          return sendJson(res, 403, { error: "Access denied to this match" });
        }
      }

      const result = await updateMatch(id, req.body);
      return sendJson(res, 200, result);
    }

    return methodNotAllowed(res, ["GET", "PATCH"]);
  } catch (error) {
    console.error(`Erro em matches/${req.query?.id || "unknown"}:`, error);
    return sendJson(res, 500, { error: error.message || "Internal server error" });
  }
}
