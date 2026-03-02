/**
 * Servidor de desenvolvimento para o frontend
 * Usa banco de dados real (racket_mvp) para desenvolvimento local
 *
 * ⚠️  ARQUITETURA IMPORTANTE — LEIA ANTES DE EDITAR:
 * Este servidor delega a lógica de negócio ao matchService.js (ESM) via import() dinâmico.
 * NÃO reimplemente lógica aqui — qualquer mudança no schema/service já reflete automaticamente.
 *
 * Para adicionar um NOVO CAMPO à tela "Minhas Partidas":
 *   1. Adicione ao prisma/schema.prisma
 *   2. Rode: npx prisma migrate dev --name <nome>  (com DATABASE_URL setado)
 *   3. Adicione ao getVisibleMatches() em matchService.js (select + return)
 *   4. Adicione à interface MatchData em MatchesContext.tsx
 *   5. Adicione a MATCH_SELECT_FULL e formatMatchFromDB() neste arquivo
 *   Pronto — o dev-server pega automaticamente via matchService.
 */

const express = require("express");
const cors = require("cors");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
require("dotenv").config({ path: path.join(__dirname, ".env.development") });

const app = express();
const PORT = 3001;

// Inicializar Prisma (compartilhado via globalThis para evitar múltiplas instâncias)
let prisma;
if (globalThis.__prisma) {
  prisma = globalThis.__prisma;
} else {
  prisma = new PrismaClient({ log: ["query", "error"] });
  globalThis.__prisma = prisma;
}

// ─── Cache dos serviços ESM ──────────────────────────────────────────────────
// As rotas principais delegam aos services (fonte da verdade)
let _matchService = null;
async function getMatchService() {
  if (!_matchService) {
    _matchService = await import("./src/services/matchService.js");
  }
  return _matchService;
}

let _authService = null;
async function getAuthService() {
  if (!_authService) {
    _authService = await import("./src/services/authService.js");
  }
  return _authService;
}

// Helper: extrai JWT do header Authorization e retorna payload (ou null)
async function extractCtx(req) {
  const auth = req.headers?.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  const svc = await getAuthService();
  const result = svc.verifyToken(auth.split(" ")[1]);
  return result.valid ? result.payload : null;
}

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "dist")));

// ─── Select completo para Prisma ─────────────────────────────────────────────
// REGRA: ao adicionar campo ao schema.prisma, adicione aqui também.
const MATCH_SELECT_FULL = {
  id: true,
  sportType: true,
  format: true,
  courtType: true,
  nickname: true,
  playerP1: true,
  playerP2: true,
  status: true,
  score: true,
  winner: true,
  apontadorEmail: true,
  playersEmails: true,
  matchState: true,
  completedSets: true,
  createdAt: true,
  updatedAt: true,
};

// ─── Função auxiliar: formata partida do banco para a API ────────────────────
// REGRA: inclua TODOS os campos do schema.prisma aqui.
function formatMatchFromDB(match) {
  let matchState = null;
  try {
    matchState = match.matchState ? JSON.parse(match.matchState) : null;
  } catch (e) {
    console.warn(
      `Erro ao parsear matchState da partida ${match.id}:`,
      e.message,
    );
    matchState = {};
  }

  let completedSets = [];
  try {
    completedSets = JSON.parse(match.completedSets || "[]");
  } catch (e) {
    console.warn(
      `Erro ao parsear completedSets da partida ${match.id}:`,
      e.message,
    );
    completedSets = [];
  }

  return {
    id: match.id,
    sportType: match.sportType || "",
    format: match.format || "",
    courtType: match.courtType || null,
    nickname: match.nickname || null,
    score: match.score || null,
    winner: match.winner || null,
    players: { p1: match.playerP1 || "", p2: match.playerP2 || "" },
    status: match.status || "NOT_STARTED",
    apontadorEmail: match.apontadorEmail || null,
    playersEmails: match.playersEmails || [],
    matchState,
    completedSets,
    createdAt: match.createdAt ? match.createdAt.toISOString() : null,
    updatedAt: match.updatedAt ? match.updatedAt.toISOString() : null,
    visibleTo: matchState?.visibleTo || "both",
  };
}

// ─── Rotas ───────────────────────────────────────────────────────────────────

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Auth ────────────────────────────────────────────────────────────────────

// POST /api/auth/login — usa authService.js real (scrypt + JWT)
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }
    const svc = await getAuthService();
    const result = await svc.loginUser({ email, password });
    res.json(result);
  } catch (err) {
    if (err.message === "INVALID_CREDENTIALS")
      return res.status(401).json({ error: "Invalid email or password" });
    if (err.message === "USER_INACTIVE")
      return res.status(403).json({ error: "User account is inactive" });
    console.error("[POST /api/auth/login]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, name, password } = req.body || {};
    if (!email || !name || !password)
      return res
        .status(400)
        .json({ error: "email, name and password are required" });
    if (password.length < 6)
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    const svc = await getAuthService();
    await svc.registerUser({ email, name, password });
    const result = await svc.loginUser({ email, password });
    res.status(201).json(result);
  } catch (err) {
    if (err.message === "EMAIL_EXISTS")
      return res.status(409).json({ error: "Email already registered" });
    console.error("[POST /api/auth/register]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/switch-club
app.post("/api/auth/switch-club", async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: "Authentication required" });
    const { clubId } = req.body || {};
    if (!clubId) return res.status(400).json({ error: "clubId is required" });
    const svc = await getAuthService();
    const result = await svc.switchClub(ctx.userId, clubId);
    res.json(result);
  } catch (err) {
    if (err.message === "NOT_A_MEMBER")
      return res.status(403).json({ error: "Not a member of this club" });
    console.error("[POST /api/auth/switch-club]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Clubes ──────────────────────────────────────────────────────────────────

// GET /api/clubs — clubes do usuário autenticado
app.get("/api/clubs", async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: "Authentication required" });
    const memberships = await prisma.clubMembership.findMany({
      where: { userId: ctx.userId },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            planType: true,
            createdAt: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
    res.json(
      memberships.map((m) => ({
        ...m.club,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    );
  } catch (err) {
    console.error("[GET /api/clubs]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/clubs — cria novo clube
app.post("/api/clubs", async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: "Authentication required" });
    const { name, slug } = req.body || {};
    if (!name || !slug)
      return res.status(400).json({ error: "name and slug are required" });
    const svc = await getAuthService();
    const club = await svc.createClub({
      name,
      slug,
      creatorUserId: ctx.userId,
    });
    res.status(201).json(club);
  } catch (err) {
    if (err.message === "SLUG_EXISTS")
      return res.status(409).json({ error: "Slug already taken" });
    console.error("[POST /api/clubs]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/clubs/:clubId/members
app.get("/api/clubs/:clubId/members", async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: "Authentication required" });
    const { clubId } = req.params;
    const memberships = await prisma.clubMembership.findMany({
      where: {
        clubId,
        role: { not: "ADMIN" }, // ADMINs são agnósticos a clubes
        userId: { not: ctx.userId }, // não exibir o próprio usuário
      },
      include: {
        user: {
          select: { id: true, email: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
    res.json({ members: memberships });
  } catch (err) {
    console.error("[GET /api/clubs/:clubId/members]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/clubs/:clubId/members — convida membro
app.post("/api/clubs/:clubId/members", async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: "Authentication required" });
    if (!["GESTOR", "ADMIN"].includes(ctx.role))
      return res.status(403).json({ error: "Only GESTOR can invite members" });
    const { clubId } = req.params;
    const { userId, role = "ATHLETE" } = req.body || {};
    if (!userId) return res.status(400).json({ error: "userId is required" });
    const membership = await prisma.clubMembership.create({
      data: {
        userId,
        clubId,
        role,
        status: "ACTIVE",
        invitedByUserId: ctx.userId,
      },
    });
    res.status(201).json(membership);
  } catch (err) {
    if (err.code === "P2002")
      return res.status(409).json({ error: "User is already a member" });
    console.error("[POST /api/clubs/:clubId/members]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/clubs/:clubId/members/import — Importação em massa de atletas
app.post("/api/clubs/:clubId/members/import", async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: "Authentication required" });
    if (!["GESTOR", "ADMIN"].includes(ctx.role))
      return res
        .status(403)
        .json({ error: "Only GESTOR/ADMIN can bulk import" });

    const { clubId } = req.params;
    const { athletes } = req.body || {};

    if (!Array.isArray(athletes) || athletes.length === 0) {
      return res.status(400).json({ error: "athletes array is required" });
    }
    if (athletes.length > 500) {
      return res
        .status(400)
        .json({
          error: `Maximum 500 athletes per import. Received ${athletes.length}.`,
        });
    }

    // Verificar quota
    const currentCount = await prisma.clubMembership.count({
      where: { clubId, status: "ACTIVE" },
    });
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { planType: true },
    });
    const planType = club?.planType || "FREE";
    const PLAN_LIMITS = { FREE: 30, BASIC: 100, PRO: 500, ENTERPRISE: 9999 };
    const maxAthletes = PLAN_LIMITS[planType] || 30;
    const remaining = maxAthletes - currentCount;

    if (athletes.length > remaining) {
      return res.status(400).json({
        error: `Quota insuficiente. Restam ${remaining} vagas, mas foram enviados ${athletes.length} atletas. Plano: ${planType}.`,
      });
    }

    const authSvc = await getAuthService();
    const results = { created: 0, skipped: 0, errors: [] };

    for (let i = 0; i < athletes.length; i++) {
      const row = athletes[i];
      const rowNum = i + 1;

      try {
        const name = (row.name || "").trim();
        const email = (row.email || "").trim().toLowerCase();
        const cpf = (row.cpf || "").replace(/\D/g, "").trim() || null;
        const gender = (row.gender || "").toUpperCase().trim() || null;
        const birthDate = row.birthDate ? new Date(row.birthDate) : null;
        const category = (row.category || "").trim() || null;
        const entity = (row.entity || "").trim() || null;
        const fatherName = (row.fatherName || "").trim() || null;
        const fatherCpf =
          (row.fatherCpf || "").replace(/\D/g, "").trim() || null;
        const motherName = (row.motherName || "").trim() || null;
        const motherCpf =
          (row.motherCpf || "").replace(/\D/g, "").trim() || null;

        if (!name || !email) {
          results.errors.push({
            row: rowNum,
            error: "Nome e e-mail são obrigatórios",
          });
          results.skipped++;
          continue;
        }

        if (cpf && cpf.length !== 11) {
          results.errors.push({
            row: rowNum,
            name,
            error: `CPF inválido: ${cpf}`,
          });
          results.skipped++;
          continue;
        }

        if (birthDate && isNaN(birthDate.getTime())) {
          results.errors.push({
            row: rowNum,
            name,
            error: "Data de nascimento inválida",
          });
          results.skipped++;
          continue;
        }

        // 1) Upsert User
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          const tempPassword = cpf ? cpf.substring(0, 6) : "123456";
          const passwordHash = await authSvc.hashPassword(tempPassword);
          user = await prisma.user.create({
            data: { email, name, passwordHash, isActive: true },
          });
        }

        // 2) Upsert AthleteProfile
        let profile = await prisma.athleteProfile.findUnique({
          where: { userId: user.id },
        });
        if (profile) {
          await prisma.athleteProfile.update({
            where: { id: profile.id },
            data: {
              name,
              cpf: cpf || profile.cpf,
              gender: gender || profile.gender,
              birthDate: birthDate || profile.birthDate,
              category: category || profile.category,
              entity: entity || profile.entity,
              fatherName: fatherName || profile.fatherName,
              fatherCpf: fatherCpf || profile.fatherCpf,
              motherName: motherName || profile.motherName,
              motherCpf: motherCpf || profile.motherCpf,
              clubId: profile.clubId || clubId,
            },
          });
        } else {
          await prisma.athleteProfile.create({
            data: {
              userId: user.id,
              name,
              cpf,
              gender,
              birthDate,
              category,
              entity,
              fatherName,
              fatherCpf,
              motherName,
              motherCpf,
              clubId,
              isPublic: true,
            },
          });
        }

        // 3) Criar ClubMembership se não existe
        const existingMembership = await prisma.clubMembership.findFirst({
          where: { userId: user.id, clubId },
        });
        if (!existingMembership) {
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
        console.error(`[bulk-import] Row ${rowNum} error:`, err);
        if (err.code === "P2002") {
          results.errors.push({
            row: rowNum,
            name: row.name,
            error: "CPF ou e-mail duplicado",
          });
        } else {
          results.errors.push({
            row: rowNum,
            name: row.name,
            error: err.message || "Erro interno",
          });
        }
        results.skipped++;
      }
    }

    return res.json({
      message: `Importação concluída: ${results.created} criados, ${results.skipped} ignorados.`,
      ...results,
    });
  } catch (err) {
    console.error("[POST /api/clubs/:clubId/members/import]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/clubs/:clubId/stats
app.get("/api/clubs/:clubId/stats", async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: "Authentication required" });
    if (ctx.role !== "GESTOR")
      return res.status(403).json({ error: "Only GESTOR can view club stats" });
    const { clubId } = req.params;
    const [
      totalMembers,
      matchesByStatus,
      tournamentsByStatus,
      recentMatches,
      recentMembers,
    ] = await Promise.all([
      prisma.clubMembership.count({
        where: { clubId, status: "ACTIVE" },
      }),
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
          role: { not: "ADMIN" }, // ADMINs são agnósticos a clubes
          userId: { not: ctx.userId }, // não exibir o próprio usuário
        },
        orderBy: { joinedAt: "desc" },
        take: 5,
        include: { user: { select: { id: true, email: true, name: true } } },
      }),
    ]);
    res.json({
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
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt,
      })),
    });
  } catch (err) {
    console.error("[GET /api/clubs/:clubId/stats]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Atletas ─────────────────────────────────────────────────────────────────

// GET /api/athletes?q=...&clubId=...
app.get("/api/athletes", async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: "Authentication required" });
    const q = (req.query.q || "")
      .replace(/[<>'"%;()&+]/g, "")
      .trim()
      .slice(0, 100);
    const filterClubId = req.query.clubId || null;
    const limit = Math.min(parseInt(req.query.limit || "20"), 50);
    const where = {
      isPublic: true,
      ...(q && { name: { contains: q, mode: "insensitive" } }),
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
        userId: true,
      },
    });
    res.json(athletes);
  } catch (err) {
    console.error("[GET /api/athletes]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/athletes — cria perfil de atleta
app.post("/api/athletes", async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: "Authentication required" });
    const { name, nickname, category, gender, clubId } = req.body || {};
    if (!name) return res.status(400).json({ error: "name is required" });
    const profile = await prisma.athleteProfile.create({
      data: {
        name,
        nickname,
        category,
        gender,
        clubId: clubId || ctx.clubId,
        isPublic: true,
      },
    });
    res.status(201).json(profile);
  } catch (err) {
    console.error("[POST /api/athletes]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Admin ───────────────────────────────────────────────────────────────────

// GET /api/admin/stats
app.get("/api/admin/stats", async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: "Authentication required" });
    if (ctx.role !== "ADMIN")
      return res.status(403).json({ error: "Admin access required" });
    const [
      totalUsers,
      totalClubs,
      totalMatches,
      totalTournaments,
      clubsByPlan,
      matchesByStatus,
      tournamentsByStatus,
      membershipsByRole,
      topClubsByMembers,
      recentClubs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.club.count(),
      prisma.match.count(),
      prisma.tournament.count(),
      prisma.club.groupBy({ by: ["planType"], _count: { id: true } }),
      prisma.match.groupBy({ by: ["status"], _count: { id: true } }),
      prisma.tournament.groupBy({ by: ["status"], _count: { id: true } }),
      prisma.clubMembership.groupBy({ by: ["role"], _count: { id: true } }),
      prisma.club.findMany({
        take: 10,
        orderBy: { memberships: { _count: "desc" } },
        select: {
          id: true,
          name: true,
          slug: true,
          planType: true,
          createdAt: true,
          _count: {
            select: { memberships: true, matches: true, tournaments: true },
          },
        },
      }),
      prisma.club.findMany({
        orderBy: { createdAt: "desc" },
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
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const activeUsersLastWeek = await prisma.user.count({
      where: { updatedAt: { gte: oneWeekAgo } },
    });
    res.json({
      totalUsers,
      totalClubs,
      totalMatches,
      totalTournaments,
      activeUsersLastWeek,
      clubsByPlan: clubsByPlan.map((g) => ({
        plan: g.planType,
        count: g._count.id,
      })),
      matchesByStatus: matchesByStatus.map((g) => ({
        status: g.status,
        count: g._count.id,
      })),
      tournamentsByStatus: tournamentsByStatus.map((g) => ({
        status: g.status,
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
        matchCount: c._count.matches,
        tournamentCount: c._count.tournaments,
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
    console.error("[GET /api/admin/stats]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/clubs?limit=20&offset=0&search=...
app.get("/api/admin/clubs", async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: "Authentication required" });
    if (ctx.role !== "ADMIN")
      return res.status(403).json({ error: "Admin access required" });
    const limit = Math.min(parseInt(req.query.limit || "20"), 100);
    const offset = parseInt(req.query.offset || "0");
    const search = req.query.search || "";
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { slug: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};
    const [clubs, total] = await Promise.all([
      prisma.club.findMany({
        where,
        orderBy: { createdAt: "desc" },
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
    res.json({
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
    console.error("[GET /api/admin/clubs]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/users?limit=20&offset=0&search=...
app.get("/api/admin/users", async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: "Authentication required" });
    if (ctx.role !== "ADMIN")
      return res.status(403).json({ error: "Admin access required" });
    const limit = Math.min(parseInt(req.query.limit || "20"), 100);
    const offset = parseInt(req.query.offset || "0");
    const search = req.query.search || "";
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { memberships: true, createdMatches: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);
    res.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        isActive: u.isActive,
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
    console.error("[GET /api/admin/users]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Partidas visíveis — delega ao matchService.js (fonte da verdade)
app.get("/api/matches/visible", async (req, res) => {
  try {
    console.log(
      `[GET /api/matches/visible] Buscando para email: ${req.query.email}`,
    );
    const svc = await getMatchService();
    const result = await svc.getVisibleMatches(req.query);
    console.log(
      `[GET /api/matches/visible] Encontradas ${result.length} partidas`,
    );
    res.json(result);
  } catch (error) {
    console.error("[GET /api/matches/visible] Erro:", error);
    res.status(500).json({ error: "Erro ao buscar partidas visíveis" });
  }
});

// Listar todas as partidas — delega ao matchService.js
app.get("/api/matches", async (req, res) => {
  try {
    const svc = await getMatchService();
    const result = await svc.getAllMatches();
    res.json(result);
  } catch (error) {
    console.error("[GET /api/matches] Erro:", error);
    res.status(500).json({ error: "Erro ao buscar partidas" });
  }
});

// Criar partida — delega ao matchService.js (valida + salva courtType, nickname, etc.)
app.post("/api/matches", async (req, res) => {
  try {
    const svc = await getMatchService();
    const result = await svc.createMatch(req.body);
    console.log(`[POST /api/matches] Partida criada: ${result.id}`);
    res.status(201).json(result);
  } catch (error) {
    console.error("[POST /api/matches] Erro:", error);
    res.status(400).json({ error: error.message || "Erro ao criar partida" });
  }
});

// Buscar estado de uma partida específica
app.get("/api/matches/:id/state", async (req, res) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      select: MATCH_SELECT_FULL,
    });
    if (!match)
      return res.status(404).json({ error: "Partida não encontrada" });
    res.json(formatMatchFromDB(match));
  } catch (error) {
    console.error(`[GET /api/matches/${req.params.id}/state] Erro:`, error);
    res.status(500).json({ error: "Erro ao buscar estado da partida" });
  }
});

// Atualizar estado de uma partida
app.patch("/api/matches/:id/state", async (req, res) => {
  try {
    const { matchState } = req.body;
    let state = {};
    try {
      state =
        typeof matchState === "string"
          ? JSON.parse(matchState)
          : typeof matchState === "object" && matchState !== null
            ? { ...matchState }
            : {};
    } catch (e) {
      console.error(
        `[PATCH /${req.params.id}/state] Erro ao parsear matchState:`,
        e,
      );
    }

    const currentMatch = await prisma.match.findUnique({
      where: { id: req.params.id },
      select: { status: true, matchState: true },
    });
    if (!currentMatch)
      return res.status(404).json({ error: "Partida não encontrada" });

    let status = currentMatch.status || "NOT_STARTED";
    const isFinished = Boolean(
      state?.isFinished || state?.winner || state?.endedAt,
    );
    const inProgress = Boolean(
      state?.startedAt ||
      state?.server ||
      state?.currentGame ||
      state?.currentSetState,
    );
    if (isFinished) status = "FINISHED";
    else if (inProgress && status === "NOT_STARTED") status = "IN_PROGRESS";

    console.log(
      `[PATCH /${req.params.id}/state] Status: ${currentMatch.status} → ${status}`,
    );

    const updated = await prisma.match.update({
      where: { id: req.params.id },
      data: {
        matchState: JSON.stringify(state),
        status,
        updatedAt: new Date(),
      },
      select: MATCH_SELECT_FULL,
    });
    res.json({
      message: "Estado atualizado",
      match: formatMatchFromDB(updated),
    });
  } catch (error) {
    console.error(`[PATCH /api/matches/${req.params.id}/state] Erro:`, error);
    res.status(500).json({ error: "Erro ao atualizar estado da partida" });
  }
});

// Buscar partida específica (rota genérica — deve ficar DEPOIS de /state)
app.get("/api/matches/:id", async (req, res) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      select: MATCH_SELECT_FULL,
    });
    if (!match)
      return res.status(404).json({ error: "Partida não encontrada" });
    res.json(formatMatchFromDB(match));
  } catch (error) {
    console.error(`[GET /api/matches/${req.params.id}] Erro:`, error);
    res.status(500).json({ error: "Erro ao buscar partida" });
  }
});

// Estatísticas de uma partida — delega ao matchService.js
app.get("/api/matches/:id/stats", async (req, res) => {
  try {
    const svc = await getMatchService();
    const stats = await svc.getMatchStats(req.params.id);
    res.json(stats);
  } catch (error) {
    console.error(`[GET /api/matches/${req.params.id}/stats] Erro:`, error);
    // Fallback: retorna stats básicas se o service falhar
    res.json({
      totalPoints: 0,
      player1: {},
      player2: {},
      match: {},
      pointsHistory: [],
    });
  }
});

// Fallback SPA
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Rota de API não encontrada" });
  }
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ─── Iniciar servidor ────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  try {
    await prisma.$connect();
    console.log(`🚀 Servidor de desenvolvimento rodando na porta ${PORT}`);
    console.log(`🗄️  Conectado ao banco de dados racket_mvp`);
    console.log(`🔗 Acesse: http://localhost:${PORT}`);
    const matchCount = await prisma.match.count();
    console.log(`📊 ${matchCount} partidas encontradas no banco`);
    // Pré-carrega o matchService para verificar que não há erros de import
    await getMatchService();
    console.log(`✅ matchService.js carregado com sucesso`);
  } catch (error) {
    console.error("❌ Erro ao iniciar servidor:", error);
    process.exit(1);
  }
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
