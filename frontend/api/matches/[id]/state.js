// frontend/api/matches/[id]/state.js - Serverless Function para Estado da Partida
// SEGURO: Usa authMiddleware para autenticação

import {
  getMatchState,
  updateMatchState,
  getMatchById,
} from "../../../src/services/matchService.js";
import {
  handleCors,
  requireAuth,
  sendJson,
  methodNotAllowed,
} from "../../_lib/authMiddleware.js";

export default async function handler(req, res) {
  try {
    if (handleCors(req, res)) return;

    const ctx = requireAuth(req, res);
    if (!ctx) return;

    const { id } = req.query;

    if (!id) {
      return sendJson(res, 400, { error: "ID da partida é obrigatório" });
    }

    // Verificar isolamento do clube
    if (ctx.role !== "ADMIN") {
      const match = await getMatchById(id);
      if (match?.clubId && match.clubId !== ctx.clubId && match.visibility !== "PUBLIC") {
        return sendJson(res, 403, { error: "Access denied to this match" });
      }
    }

    if (req.method === "GET") {
      const state = await getMatchState(id);
      return sendJson(res, 200, state);
    }

    if (req.method === "PATCH") {
      const result = await updateMatchState(id, req.body);
      return sendJson(res, 200, result);
    }

    return methodNotAllowed(res, ["GET", "PATCH"]);
  } catch (error) {
    console.error(`Erro em matches/${req.query?.id || "unknown"}/state:`, error);
    return sendJson(res, 500, { error: error.message || "Internal server error" });
  }
}
