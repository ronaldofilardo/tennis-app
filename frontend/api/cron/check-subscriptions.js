// frontend/api/cron/check-subscriptions.js
// CRON JOB STUB — Preparado para Vercel Cron Jobs
//
// Quando ativado no vercel.json, este endpoint:
//   1. Busca subscriptions ativas que já venceram
//   2. Marca como PAST_DUE
//   3. Suspende membros do clube (exceto GESTOR)
//
// Proteção: Verifica header Authorization: Bearer CRON_SECRET
// Ativação: Descomentar a seção "crons" no vercel.json

import { checkAndSuspendExpiredSubscriptions } from "../../src/services/subscriptionService.js";
import { sendJson } from "../_lib/authMiddleware.js";

/**
 * Valida que a chamada é de um cron legítimo.
 * Em produção Vercel, o header `Authorization: Bearer <CRON_SECRET>` é obrigatório.
 * @param {import('http').IncomingMessage} req
 * @returns {boolean}
 */
function validateCronAuth(req) {
  const cronSecret = process.env.CRON_SECRET;

  // Se não há secret configurado, está no modo dev
  if (!cronSecret) {
    console.warn(
      "[cron] CRON_SECRET not configured — running in dev mode",
    );
    return process.env.NODE_ENV === "development";
  }

  const auth = req.headers?.authorization;
  return auth === `Bearer ${cronSecret}`;
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  // Validar autenticação do cron job
  if (!validateCronAuth(req)) {
    return sendJson(res, 401, { error: "Unauthorized" });
  }

  try {
    console.log("[cron] Starting subscription check...");

    const result = await checkAndSuspendExpiredSubscriptions();

    console.log("[cron] Subscription check completed:", {
      checked: result.checked,
      suspended: result.suspended,
    });

    return sendJson(res, 200, {
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err) {
    console.error("[cron] Error checking subscriptions:", err);
    return sendJson(res, 500, {
      error: "Error checking subscriptions",
      message: err.message,
    });
  }
}
