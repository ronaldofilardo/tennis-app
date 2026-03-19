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
app.disable("etag"); // Desabilita ETags para evitar respostas 304 com dados desatualizados
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

// POST /api/auth/register-scorer
app.post("/api/auth/register-scorer", async (req, res) => {
  try {
    const { name, email, cpf, phone, birthDate } = req.body || {};
    if (!name?.trim())
      return res.status(400).json({ error: "Nome é obrigatório." });
    const cleanCpf = cpf ? cpf.replace(/\D/g, "").trim() : null;
    if (cleanCpf && cleanCpf.length !== 11)
      return res.status(400).json({ error: "CPF inválido." });
    const loginIdentifier =
      cleanCpf || (email ? email.trim().toLowerCase() : null);
    if (!loginIdentifier)
      return res.status(400).json({ error: "E-mail ou CPF é obrigatório." });
    const existing = await prisma.user.findUnique({
      where: { email: loginIdentifier },
    });
    if (existing)
      return res
        .status(409)
        .json({ error: "Este CPF/e-mail já está cadastrado." });
    function derivarSenhaPure(birthDateRaw, cleanCpfVal) {
      if (birthDateRaw) {
        let dd, mm, yyyy;
        if (
          typeof birthDateRaw === "string" &&
          birthDateRaw.match(/^\d{4}-\d{2}-\d{2}$/)
        ) {
          const [year, month, day] = birthDateRaw.split("-");
          dd = String(day).padStart(2, "0");
          mm = String(month).padStart(2, "0");
          yyyy = year;
        } else {
          const d = new Date(birthDateRaw);
          if (!isNaN(d.getTime())) {
            dd = String(d.getUTCDate()).padStart(2, "0");
            mm = String(d.getUTCMonth() + 1).padStart(2, "0");
            yyyy = d.getUTCFullYear();
          }
        }
        if (dd && mm && yyyy) return `${dd}${mm}${yyyy}`;
      }
      return cleanCpfVal ? cleanCpfVal.substring(0, 8) : "12345678";
    }
    const senha = derivarSenhaPure(birthDate || null, cleanCpf);
    const svc = await getAuthService();
    const passwordHash = await svc.hashPassword(senha);
    await prisma.user.create({
      data: {
        email: loginIdentifier,
        name: name.trim(),
        passwordHash,
        isActive: true,
      },
    });
    const result = await svc.loginUser({
      email: loginIdentifier,
      password: senha,
    });
    res.status(201).json(result);
  } catch (err) {
    console.error("[POST /api/auth/register-scorer]", err);
    res.status(500).json({ error: "Erro interno ao cadastrar anotador." });
  }
});

// POST /api/auth/register-athlete-independent
app.post("/api/auth/register-athlete-independent", async (req, res) => {
  try {
    const {
      name,
      email,
      cpf,
      phone,
      birthDate,
      gender,
      category,
      nickname,
      ranking,
      entity,
      fatherName,
      fatherCpf,
      motherName,
      motherCpf,
    } = req.body || {};
    if (!name?.trim())
      return res.status(400).json({ error: "Nome é obrigatório." });
    const cleanCpf = cpf ? cpf.replace(/\D/g, "").trim() : null;
    if (cleanCpf && cleanCpf.length !== 11)
      return res.status(400).json({ error: "CPF inválido." });
    if (!birthDate)
      return res
        .status(400)
        .json({ error: "Data de nascimento é obrigatória." });
    const loginIdentifier =
      cleanCpf || (email ? email.trim().toLowerCase() : null);
    if (!loginIdentifier)
      return res.status(400).json({ error: "E-mail ou CPF é obrigatório." });
    const existing = await prisma.user.findUnique({
      where: { email: loginIdentifier },
    });
    if (existing)
      return res
        .status(409)
        .json({ error: "Este CPF/e-mail já está cadastrado." });
    function derivarSenhaPure2(birthDateRaw, cleanCpfVal) {
      if (birthDateRaw) {
        let dd, mm, yyyy;
        if (
          typeof birthDateRaw === "string" &&
          birthDateRaw.match(/^\d{4}-\d{2}-\d{2}$/)
        ) {
          const [year, month, day] = birthDateRaw.split("-");
          dd = String(day).padStart(2, "0");
          mm = String(month).padStart(2, "0");
          yyyy = year;
        } else {
          const d = new Date(birthDateRaw);
          if (!isNaN(d.getTime())) {
            dd = String(d.getUTCDate()).padStart(2, "0");
            mm = String(d.getUTCMonth() + 1).padStart(2, "0");
            yyyy = d.getUTCFullYear();
          }
        }
        if (dd && mm && yyyy) return `${dd}${mm}${yyyy}`;
      }
      return cleanCpfVal ? cleanCpfVal.substring(0, 8) : "12345678";
    }
    const senha = derivarSenhaPure2(birthDate, cleanCpf);
    const svc = await getAuthService();
    const passwordHash = await svc.hashPassword(senha);
    const parsedBirth = birthDate ? new Date(birthDate) : null;
    const user = await prisma.user.create({
      data: {
        email: loginIdentifier,
        name: name.trim(),
        passwordHash,
        isActive: true,
      },
    });
    await prisma.athleteProfile.create({
      data: {
        userId: user.id,
        name: name.trim(),
        nickname: nickname || null,
        birthDate: parsedBirth,
        phone: phone || null,
        cpf: cleanCpf || null,
        gender: gender || null,
        category: category || null,
        ranking: ranking ? Number(ranking) : null,
        entity: entity || null,
        fatherName: fatherName || null,
        fatherCpf: fatherCpf ? fatherCpf.replace(/\D/g, "") : null,
        motherName: motherName || null,
        motherCpf: motherCpf ? motherCpf.replace(/\D/g, "") : null,
        clubId: null,
        isPublic: true,
      },
    });
    const result = await svc.loginUser({
      email: loginIdentifier,
      password: senha,
    });
    res.status(201).json(result);
  } catch (err) {
    console.error("[POST /api/auth/register-athlete-independent]", err);
    res.status(500).json({ error: "Erro interno ao cadastrar atleta." });
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
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
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
      orderBy: { joinedAt: "asc" },
    });

    // Inclui também atletas convidados sem conta (userId=null) vinculados ao clube
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

    res.json({ members: [...memberships, ...guestMembers] });
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
      return res.status(400).json({
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
        const birthDateRaw = row.birthDate || null;
        const birthDate = birthDateRaw ? new Date(birthDateRaw) : null;
        const category = (row.category || "").trim() || null;
        const entity = (row.entity || "").trim() || null;
        const fatherName = (row.fatherName || "").trim() || null;
        const fatherCpf =
          (row.fatherCpf || "").replace(/\D/g, "").trim() || null;
        const motherName = (row.motherName || "").trim() || null;
        const motherCpf =
          (row.motherCpf || "").replace(/\D/g, "").trim() || null;

        if (!name) {
          results.errors.push({
            row: rowNum,
            error: "Nome é obrigatório",
          });
          results.skipped++;
          continue;
        }

        // Identificador de login: CPF se disponível, senão email
        const loginIdentifier = cpf || email;
        if (!loginIdentifier) {
          results.errors.push({
            row: rowNum,
            name,
            error: "CPF ou e-mail são obrigatórios",
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

        // 1) Upsert User — login via CPF, senha = data de nascimento DDMMYYYY
        function derivarSenha(birthDateRaw, cpf) {
          if (birthDateRaw) {
            let dd, mm, yyyy;
            if (
              typeof birthDateRaw === "string" &&
              birthDateRaw.match(/^\d{4}-\d{2}-\d{2}$/)
            ) {
              const [year, month, day] = birthDateRaw.split("-");
              dd = String(day).padStart(2, "0");
              mm = String(month).padStart(2, "0");
              yyyy = year;
            } else {
              const d = new Date(birthDateRaw);
              if (!isNaN(d.getTime())) {
                dd = String(d.getUTCDate()).padStart(2, "0");
                mm = String(d.getUTCMonth() + 1).padStart(2, "0");
                yyyy = d.getUTCFullYear();
              }
            }
            if (dd && mm && yyyy) return `${dd}${mm}${yyyy}`;
          }
          return cpf ? cpf.substring(0, 8) : "12345678";
        }

        const novaSenha = derivarSenha(birthDateRaw, cpf);
        let user = await prisma.user.findUnique({
          where: { email: loginIdentifier },
        });
        if (!user) {
          const passwordHash = await authSvc.hashPassword(novaSenha);
          user = await prisma.user.create({
            data: {
              email: loginIdentifier,
              name,
              passwordHash,
              isActive: true,
            },
          });
        } else if (birthDateRaw) {
          // Atualizar senha para formato DDMMYYYY caso tenha sido registrado com senha antiga
          const passwordHash = await authSvc.hashPassword(novaSenha);
          await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash },
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

// POST /api/clubs/:clubId/athletes — cadastro manual de atleta/técnico pelo gestor
app.post("/api/clubs/:clubId/athletes", async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: "Authentication required" });
    if (!["GESTOR", "ADMIN"].includes(ctx.role))
      return res
        .status(403)
        .json({ error: "Apenas GESTOR/ADMIN pode cadastrar atletas" });

    const { clubId } = req.params;
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
      return res.status(400).json({ error: "Nome é obrigatório" });

    const VALID_ROLES = ["ATHLETE", "COACH", "SPECTATOR"];
    if (!VALID_ROLES.includes(role))
      return res.status(400).json({ error: "Papel inválido" });

    const cleanCpf = cpf ? cpf.replace(/\D/g, "").trim() : null;
    if (cleanCpf && cleanCpf.length !== 11)
      return res
        .status(400)
        .json({ error: "CPF inválido (deve ter 11 dígitos)" });

    // ─── Helper: Deriva senha a partir da data de nascimento ───
    function derivarSenha(birthDate, cleanCpf) {
      if (birthDate) {
        let dd, mm, yyyy;
        if (
          typeof birthDate === "string" &&
          birthDate.match(/^\d{4}-\d{2}-\d{2}$/)
        ) {
          // ISO format: YYYY-MM-DD
          const [year, month, day] = birthDate.split("-");
          dd = String(day).padStart(2, "0");
          mm = String(month).padStart(2, "0");
          yyyy = year;
        } else {
          // Tentar com Date object
          const d = new Date(birthDate);
          if (!isNaN(d.getTime())) {
            dd = String(d.getUTCDate()).padStart(2, "0");
            mm = String(d.getUTCMonth() + 1).padStart(2, "0");
            yyyy = d.getUTCFullYear();
          }
        }
        if (dd && mm && yyyy) {
          return `${dd}${mm}${yyyy}`;
        }
      }
      return cleanCpf ? cleanCpf.substring(0, 8) : "12345678";
    }

    const authSvc = await getAuthService();

    // ─── Fluxo COACH: cria User + ClubMembership, sem AthleteProfile ───
    if (role === "COACH") {
      if (!email || !email.trim())
        return res
          .status(400)
          .json({ error: "E-mail é obrigatório para técnicos." });

      const cleanEmail = email.trim().toLowerCase();
      let coachUser = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });
      if (!coachUser) {
        const passwordHash = await authSvc.hashPassword(cleanEmail);
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
        return res
          .status(409)
          .json({ error: "Técnico já vinculado a este clube." });

      const membership = await prisma.clubMembership.create({
        data: {
          userId: coachUser.id,
          clubId,
          role: "COACH",
          status: "ACTIVE",
          invitedByUserId: ctx.userId,
        },
      });
      return res.status(201).json({
        id: coachUser.id,
        name: coachUser.name,
        email: coachUser.email,
        role: membership.role,
        membershipId: membership.id,
      });
    }

    // ─── Fluxo ATHLETE / SPECTATOR: cria User (login via CPF) + AthleteProfile + ClubMembership ───
    let userId = null;
    const loginIdentifier =
      cleanCpf || (email ? email.trim().toLowerCase() : null);

    if (loginIdentifier) {
      const novaSenha = derivarSenha(birthDate, cleanCpf);
      let user = await prisma.user.findUnique({
        where: { email: loginIdentifier },
      });
      if (!user) {
        const passwordHash = await authSvc.hashPassword(novaSenha);
        user = await prisma.user.create({
          data: {
            email: loginIdentifier, // CPF como identificador único de login para atletas
            name: name.trim(),
            passwordHash,
            isActive: true,
          },
        });
      } else if (birthDate) {
        // Atualizar senha para formato DDMMYYYY caso tenha sido registrado com senha antiga
        const passwordHash = await authSvc.hashPassword(novaSenha);
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

    return res.status(201).json({
      ...profile,
      globalIdDisplay: `[${profile.globalId.slice(0, 8).toUpperCase()}]`,
    });
  } catch (err) {
    console.error("[POST /api/clubs/:clubId/athletes]", err);
    if (err.code === "P2002")
      return res.status(409).json({ error: "CPF ou e-mail já cadastrado" });
    res.status(500).json({ error: "Erro interno ao cadastrar atleta" });
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
  } catch (err) {
    console.error("[GET /api/clubs/:clubId/stats]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Atletas ─────────────────────────────────────────────────────────────────

// GET /api/athletes?q=...&clubId=...&limit=...
// Endpoint PÚBLICO — permite acesso anônimo (para Scorer Avulso)
app.get("/api/athletes", async (req, res) => {
  try {
    const ctx = await extractCtx(req); // pode ser null para anônimos
    const q = (req.query.q || "")
      .replace(/[<>'"%;()&+]/g, "")
      .trim()
      .slice(0, 100);
    const filterClubId = req.query.clubId || null;
    const excludeUserId = req.query.excludeUserId || null;
    const excludeAthleteId = req.query.excludeAthleteId || null;
    const limit = Math.min(parseInt(req.query.limit || "20"), 200); // Aumentado para 200
    const notClauses = [
      ...(excludeUserId ? [{ userId: excludeUserId }] : []),
      ...(excludeAthleteId ? [{ id: excludeAthleteId }] : []),
    ];
    const where = {
      isPublic: true,
      ...(q && {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { globalId: { contains: q, mode: "insensitive" } },
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
      orderBy: { name: "asc" },
      select: {
        id: true,
        globalId: true,
        name: true,
        nickname: true,
        clubId: true,
        category: true,
        gender: true,
        ranking: true,
        userId: true,
        user: { select: { name: true } },
      },
    });
    // Busca nomes dos clubes separadamente (AthleteProfile não tem relação direta com Club no schema)
    const clubIds = [...new Set(athletes.map((a) => a.clubId).filter(Boolean))];
    const clubs =
      clubIds.length > 0
        ? await prisma.club.findMany({
            where: { id: { in: clubIds } },
            select: { id: true, name: true },
          })
        : [];
    const clubMap = Object.fromEntries(clubs.map((c) => [c.id, c.name]));
    // Anônimos não veem userId (privacidade), mas veem clubName
    // Usa User.name como nome canônico (mesmo exibido no Gestor); AthleteProfile.name como fallback
    const response = athletes.map((a) => ({
      id: a.id,
      globalId: a.globalId,
      name: a.user?.name ?? a.name,
      nickname: a.nickname,
      category: a.category,
      gender: a.gender,
      ranking: a.ranking,
      clubName: a.clubId ? (clubMap[a.clubId] ?? null) : null,
      ...(ctx ? { clubId: a.clubId, userId: a.userId } : {}),
    }));
    res.json(response);
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

// PATCH /api/athletes/:id — edita perfil de atleta (gestor do clube ou próprio atleta)
app.patch("/api/athletes/:id", async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: "Authentication required" });
    const { id } = req.params;
    const athlete = await prisma.athleteProfile.findUnique({ where: { id } });
    if (!athlete) return res.status(404).json({ error: "Athlete not found" });

    const isSelf = athlete.userId && athlete.userId === ctx.userId;
    const isGestorOfClub =
      (ctx.role === "GESTOR" && ctx.clubId === athlete.clubId) ||
      ctx.role === "ADMIN";
    if (!isSelf && !isGestorOfClub)
      return res.status(403).json({
        error:
          "Apenas o gestor do clube pode editar perfis de atletas e técnicos.",
      });

    const { name, nickname, birthDate, phone, category, gender, ranking } =
      req.body || {};
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (nickname !== undefined) updateData.nickname = nickname?.trim() || null;
    if (birthDate !== undefined)
      updateData.birthDate = birthDate ? new Date(birthDate) : null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (category !== undefined) updateData.category = category?.trim() || null;
    if (gender !== undefined) updateData.gender = gender || null;
    if (ranking !== undefined)
      updateData.ranking = ranking ? parseInt(ranking) : null;

    const updated = await prisma.athleteProfile.update({
      where: { id },
      data: updateData,
    });
    res.json(updated);
  } catch (err) {
    console.error("[PATCH /api/athletes/:id]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/clubs/:clubId/members/:membershipId/profile — gestor edita dados de membro
app.patch(
  "/api/clubs/:clubId/members/:membershipId/profile",
  async (req, res) => {
    try {
      const ctx = await extractCtx(req);
      if (!ctx)
        return res.status(401).json({ error: "Authentication required" });
      const { clubId, membershipId } = req.params;
      if (
        ctx.role !== "ADMIN" &&
        (ctx.role !== "GESTOR" || ctx.clubId !== clubId)
      )
        return res.status(403).json({
          error: "Apenas o gestor do clube pode editar dados de membros.",
        });

      const membership = await prisma.clubMembership.findUnique({
        where: { id: membershipId },
      });
      if (!membership || membership.clubId !== clubId)
        return res.status(404).json({ error: "Membership não encontrada." });

      const { name, email } = req.body || {};
      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (email !== undefined) updateData.email = email.trim().toLowerCase();

      const updatedUser = await prisma.user.update({
        where: { id: membership.userId },
        data: updateData,
        select: { id: true, name: true, email: true },
      });
      res.json({ success: true, user: updatedUser });
    } catch (err) {
      console.error(
        "[PATCH /api/clubs/:clubId/members/:membershipId/profile]",
        err,
      );
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

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

// POST /api/admin/clubs — cria novo clube + gestor
app.post("/api/admin/clubs", async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: "Authentication required" });
    if (ctx.role !== "ADMIN")
      return res.status(403).json({ error: "Admin access required" });

    const {
      name,
      slug,
      planType = "FREE",
      gestorName,
      gestorEmail,
      gestorPassword,
      alsoCoach = false,
    } = req.body || {};

    if (!name || !name.trim())
      return res.status(400).json({ error: "Nome do clube é obrigatório." });
    if (!gestorName || !gestorName.trim())
      return res.status(400).json({ error: "Nome do gestor é obrigatório." });
    if (!gestorEmail || !gestorEmail.trim())
      return res.status(400).json({ error: "E-mail do gestor é obrigatório." });
    if (!gestorPassword || gestorPassword.length < 6)
      return res
        .status(400)
        .json({ error: "Senha do gestor deve ter ao menos 6 caracteres." });

    const cleanEmail = gestorEmail.trim().toLowerCase();
    const clubSlug = slug
      ? slug
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
      : name
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

    // Verificar slug único
    const slugExists = await prisma.club.findUnique({
      where: { slug: clubSlug },
    });
    if (slugExists)
      return res
        .status(409)
        .json({ error: `Slug "${clubSlug}" já está em uso.` });

    const authSvc = await getAuthService();
    const passwordHash = await authSvc.hashPassword(gestorPassword);

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
          role: "GESTOR",
          status: "ACTIVE",
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

    res.status(201).json({
      club: result.club,
      gestor: result.gestor,
      alsoCoach: result.membership.alsoCoach,
    });
  } catch (err) {
    console.error("[POST /api/admin/clubs]", err);
    if (err.code === "P2002")
      return res
        .status(409)
        .json({ error: "E-mail do gestor ou slug já cadastrado." });
    res.status(500).json({ error: err.message || "Internal server error" });
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
    const ctx = await extractCtx(req);
    const svc = await getMatchService();
    const matchData = {
      ...req.body,
      clubId: ctx?.clubId || req.body.clubId || null,
      createdByUserId: ctx?.userId || null,
    };
    const result = await svc.createMatch(matchData);
    console.log(
      `[POST /api/matches] Partida criada: ${result.id} (clubId: ${matchData.clubId})`,
    );
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

// Sistema de revisão removido na migration 20260317180000_remove_scorer_review_system

// GET /api/matches/:id/reviews — removido, retorna vazio para compatibilidade
app.get("/api/matches/:id/reviews", async (req, res) => {
  const ctx = await extractCtx(req);
  if (!ctx) return res.status(401).json({ error: "Authentication required" });
  return res.json([]);
});

// PATCH /api/matches/:id/reviews/:reviewId — removido
app.patch("/api/matches/:id/reviews/:reviewId", (_req, res) => {
  return res.status(410).json({ error: "Sistema de revisão removido" });
});

// GET /api/reviews/pending — removido, retorna vazio para compatibilidade
app.get("/api/reviews/pending", async (req, res) => {
  const ctx = await extractCtx(req);
  if (!ctx) return res.status(401).json({ error: "Authentication required" });
  return res.json([]);
});

// POST /api/matches/download-review — removido
app.post("/api/matches/download-review", (_req, res) => {
  return res.status(410).json({ error: "Sistema de revisão removido" });
});

// DELETE /api/matches/:id/local-only — remove cópia privada (central intacta)
app.delete("/api/matches/:id/local-only", async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: "Authentication required" });

    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        createdByUserId: true,
      },
    });
    if (!match)
      return res.status(404).json({ error: "Partida não encontrada" });
    if (match.createdByUserId !== ctx.userId)
      return res
        .status(403)
        .json({ error: "Sem permissão para remover esta partida" });

    await prisma.match.delete({ where: { id: req.params.id } });
    res.json({ message: "Cópia local removida com sucesso." });
  } catch (error) {
    console.error("[DELETE /api/matches/:id/local-only] Erro:", error);
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// GET /api/admin/matches/all — lista TODAS as partidas com paginação e filtro por status
app.get("/api/admin/matches/all", async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: "Authentication required" });
    if (ctx.role !== "ADMIN")
      return res.status(403).json({ error: "Acesso negado" });

    const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);
    const offset = parseInt(req.query.offset || "0", 10);
    const status = req.query.status || null;

    const where = status ? { status } : {};

    const [matches, total] = await Promise.all([
      prisma.match.findMany({
        where,
        orderBy: { createdAt: "desc" },
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

    res.json({ matches: formatted, total, limit, offset });
  } catch (error) {
    console.error("[GET /api/admin/matches/all] Erro:", error);
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// GET /api/admin/matches — lista partidas do banco central (com filtro ?status=REJECTED)
app.get("/api/admin/matches", async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: "Authentication required" });
    if (ctx.role !== "ADMIN")
      return res.status(403).json({ error: "Acesso negado" });

    const status = req.query.status || "FINISHED";
    const matches = await prisma.match.findMany({
      where: { status },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        playerP1: true,
        playerP2: true,
        score: true,
        winner: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.json({ matches, total: matches.length });
  } catch (error) {
    console.error("[GET /api/admin/matches] Erro:", error);
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// DELETE /api/admin/matches/central/:id — admin remove partida central + cópias privadas
app.delete("/api/admin/matches/central/:id", async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: "Authentication required" });
    if (ctx.role !== "ADMIN")
      return res.status(403).json({ error: "Acesso negado" });

    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });
    if (!match)
      return res.status(404).json({ error: "Partida não encontrada" });

    await prisma.match.delete({ where: { id: req.params.id } });

    res.json({
      message: "Partida central e cópias privadas removidas com sucesso.",
    });
  } catch (error) {
    console.error("[DELETE /api/admin/matches/central/:id] Erro:", error);
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : String(error) });
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
