// frontend/api/clubs.js
// Router consolidado — todas as rotas /api/clubs/*
//   GET    /api/clubs                              → lista clubes do usuário
//   POST   /api/clubs                              → cria novo clube
//   POST   /api/clubs/join                         → entrar via código de convite
//   GET    /api/clubs/invite/:code                 → info do clube pelo código
//   GET    /api/clubs/:clubId/members              → lista membros
//   POST   /api/clubs/:clubId/members              → convida membro
//   POST   /api/clubs/:clubId/members/import       → importação em massa
//   GET    /api/clubs/:clubId/settings             → configurações
//   PATCH  /api/clubs/:clubId/settings             → atualiza configurações
//   GET    /api/clubs/:clubId/stats                → estatísticas do clube
//   GET    /api/clubs/:clubId/subscription         → subscription atual
//   PATCH  /api/clubs/:clubId/subscription         → atualiza plano
//   GET    /api/clubs/:clubId/theme                → tema White-Label
//   GET    /api/clubs/:clubId/invoices             → faturas

import {
  createClub,
  addClubMember,
  getClubMembers,
  hashPassword,
} from "../src/services/authService.js";
import {
  getSubscriptionWithUsage,
  createOrUpdateSubscription,
  getClubInvoices,
} from "../src/services/subscriptionService.js";
import prisma from "./_lib/prisma.js";
import {
  handleCors,
  requireAuth,
  requireClubAccess,
  requireRole,
  sendJson,
  methodNotAllowed,
} from "./_lib/authMiddleware.js";
import {
  requireActiveSubscription,
  requireAthleteQuota,
} from "./_lib/subscriptionMiddleware.js";

const MAX_IMPORT_ROWS = 500;
const PLAN_LIMITS = { FREE: 30, BASIC: 100, PRO: 500, ENTERPRISE: 9999 };

function parsePath(url) {
  const parts = url.pathname.split("/").filter(Boolean);
  // parts: [api, clubs, ?seg, ?sub, ?sub2]
  const seg = parts[2] || null;  // clubId | 'join' | 'invite'
  const sub = parts[3] || null;  // 'members' | 'settings' | etc.
  const sub2 = parts[4] || null; // 'import'
  return { seg, sub, sub2 };
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const { seg, sub, sub2 } = parsePath(url);

  // ─── POST /api/clubs/join ──────────────────────────────────────────────────
  if (seg === "join") {
    if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
    const ctx = requireAuth(req, res);
    if (!ctx) return;
    const { inviteCode } = req.body || {};
    if (!inviteCode || typeof inviteCode !== "string") {
      return sendJson(res, 400, { error: "Código de convite obrigatório." });
    }
    try {
      const club = await prisma.club.findFirst({
        where: { inviteCode },
        select: { id: true, name: true, slug: true, allowedEmailDomains: true },
      });
      if (!club) return sendJson(res, 404, { error: "Código de convite inválido." });

      const existing = await prisma.clubMembership.findUnique({
        where: { userId_clubId: { userId: ctx.userId, clubId: club.id } },
      });
      if (existing) {
        if (existing.status === "ACTIVE") return sendJson(res, 409, { error: "Você já é membro deste clube." });
        await prisma.clubMembership.update({ where: { id: existing.id }, data: { status: "ACTIVE" } });
        return sendJson(res, 200, { success: true, message: `Bem-vindo de volta ao ${club.name}!`, clubId: club.id });
      }

      if (club.allowedEmailDomains) {
        const domains = club.allowedEmailDomains.split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
        if (domains.length > 0) {
          const userDomain = ctx.email?.split("@")[1]?.toLowerCase();
          if (!domains.includes(userDomain)) {
            return sendJson(res, 403, { error: `Este clube aceita apenas e-mails dos domínios: ${domains.join(", ")}` });
          }
        }
      }

      const tempCtx = { ...ctx, clubId: club.id };
      const subCheck = await requireActiveSubscription(req, res, tempCtx);
      if (!subCheck) return;
      const quotaCheck = await requireAthleteQuota(req, res, tempCtx);
      if (!quotaCheck) return;

      await prisma.clubMembership.create({
        data: { userId: ctx.userId, clubId: club.id, role: "ATHLETE", status: "ACTIVE" },
      });
      return sendJson(res, 201, { success: true, message: `Bem-vindo ao ${club.name}!`, clubId: club.id, club: { id: club.id, name: club.name, slug: club.slug } });
    } catch (err) {
      console.error("[clubs/join]", err);
      return sendJson(res, 500, { error: "Erro interno." });
    }
  }

  // ─── GET /api/clubs/invite/:code ───────────────────────────────────────────
  if (seg === "invite" && sub) {
    if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
    const code = sub;
    try {
      const club = await prisma.club.findFirst({
        where: { inviteCode: code },
        select: {
          id: true, name: true, slug: true, logoUrl: true, appName: true,
          _count: { select: { members: { where: { status: "ACTIVE" } } } },
        },
      });
      if (!club) return sendJson(res, 404, { error: "Código de convite inválido ou expirado." });
      return sendJson(res, 200, {
        id: club.id, name: club.name, slug: club.slug,
        logoUrl: club.logoUrl, appName: club.appName, memberCount: club._count.members,
      });
    } catch (err) {
      console.error("[clubs/invite]", err);
      return sendJson(res, 500, { error: "Erro interno." });
    }
  }

  // ─── /api/clubs/:clubId/* ──────────────────────────────────────────────────
  if (seg && seg !== "join" && seg !== "invite") {
    const clubId = seg;

    // ── /api/clubs/:clubId/members/import ─────────────────────────────────────
    if (sub === "members" && sub2 === "import") {
      if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
      const ctx = requireClubAccess(req, res, clubId, "GESTOR", "ADMIN");
      if (!ctx) return;
      const subCheck = await requireActiveSubscription(req, res, ctx);
      if (!subCheck) return;

      const { athletes } = req.body || {};
      if (!Array.isArray(athletes) || athletes.length === 0) return sendJson(res, 400, { error: "athletes array is required" });
      if (athletes.length > MAX_IMPORT_ROWS) return sendJson(res, 400, { error: `Maximum ${MAX_IMPORT_ROWS} athletes per import.` });

      const currentCount = await prisma.clubMembership.count({ where: { clubId, status: "ACTIVE" } });
      const sub_ = await prisma.subscription.findUnique({ where: { clubId } });
      const club_ = await prisma.club.findUnique({ where: { id: clubId }, select: { planType: true } });
      const planType = sub_?.planType || club_?.planType || "FREE";
      const remaining = (PLAN_LIMITS[planType] || 30) - currentCount;
      if (athletes.length > remaining) return sendJson(res, 400, { error: `Quota insuficiente. Restam ${remaining} vagas.` });

      const results = { created: 0, skipped: 0, errors: [] };
      for (let i = 0; i < athletes.length; i++) {
        const row = athletes[i];
        try {
          const name = (row.name || "").trim();
          const email = (row.email || "").trim().toLowerCase();
          const cpf = (row.cpf || "").replace(/\D/g, "").trim() || null;
          if (!name || !email) { results.errors.push({ row: i + 1, error: "Nome e e-mail são obrigatórios" }); results.skipped++; continue; }
          if (cpf && cpf.length !== 11) { results.errors.push({ row: i + 1, name, error: `CPF inválido: ${cpf}` }); results.skipped++; continue; }

          let user = await prisma.user.findUnique({ where: { email } });
          if (!user) {
            const passwordHash = await hashPassword(cpf ? cpf.substring(0, 6) : "123456");
            user = await prisma.user.create({ data: { email, name, passwordHash, isActive: true } });
          }

          let profile = await prisma.athleteProfile.findUnique({ where: { userId: user.id } });
          const fields = {
            name, cpf: cpf || undefined, gender: (row.gender || "").toUpperCase() || undefined,
            birthDate: row.birthDate ? new Date(row.birthDate) : undefined,
            category: (row.category || "").trim() || undefined,
            entity: (row.entity || "").trim() || undefined,
            fatherName: (row.fatherName || "").trim() || undefined,
            fatherCpf: (row.fatherCpf || "").replace(/\D/g, "") || undefined,
            motherName: (row.motherName || "").trim() || undefined,
            motherCpf: (row.motherCpf || "").replace(/\D/g, "") || undefined,
          };
          if (profile) {
            await prisma.athleteProfile.update({ where: { id: profile.id }, data: { ...fields, clubId: profile.clubId || clubId } });
          } else {
            await prisma.athleteProfile.create({ data: { userId: user.id, ...fields, clubId, isPublic: true } });
          }

          const existing = await prisma.clubMembership.findFirst({ where: { userId: user.id, clubId } });
          if (!existing) {
            await prisma.clubMembership.create({ data: { userId: user.id, clubId, role: "ATHLETE", status: "ACTIVE", invitedByUserId: ctx.userId } });
          }
          results.created++;
        } catch (err) {
          results.errors.push({ row: i + 1, name: row.name, error: err.code === "P2002" ? "CPF ou e-mail duplicado" : err.message });
          results.skipped++;
        }
      }
      return sendJson(res, 200, { message: `Importação concluída: ${results.created} criados, ${results.skipped} ignorados.`, ...results });
    }

    // ── /api/clubs/:clubId/members ─────────────────────────────────────────────
    if (sub === "members") {
      if (req.method === "GET") {
        const ctx = requireClubAccess(req, res, clubId, "GESTOR", "CLUB_STAFF", "COACH", "ADMIN");
        if (!ctx) return;
        const members = await getClubMembers(clubId, ctx.userId);
        return sendJson(res, 200, { members });
      }
      if (req.method === "POST") {
        const ctx = requireClubAccess(req, res, clubId, "GESTOR", "ADMIN");
        if (!ctx) return;
        const subCheck = await requireActiveSubscription(req, res, ctx);
        if (!subCheck) return;
        const { role: memberRole = "ATHLETE" } = req.body || {};
        if (["ATHLETE", "COACH"].includes(memberRole)) {
          const quotaOk = await requireAthleteQuota(req, res, ctx);
          if (!quotaOk) return;
        }
        const { userId } = req.body || {};
        if (!userId) return sendJson(res, 400, { error: "userId is required" });
        const result = await addClubMember({ clubId, userId, role: memberRole, invitedByUserId: ctx.userId });
        return sendJson(res, 201, result);
      }
      return methodNotAllowed(res, ["GET", "POST"]);
    }

    // ── /api/clubs/:clubId/settings ───────────────────────────────────────────
    if (sub === "settings") {
      const ctx = requireAuth(req, res);
      if (!ctx) return;
      if (ctx.role !== "GESTOR" && ctx.role !== "ADMIN") return sendJson(res, 403, { error: "Apenas gestores podem gerenciar configurações." });
      if (ctx.clubId && ctx.clubId !== clubId && ctx.role !== "ADMIN") return sendJson(res, 403, { error: "Sem permissão para este clube." });

      if (req.method === "GET") {
        const club = await prisma.club.findUnique({
          where: { id: clubId },
          select: { id: true, name: true, slug: true, appName: true, logoUrl: true, inviteCode: true, allowedEmailDomains: true, defaultVisibility: true, defaultScoreMode: true, termsText: true, termsPdfUrl: true, themeConfig: true },
        });
        if (!club) return sendJson(res, 404, { error: "Clube não encontrado." });
        return sendJson(res, 200, { appName: club.appName || "", logoUrl: club.logoUrl || "", inviteCode: club.inviteCode || "", allowedEmailDomains: club.allowedEmailDomains || "", defaultVisibility: club.defaultVisibility || "CLUB", defaultScoreMode: club.defaultScoreMode || "MANUAL", termsText: club.termsText || "", termsPdfUrl: club.termsPdfUrl || "", themeConfig: club.themeConfig || null });
      }
      if (req.method === "PATCH") {
        const { appName, logoUrl, allowedEmailDomains, defaultVisibility, defaultScoreMode, termsText, termsPdfUrl, themeConfig } = req.body || {};
        const updateData = {};
        if (appName !== undefined) updateData.appName = appName;
        if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
        if (allowedEmailDomains !== undefined) updateData.allowedEmailDomains = allowedEmailDomains;
        if (defaultVisibility !== undefined) {
          if (!["PUBLIC", "CLUB", "PLAYERS_ONLY"].includes(defaultVisibility)) return sendJson(res, 400, { error: "Visibilidade inválida." });
          updateData.defaultVisibility = defaultVisibility;
        }
        if (defaultScoreMode !== undefined) updateData.defaultScoreMode = defaultScoreMode;
        if (termsText !== undefined) updateData.termsText = termsText;
        if (termsPdfUrl !== undefined) updateData.termsPdfUrl = termsPdfUrl;
        if (themeConfig !== undefined) updateData.themeConfig = themeConfig;
        const updated = await prisma.club.update({ where: { id: clubId }, data: updateData, select: { id: true, name: true, slug: true, appName: true, logoUrl: true, themeConfig: true } });
        return sendJson(res, 200, { success: true, club: updated });
      }
      return sendJson(res, 405, { error: "Method not allowed" });
    }

    // ── /api/clubs/:clubId/stats ───────────────────────────────────────────────
    if (sub === "stats") {
      if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
      const ctx = requireClubAccess(req, res, clubId, "GESTOR", "ADMIN");
      if (!ctx) return;
      const [totalMembers, matchesByStatus, tournamentsByStatus, recentMatches, recentMembers] = await Promise.all([
        prisma.clubMembership.count({ where: { clubId, status: "ACTIVE" } }),
        prisma.match.groupBy({ by: ["status"], where: { clubId }, _count: { id: true } }),
        prisma.tournament.groupBy({ by: ["status"], where: { clubId }, _count: { id: true } }),
        prisma.match.findMany({ where: { clubId }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, playerP1: true, playerP2: true, status: true, score: true, format: true, createdAt: true, visibility: true } }),
        prisma.clubMembership.findMany({ where: { clubId, role: { not: "ADMIN" }, userId: { not: ctx.userId } }, orderBy: { joinedAt: "desc" }, take: 5, include: { user: { select: { id: true, email: true, name: true } } } }),
      ]);
      return sendJson(res, 200, {
        totalMembers,
        totalMatches: matchesByStatus.reduce((s, g) => s + g._count.id, 0),
        matchesByStatus: matchesByStatus.map((g) => ({ status: g.status, count: g._count.id })),
        totalTournaments: tournamentsByStatus.reduce((s, g) => s + g._count.id, 0),
        tournamentsByStatus: tournamentsByStatus.map((g) => ({ status: g.status, count: g._count.id })),
        recentMatches,
        recentMembers: recentMembers.map((m) => ({ id: m.id, userId: m.userId, name: m.user.name, email: m.user.email, role: m.role, status: m.status, joinedAt: m.joinedAt })),
      });
    }

    // ── /api/clubs/:clubId/subscription ───────────────────────────────────────
    if (sub === "subscription") {
      if (req.method === "GET") {
        const ctx = requireClubAccess(req, res, clubId, "GESTOR", "ADMIN");
        if (!ctx) return;
        const data = await getSubscriptionWithUsage(clubId);
        if (!data) return sendJson(res, 404, { error: "Club not found" });
        return sendJson(res, 200, data);
      }
      if (req.method === "PATCH") {
        const ctx = requireClubAccess(req, res, clubId, "GESTOR", "ADMIN");
        if (!ctx) return;
        const { planType, billingCycle } = req.body || {};
        if (!planType || !["FREE", "PREMIUM", "ENTERPRISE"].includes(planType)) return sendJson(res, 400, { error: "planType must be FREE, PREMIUM, or ENTERPRISE" });
        if (billingCycle && !["MONTHLY", "QUARTERLY", "YEARLY"].includes(billingCycle)) return sendJson(res, 400, { error: "billingCycle must be MONTHLY, QUARTERLY, or YEARLY" });
        if (ctx.role !== "ADMIN" && planType === "FREE") return sendJson(res, 403, { error: "Only platform admin can downgrade to FREE plan" });
        const subscription = await createOrUpdateSubscription({ clubId, planType, billingCycle: billingCycle || "MONTHLY" });
        return sendJson(res, 200, { message: `Plan updated to ${planType}`, subscription });
      }
      return methodNotAllowed(res, ["GET", "PATCH"]);
    }

    // ── /api/clubs/:clubId/theme ───────────────────────────────────────────────
    if (sub === "theme") {
      if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
      const club = await prisma.club.findFirst({
        where: { OR: [{ slug: clubId.toLowerCase() }, { id: clubId }] },
        select: { id: true, name: true, slug: true, logoUrl: true, themeConfig: true },
      });
      if (!club) return sendJson(res, 404, { error: "Club not found" });
      const themeConfig = typeof club.themeConfig === "string" ? JSON.parse(club.themeConfig) : club.themeConfig;
      res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
      return sendJson(res, 200, { theme: { name: club.name, logoUrl: club.logoUrl || null, colors: themeConfig?.colors || {}, fontFamily: themeConfig?.fontFamily || null, defaultCourtType: themeConfig?.defaultCourtType || null }, clubId: club.id });
    }

    // ── /api/clubs/:clubId/invoices ────────────────────────────────────────────
    if (sub === "invoices") {
      if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
      const ctx = requireClubAccess(req, res, clubId, "GESTOR", "ADMIN");
      if (!ctx) return;
      const limit = parseInt(url.searchParams.get("limit") || "20", 10);
      const offset = parseInt(url.searchParams.get("offset") || "0", 10);
      const invoices = await getClubInvoices(clubId, { limit, offset });
      return sendJson(res, 200, { invoices, pagination: { limit, offset, total: invoices.length } });
    }
  }

  // ─── /api/clubs (root) ────────────────────────────────────────────────────
  const ctx = requireAuth(req, res);
  if (!ctx) return;

  if (req.method === "GET") {
    try {
      const memberships = await prisma.clubMembership.findMany({
        where: { userId: ctx.userId },
        include: { club: { select: { id: true, name: true, slug: true, logoUrl: true, planType: true, createdAt: true } } },
        orderBy: { joinedAt: "asc" },
      });
      return sendJson(res, 200, memberships.map((m) => ({ ...m.club, role: m.role, joinedAt: m.joinedAt })));
    } catch (err) {
      console.error("[clubs GET]", err);
      return sendJson(res, 500, { error: "Internal server error" });
    }
  }

  if (req.method === "POST") {
    try {
      const { name, slug } = req.body || {};
      if (!name || !slug) return sendJson(res, 400, { error: "name and slug are required" });
      const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      if (normalizedSlug.length < 3) return sendJson(res, 400, { error: "slug must be at least 3 characters" });
      const club = await createClub({ name, slug: normalizedSlug, userId: ctx.userId });
      return sendJson(res, 201, club);
    } catch (err) {
      console.error("[clubs POST]", err);
      return sendJson(res, 500, { error: "Internal server error" });
    }
  }

  return methodNotAllowed(res, ["GET", "POST"]);
}
