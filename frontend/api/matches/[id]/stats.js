// frontend/api/matches/[id]/stats.js - Serverless Function para Estatísticas da Partida
// SEGURO: Usa authMiddleware para autenticação

import { getMatchStats, getMatchById } from "../../../src/services/matchService.js";
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

    if (req.method !== "GET") {
      return methodNotAllowed(res, ["GET"]);
    }

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

    const stats = await getMatchStats(id);
    return sendJson(res, 200, stats);
  } catch (error) {
    console.error(`Erro em matches/${req.query?.id || "unknown"}/stats:`, error);
    return sendJson(res, 500, { error: error.message || "Internal server error" });
  }
}
