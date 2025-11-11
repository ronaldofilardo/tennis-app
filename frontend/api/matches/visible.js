// frontend/api/matches/visible.js - Serverless Function para Matches Visíveis

import { getVisibleMatches } from "../../src/services/matchService.js";
import {
  corsHeaders,
  createTimeoutHandler,
  handleCors,
  handleApiError,
} from "../../src/services/businessLogic.js";

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

    const queryParams = Object.fromEntries(
      new URL(req.url, "http://localhost").searchParams.entries()
    );
    const result = await getVisibleMatches(queryParams);
    clearTimeout(timeout);
    return res.json(result);
  } catch (error) {
    return handleApiError(error, res, timeout, " matches/visible");
  }
}
