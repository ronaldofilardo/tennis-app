// frontend/api/clubs/invite/[code].js
// API pública: GET informações de um clube pelo código de convite
// Usado na página /join/:code

import prisma from "../../_lib/prisma.js";
import { handleCors, sendJson } from "../../_lib/authMiddleware.js";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const { code } = req.query;

  if (!code || typeof code !== "string") {
    return sendJson(res, 400, { error: "Código de convite inválido." });
  }

  try {
    const club = await prisma.club.findFirst({
      where: { inviteCode: code },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        appName: true,
        _count: {
          select: {
            members: {
              where: { status: "ACTIVE" },
            },
          },
        },
      },
    });

    if (!club) {
      return sendJson(res, 404, { error: "Código de convite inválido ou expirado." });
    }

    return sendJson(res, 200, {
      id: club.id,
      name: club.name,
      slug: club.slug,
      logoUrl: club.logoUrl,
      appName: club.appName,
      memberCount: club._count.members,
    });
  } catch (error) {
    console.error("[InviteCode GET] Error:", error);
    return sendJson(res, 500, { error: "Erro interno." });
  }
}
