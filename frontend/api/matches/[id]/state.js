// frontend/api/matches/[id]/state.js - Serverless Function para Estado da Partida

import {
  getMatchState,
  updateMatchState,
} from "../../../src/services/matchService.js";
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

    const { id } = req.query;

    if (!id) {
      clearTimeout(timeout);
      return res.status(400).json({ error: "ID da partida é obrigatório" });
    }

    if (req.method === "GET") {
      const state = await getMatchState(id);
      clearTimeout(timeout);
      return res.json(state);
    }

    if (req.method === "PATCH") {
      const result = await updateMatchState(id, req.body);
      clearTimeout(timeout);
      return res.json(result);
    }

    clearTimeout(timeout);
    return res.status(405).json({ error: "Método não permitido" });
  } catch (error) {
    return handleApiError(
      error,
      res,
      timeout,
      ` matches/${req.query?.id || "unknown"}/state`
    );
  }
}
