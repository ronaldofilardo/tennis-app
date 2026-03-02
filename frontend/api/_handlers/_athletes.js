// frontend/api/athletes.js
// Router consolidado — todas as rotas /api/athletes/*
//   GET   /api/athletes?q=...    → busca global de atletas
//   POST  /api/athletes          → cria perfil de atleta
//   GET   /api/athletes/:id      → detalhe do atleta (com privacidade)
//   PATCH /api/athletes/:id      → atualiza perfil

import prisma from "../_lib/prisma.js";
import {
  handleCors,
  requireAuth,
  sendJson,
  methodNotAllowed,
} from "../_lib/authMiddleware.js";

function getAthleteId(url) {
  const parts = url.pathname.split("/").filter(Boolean);
  const seg = parts[2] || null; // /api/athletes/:id
  return seg;
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const ctx = requireAuth(req, res);
  if (!ctx) return;

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const athleteId = getAthleteId(url);

  // ─── /api/athletes/:id ────────────────────────────────────────────────────
  if (athleteId) {
    if (req.method === "GET") {
      try {
        const athlete = await prisma.athleteProfile.findUnique({
          where: { id: athleteId },
        });
        if (!athlete) return sendJson(res, 404, { error: "Athlete not found" });
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
        console.error("[athletes/:id GET]", err);
        return sendJson(res, 500, { error: "Internal server error" });
      }
    }

    if (req.method === "PATCH") {
      try {
        const athlete = await prisma.athleteProfile.findUnique({
          where: { id: athleteId },
        });
        if (!athlete) return sendJson(res, 404, { error: "Athlete not found" });
        const isOwnClub = ctx.clubId && athlete.clubId === ctx.clubId;
        const isSelf = athlete.userId && athlete.userId === ctx.userId;
        if (!isOwnClub && !isSelf)
          return sendJson(res, 403, {
            error: "Cannot edit athlete from another club",
          });
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
        console.error("[athletes/:id PATCH]", err);
        return sendJson(res, 500, { error: "Internal server error" });
      }
    }

    return methodNotAllowed(res, ["GET", "PATCH"]);
  }

  // ─── /api/athletes (root) ─────────────────────────────────────────────────
  if (req.method === "GET") {
    try {
      const searchQuery = url.searchParams.get("q") || "";
      const filterClubId = url.searchParams.get("clubId") || null;
      const limit = Math.min(
        parseInt(url.searchParams.get("limit") || "20"),
        50,
      );
      const sanitized = searchQuery
        .replace(/[<>'"%;()&+]/g, "")
        .trim()
        .slice(0, 100);
      const where = {
        isPublic: true,
        ...(sanitized && {
          name: { contains: sanitized, mode: "insensitive" },
        }),
        ...(filterClubId && { clubId: filterClubId }),
      };
      const athletes = await prisma.athleteProfile.findMany({
        where,
        take: limit,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          nickname: true,
          clubId: true,
          category: true,
          gender: true,
          ranking: true,
          birthDate: true,
        },
      });
      return sendJson(res, 200, athletes);
    } catch (err) {
      console.error("[athletes GET]", err);
      return sendJson(res, 500, { error: "Internal server error" });
    }
  }

  if (req.method === "POST") {
    try {
      const {
        name,
        nickname,
        birthDate,
        phone,
        category,
        gender,
        ranking,
        isPublic = true,
      } = req.body || {};
      if (!name) return sendJson(res, 400, { error: "name is required" });
      const athlete = await prisma.athleteProfile.create({
        data: {
          userId: ctx.userId,
          clubId: ctx.clubId || null,
          name: name.trim(),
          nickname: nickname?.trim() || null,
          birthDate: birthDate ? new Date(birthDate) : null,
          phone: phone?.trim() || null,
          category: category?.trim() || null,
          gender: gender || null,
          ranking: ranking ? parseInt(ranking) : null,
          isPublic,
        },
      });
      return sendJson(res, 201, athlete);
    } catch (err) {
      console.error("[athletes POST]", err);
      return sendJson(res, 500, { error: "Internal server error" });
    }
  }

  return methodNotAllowed(res, ["GET", "POST"]);
}
