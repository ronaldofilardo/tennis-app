// frontend/api/athletes.js
// Router consolidado — todas as rotas /api/athletes/*
//   GET   /api/athletes?q=...    → busca global de atletas (pública — usada pelo scorer)
//   POST  /api/athletes          → cria perfil de atleta
//   GET   /api/athletes/:id      → detalhe do atleta (com privacidade)
//   PATCH /api/athletes/:id      → atualiza perfil

import prisma from '../_lib/prisma.js';
import {
  handleCors,
  requireAuth,
  extractContext,
  sendJson,
  methodNotAllowed,
} from '../_lib/authMiddleware.js';

function getAthleteId(url) {
  const parts = url.pathname.split('/').filter(Boolean);
  const seg = parts[2] || null; // /api/athletes/:id
  return seg;
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const athleteId = getAthleteId(url);

  // ─── GET /api/athletes (busca pública — não requer auth) ──────────────────
  // Permite que o scorer avulso (anônimo) encontre atletas da base central.
  // Retorna apenas campos públicos; dados sensíveis ficam protegidos.
  if (!athleteId && req.method === 'GET') {
    try {
      const ctx = extractContext(req); // pode ser null (anon)
      const searchQuery = url.searchParams.get('q') || '';
      const filterClubId = url.searchParams.get('clubId') || null;
      const excludeUserId = url.searchParams.get('excludeUserId') || null;
      const excludeAthleteId = url.searchParams.get('excludeAthleteId') || null;
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 200);
      const sanitized = searchQuery
        .replace(/[<>'"%;()&+]/g, '')
        .trim()
        .slice(0, 100);
      const notClauses = [
        ...(excludeUserId ? [{ userId: excludeUserId }] : []),
        ...(excludeAthleteId ? [{ id: excludeAthleteId }] : []),
      ];
      const where = {
        isPublic: true,
        ...(sanitized && {
          OR: [
            { name: { contains: sanitized, mode: 'insensitive' } },
            { globalId: { contains: sanitized, mode: 'insensitive' } },
          ],
        }),
        ...(filterClubId && { clubId: filterClubId }),
        ...(notClauses.length > 0 && {
          NOT: notClauses.length === 1 ? notClauses[0] : notClauses,
        }),
      };
      const athletes = await prisma.athleteProfile.findMany({
        where,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          globalId: true,
          name: true,
          nickname: true,
          category: true,
          gender: true,
          ranking: true,
          userId: true,
          clubId: true,
          user: { select: { name: true } },
        },
      });
      // Para usuários anônimos, omite userId (privacidade)
      // Usa User.name como nome canônico (mesmo exibido no Gestor); AthleteProfile.name como fallback
      const response = athletes.map((a) => ({
        id: a.id,
        globalId: a.globalId,
        name: a.user?.name ?? a.name,
        nickname: a.nickname,
        category: a.category,
        gender: a.gender,
        ranking: a.ranking,
        clubName: null,
        ...(ctx ? { clubId: a.clubId, userId: a.userId } : {}),
      }));
      return sendJson(res, 200, { athletes: response });
    } catch (err) {
      console.error('[athletes GET]', err);
      return sendJson(res, 500, { error: 'Internal server error' });
    }
  }

  // Todas as demais rotas exigem autenticação
  const ctx = requireAuth(req, res);
  if (!ctx) return;

  // ─── /api/athletes/:id ────────────────────────────────────────────────────
  if (athleteId) {
    if (req.method === 'GET') {
      try {
        const athlete = await prisma.athleteProfile.findUnique({
          where: { id: athleteId },
        });
        if (!athlete) return sendJson(res, 404, { error: 'Athlete not found' });
        const isOwnClub = ctx.clubId && athlete.clubId === ctx.clubId;
        const isSelf = athlete.userId && athlete.userId === ctx.userId;
        const response =
          isOwnClub || isSelf
            ? athlete
            : {
                id: athlete.id,
                globalId: athlete.globalId,
                name: athlete.name,
                nickname: athlete.nickname,
                clubId: athlete.clubId,
                category: athlete.category,
                gender: athlete.gender,
                ranking: athlete.ranking,
              };
        return sendJson(res, 200, response);
      } catch (err) {
        console.error('[athletes/:id GET]', err);
        return sendJson(res, 500, { error: 'Internal server error' });
      }
    }

    if (req.method === 'PATCH') {
      try {
        const athlete = await prisma.athleteProfile.findUnique({
          where: { id: athleteId },
        });
        if (!athlete) return sendJson(res, 404, { error: 'Athlete not found' });
        const isSelf = athlete.userId && athlete.userId === ctx.userId;
        const isGestorOfClub =
          (ctx.role === 'GESTOR' && ctx.clubId === athlete.clubId) || ctx.role === 'ADMIN';
        if (!isSelf && !isGestorOfClub)
          return sendJson(res, 403, {
            error: 'Apenas o gestor do clube pode editar perfis de atletas e técnicos.',
          });
        const { name, nickname, birthDate, phone, category, gender, ranking } = req.body || {};
        const updateData = {};
        if (name !== undefined) updateData.name = name.trim();
        if (nickname !== undefined) updateData.nickname = nickname?.trim() || null;
        if (birthDate !== undefined) updateData.birthDate = birthDate ? new Date(birthDate) : null;
        if (phone !== undefined) updateData.phone = phone?.trim() || null;
        if (category !== undefined) updateData.category = category?.trim() || null;
        if (gender !== undefined) updateData.gender = gender || null;
        if (ranking !== undefined) updateData.ranking = ranking ? parseInt(ranking) : null;
        const updated = await prisma.athleteProfile.update({
          where: { id: athleteId },
          data: updateData,
        });
        return sendJson(res, 200, updated);
      } catch (err) {
        console.error('[athletes/:id PATCH]', err);
        return sendJson(res, 500, { error: 'Internal server error' });
      }
    }

    return methodNotAllowed(res, ['GET', 'PATCH']);
  }

  // ─── POST /api/athletes ───────────────────────────────────────────────────
  if (req.method === 'POST') {
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
      if (!name) return sendJson(res, 400, { error: 'name is required' });
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
      console.error('[athletes POST]', err);
      return sendJson(res, 500, { error: 'Internal server error' });
    }
  }

  return methodNotAllowed(res, ['GET', 'POST']);
}
