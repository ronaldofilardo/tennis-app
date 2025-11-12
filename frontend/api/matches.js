// frontend/api/matches.js - Serverless Function para Matches

import { getAllMatches, createMatch } from "../src/services/matchService.js";
import {
  corsHeaders,
  createTimeoutHandler,
  handleCors,
  handleApiError,
} from "../src/services/businessLogic.js";
import {
  validateMatchApiResponse,
  VersionedMatchApiResponseSchema,
} from "../src/schemas/contracts.js";

export default async function handler(req, res) {
  const timeout = createTimeoutHandler(res);

  try {
    handleCors(res);
    if (req.method === "OPTIONS") {
      clearTimeout(timeout);
      return res.status(200).end();
    }

    if (req.method === "GET") {
      const result = await getAllMatches();

      // Validar e adicionar versão aos matches
      const validatedMatches = result.map((match) => {
        const validation = validateMatchApiResponse(match);
        if (!validation.success) {
          throw new Error(
            `Contrato de API violado: ${validation.error.message}`
          );
        }
        return { ...match, contractVersion: "1.0.0" };
      });

      clearTimeout(timeout);
      return res.json(validatedMatches);
    }

    if (req.method === "POST") {
      const result = await createMatch(req.body);

      // Validar resposta
      const validation = validateMatchApiResponse(result);
      if (!validation.success) {
        throw new Error(
          `Contrato de API violado na criação: ${validation.error.message}`
        );
      }

      const versionedResult = { ...result, contractVersion: "1.0.0" };
      clearTimeout(timeout);
      return res.status(201).json(versionedResult);
    }

    clearTimeout(timeout);
    return res.status(405).json({ error: "Método não permitido" });
  } catch (error) {
    console.error("Erro interno ao criar partida:", error);
    return handleApiError(error, res, timeout, " matches");
  }
}
