// frontend/api/clubs/[clubId]/theme.js
// Endpoint: GET /api/clubs/:clubId/theme — Retorna tema White-Label do clube (Fase 4)
// Aceita tanto o slug quanto o ID do clube como identificador

import prisma from "../../_lib/prisma.js";

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { clubId } = req.query;

    if (!clubId || typeof clubId !== "string") {
      return res.status(400).json({ error: "Club identifier is required" });
    }

    // Tenta encontrar pelo slug primeiro; se não, tenta pelo id
    const club = await prisma.club.findFirst({
      where: {
        OR: [
          { slug: clubId.toLowerCase() },
          { id: clubId },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        themeConfig: true,
      },
    });

    if (!club) {
      return res.status(404).json({ error: "Club not found" });
    }

    // themeConfig é um JSON armazenado no banco
    // Formato esperado: { colors: { ... }, fontFamily?: string, defaultCourtType?: string }
    const themeConfig =
      typeof club.themeConfig === "string"
        ? JSON.parse(club.themeConfig)
        : club.themeConfig;

    const theme = {
      name: club.name,
      logoUrl: club.logoUrl || null,
      colors: themeConfig?.colors || {},
      fontFamily: themeConfig?.fontFamily || null,
      defaultCourtType: themeConfig?.defaultCourtType || null,
    };

    // Cache longo (tema raramente muda) — 1 hora
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");

    return res.status(200).json({ theme, clubId: club.id });
  } catch (error) {
    console.error("[Theme endpoint error]", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
