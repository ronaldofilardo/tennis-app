// frontend/api/athletes.js
// GET  /api/athletes?q=...&clubId=...  — Busca global de atletas
// POST /api/athletes                    — Cria perfil de atleta

import prisma from "./_lib/prisma.js";
import {
  handleCors,
  requireAuth,
  sendJson,
  methodNotAllowed,
} from "./_lib/authMiddleware.js";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const ctx = requireAuth(req, res);
  if (!ctx) return;

  // ========================================================
  // GET /api/athletes?q=...&clubId=...&limit=20
  // Busca global de atletas com controle de privacidade
  // ========================================================
  if (req.method === "GET") {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const searchQuery = url.searchParams.get("q") || "";
      const filterClubId = url.searchParams.get("clubId") || null;
      const limit = Math.min(
        parseInt(url.searchParams.get("limit") || "20"),
        50,
      );

      // Sanitização básica do input de busca
      const sanitizedQuery = searchQuery
        .replace(/[<>'"%;()&+]/g, "")
        .trim()
        .slice(0, 100);

      const where = {
        isPublic: true,
        ...(sanitizedQuery && {
          name: { contains: sanitizedQuery, mode: "insensitive" },
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
          // Campos privados: só retorna se o atleta pertence ao clube do usuário
          birthDate: true,
          phone: true,
        },
      });

      // Aplicar privacidade: dados completos só para atletas do próprio clube
      const callerClubId = ctx.clubId;
      const result = athletes.map((athlete) => {
        const isOwnClub = callerClubId && athlete.clubId === callerClubId;

        if (isOwnClub) {
          // Visão completa para atletas do próprio clube
          return athlete;
        }

        // Visão pública: apenas nome + clube (conforme requisito 3)
        return {
          id: athlete.id,
          name: athlete.name,
          nickname: athlete.nickname,
          clubId: athlete.clubId,
          category: athlete.category,
          gender: athlete.gender,
          ranking: athlete.ranking,
          // Campos privados omitidos
          birthDate: null,
          phone: null,
        };
      });

      return sendJson(res, 200, { athletes: result, total: result.length });
    } catch (err) {
      console.error("[athletes GET]", err);
      return sendJson(res, 500, { error: "Internal server error" });
    }
  }

  // ========================================================
  // POST /api/athletes — Cria novo perfil de atleta
  // Pode ser vinculado a um userId existente ou criado como "convidado"
  // ========================================================
  if (req.method === "POST") {
    try {
      const {
        name,
        nickname,
        email,
        birthDate,
        phone,
        category,
        gender,
        ranking,
      } = req.body || {};

      if (!name || name.trim().length < 2) {
        return sendJson(res, 400, { error: "name is required (min 2 chars)" });
      }

      // Se email fornecido, tenta vincular a um User existente
      let userId = null;
      if (email) {
        const existingUser = await prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });
        if (existingUser) {
          userId = existingUser.id;

          // Verificar se já tem perfil de atleta
          const existingProfile = await prisma.athleteProfile.findUnique({
            where: { userId },
          });
          if (existingProfile) {
            return sendJson(res, 409, {
              error: "User already has an athlete profile",
              athleteId: existingProfile.id,
            });
          }
        }
      }

      const clubId = ctx.clubId || null;

      const athlete = await prisma.athleteProfile.create({
        data: {
          name: name.trim(),
          nickname: nickname?.trim() || null,
          userId,
          birthDate: birthDate ? new Date(birthDate) : null,
          phone: phone?.trim() || null,
          category: category?.trim() || null,
          gender: gender || null,
          ranking: ranking ? parseInt(ranking) : null,
          clubId,
          isPublic: true,
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
