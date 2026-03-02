// frontend/api/clubs/[clubId]/subscription.js
// GET   /api/clubs/:clubId/subscription — Retorna subscription + uso do clube
// PATCH /api/clubs/:clubId/subscription — Atualiza plano (ADMIN ou GESTOR)

import {
  getSubscriptionWithUsage,
  createOrUpdateSubscription,
  generateInviteCode,
} from "../../../src/services/subscriptionService.js";
import {
  handleCors,
  requireClubAccess,
  sendJson,
  methodNotAllowed,
} from "../../_lib/authMiddleware.js";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  // Extrair clubId da rota
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathParts = url.pathname.split("/");
  const clubId = pathParts[3]; // /api/clubs/:clubId/subscription

  // ========================================================
  // GET /api/clubs/:clubId/subscription
  // Retorna subscription atual + usage
  // ========================================================
  if (req.method === "GET") {
    const ctx = requireClubAccess(
      req,
      res,
      clubId,
      "GESTOR",
      "ADMIN",
    );
    if (!ctx) return;

    try {
      const data = await getSubscriptionWithUsage(clubId);
      if (!data) {
        return sendJson(res, 404, { error: "Club not found" });
      }
      return sendJson(res, 200, data);
    } catch (err) {
      console.error("[subscription GET]", err);
      return sendJson(res, 500, { error: "Internal server error" });
    }
  }

  // ========================================================
  // PATCH /api/clubs/:clubId/subscription
  // Atualiza plano — ADMIN pode mudar qualquer plano; GESTOR apenas upgrade
  // ========================================================
  if (req.method === "PATCH") {
    const ctx = requireClubAccess(req, res, clubId, "GESTOR", "ADMIN");
    if (!ctx) return;

    try {
      const { planType, billingCycle } = req.body || {};

      if (!planType || !["FREE", "PREMIUM", "ENTERPRISE"].includes(planType)) {
        return sendJson(res, 400, {
          error: "planType must be FREE, PREMIUM, or ENTERPRISE",
        });
      }

      if (
        billingCycle &&
        !["MONTHLY", "QUARTERLY", "YEARLY"].includes(billingCycle)
      ) {
        return sendJson(res, 400, {
          error: "billingCycle must be MONTHLY, QUARTERLY, or YEARLY",
        });
      }

      // Se não for ADMIN, não pode downgrade para FREE (precisa cancelar subscription)
      if (ctx.role !== "ADMIN" && planType === "FREE") {
        return sendJson(res, 403, {
          error: "Only platform admin can downgrade to FREE plan",
        });
      }

      const subscription = await createOrUpdateSubscription({
        clubId,
        planType,
        billingCycle: billingCycle || "MONTHLY",
      });

      return sendJson(res, 200, {
        message: `Plan updated to ${planType}`,
        subscription,
      });
    } catch (err) {
      console.error("[subscription PATCH]", err);
      return sendJson(res, 500, {
        error: err.message || "Internal server error",
      });
    }
  }

  return methodNotAllowed(res, ["GET", "PATCH"]);
}
