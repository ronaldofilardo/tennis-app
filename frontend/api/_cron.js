// frontend/api/cron.js
// Router consolidado — todas as rotas /api/cron/*
//   GET|POST /api/cron/check-subscriptions → verifica e suspende subscriptions expiradas
//
// Proteção: Authorization: Bearer CRON_SECRET

import { checkAndSuspendExpiredSubscriptions } from "../src/services/subscriptionService.js";
import { sendJson } from "./_lib/authMiddleware.js";

function validateCronAuth(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.warn("[cron] CRON_SECRET not configured — dev mode");
    return process.env.NODE_ENV === "development";
  }
  return req.headers?.authorization === `Bearer ${cronSecret}`;
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  if (!validateCronAuth(req)) {
    return sendJson(res, 401, { error: "Unauthorized" });
  }

  try {
    console.log("[cron] Starting subscription check...");
    const result = await checkAndSuspendExpiredSubscriptions();
    console.log("[cron] Done:", result);
    return sendJson(res, 200, {
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err) {
    console.error("[cron] Error:", err);
    return sendJson(res, 500, {
      error: "Error checking subscriptions",
      message: err.message,
    });
  }
}
