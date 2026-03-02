ppn; // frontend/api/clubs/[clubId]/settings.js
// API: GET/PATCH configurações do clube (white-label, termos, defaults)
// Acesso: GESTOR ou ADMIN

import {
  handleCors,
  requireAuth,
  sendJson,
} from "../../_lib/authMiddleware.js";
import prisma from "../../_lib/prisma.js";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const ctx = requireAuth(req, res);
  if (!ctx) return;

  const { clubId } = req.query;

  // Verificar permissão
  if (ctx.role !== "GESTOR" && ctx.role !== "ADMIN") {
    return sendJson(res, 403, {
      error: "Apenas gestores podem gerenciar configurações.",
    });
  }

  // Verificar que o clube pertence ao contexto
  if (ctx.clubId && ctx.clubId !== clubId && ctx.role !== "ADMIN") {
    return sendJson(res, 403, { error: "Sem permissão para este clube." });
  }

  if (req.method === "GET") {
    return handleGet(req, res, clubId);
  }

  if (req.method === "PATCH") {
    return handlePatch(req, res, clubId);
  }

  return sendJson(res, 405, { error: "Method not allowed" });
}

async function handleGet(req, res, clubId) {
  try {
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: {
        id: true,
        name: true,
        slug: true,
        appName: true,
        logoUrl: true,
        inviteCode: true,
        allowedEmailDomains: true,
        defaultVisibility: true,
        defaultScoreMode: true,
        termsText: true,
        termsPdfUrl: true,
        themeConfig: true,
      },
    });

    if (!club) {
      return sendJson(res, 404, { error: "Clube não encontrado." });
    }

    return sendJson(res, 200, {
      appName: club.appName || "",
      logoUrl: club.logoUrl || "",
      inviteCode: club.inviteCode || "",
      allowedEmailDomains: club.allowedEmailDomains || "",
      defaultVisibility: club.defaultVisibility || "CLUB",
      defaultScoreMode: club.defaultScoreMode || "MANUAL",
      termsText: club.termsText || "",
      termsPdfUrl: club.termsPdfUrl || "",
      themeConfig: club.themeConfig || null,
    });
  } catch (error) {
    console.error("[ClubSettings GET] Error:", error);
    return sendJson(res, 500, { error: "Erro interno." });
  }
}

async function handlePatch(req, res, clubId) {
  try {
    const {
      appName,
      logoUrl,
      allowedEmailDomains,
      defaultVisibility,
      defaultScoreMode,
      termsText,
      termsPdfUrl,
      themeConfig,
    } = req.body || {};

    // Build update data (only include provided fields)
    const updateData = {};

    if (appName !== undefined) updateData.appName = appName;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (allowedEmailDomains !== undefined)
      updateData.allowedEmailDomains = allowedEmailDomains;
    if (defaultVisibility !== undefined) {
      const validVisibilities = ["PUBLIC", "CLUB", "PLAYERS_ONLY"];
      if (!validVisibilities.includes(defaultVisibility)) {
        return sendJson(res, 400, { error: "Visibilidade inválida." });
      }
      updateData.defaultVisibility = defaultVisibility;
    }
    if (defaultScoreMode !== undefined)
      updateData.defaultScoreMode = defaultScoreMode;
    if (termsText !== undefined) updateData.termsText = termsText;
    if (termsPdfUrl !== undefined) updateData.termsPdfUrl = termsPdfUrl;
    if (themeConfig !== undefined) updateData.themeConfig = themeConfig;

    const updated = await prisma.club.update({
      where: { id: clubId },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        appName: true,
        logoUrl: true,
        themeConfig: true,
      },
    });

    return sendJson(res, 200, {
      success: true,
      club: updated,
    });
  } catch (error) {
    console.error("[ClubSettings PATCH] Error:", error);
    return sendJson(res, 500, { error: "Erro ao salvar configurações." });
  }
}
