// frontend/api/matches/visible.js - Serverless Function para Matches Visíveis
// Retorna partidas visíveis respeitando multi-tenancy

import { getVisibleMatches } from "../../src/services/matchService.js";
import {
  handleCors,
  extractContext,
  sendJson,
  methodNotAllowed,
} from "../_lib/authMiddleware.js";

export default async function handler(req, res) {
  try {
    if (handleCors(req, res)) return;

    if (req.method !== "GET") {
      return methodNotAllowed(res, ["GET"]);
    }

    // Auth é opcional para partidas visíveis — usuários anônimos veem apenas PUBLIC
    const ctx = extractContext(req);
    const clubId = ctx?.clubId || null;
    const userRole = ctx?.role || null;

    const queryParams = Object.fromEntries(
      new URL(req.url, "http://localhost").searchParams.entries()
    );

    // Injeta clubId e role nos params para filtrar no serviço
    const result = await getVisibleMatches({ ...queryParams, clubId, userRole });
    return sendJson(res, 200, result);
  } catch (error) {
    console.error("Erro em matches/visible:", error);
    return sendJson(res, 500, { error: error.message || "Internal server error" });
  }
}
