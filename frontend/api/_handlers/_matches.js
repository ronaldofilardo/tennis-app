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
  getMatchesOpenForAnnotation,
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
  // parts: [api, matches, ?id|visible|open-for-annotation, ?sub, ?subId, ?action]
  const seg = parts[2] || null;
  const sub = parts[3] || null;
  const subId = parts[4] || null;
  const action = parts[5] || null;
  const isVisible = seg === "visible";
  const isOpenForAnnotation = seg === "open-for-annotation";
  const id = !isVisible && !isOpenForAnnotation ? seg : null;
  return { id, sub, subId, action, isVisible, isOpenForAnnotation };
}

export default async function handler(req, res) {
  try {
    if (handleCors(req, res)) return;

    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const { id, sub, subId, action, isVisible, isOpenForAnnotation } = parsePath(url);

    // ─── GET /api/matches/visible ────────────────────────────────────────────
    if (isVisible) {
      if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
      const ctx = extractContext(req);
      const rawParams = Object.fromEntries(url.searchParams.entries());
      const { path: _p, clubId: _c, userRole: _u, ...cleanParams } = rawParams;
      const result = await getVisibleMatches({
        email: cleanParams.email,
        role: cleanParams.role ?? ctx?.role ?? undefined,
      });
      return sendJson(res, 200, result);
    }

    // ─── GET /api/matches/open-for-annotation ────────────────────────────────
    if (isOpenForAnnotation) {
      if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
      const ctx = requireAuth(req, res);
      if (!ctx) return;
      const result = await getMatchesOpenForAnnotation();
      return sendJson(res, 200, result);
    }

    // ─── /api/matches/:id/sessions ───────────────────────────────────────────
    // POST   /api/matches/:id/sessions              → inicia sessão de anotação
    // GET    /api/matches/:id/sessions              → lista sessões da partida
    // PATCH  /api/matches/:id/sessions/:sessionId   → encerra sessão (endedAt)
    // POST   /api/matches/:id/sessions/:sessionId/endorse → endossa sessão
    if (id && sub === "sessions") {
      const ctx = requireAuth(req, res);
      if (!ctx) return;

      // Endosso: POST /api/matches/:id/sessions/:sessionId/endorse
      if (subId && action === "endorse" && req.method === "POST") {
        const session = await prisma.matchAnnotationSession.findUnique({
          where: { id: subId },
          select: { id: true, matchId: true, isActive: true },
        });
        if (!session || session.matchId !== id)
          return sendJson(res, 404, { error: "Session not found" });
        // Só pode endossar sessão encerrada
        if (session.isActive)
          return sendJson(res, 400, {
            error: "Cannot endorse an active session",
          });
        const endorsement = await prisma.annotationEndorsement.create({
          data: { sessionId: subId, endorsedByUserId: ctx.userId },
          include: {
            endorsedBy: { select: { id: true, name: true, email: true } },
          },
        });
        return sendJson(res, 201, endorsement);
      }

      // PATCH /api/matches/:id/sessions/:sessionId → encerrar sessão
      if (subId && req.method === "PATCH") {
        const session = await prisma.matchAnnotationSession.findUnique({
          where: { id: subId },
          select: {
            id: true,
            matchId: true,
            annotatorUserId: true,
            isActive: true,
          },
        });
        if (!session || session.matchId !== id)
          return sendJson(res, 404, { error: "Session not found" });
        // Só o anotador ou ADMIN pode encerrar
        if (session.annotatorUserId !== ctx.userId && ctx.role !== "ADMIN")
          return sendJson(res, 403, {
            error: "Only the annotator or admin can end a session",
          });
        if (!session.isActive)
          return sendJson(res, 400, { error: "Session already ended" });
        // Capturar snapshot do matchState atual
        const match = await prisma.match.findUnique({
          where: { id },
          select: { matchState: true },
        });
        const updated = await prisma.matchAnnotationSession.update({
          where: { id: subId },
          data: {
            isActive: false,
            endedAt: new Date(),
            matchStateSnapshot: match?.matchState || null,
          },
        });
        return sendJson(res, 200, updated);
      }

      // GET /api/matches/:id/sessions → listar sessões
      if (req.method === "GET") {
        const sessions = await prisma.matchAnnotationSession.findMany({
          where: { matchId: id },
          include: {
            annotator: { select: { id: true, name: true, email: true } },
            endorsements: {
              include: { endorsedBy: { select: { id: true, name: true } } },
            },
          },
          orderBy: { createdAt: "desc" },
        });
        return sendJson(res, 200, sessions);
      }

      // POST /api/matches/:id/sessions → iniciar nova sessão
      if (req.method === "POST") {
        // Verificar se a partida existe e não está finalizada
        const match = await prisma.match.findUnique({
          where: { id },
          select: { status: true, clubId: true, openForAnnotation: true },
        });
        if (!match) return sendJson(res, 404, { error: "Match not found" });
        if (match.status === "FINISHED")
          return sendJson(res, 409, { error: "Match already finished" });

        // Partida aberta: qualquer autenticado (não SPECTATOR de plataforma) pode anotar
        // Partida fechada: respeita role de clube (comportamento original)
        if (!match.openForAnnotation && ctx.role === "SPECTATOR")
          return sendJson(res, 403, {
            error: "Spectators cannot annotate matches",
          });

        // Desativar qualquer sessão ativa anterior desta partida
        await prisma.matchAnnotationSession.updateMany({
          where: { matchId: id, isActive: true },
          data: { isActive: false, endedAt: new Date() },
        });
        // Criar nova sessão ativa
        const session = await prisma.matchAnnotationSession.create({
          data: { matchId: id, annotatorUserId: ctx.userId, isActive: true },
          include: {
            annotator: { select: { id: true, name: true, email: true } },
          },
        });
        return sendJson(res, 201, session);
      }

      return methodNotAllowed(res, ["GET", "POST", "PATCH"]);
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
      if (req.method === "PATCH") {
        // SPECTATOR não pode alterar estado
        if (ctx.role === "SPECTATOR")
          return sendJson(res, 403, {
            error: "Spectators cannot modify matches",
          });
        // Partida finalizada é imutável
        const current = await prisma.match.findUnique({
          where: { id },
          select: { status: true },
        });
        if (current?.status === "FINISHED")
          return sendJson(res, 409, { error: "Match already finished" });
        // Cross-club PUBLIC: somente leitura
        const matchData = await getMatchById(id);
        if (
          matchData?.clubId &&
          matchData.clubId !== ctx.clubId &&
          ctx.role !== "ADMIN"
        )
          return sendJson(res, 403, {
            error: "Cross-club matches are read-only",
          });
        return sendJson(res, 200, await updateMatchState(id, req.body));
      }
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
        // SPECTATOR não pode alterar partidas
        if (ctx.role === "SPECTATOR")
          return sendJson(res, 403, {
            error: "Spectators cannot modify matches",
          });
        const existing = await getMatchById(id);
        if (existing && ctx.role !== "ADMIN") {
          if (existing.clubId && existing.clubId !== ctx.clubId) {
            return sendJson(res, 403, { error: "Access denied to this match" });
          }
        }
        // Partida finalizada é imutável
        const currentStatus = await prisma.match.findUnique({
          where: { id },
          select: { status: true },
        });
        if (currentStatus?.status === "FINISHED")
          return sendJson(res, 409, { error: "Match already finished" });
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
      // SPECTATOR não pode criar partidas
      if (ctx.role === "SPECTATOR")
        return sendJson(res, 403, {
          error: "Spectators cannot create matches",
        });
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
