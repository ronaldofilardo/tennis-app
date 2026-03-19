// frontend/api/clubs.js
// Router consolidado — todas as rotas /api/clubs/*
//   GET    /api/clubs                              → lista clubes do usuário
//   POST   /api/clubs                              → cria novo clube
//   POST   /api/clubs/join                         → entrar via código de convite
//   GET    /api/clubs/invite/:code                 → info do clube pelo código
//   GET    /api/clubs/:clubId/members              → lista membros
//   POST   /api/clubs/:clubId/members              → convida membro
//   POST   /api/clubs/:clubId/members/import       → importação em massa
//   POST   /api/clubs/:clubId/athletes             → cadastro manual (gestor)
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
} from "../../src/services/authService.js";
import { hashPassword, derivarSenha } from "../_lib/passwordUtils.js";
import {
  getSubscriptionWithUsage,
  createOrUpdateSubscription,
  getClubInvoices,
} from "../../src/services/subscriptionService.js";
import prisma from "../_lib/prisma.js";
import {
  handleCors,
  requireAuth,
  requireClubAccess,
  requireRole,
  sendJson,
  methodNotAllowed,
} from "../_lib/authMiddleware.js";
import {
  requireActiveSubscription,
  requireAthleteQuota,
} from "../_lib/subscriptionMiddleware.js";

const MAX_IMPORT_ROWS = 500;
const PLAN_LIMITS = { FREE: 30, BASIC: 100, PRO: 500, ENTERPRISE: 9999 };

function parsePath(url) {
  const parts = url.pathname.split("/").filter(Boolean);
  // parts: [api, clubs, ?seg, ?sub, ?sub2, ?sub3]
  const seg = parts[2] || null; // clubId | 'join' | 'invite'
  const sub = parts[3] || null; // 'members' | 'settings' | etc.
  const sub2 = parts[4] || null; // membershipId | 'import'
  const sub3 = parts[5] || null; // 'confirm' | 'profile'
  return { seg, sub, sub2, sub3 };
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const { seg, sub, sub2, sub3 } = parsePath(url);

  // ─── GET /api/clubs/my-invites ────────────────────────────────────────────
  // Atleta vê todos os convites de clube pendentes para ele
  if (seg === "my-invites") {
    if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
    const ctx = requireAuth(req, res);
    if (!ctx) return;
    try {
      const pending = await prisma.clubMembership.findMany({
        where: { userId: ctx.userId, status: "PENDING" },
        include: {
          club: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { joinedAt: "desc" },
      });
      return sendJson(
        res,
        200,
        pending.map((m) => ({
          id: m.id,
          clubId: m.clubId,
          role: m.role,
          joinedAt: m.joinedAt,
          club: m.club,
        })),
      );
    } catch (err) {
      console.error("[my-invites GET]", err);
      return sendJson(res, 500, { error: "Erro interno." });
    }
  }

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
        select: { id: true, name: true, slug: true },
      });
      if (!club)
        return sendJson(res, 404, { error: "Código de convite inválido." });

      const existing = await prisma.clubMembership.findUnique({
        where: { userId_clubId: { userId: ctx.userId, clubId: club.id } },
      });
      if (existing) {
        if (existing.status === "ACTIVE")
          return sendJson(res, 409, { error: "Você já é membro deste clube." });
        await prisma.clubMembership.update({
          where: { id: existing.id },
          data: { status: "ACTIVE" },
        });
        return sendJson(res, 200, {
          success: true,
          message: `Bem-vindo de volta ao ${club.name}!`,
          clubId: club.id,
        });
      }

      const tempCtx = { ...ctx, clubId: club.id };
      const subCheck = await requireActiveSubscription(req, res, tempCtx);
      if (!subCheck) return;
      const quotaCheck = await requireAthleteQuota(req, res, tempCtx);
      if (!quotaCheck) return;

      await prisma.clubMembership.create({
        data: {
          userId: ctx.userId,
          clubId: club.id,
          role: "ATHLETE",
          status: "ACTIVE",
        },
      });
      return sendJson(res, 201, {
        success: true,
        message: `Bem-vindo ao ${club.name}!`,
        clubId: club.id,
        club: { id: club.id, name: club.name, slug: club.slug },
      });
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
          id: true,
          name: true,
          slug: true,
          _count: { select: { members: { where: { status: "ACTIVE" } } } },
        },
      });
      if (!club)
        return sendJson(res, 404, {
          error: "Código de convite inválido ou expirado.",
        });
      return sendJson(res, 200, {
        id: club.id,
        name: club.name,
        slug: club.slug,
        memberCount: club._count.members,
      });
    } catch (err) {
      console.error("[clubs/invite]", err);
      return sendJson(res, 500, { error: "Erro interno." });
    }
  }

  // ─── /api/clubs/:clubId/* ──────────────────────────────────────────────────
  if (seg && seg !== "join" && seg !== "invite") {
    const clubId = seg;

    // ── POST /api/clubs/:clubId/athletes ──────────────────────────────────────
    // Cadastro manual de um atleta ou técnico pelo gestor (gera globalId automaticamente)
    if (sub === "athletes" && !sub2) {
      if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
      const ctx = requireClubAccess(req, res, clubId, "GESTOR", "ADMIN");
      if (!ctx) return;
      const subCheck = await requireActiveSubscription(req, res, ctx);
      if (!subCheck) return;

      const {
        name,
        email,
        role = "ATHLETE",
        gender,
        cpf,
        birthDate,
        category,
        entity,
        nickname,
        phone,
        ranking,
        fatherName,
        fatherCpf,
        motherName,
        motherCpf,
      } = req.body || {};

      if (!name || !name.trim())
        return sendJson(res, 400, { error: "Nome é obrigatório" });

      const VALID_ROLES = ["ATHLETE", "COACH", "SPECTATOR"];
      if (!VALID_ROLES.includes(role))
        return sendJson(res, 400, { error: "Papel inválido" });

      const cleanCpf = cpf ? cpf.replace(/\D/g, "").trim() : null;
      if (cleanCpf && cleanCpf.length !== 11)
        return sendJson(res, 400, {
          error: "CPF inválido (deve ter 11 dígitos)",
        });

      try {
        // ─── Fluxo COACH: cria User + ClubMembership, sem AthleteProfile ───
        if (role === "COACH") {
          if (!email || !email.trim())
            return sendJson(res, 400, {
              error: "E-mail é obrigatório para técnicos.",
            });

          const cleanEmail = email.trim().toLowerCase();
          let coachUser = await prisma.user.findUnique({
            where: { email: cleanEmail },
          });
          if (!coachUser) {
            const passwordHash = await hashPassword(
              derivarSenha(birthDate, cleanCpf),
            );
            coachUser = await prisma.user.create({
              data: {
                email: cleanEmail,
                name: name.trim(),
                passwordHash,
                isActive: true,
              },
            });
          }

          const existingMembership = await prisma.clubMembership.findFirst({
            where: { userId: coachUser.id, clubId },
          });
          if (existingMembership)
            return sendJson(res, 409, {
              error: "Técnico já vinculado a este clube.",
            });

          const membership = await prisma.clubMembership.create({
            data: {
              userId: coachUser.id,
              clubId,
              role: "COACH",
              status: "ACTIVE",
              invitedByUserId: ctx.userId,
            },
          });
          return sendJson(res, 201, {
            id: coachUser.id,
            name: coachUser.name,
            email: coachUser.email,
            role: membership.role,
            membershipId: membership.id,
          });
        }

        // ─── Fluxo ATHLETE / SPECTATOR: cria User (login via CPF) + AthleteProfile + ClubMembership ───
        let userId = null;
        let user = null;

        // Identificador de login: CPF (sem pontuação) se disponível, senão email
        const loginIdentifier =
          cleanCpf || (email ? email.trim().toLowerCase() : null);

        if (loginIdentifier) {
          const novaSenha = derivarSenha(birthDate, cleanCpf);
          user = await prisma.user.findUnique({
            where: { email: loginIdentifier },
          });
          if (!user) {
            const passwordHash = await hashPassword(novaSenha);
            user = await prisma.user.create({
              data: {
                email: loginIdentifier, // CPF como identificador único de login
                name: name.trim(),
                passwordHash,
                isActive: true,
              },
            });
          } else if (birthDate) {
            // Atualizar senha para o formato DDMMYYYY caso tenha sido registrado com senha antiga
            const passwordHash = await hashPassword(novaSenha);
            await prisma.user.update({
              where: { id: user.id },
              data: { passwordHash },
            });
          }
          userId = user.id;
        }

        const athleteFields = {
          name: name.trim(),
          nickname: nickname?.trim() || null,
          cpf: cleanCpf || null,
          gender: gender ? gender.toUpperCase() : null,
          birthDate: birthDate ? new Date(birthDate) : null,
          category: category?.trim() || null,
          entity: entity?.trim() || null,
          phone: phone?.trim() || null,
          ranking: ranking ? parseInt(String(ranking), 10) : null,
          fatherName: fatherName?.trim() || null,
          fatherCpf: fatherCpf?.replace(/\D/g, "") || null,
          motherName: motherName?.trim() || null,
          motherCpf: motherCpf?.replace(/\D/g, "") || null,
          clubId,
          isPublic: true,
        };

        let profile = userId
          ? await prisma.athleteProfile.findUnique({ where: { userId } })
          : null;

        if (profile) {
          profile = await prisma.athleteProfile.update({
            where: { id: profile.id },
            data: { ...athleteFields, clubId: profile.clubId || clubId },
          });
        } else {
          profile = await prisma.athleteProfile.create({
            data: { userId, ...athleteFields },
          });
        }

        // Cria ou garante vínculo com o clube (apenas se há userId)
        if (userId) {
          const existing = await prisma.clubMembership.findFirst({
            where: { userId, clubId },
          });
          if (!existing) {
            await prisma.clubMembership.create({
              data: {
                userId,
                clubId,
                role,
                status: "ACTIVE",
                invitedByUserId: ctx.userId,
              },
            });
          }
        }

        return sendJson(res, 201, {
          ...profile,
          globalIdDisplay: `[${profile.globalId.slice(0, 8).toUpperCase()}]`,
        });
      } catch (err) {
        console.error("[clubs/:clubId/athletes POST]", err);
        if (err.code === "P2002")
          return sendJson(res, 409, { error: "CPF ou e-mail já cadastrado" });
        return sendJson(res, 500, {
          error: "Erro interno ao cadastrar atleta",
        });
      }
    }

    // ── /api/clubs/:clubId/members/import ─────────────────────────────────────
    if (sub === "members" && sub2 === "import") {
      if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
      const ctx = requireClubAccess(req, res, clubId, "GESTOR", "ADMIN");
      if (!ctx) return;
      const subCheck = await requireActiveSubscription(req, res, ctx);
      if (!subCheck) return;

      const { athletes } = req.body || {};
      if (!Array.isArray(athletes) || athletes.length === 0)
        return sendJson(res, 400, { error: "athletes array is required" });
      if (athletes.length > MAX_IMPORT_ROWS)
        return sendJson(res, 400, {
          error: `Maximum ${MAX_IMPORT_ROWS} athletes per import.`,
        });

      const currentCount = await prisma.clubMembership.count({
        where: { clubId, status: "ACTIVE" },
      });
      const sub_ = await prisma.subscription.findUnique({ where: { clubId } });
      const club_ = await prisma.club.findUnique({
        where: { id: clubId },
        select: { planType: true },
      });
      const planType = sub_?.planType || club_?.planType || "FREE";
      const remaining = (PLAN_LIMITS[planType] || 30) - currentCount;
      if (athletes.length > remaining)
        return sendJson(res, 400, {
          error: `Quota insuficiente. Restam ${remaining} vagas.`,
        });

      const results = { created: 0, skipped: 0, errors: [] };
      for (let i = 0; i < athletes.length; i++) {
        const row = athletes[i];
        try {
          const name = (row.name || "").trim();
          const email = (row.email || "").trim().toLowerCase();
          const cpf = (row.cpf || "").replace(/\D/g, "").trim() || null;
          if (!name || !email) {
            results.errors.push({
              row: i + 1,
              error: "Nome e e-mail são obrigatórios",
            });
            results.skipped++;
            continue;
          }
          if (cpf && cpf.length !== 11) {
            results.errors.push({
              row: i + 1,
              name,
              error: `CPF inválido: ${cpf}`,
            });
            results.skipped++;
            continue;
          }

          let user = await prisma.user.findUnique({ where: { email } });
          if (!user) {
            const passwordHash = await hashPassword(
              cpf ? cpf.substring(0, 6) : "123456",
            );
            user = await prisma.user.create({
              data: { email, name, passwordHash, isActive: true },
            });
          }

          let profile = await prisma.athleteProfile.findUnique({
            where: { userId: user.id },
          });
          const fields = {
            name,
            cpf: cpf || undefined,
            gender: (row.gender || "").toUpperCase() || undefined,
            birthDate: row.birthDate ? new Date(row.birthDate) : undefined,
            category: (row.category || "").trim() || undefined,
            entity: (row.entity || "").trim() || undefined,
            fatherName: (row.fatherName || "").trim() || undefined,
            fatherCpf: (row.fatherCpf || "").replace(/\D/g, "") || undefined,
            motherName: (row.motherName || "").trim() || undefined,
            motherCpf: (row.motherCpf || "").replace(/\D/g, "") || undefined,
          };
          if (profile) {
            await prisma.athleteProfile.update({
              where: { id: profile.id },
              data: { ...fields, clubId: profile.clubId || clubId },
            });
          } else {
            await prisma.athleteProfile.create({
              data: { userId: user.id, ...fields, clubId, isPublic: true },
            });
          }

          const existing = await prisma.clubMembership.findFirst({
            where: { userId: user.id, clubId },
          });
          if (!existing) {
            await prisma.clubMembership.create({
              data: {
                userId: user.id,
                clubId,
                role: "ATHLETE",
                status: "ACTIVE",
                invitedByUserId: ctx.userId,
              },
            });
          }
          results.created++;
        } catch (err) {
          results.errors.push({
            row: i + 1,
            name: row.name,
            error:
              err.code === "P2002" ? "CPF ou e-mail duplicado" : err.message,
          });
          results.skipped++;
        }
      }
      return sendJson(res, 200, {
        message: `Importação concluída: ${results.created} criados, ${results.skipped} ignorados.`,
        ...results,
      });
    }

    // ── /api/clubs/:clubId/members ─────────────────────────────────────────────
    if (sub === "members") {
      // PATCH /api/clubs/:clubId/members/:membershipId/confirm
      // → atleta confirma a inscrição no clube (PENDING → ACTIVE)
      if (sub2 && sub3 !== "profile" && req.method === "PATCH") {
        const membershipId = sub2;
        const ctx = requireAuth(req, res);
        if (!ctx) return;
        try {
          const membership = await prisma.clubMembership.findUnique({
            where: { id: membershipId },
          });
          if (!membership)
            return sendJson(res, 404, { error: "Membership não encontrada." });
          if (membership.userId !== ctx.userId)
            return sendJson(res, 403, {
              error: "Somente o próprio atleta pode confirmar sua inscrição.",
            });
          if (membership.status !== "PENDING")
            return sendJson(res, 400, {
              error: "Inscrição não está pendente.",
            });

          const updated = await prisma.clubMembership.update({
            where: { id: membershipId },
            data: { status: "ACTIVE" },
          });
          return sendJson(res, 200, { success: true, membership: updated });
        } catch (err) {
          console.error("[members/:id PATCH]", err);
          return sendJson(res, 500, { error: "Erro interno." });
        }
      }

      // PATCH /api/clubs/:clubId/members/:membershipId/profile
      // → gestor edita nome/email de um atleta convidado ou técnico
      if (sub2 && sub3 === "profile" && req.method === "PATCH") {
        const membershipId = sub2;
        const ctx = requireClubAccess(req, res, clubId, "GESTOR", "ADMIN");
        if (!ctx) return;
        try {
          const membership = await prisma.clubMembership.findUnique({
            where: { id: membershipId },
            include: { user: { select: { id: true } } },
          });
          if (!membership || membership.clubId !== clubId)
            return sendJson(res, 404, { error: "Membership não encontrada." });

          const { name, email } = req.body || {};
          const updateData = {};
          if (name !== undefined) updateData.name = name.trim();
          if (email !== undefined)
            updateData.email = email.trim().toLowerCase();

          const updatedUser = await prisma.user.update({
            where: { id: membership.userId },
            data: updateData,
            select: { id: true, name: true, email: true },
          });
          return sendJson(res, 200, { success: true, user: updatedUser });
        } catch (err) {
          console.error("[members/:id/profile PATCH]", err);
          return sendJson(res, 500, { error: "Erro interno." });
        }
      }

      if (req.method === "GET") {
        const ctx = requireClubAccess(
          req,
          res,
          clubId,
          "GESTOR",
          "CLUB_STAFF",
          "COACH",
          "ADMIN",
        );
        if (!ctx) return;
        const members = await getClubMembers(clubId, ctx.userId);

        // Inclui atletas convidados sem conta (userId=null) vinculados ao clube
        const guestProfiles = await prisma.athleteProfile.findMany({
          where: { clubId, userId: null },
          orderBy: { createdAt: "asc" },
        });
        const guestMembers = guestProfiles.map((p) => ({
          id: `guest-${p.id}`,
          userId: null,
          clubId,
          role: "ATHLETE",
          status: "ACTIVE",
          joinedAt: p.createdAt,
          isGuest: true,
          user: {
            id: null,
            email: null,
            name: p.name,
            avatarUrl: null,
            athleteProfile: {
              id: p.id,
              globalId: p.globalId,
              cpf: p.cpf,
              birthDate: p.birthDate,
            },
          },
        }));

        return sendJson(res, 200, { members: [...members, ...guestMembers] });
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
        const result = await addClubMember({
          clubId,
          userId,
          role: memberRole,
          invitedByUserId: ctx.userId,
        });
        return sendJson(res, 201, result);
      }
      return methodNotAllowed(res, ["GET", "POST", "PATCH"]);
    }

    // ── /api/clubs/:clubId/pending-invites ─────────────────────────────────────
    // Gestor vê atletas aguardando confirmação
    if (sub === "pending-invites") {
      if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
      const ctx = requireClubAccess(req, res, clubId, "GESTOR", "ADMIN");
      if (!ctx) return;
      try {
        const pending = await prisma.clubMembership.findMany({
          where: { clubId, status: "PENDING" },
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
          orderBy: { joinedAt: "desc" },
        });
        return sendJson(
          res,
          200,
          pending.map((m) => ({
            id: m.id,
            userId: m.userId,
            role: m.role,
            joinedAt: m.joinedAt,
            user: m.user,
          })),
        );
      } catch (err) {
        console.error("[pending-invites GET]", err);
        return sendJson(res, 500, { error: "Erro interno." });
      }
    }

    // ── /api/clubs/:clubId/rankings ───────────────────────────────────────────
    // Rankings intraclubes por sets acumulados
    if (sub === "rankings") {
      if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
      const ctx = requireAuth(req, res);
      if (!ctx) return;
      // Permite GESTOR, ADMIN e membros ACTIVE do clube
      const isSiteAdmin = ctx.role === "ADMIN";
      if (!isSiteAdmin) {
        const membership = await prisma.clubMembership.findFirst({
          where: { clubId, userId: ctx.userId, status: "ACTIVE" },
        });
        if (!membership) {
          return sendJson(res, 403, {
            error: "Apenas membros do clube podem ver o ranking.",
          });
        }
      }
      try {
        const matches = await prisma.match.findMany({
          where: { clubId, status: "FINISHED" },
          select: {
            id: true,
            player1Id: true,
            player2Id: true,
            completedSets: true,
            player1: { select: { id: true, globalId: true, name: true } },
            player2: { select: { id: true, globalId: true, name: true } },
          },
        });

        // Agrega sets por AthleteProfile.globalId
        const statsMap = new Map();

        function ensureEntry(athlete) {
          if (!athlete) return;
          if (!statsMap.has(athlete.globalId)) {
            statsMap.set(athlete.globalId, {
              globalId: athlete.globalId,
              name: athlete.name,
              setsWon: 0,
              matchesPlayed: 0,
              wins: 0,
            });
          }
        }

        for (const match of matches) {
          if (!match.player1 || !match.player2) continue;
          ensureEntry(match.player1);
          ensureEntry(match.player2);

          const p1 = statsMap.get(match.player1.globalId);
          const p2 = statsMap.get(match.player2.globalId);
          p1.matchesPlayed++;
          p2.matchesPlayed++;

          let p1SetsWon = 0;
          let p2SetsWon = 0;

          if (match.completedSets) {
            try {
              const sets = JSON.parse(match.completedSets);
              for (const set of sets) {
                if (set.winner === "PLAYER_1") p1SetsWon++;
                else if (set.winner === "PLAYER_2") p2SetsWon++;
              }
            } catch {
              // completedSets malformado — ignora
            }
          }

          p1.setsWon += p1SetsWon;
          p2.setsWon += p2SetsWon;

          if (p1SetsWon > p2SetsWon) p1.wins++;
          else if (p2SetsWon > p1SetsWon) p2.wins++;
        }

        const rankings = Array.from(statsMap.values()).sort(
          (a, b) =>
            b.setsWon - a.setsWon ||
            b.wins - a.wins ||
            b.matchesPlayed - a.matchesPlayed,
        );

        return sendJson(res, 200, { rankings });
      } catch (err) {
        console.error("[rankings GET]", err);
        return sendJson(res, 500, { error: "Erro interno." });
      }
    }

    // ── /api/clubs/:clubId/stats ───────────────────────────────────────────────
    if (sub === "stats") {
      if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
      const ctx = requireClubAccess(req, res, clubId, "GESTOR", "ADMIN");
      if (!ctx) return;
      const [
        totalMembers,
        matchesByStatus,
        tournamentsByStatus,
        recentMatches,
        recentMembers,
      ] = await Promise.all([
        prisma.clubMembership.count({ where: { clubId, status: "ACTIVE" } }),
        prisma.match.groupBy({
          by: ["status"],
          where: { clubId },
          _count: { id: true },
        }),
        prisma.tournament.groupBy({
          by: ["status"],
          where: { clubId },
          _count: { id: true },
        }),
        prisma.match.findMany({
          where: { clubId },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            playerP1: true,
            playerP2: true,
            status: true,
            score: true,
            format: true,
            createdAt: true,
            visibility: true,
          },
        }),
        prisma.clubMembership.findMany({
          where: {
            clubId,
            role: { not: "ADMIN" },
            userId: { not: ctx.userId },
          },
          orderBy: { joinedAt: "desc" },
          take: 5,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                athleteProfile: {
                  select: {
                    id: true,
                    globalId: true,
                    cpf: true,
                    birthDate: true,
                  },
                },
              },
            },
          },
        }),
      ]);
      res.setHeader("Cache-Control", "no-cache, must-revalidate");
      return sendJson(res, 200, {
        totalMembers,
        totalMatches: matchesByStatus.reduce((s, g) => s + g._count.id, 0),
        matchesByStatus: matchesByStatus.map((g) => ({
          status: g.status,
          count: g._count.id,
        })),
        totalTournaments: tournamentsByStatus.reduce(
          (s, g) => s + g._count.id,
          0,
        ),
        tournamentsByStatus: tournamentsByStatus.map((g) => ({
          status: g.status,
          count: g._count.id,
        })),
        recentMatches,
        recentMembers: recentMembers.map((m) => ({
          id: m.id,
          userId: m.userId,
          clubId: m.clubId,
          role: m.role,
          status: m.status,
          joinedAt: m.joinedAt,
          user: {
            id: m.user.id,
            email: m.user.email,
            name: m.user.name,
            athleteProfile: m.user.athleteProfile,
          },
        })),
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
        if (!planType || !["FREE", "PREMIUM", "ENTERPRISE"].includes(planType))
          return sendJson(res, 400, {
            error: "planType must be FREE, PREMIUM, or ENTERPRISE",
          });
        if (
          billingCycle &&
          !["MONTHLY", "QUARTERLY", "YEARLY"].includes(billingCycle)
        )
          return sendJson(res, 400, {
            error: "billingCycle must be MONTHLY, QUARTERLY, or YEARLY",
          });
        if (ctx.role !== "ADMIN" && planType === "FREE")
          return sendJson(res, 403, {
            error: "Only platform admin can downgrade to FREE plan",
          });
        const subscription = await createOrUpdateSubscription({
          clubId,
          planType,
          billingCycle: billingCycle || "MONTHLY",
        });
        return sendJson(res, 200, {
          message: `Plan updated to ${planType}`,
          subscription,
        });
      }
      return methodNotAllowed(res, ["GET", "PATCH"]);
    }

    // ── /api/clubs/:clubId/invoices ────────────────────────────────────────────
    if (sub === "invoices") {
      if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
      const ctx = requireClubAccess(req, res, clubId, "GESTOR", "ADMIN");
      if (!ctx) return;
      const limit = parseInt(url.searchParams.get("limit") || "20", 10);
      const offset = parseInt(url.searchParams.get("offset") || "0", 10);
      const invoices = await getClubInvoices(clubId, { limit, offset });
      return sendJson(res, 200, {
        invoices,
        pagination: { limit, offset, total: invoices.length },
      });
    }
  }

  // ─── /api/clubs (root) ────────────────────────────────────────────────────
  const ctx = requireAuth(req, res);
  if (!ctx) return;

  if (req.method === "GET") {
    try {
      const memberships = await prisma.clubMembership.findMany({
        where: { userId: ctx.userId },
        include: {
          club: {
            select: {
              id: true,
              name: true,
              slug: true,
              planType: true,
              createdAt: true,
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      });
      return sendJson(
        res,
        200,
        memberships.map((m) => ({
          ...m.club,
          role: m.role,
          joinedAt: m.joinedAt,
        })),
      );
    } catch (err) {
      console.error("[clubs GET]", err);
      return sendJson(res, 500, { error: "Internal server error" });
    }
  }

  if (req.method === "POST") {
    try {
      const { name, slug } = req.body || {};
      if (!name || !slug)
        return sendJson(res, 400, { error: "name and slug are required" });
      const normalizedSlug = slug
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      if (normalizedSlug.length < 3)
        return sendJson(res, 400, {
          error: "slug must be at least 3 characters",
        });
      const club = await createClub({
        name,
        slug: normalizedSlug,
        userId: ctx.userId,
      });
      return sendJson(res, 201, club);
    } catch (err) {
      console.error("[clubs POST]", err);
      return sendJson(res, 500, { error: "Internal server error" });
    }
  }

  return methodNotAllowed(res, ["GET", "POST"]);
}
