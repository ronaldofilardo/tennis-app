// frontend/api/matches.js
// Router consolidado — todas as rotas /api/matches/*
//   GET    /api/matches                    → lista partidas do clube
//   POST   /api/matches                    → cria partida
//   GET    /api/matches/visible            → partidas visíveis (auth opcional)
//   GET    /api/matches/:id                → detalhe da partida
//   PATCH  /api/matches/:id                → atualiza partida
//   GET    /api/matches/:id/state          → estado da partida
//   PATCH  /api/matches/:id/state          → atualiza estado
//   GET    /api/matches/:id/stats          → estatísticas

import {
  getAllMatches,
  createMatch,
  getMatchById,
  updateMatch,
  getMatchState,
  updateMatchState,
  getMatchStats,
  getVisibleMatches,
} from "../../src/services/matchService.js";
import {
  handleCors,
  requireAuth,
  extractContext,
  sendJson,
  methodNotAllowed,
} from "../_lib/authMiddleware.js";
import { validateMatchApiResponse } from "../../src/schemas/contracts.js";
import { requireActiveSubscription } from "../_lib/subscriptionMiddleware.js";
import prisma from "../_lib/prisma.js";

function parsePath(url) {
  const parts = url.pathname.split("/").filter(Boolean);
  // parts: [api, matches, ?id|visible, ?sub]
  const seg = parts[2] || null;
  const sub = parts[3] || null;
  const isVisible = seg === "visible";
  const id = !isVisible ? seg : null;
  return { id, sub, isVisible };
}

export default async function handler(req, res) {
  try {
    if (handleCors(req, res)) return;

    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const { id, sub, isVisible } = parsePath(url);

    // ─── GET /api/matches/visible ────────────────────────────────────────────
    if (isVisible) {
      if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
      const ctx = extractContext(req);
      const rawParams = Object.fromEntries(url.searchParams.entries());
      // Remove 'path' injetado pelo catch-all do Vercel e normaliza para o schema
      // VisibleMatchesQuerySchema aceita apenas { email?, role? }
      const { path: _p, clubId: _c, userRole: _u, ...cleanParams } = rawParams;
      const result = await getVisibleMatches({
        email: cleanParams.email,
        role: cleanParams.role ?? ctx?.role ?? undefined,
      });
      return sendJson(res, 200, result);
    }

    // ─── /api/matches/:id/state ──────────────────────────────────────────────
    if (id && sub === "state") {
      const ctx = requireAuth(req, res);
      if (!ctx) return;
      if (ctx.role !== "ADMIN") {
        const match = await getMatchById(id);
        if (
          match?.clubId &&
          match.clubId !== ctx.clubId &&
          match.visibility !== "PUBLIC"
        ) {
          return sendJson(res, 403, { error: "Access denied to this match" });
        }
      }
      if (req.method === "GET")
        return sendJson(res, 200, await getMatchState(id));
      if (req.method === "PATCH")
        return sendJson(res, 200, await updateMatchState(id, req.body));
      return methodNotAllowed(res, ["GET", "PATCH"]);
    }

    // ─── GET /api/matches/:id/stats ──────────────────────────────────────────
    if (id && sub === "stats") {
      const ctx = requireAuth(req, res);
      if (!ctx) return;
      if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
      if (ctx.role !== "ADMIN") {
        const match = await getMatchById(id);
        if (
          match?.clubId &&
          match.clubId !== ctx.clubId &&
          match.visibility !== "PUBLIC"
        ) {
          return sendJson(res, 403, { error: "Access denied to this match" });
        }
      }
      return sendJson(res, 200, await getMatchStats(id));
    }

    // ─── /api/matches/:id ────────────────────────────────────────────────────
    if (id) {
      const ctx = requireAuth(req, res);
      if (!ctx) return;
      if (req.method === "GET") {
        const match = await getMatchById(id);
        if (match && ctx.role !== "ADMIN") {
          if (
            match.clubId &&
            match.clubId !== ctx.clubId &&
            match.visibility !== "PUBLIC"
          ) {
            return sendJson(res, 403, { error: "Access denied to this match" });
          }
        }
        return sendJson(res, 200, match);
      }
      if (req.method === "PATCH") {
        const existing = await getMatchById(id);
        if (existing && ctx.role !== "ADMIN") {
          if (existing.clubId && existing.clubId !== ctx.clubId) {
            return sendJson(res, 403, { error: "Access denied to this match" });
          }
        }
        return sendJson(res, 200, await updateMatch(id, req.body));
      }
      return methodNotAllowed(res, ["GET", "PATCH"]);
    }

    // ─── /api/matches (root) ─────────────────────────────────────────────────
    const ctx = requireAuth(req, res);
    if (!ctx) return;

    if (req.method === "GET") {
      const result = await getAllMatches(ctx.clubId, ctx.role, ctx.userId);
      const validated = result.map((match) => {
        const validation = validateMatchApiResponse(match);
        if (!validation.success) {
          throw new Error(
            `Contrato de API violado: ${validation.error.message}`,
          );
        }
        return { ...match, contractVersion: "1.0.0" };
      });
      return sendJson(res, 200, validated);
    }

    if (req.method === "POST") {
      const subCheck = await requireActiveSubscription(req, res, ctx);
      if (!subCheck) return;
      const matchData = {
        ...req.body,
        clubId: ctx.clubId,
        createdByUserId: ctx.userId,
      };
      const result = await createMatch(matchData);
      const validation = validateMatchApiResponse(result);
      if (!validation.success) {
        throw new Error(
          `Contrato de API violado na criação: ${validation.error.message}`,
        );
      }
      return sendJson(res, 201, { ...result, contractVersion: "1.0.0" });
    }

    return methodNotAllowed(res, ["GET", "POST"]);
  } catch (error) {
    console.error("Erro interno em matches:", error);
    const msg =
      error instanceof Error
        ? error.message
        : error != null
          ? String(error)
          : "Internal server error";
    return sendJson(res, 500, { error: msg });
  }
}
