// frontend/api/clubs/[clubId]/invoices.js
// GET /api/clubs/:clubId/invoices — Lista invoices/faturas do clube

import { getClubInvoices } from "../../../src/services/subscriptionService.js";
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
  const clubId = pathParts[3]; // /api/clubs/:clubId/invoices

  if (req.method !== "GET") {
    return methodNotAllowed(res, ["GET"]);
  }

  const ctx = requireClubAccess(req, res, clubId, "GESTOR", "ADMIN");
  if (!ctx) return;

  try {
    const queryParams = new URL(req.url, "http://localhost").searchParams;
    const limit = parseInt(queryParams.get("limit") || "20", 10);
    const offset = parseInt(queryParams.get("offset") || "0", 10);

    const invoices = await getClubInvoices(clubId, { limit, offset });

    return sendJson(res, 200, {
      invoices,
      pagination: { limit, offset, total: invoices.length },
    });
  } catch (err) {
    console.error("[invoices GET]", err);
    return sendJson(res, 500, { error: "Internal server error" });
  }
}
