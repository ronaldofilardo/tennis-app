// frontend/api/matches.js - Serverless Function para Matches
// SEGURO: Usa authMiddleware para autenticação e isolamento por clubId

import { getAllMatches, createMatch } from "../src/services/matchService.js";
import {
  handleCors,
  requireAuth,
  extractContext,
  sendJson,
  methodNotAllowed,
} from "./_lib/authMiddleware.js";
import {
  validateMatchApiResponse,
  VersionedMatchApiResponseSchema,
} from "../src/schemas/contracts.js";
import { requireActiveSubscription } from "./_lib/subscriptionMiddleware.js";

export default async function handler(req, res) {
  try {
    if (handleCors(req, res)) return;

    const ctx = requireAuth(req, res);
    if (!ctx) return;

    if (req.method === "GET") {
      // Filtra partidas pelo clube do usuário autenticado
      // ADMIN vê todas; outros vêem apenas do seu clube + partidas PUBLIC
      const result = await getAllMatches(ctx.clubId, ctx.role);

      // Validar e adicionar versão aos matches
      const validatedMatches = result.map((match) => {
        const validation = validateMatchApiResponse(match);
        if (!validation.success) {
          throw new Error(
            `Contrato de API violado: ${validation.error.message}`,
          );
        }
        return { ...match, contractVersion: "1.0.0" };
      });

      return sendJson(res, 200, validatedMatches);
    }

    if (req.method === "POST") {
      // Verificar subscription ativa antes de criar partida
      const subCheck = await requireActiveSubscription(req, res, ctx);
      if (!subCheck) return; // 402 já enviado

      // Injeta clubId do contexto no body da partida
      const matchData = {
        ...req.body,
        clubId: ctx.clubId,
        createdByUserId: ctx.userId,
      };

      const result = await createMatch(matchData);

      // Validar resposta
      const validation = validateMatchApiResponse(result);
      if (!validation.success) {
        throw new Error(
          `Contrato de API violado na criação: ${validation.error.message}`,
        );
      }

      const versionedResult = { ...result, contractVersion: "1.0.0" };
      return sendJson(res, 201, versionedResult);
    }

    return methodNotAllowed(res, ["GET", "POST"]);
  } catch (error) {
    console.error("Erro interno em matches:", error);
    return sendJson(res, 500, {
      error: error.message || "Internal server error",
    });
  }
}
