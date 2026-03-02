// frontend/api/clubs/[clubId]/members.js
// GET  /api/clubs/:clubId/members — Lista membros do clube (GESTOR/COACH)
// POST /api/clubs/:clubId/members — Convida membro para o clube (GESTOR only)

import {
  addClubMember,
  getClubMembers,
} from "../../../src/services/authService.js";
import {
  handleCors,
  requireClubAccess,
  sendJson,
  methodNotAllowed,
} from "../../_lib/authMiddleware.js";
import {
  requireActiveSubscription,
  requireAthleteQuota,
} from "../../_lib/subscriptionMiddleware.js";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  // Extrair clubId da rota
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathParts = url.pathname.split("/");
  const clubId = pathParts[3]; // /api/clubs/:clubId/members

  // ========================================================
  // GET /api/clubs/:clubId/members
  // Lista membros do clube (GESTOR, CLUB_STAFF ou COACH)
  // ========================================================
  if (req.method === "GET") {
    const ctx = requireClubAccess(
      req,
      res,
      clubId,
      "GESTOR",
      "CLUB_STAFF",
      "COACH",
      "ADMIN",
    );
    if (!ctx) return;

    try {
      const members = await getClubMembers(clubId, ctx.userId);
      return sendJson(res, 200, { members });
    } catch (err) {
      console.error("[clubs members GET]", err);
      return sendJson(res, 500, {
        error: err.message || "Internal server error",
      });
    }
  }

  // ========================================================
  // POST /api/clubs/:clubId/members
  // Convida membro para o clube (GESTOR only)
  // ========================================================
  if (req.method === "POST") {
    const ctx = requireClubAccess(req, res, clubId, "GESTOR", "ADMIN");
    if (!ctx) return;

    // Verificar subscription ativa
    const subCheck = await requireActiveSubscription(req, res, ctx);
    if (!subCheck) return;

    // Verificar quota de atletas se a role é ATHLETE ou COACH
    const { role = "ATHLETE" } = req.body || {};
    if (["ATHLETE", "COACH"].includes(role)) {
      const quotaOk = await requireAthleteQuota(req, res, ctx);
      if (!quotaOk) return;
    }

    try {
      const { userId, role = "ATHLETE" } = req.body || {};
      if (!userId) {
        return sendJson(res, 400, { error: "userId is required" });
      }

      const result = await addClubMember({
        clubId,
        userId,
        role,
        invitedByUserId: ctx.userId,
      });

      return sendJson(res, 201, result);
    } catch (err) {
      console.error("[clubs members POST]", err);
      const statusCode = err.message?.includes("INVALID") ? 400 : 500;
      return sendJson(res, statusCode, {
        error: err.message || "Internal server error",
      });
    }
  }

  return methodNotAllowed(res, ["GET", "POST"]);
}
