// frontend/api/admin.js
// Router consolidado — todas as rotas /api/admin/* (ADMIN only)
//   GET  /api/admin/clubs          → lista todos os clubes com contagens
//   POST /api/admin/clubs          → cria clube + gestor
//   GET  /api/admin/stats          → estatísticas globais da plataforma
//   GET  /api/admin/users          → lista todos os usuários

import prisma from '../_lib/prisma.js';
import { handleCors, requireRole, sendJson, methodNotAllowed } from '../_lib/authMiddleware.js';
import { hashPassword, derivarSenha } from '../_lib/passwordUtils.js';

function getSection(url) {
  const parts = url.pathname.split('/').filter(Boolean);
  return parts[2] || null; // [api, admin, section]
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const ctx = requireRole(req, res, 'ADMIN');
  if (!ctx) return;

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const section = getSection(url);

  // ─── POST /api/admin/clubs ───────────────────────────────────────────────
  // Cria um novo clube e seu gestor em uma única transação
  if (section === 'clubs' && req.method === 'POST') {
    const {
      name,
      slug,
      planType = 'FREE',
      gestorName,
      gestorEmail,
      gestorPassword,
      alsoCoach = false,
    } = req.body || {};

    if (!name || !name.trim()) return sendJson(res, 400, { error: 'Nome do clube é obrigatório.' });
    if (!gestorName || !gestorName.trim())
      return sendJson(res, 400, { error: 'Nome do gestor é obrigatório.' });
    if (!gestorEmail || !gestorEmail.trim())
      return sendJson(res, 400, { error: 'E-mail do gestor é obrigatório.' });
    if (!gestorPassword || gestorPassword.length < 6)
      return sendJson(res, 400, {
        error: 'Senha do gestor deve ter ao menos 6 caracteres.',
      });

    const cleanEmail = gestorEmail.trim().toLowerCase();
    const clubSlug = slug
      ? slug
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
      : name
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');

    try {
      // Verificar slug único
      const slugExists = await prisma.club.findUnique({
        where: { slug: clubSlug },
      });
      if (slugExists)
        return sendJson(res, 409, {
          error: `Slug "${clubSlug}" já está em uso.`,
        });

      const passwordHash = await hashPassword(gestorPassword);

      const result = await prisma.$transaction(async (tx) => {
        // Cria ou reutiliza o usuário gestor
        let gestor = await tx.user.findUnique({ where: { email: cleanEmail } });
        if (!gestor) {
          gestor = await tx.user.create({
            data: {
              email: cleanEmail,
              name: gestorName.trim(),
              passwordHash,
              isActive: true,
            },
          });
        }

        // Cria o clube
        const club = await tx.club.create({
          data: {
            name: name.trim(),
            slug: clubSlug,
            planType,
          },
        });

        // Vincula gestor ao clube
        const membership = await tx.clubMembership.create({
          data: {
            userId: gestor.id,
            clubId: club.id,
            role: 'GESTOR',
            status: 'ACTIVE',
            alsoCoach: Boolean(alsoCoach),
            invitedByUserId: ctx.userId,
          },
        });

        return {
          club,
          gestor: { id: gestor.id, name: gestor.name, email: gestor.email },
          membership,
        };
      });

      return sendJson(res, 201, {
        club: result.club,
        gestor: result.gestor,
        alsoCoach: result.membership.alsoCoach,
      });
    } catch (err) {
      console.error('[admin/clubs POST]', err);
      if (err.code === 'P2002')
        return sendJson(res, 409, {
          error: 'E-mail do gestor ou slug já cadastrado.',
        });
      return sendJson(res, 500, { error: err.message || 'Erro interno.' });
    }
  }

  // Demais rotas são GET only
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET', 'POST']);

  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);
  const search = url.searchParams.get('search') || '';

  // ─── GET /api/admin/clubs ─────────────────────────────────────────────────
  if (section === 'clubs') {
    try {
      const where = search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {};
      const [clubs, total] = await Promise.all([
        prisma.club.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit,
          select: {
            id: true,
            name: true,
            slug: true,
            planType: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: { memberships: true, matches: true, tournaments: true },
            },
          },
        }),
        prisma.club.count({ where }),
      ]);
      return sendJson(res, 200, {
        clubs: clubs.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          planType: c.planType,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          memberCount: c._count.memberships,
          matchCount: c._count.matches,
          tournamentCount: c._count.tournaments,
        })),
        total,
        limit,
        offset,
      });
    } catch (err) {
      console.error('[admin/clubs]', err);
      return sendJson(res, 500, {
        error: err.message || 'Internal server error',
      });
    }
  }

  // ─── GET /api/admin/users ─────────────────────────────────────────────────
  if (section === 'users') {
    try {
      const where = search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {};
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit,
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
            platformRole: true,
            createdAt: true,
            updatedAt: true,
            _count: { select: { memberships: true, createdMatches: true } },
            memberships: {
              take: 1,
              orderBy: { joinedAt: 'asc' },
              select: { club: { select: { name: true } } },
            },
          },
        }),
        prisma.user.count({ where }),
      ]);
      return sendJson(res, 200, {
        users: users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          isActive: u.isActive,
          platformRole: u.platformRole,
          primaryClub: u.memberships[0]?.club?.name ?? null,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
          clubCount: u._count.memberships,
          matchCount: u._count.createdMatches,
        })),
        total,
        limit,
        offset,
      });
    } catch (err) {
      console.error('[admin/users]', err);
      return sendJson(res, 500, {
        error: err.message || 'Internal server error',
      });
    }
  }

  // ─── GET /api/admin/stats ─────────────────────────────────────────────────
  if (section === 'stats') {
    try {
      const now = new Date();
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalUsers,
        totalClubs,
        newUsersThisMonth,
        newClubsThisMonth,
        activeUsersLastWeek,
        clubsByPlan,
        membershipsByRole,
        topClubsByMembers,
        recentClubs,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.club.count(),
        prisma.user.count({ where: { createdAt: { gte: firstDayOfMonth } } }),
        prisma.club.count({ where: { createdAt: { gte: firstDayOfMonth } } }),
        prisma.user.count({ where: { updatedAt: { gte: oneWeekAgo } } }),
        prisma.club.groupBy({ by: ['planType'], _count: { id: true } }),
        prisma.clubMembership.groupBy({ by: ['role'], _count: { id: true } }),
        prisma.club.findMany({
          take: 10,
          orderBy: { memberships: { _count: 'desc' } },
          select: {
            id: true,
            name: true,
            slug: true,
            planType: true,
            createdAt: true,
            _count: { select: { memberships: true } },
          },
        }),
        prisma.club.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            name: true,
            slug: true,
            planType: true,
            createdAt: true,
            _count: { select: { memberships: true } },
          },
        }),
      ]);

      return sendJson(res, 200, {
        totalUsers,
        totalClubs,
        newUsersThisMonth,
        newClubsThisMonth,
        activeUsersLastWeek,
        clubsByPlan: clubsByPlan.map((g) => ({
          plan: g.planType,
          count: g._count.id,
        })),
        membershipsByRole: membershipsByRole.map((g) => ({
          role: g.role,
          count: g._count.id,
        })),
        topClubsByMembers: topClubsByMembers.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          planType: c.planType,
          createdAt: c.createdAt,
          memberCount: c._count.memberships,
        })),
        recentClubs: recentClubs.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          planType: c.planType,
          createdAt: c.createdAt,
          memberCount: c._count.memberships,
        })),
      });
    } catch (err) {
      console.error('[admin/stats]', err);
      return sendJson(res, 500, {
        error: err.message || 'Internal server error',
      });
    }
  }

  // ─── GET /api/admin/matches/all ─────────────────────────────────────────
  if (section === 'matches') {
    const parts = url.pathname.split('/').filter(Boolean);
    const subSection = parts[3];

    // GET /api/admin/matches/all — lista TODAS as partidas com paginação e filtro por status
    if (subSection === 'all') {
      if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
      try {
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
        const offset = parseInt(url.searchParams.get('offset') || '0', 10);
        const status = url.searchParams.get('status') || null;

        const where = status ? { status } : {};

        const [matches, total] = await Promise.all([
          prisma.match.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: limit,
            select: {
              id: true,
              playerP1: true,
              playerP2: true,
              status: true,
              score: true,
              winner: true,
              visibility: true,
              createdAt: true,
              club: { select: { name: true } },
              createdBy: { select: { name: true } },
            },
          }),
          prisma.match.count({ where }),
        ]);

        const formatted = matches.map((m) => ({
          id: m.id,
          playerP1: m.playerP1,
          playerP2: m.playerP2,
          status: m.status,
          score: m.score,
          winner: m.winner,
          visibility: m.visibility,
          clubName: m.club?.name ?? null,
          createdByName: m.createdBy?.name ?? null,
          createdAt: m.createdAt,
        }));

        return sendJson(res, 200, { matches: formatted, total, limit, offset });
      } catch (err) {
        console.error('[admin/matches/all]', err);
        return sendJson(res, 500, { error: err.message || 'Erro interno.' });
      }
    }
  }

  // ─── POST /api/admin/athletes/sync-passwords ─────────────────────────────
  // Recalcula a senha padrão (DDMMAAAA) de todos os atletas com data de nascimento.
  if (section === 'athletes') {
    const parts = url.pathname.split('/').filter(Boolean);
    const subSection = parts[3]; // sync-passwords
    if (subSection === 'sync-passwords') {
      if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
      try {
        const BATCH_SIZE = 100;
        let offset = 0;
        let updated = 0;
        let skipped = 0;

        while (true) {
          const profiles = await prisma.athleteProfile.findMany({
            where: { birthDate: { not: null }, userId: { not: null } },
            select: { id: true, birthDate: true, cpf: true, userId: true },
            skip: offset,
            take: BATCH_SIZE,
          });

          if (profiles.length === 0) break;

          await Promise.all(
            profiles.map(async (profile) => {
              try {
                const cleanCpf = profile.cpf ? profile.cpf.replace(/\D/g, '') : null;
                const senha = derivarSenha(profile.birthDate.toISOString().split('T')[0], cleanCpf);
                const passwordHash = await hashPassword(senha);
                await prisma.user.update({
                  where: { id: profile.userId },
                  data: { passwordHash },
                });
                updated++;
              } catch {
                skipped++;
              }
            }),
          );

          offset += BATCH_SIZE;
        }

        return sendJson(res, 200, { updated, skipped });
      } catch (err) {
        console.error('[admin/athletes/sync-passwords]', err);
        return sendJson(res, 500, { error: err.message || 'Erro interno.' });
      }
    }
  }

  return sendJson(res, 404, { error: 'Unknown admin section' });
}
