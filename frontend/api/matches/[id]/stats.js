// frontend/api/matches/[id]/stats.js - Serverless Function para Estatísticas da Partida

import { getMatchStats } from "../../../src/services/matchService.js";
import {
  corsHeaders,
  createTimeoutHandler,
  handleCors,
  handleApiError,
} from "../../../src/services/businessLogic.js";

export default async function handler(req, res) {
  const timeout = createTimeoutHandler(res);

  try {
    handleCors(res);
    if (req.method === "OPTIONS") {
      clearTimeout(timeout);
      return res.status(200).end();
    }

    if (req.method !== "GET") {
      clearTimeout(timeout);
      return res.status(405).json({ error: "Método não permitido" });
    }

    const { id } = req.query;

    if (!id) {
      clearTimeout(timeout);
      return res.status(400).json({ error: "ID da partida é obrigatório" });
    }

    const stats = await getMatchStats(id);
    clearTimeout(timeout);
    return res.json(stats);
  } catch (error) {
    return handleApiError(
      error,
      res,
      timeout,
      ` matches/${req.query?.id || "unknown"}/stats`
    );
  }
}
