// frontend/api/athletes/[id].js
// GET    /api/athletes/:id — Detalhes de um atleta (com privacidade)
// PATCH  /api/athletes/:id — Atualiza perfil (somente clube dono ou próprio)

import prisma from "../_lib/prisma.js";
import {
  handleCors,
  requireAuth,
  sendJson,
  methodNotAllowed,
} from "../_lib/authMiddleware.js";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const ctx = requireAuth(req, res);
  if (!ctx) return;

  // Extrair ID da URL
  const urlParts = req.url.split("/");
  const athleteId = urlParts[urlParts.length - 1]?.split("?")[0];

  if (!athleteId) {
    return sendJson(res, 400, { error: "athlete id is required" });
  }

  // GET — detalhes do atleta
  if (req.method === "GET") {
    try {
      const athlete = await prisma.athleteProfile.findUnique({
        where: { id: athleteId },
      });

      if (!athlete) {
        return sendJson(res, 404, { error: "Athlete not found" });
      }

      // Privacidade: dados completos somente para o clube que cadastrou
      const isOwnClub = ctx.clubId && athlete.clubId === ctx.clubId;
      const isSelf = athlete.userId && athlete.userId === ctx.userId;

      const response =
        isOwnClub || isSelf
          ? athlete
          : {
              id: athlete.id,
              name: athlete.name,
              nickname: athlete.nickname,
              clubId: athlete.clubId,
              category: athlete.category,
              gender: athlete.gender,
              ranking: athlete.ranking,
            };

      return sendJson(res, 200, response);
    } catch (err) {
      console.error("[athletes/id GET]", err);
      return sendJson(res, 500, { error: "Internal server error" });
    }
  }

  // PATCH — atualizar perfil
  if (req.method === "PATCH") {
    try {
      const athlete = await prisma.athleteProfile.findUnique({
        where: { id: athleteId },
      });

      if (!athlete) {
        return sendJson(res, 404, { error: "Athlete not found" });
      }

      // Somente clube dono ou o próprio usuário pode editar
      const isOwnClub = ctx.clubId && athlete.clubId === ctx.clubId;
      const isSelf = athlete.userId && athlete.userId === ctx.userId;

      if (!isOwnClub && !isSelf) {
        return sendJson(res, 403, {
          error: "Cannot edit athlete from another club",
        });
      }

      const { name, nickname, birthDate, phone, category, gender, ranking } =
        req.body || {};

      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (nickname !== undefined)
        updateData.nickname = nickname?.trim() || null;
      if (birthDate !== undefined)
        updateData.birthDate = birthDate ? new Date(birthDate) : null;
      if (phone !== undefined) updateData.phone = phone?.trim() || null;
      if (category !== undefined)
        updateData.category = category?.trim() || null;
      if (gender !== undefined) updateData.gender = gender || null;
      if (ranking !== undefined)
        updateData.ranking = ranking ? parseInt(ranking) : null;

      const updated = await prisma.athleteProfile.update({
        where: { id: athleteId },
        data: updateData,
      });

      return sendJson(res, 200, updated);
    } catch (err) {
      console.error("[athletes/id PATCH]", err);
      return sendJson(res, 500, { error: "Internal server error" });
    }
  }

  return methodNotAllowed(res, ["GET", "PATCH"]);
}
