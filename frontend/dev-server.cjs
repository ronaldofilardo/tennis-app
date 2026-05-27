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

const express = require('express');
const cors = require('cors');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: path.join(__dirname, '.env.development') });

const app = express();
const PORT = 3001;

// Inicializar Prisma (compartilhado via globalThis para evitar múltiplas instâncias)
let prisma;
if (globalThis.__prisma) {
  prisma = globalThis.__prisma;
} else {
  prisma = new PrismaClient({ log: ['query', 'error'] });
  globalThis.__prisma = prisma;
}

// ─── Cache dos serviços ESM ──────────────────────────────────────────────────
// As rotas principais delegam aos services (fonte da verdade)
let _matchService = null;
async function getMatchService() {
  if (!_matchService) {
    _matchService = await import('./src/services/matchService.ts');
  }
  return _matchService;
}

let _authService = null;
async function getAuthService() {
  if (!_authService) {
    _authService = await import('./src/services/authService.js');
  }
  return _authService;
}

// Helper: extrai JWT do header Authorization e retorna payload (ou null)
async function extractCtx(req) {
  const auth = req.headers?.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const svc = await getAuthService();
  const result = svc.verifyToken(auth.split(' ')[1]);
  return result.valid ? result.payload : null;
}

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.disable('etag'); // Desabilita ETags para evitar respostas 304 com dados desatualizados
app.use(express.static(path.join(__dirname, 'dist')));

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
  createdByUserId: true,
  visibility: true,
  openForAnnotation: true,
};

// ─── Função auxiliar: formata partida do banco para a API ────────────────────
// REGRA: inclua TODOS os campos do schema.prisma aqui.
function formatMatchFromDB(match) {
  let matchState = null;
  try {
    matchState = match.matchState ? JSON.parse(match.matchState) : null;
  } catch (e) {
    console.warn(`Erro ao parsear matchState da partida ${match.id}:`, e.message);
    matchState = {};
  }

  let completedSets = [];
  try {
    completedSets = JSON.parse(match.completedSets || '[]');
  } catch (e) {
    console.warn(`Erro ao parsear completedSets da partida ${match.id}:`, e.message);
    completedSets = [];
  }

  return {
    id: match.id,
    sportType: match.sportType || '',
    format: match.format || '',
    courtType: match.courtType || null,
    nickname: match.nickname || null,
    score: match.score || null,
    winner: match.winner || null,
    players: { p1: match.playerP1 || '', p2: match.playerP2 || '' },
    status: match.status || 'NOT_STARTED',
    apontadorEmail: match.apontadorEmail || null,
    playersEmails: match.playersEmails || [],
    matchState,
    completedSets,
    createdAt: match.createdAt ? match.createdAt.toISOString() : null,
    updatedAt: match.updatedAt ? match.updatedAt.toISOString() : null,
    visibleTo: matchState?.visibleTo || 'both',
    createdByUserId: match.createdByUserId || null,
    visibility: match.visibility || 'PLAYERS_ONLY',
    openForAnnotation: match.openForAnnotation ?? false,
  };
}

// ─── Rotas ───────────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Auth ────────────────────────────────────────────────────────────────────

// POST /api/auth/login — usa authService.js real (scrypt + JWT)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    const svc = await getAuthService();
    const result = await svc.loginUser({ email, password });
    res.json(result);
  } catch (err) {
    if (err.message === 'INVALID_CREDENTIALS')
      return res.status(401).json({ error: 'Invalid email or password' });
    if (err.message === 'USER_INACTIVE')
      return res.status(403).json({ error: 'User account is inactive' });
    console.error('[POST /api/auth/login]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, name, password } = req.body || {};
    if (!email || !name || !password)
      return res.status(400).json({ error: 'email, name and password are required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const svc = await getAuthService();
    await svc.registerUser({ email, name, password });
    const result = await svc.loginUser({ email, password });
    res.status(201).json(result);
  } catch (err) {
    if (err.message === 'EMAIL_EXISTS')
      return res.status(409).json({ error: 'Email already registered' });
    console.error('[POST /api/auth/register]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/register-scorer
app.post('/api/auth/register-scorer', async (req, res) => {
  try {
    const { name, email, cpf, phone, birthDate } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ error: 'Nome é obrigatório.' });
    const cleanCpf = cpf ? cpf.replace(/\D/g, '').trim() : null;
    if (cleanCpf && cleanCpf.length !== 11) return res.status(400).json({ error: 'CPF inválido.' });
    const loginIdentifier = cleanCpf || (email ? email.trim().toLowerCase() : null);
    if (!loginIdentifier) return res.status(400).json({ error: 'E-mail ou CPF é obrigatório.' });
    const existing = await prisma.user.findUnique({
      where: { email: loginIdentifier },
    });
    if (existing) return res.status(409).json({ error: 'Este CPF/e-mail já está cadastrado.' });
    function derivarSenhaPure(birthDateRaw, cleanCpfVal) {
      if (birthDateRaw) {
        let dd, mm, yyyy;
        if (typeof birthDateRaw === 'string' && birthDateRaw.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = birthDateRaw.split('-');
          dd = String(day).padStart(2, '0');
          mm = String(month).padStart(2, '0');
          yyyy = year;
        } else {
          const d = new Date(birthDateRaw);
          if (!isNaN(d.getTime())) {
            dd = String(d.getUTCDate()).padStart(2, '0');
            mm = String(d.getUTCMonth() + 1).padStart(2, '0');
            yyyy = d.getUTCFullYear();
          }
        }
        if (dd && mm && yyyy) return `${dd}${mm}${yyyy}`;
      }
      return cleanCpfVal ? cleanCpfVal.substring(0, 8) : '12345678';
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
        platformRole: 'SCORER',
      },
    });
    const result = await svc.loginUser({
      email: loginIdentifier,
      password: senha,
    });
    res.status(201).json(result);
  } catch (err) {
    console.error('[POST /api/auth/register-scorer]', err);
    res.status(500).json({ error: 'Erro interno ao cadastrar anotador.' });
  }
});

// POST /api/auth/register-athlete-independent
app.post('/api/auth/register-athlete-independent', async (req, res) => {
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
    if (!name?.trim()) return res.status(400).json({ error: 'Nome é obrigatório.' });
    const cleanCpf = cpf ? cpf.replace(/\D/g, '').trim() : null;
    if (cleanCpf && cleanCpf.length !== 11) return res.status(400).json({ error: 'CPF inválido.' });
    if (!birthDate) return res.status(400).json({ error: 'Data de nascimento é obrigatória.' });
    const loginIdentifier = cleanCpf || (email ? email.trim().toLowerCase() : null);
    if (!loginIdentifier) return res.status(400).json({ error: 'E-mail ou CPF é obrigatório.' });
    const existing = await prisma.user.findUnique({
      where: { email: loginIdentifier },
    });
    if (existing) return res.status(409).json({ error: 'Este CPF/e-mail já está cadastrado.' });
    function derivarSenhaPure2(birthDateRaw, cleanCpfVal) {
      if (birthDateRaw) {
        let dd, mm, yyyy;
        if (typeof birthDateRaw === 'string' && birthDateRaw.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = birthDateRaw.split('-');
          dd = String(day).padStart(2, '0');
          mm = String(month).padStart(2, '0');
          yyyy = year;
        } else {
          const d = new Date(birthDateRaw);
          if (!isNaN(d.getTime())) {
            dd = String(d.getUTCDate()).padStart(2, '0');
            mm = String(d.getUTCMonth() + 1).padStart(2, '0');
            yyyy = d.getUTCFullYear();
          }
        }
        if (dd && mm && yyyy) return `${dd}${mm}${yyyy}`;
      }
      return cleanCpfVal ? cleanCpfVal.substring(0, 8) : '12345678';
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
        platformRole: 'INDEPENDENT_ATHLETE',
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
        fatherCpf: fatherCpf ? fatherCpf.replace(/\D/g, '') : null,
        motherName: motherName || null,
        motherCpf: motherCpf ? motherCpf.replace(/\D/g, '') : null,
        isPublic: true,
      },
    });
    const result = await svc.loginUser({
      email: loginIdentifier,
      password: senha,
    });
    res.status(201).json(result);
  } catch (err) {
    console.error('[POST /api/auth/register-athlete-independent]', err);
    res.status(500).json({ error: 'Erro interno ao cadastrar atleta.' });
  }
});

// GET /api/athletes/my — lista atletas criados pelo usuário autenticado
app.get('/api/athletes/my', async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: 'Authentication required' });

    const athletes = await prisma.athleteProfile.findMany({
      where: { createdByUserId: ctx.userId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        nickname: true,
        gender: true,
        age: true,
        ranking: true,
        clubName: true,
        dominance: true,
        backhand: true,
      },
    });
    res.json({ athletes });
  } catch (err) {
    console.error('[GET /api/athletes/my]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/athletes', async (req, res) => {
  try {
    const ctx = await extractCtx(req); // pode ser null para anônimos
    const q = (req.query.q || '')
      .replace(/[<>'"%;()&+]/g, '')
      .trim()
      .slice(0, 100);
    const excludeUserId = req.query.excludeUserId || null;
    const excludeAthleteId = req.query.excludeAthleteId || null;
    const limit = Math.min(parseInt(req.query.limit || '20'), 200); // Aumentado para 200
    const notClauses = [
      ...(excludeUserId ? [{ userId: excludeUserId }] : []),
      ...(excludeAthleteId ? [{ id: excludeAthleteId }] : []),
    ];
    const where = {
      isPublic: true,
      ...(q && {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { globalId: { contains: q, mode: 'insensitive' } },
        ],
      }),
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
        user: { select: { name: true } },
      },
    });
    // Anônimos não veem userId (privacidade)
    // Usa User.name como nome canônico (mesmo exibido no Gestor); AthleteProfile.name como fallback
    const response = athletes.map((a) => ({
      id: a.id,
      globalId: a.globalId,
      name: a.user?.name ?? a.name,
      nickname: a.nickname,
      category: a.category,
      gender: a.gender,
      ranking: a.ranking,
      ...(ctx ? { userId: a.userId } : {}),
    }));
    res.json(response);
  } catch (err) {
    console.error('[GET /api/athletes]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/athletes — cria perfil de atleta
app.post('/api/athletes', async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: 'Authentication required' });
    const { name, nickname, category, gender, age, clubName, dominance, backhand, ranking } =
      req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });

    // Verificar se o usuário existe, se não deixar createdByUserId como NULL
    let createdByUserId = null;
    if (ctx.userId) {
      const userExists = await prisma.user.findUnique({
        where: { id: ctx.userId },
        select: { id: true },
      });
      if (userExists) {
        createdByUserId = ctx.userId;
      } else {
        console.warn(
          `[POST /api/athletes] Usuário ${ctx.userId} não existe, criando atleta sem createdByUserId`,
        );
      }
    }

    const profile = await prisma.athleteProfile.create({
      data: {
        name,
        nickname,
        category,
        gender,
        age: age ? parseInt(age) : null,
        clubName: clubName || null,
        dominance: dominance || null,
        backhand: backhand || null,
        ranking: ranking ? parseInt(ranking) : null,
        isPublic: true,
        createdByUserId,
      },
    });
    res.status(201).json(profile);
  } catch (err) {
    console.error('[POST /api/athletes]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/athletes/:id — edita perfil de atleta (próprio atleta ou admin)
app.patch('/api/athletes/:id', async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: 'Authentication required' });
    const { id } = req.params;
    const athlete = await prisma.athleteProfile.findUnique({ where: { id } });
    if (!athlete) return res.status(404).json({ error: 'Athlete not found' });

    const isSelf = athlete.userId && athlete.userId === ctx.userId;
    const isAdmin = ctx.role === 'ADMIN';
    if (!isSelf && !isAdmin)
      return res.status(403).json({
        error: 'Apenas o próprio atleta ou admin pode editar este perfil.',
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
      where: { id },
      data: updateData,
    });
    res.json(updated);
  } catch (err) {
    console.error('[PATCH /api/athletes/:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Admin ───────────────────────────────────────────────────────────────────

// Criar partida — delega ao matchService.js (valida + salva courtType, nickname, etc.)
app.post('/api/matches', async (req, res) => {
  try {
    const ctx = await extractCtx(req);

    // Verificar se createdByUserId existe no banco antes de passar para createMatch
    let resolvedUserId = null;
    if (ctx?.userId) {
      const userExists = await prisma.user.findUnique({
        where: { id: ctx.userId },
        select: { id: true },
      });
      resolvedUserId = userExists ? ctx.userId : null;
      if (!userExists) {
        console.warn(
          `[POST /api/matches] userId ${ctx.userId} não encontrado no banco — omitindo createdByUserId`,
        );
      }
    }

    const svc = await getMatchService();
    const matchData = {
      ...req.body,
      createdByUserId: resolvedUserId,
    };
    const result = await svc.createMatch(matchData);
    console.log(`[POST /api/matches] Partida criada: ${result.id}`);
    res.status(201).json(result);
  } catch (error) {
    console.error('[POST /api/matches] Erro:', error);
    res.status(400).json({ error: error.message || 'Erro ao criar partida' });
  }
});

// ─── ROTAS ESTÁTICAS (devem vir ANTES de :id) ────────────────────────────────

// GET /api/matches/my-completed — partidas concluídas
app.get('/api/matches/my-completed', async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: 'Authentication required' });

    const profile = await prisma.athleteProfile.findFirst({ where: { userId: ctx.userId } });

    const matches = await prisma.match.findMany({
      where: {
        status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'FINISHED'] },
        OR: [
          { createdByUserId: ctx.userId },
          ...(profile ? [{ player1Id: profile.id }, { player2Id: profile.id }] : []),
          { playersEmails: { has: ctx.email } },
        ],
      },
      select: {
        id: true,
        sportType: true,
        format: true,
        courtType: true,
        playerP1: true,
        playerP2: true,
        status: true,
        createdAt: true,
        createdByUserId: true,
        player1: { select: { id: true, name: true } },
        player2: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    });

    const result = matches.map((m) => ({
      id: m.id,
      sportType: m.sportType,
      format: m.format,
      courtType: m.courtType,
      playerP1: m.playerP1,
      playerP2: m.playerP2,
      status: m.status,
      createdAt: m.createdAt ? m.createdAt.toISOString() : null,
      createdByUserId: m.createdByUserId,
      annotationCount: 0,
      player1: m.player1,
      player2: m.player2,
    }));

    res.json(result);
  } catch (error) {
    console.error('[GET /api/matches/my-completed] Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar partidas concluídas' });
  }
});

// GET /api/matches/annotated-for-me — anotadas onde usuário é jogador
app.get('/api/matches/annotated-for-me', async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: 'Authentication required' });

    const profile = await prisma.athleteProfile.findFirst({ where: { userId: ctx.userId } });

    const matches = await prisma.match.findMany({
      where: {
        annotationSessions: {
          some: {
            OR: [{ status: 'COMPLETED' }, { isActive: false, endedAt: { not: null } }],
          },
        },
        OR: [
          ...(profile ? [{ player1Id: profile.id }, { player2Id: profile.id }] : []),
          { playersEmails: { has: ctx.email } },
          { apontadorEmail: ctx.email },
          { dashboardShares: { some: { targetUserId: ctx.userId } } },
        ],
      },
      select: {
        id: true,
        sportType: true,
        format: true,
        courtType: true,
        playerP1: true,
        playerP2: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        player1: { select: { id: true, name: true } },
        player2: { select: { id: true, name: true } },
        annotationSessions: {
          where: {
            OR: [{ status: 'COMPLETED' }, { isActive: false, endedAt: { not: null } }],
          },
          select: {
            id: true,
            annotatorUserId: true,
            endedAt: true,
            finalStateSnapshot: true,
            annotator: { select: { id: true, name: true } },
          },
          orderBy: { endedAt: 'desc' },
        },
        dashboardShares: {
          where: { targetUserId: ctx.userId },
          orderBy: { notifiedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    });

    const enriched = matches.map((m) => ({
      id: m.id,
      sportType: m.sportType,
      format: m.format,
      courtType: m.courtType,
      playerP1: m.playerP1,
      playerP2: m.playerP2,
      status: m.status,
      createdAt: m.createdAt,
      player1: m.player1,
      player2: m.player2,
      completedAnnotations: m.annotationSessions.map((s) => ({
        id: s.id,
        annotatorId: s.annotatorUserId,
        annotatorName: s.annotator?.name ?? 'Anotador',
        endedAt: s.endedAt,
        hasFinalState: !!s.finalStateSnapshot,
      })),
      comparisonAvailable: m.annotationSessions.length >= 2,
      myShare: m.dashboardShares[0] ?? null,
      isNew: !m.dashboardShares[0] || m.dashboardShares[0].status === 'PENDING',
    }));

    res.json(enriched);
  } catch (error) {
    console.error('[GET /api/matches/annotated-for-me] Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar partidas anotadas para o usuário' });
  }
});

// GET /api/matches/annotated-by-me — anotadas pelo usuário
app.get('/api/matches/annotated-by-me', async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: 'Authentication required' });

    // Cleanup: fechar sessões órfãs (IN_PROGRESS) do usuário em partidas já FINISHED
    await prisma.matchAnnotationSession.updateMany({
      where: {
        annotatorUserId: ctx.userId,
        status: 'IN_PROGRESS',
        isActive: true,
        match: { status: 'FINISHED' },
      },
      data: {
        status: 'COMPLETED',
        isActive: false,
        endedAt: new Date(),
      },
    });

    const sessions = await prisma.matchAnnotationSession.findMany({
      where: {
        annotatorUserId: ctx.userId,
        OR: [{ status: 'COMPLETED' }, { isActive: false, endedAt: { not: null } }],
      },
      include: {
        match: {
          select: {
            id: true,
            sportType: true,
            format: true,
            courtType: true,
            playerP1: true,
            playerP2: true,
            status: true,
            createdAt: true,
            player1: { select: { id: true, name: true } },
            player2: { select: { id: true, name: true } },
            annotationSessions: {
              where: {
                OR: [{ status: 'COMPLETED' }, { isActive: false, endedAt: { not: null } }],
              },
              select: {
                id: true,
                annotatorUserId: true,
                endedAt: true,
                annotator: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { endedAt: 'desc' },
      take: 30,
    });

    const result = sessions.map((s) => ({
      ...s.match,
      mySession: {
        id: s.id,
        endedAt: s.endedAt,
        hasFinalState: !!s.finalStateSnapshot,
        finalStateSnapshot: s.finalStateSnapshot
          ? typeof s.finalStateSnapshot === 'string'
            ? s.finalStateSnapshot
            : JSON.stringify(s.finalStateSnapshot)
          : null,
        matchStateSnapshot: s.matchStateSnapshot
          ? typeof s.matchStateSnapshot === 'string'
            ? s.matchStateSnapshot
            : JSON.stringify(s.matchStateSnapshot)
          : null,
      },
      completedAnnotations: s.match.annotationSessions.map((sa) => ({
        id: sa.id,
        annotatorId: sa.annotatorUserId,
        annotatorName: sa.annotator?.name ?? 'Anotador',
        endedAt: sa.endedAt,
      })),
      comparisonAvailable: s.match.annotationSessions.length >= 2,
    }));

    res.json(result);
  } catch (error) {
    console.error('[GET /api/matches/annotated-by-me] Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar anotações realizadas' });
  }
});

// GET /api/matches/visible — partidas visíveis
app.get('/api/matches/visible', async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: 'Authentication required' });
    res.json([]);
  } catch (error) {
    console.error('[GET /api/matches/visible] Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar partidas visíveis' });
  }
});

// GET /api/matches/open-for-annotation — partidas abertas para anotação
app.get('/api/matches/open-for-annotation', async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: 'Authentication required' });
    res.json([]);
  } catch (error) {
    console.error('[GET /api/matches/open-for-annotation] Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar partidas abertas' });
  }
});

// GET /api/matches/suspended-sessions — sessões suspensas
app.get('/api/matches/suspended-sessions', async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: 'Authentication required' });

    // Encontra todas as sessões suspensas do usuário
    // Exclui partidas em status FINISHED (elas devem ir para histórico, não para suspensas)
    const suspendedSessions = await prisma.matchAnnotationSession.findMany({
      where: {
        annotatorUserId: ctx.userId,
        isActive: false,
        status: { in: ['IN_PROGRESS', 'ABANDONED'] },
        match: {
          status: { not: 'FINISHED' },
        },
      },
      select: {
        id: true,
        matchId: true,
        matchStateSnapshot: true,
        createdAt: true,
        status: true,
        match: {
          select: {
            id: true,
            sportType: true,
            format: true,
            courtType: true,
            nickname: true,
            playerP1: true,
            playerP2: true,
            status: true,
            createdAt: true,
            apontadorEmail: true,
            playersEmails: true,
            completedSets: true,
            score: true,
            matchState: true,
            visibility: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Deduplicação: manter apenas a sessão mais recente por matchId
    const deduplicatedByMatch = new Map();
    for (const session of suspendedSessions) {
      if (!deduplicatedByMatch.has(session.matchId)) {
        deduplicatedByMatch.set(session.matchId, session);
      }
    }

    const result = Array.from(deduplicatedByMatch.values()).map((session) => ({
      ...formatMatchFromDB(session.match),
      suspendedSessionId: session.id,
      suspendedAt: session.createdAt,
      suspendedStatus: session.status,
      matchStateSnapshot: session.matchStateSnapshot
        ? typeof session.matchStateSnapshot === 'string'
          ? session.matchStateSnapshot
          : JSON.stringify(session.matchStateSnapshot)
        : null,
    }));

    res.json(result);
  } catch (error) {
    console.error('[GET /api/matches/suspended-sessions] Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar sessões suspensas' });
  }
});

// Buscar estado de uma partida específica
app.get('/api/matches/:id/state', async (req, res) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      select: MATCH_SELECT_FULL,
    });
    if (!match) return res.status(404).json({ error: 'Partida não encontrada' });
    res.json(formatMatchFromDB(match));
  } catch (error) {
    console.error(`[GET /api/matches/${req.params.id}/state] Erro:`, error);
    res.status(500).json({ error: 'Erro ao buscar estado da partida' });
  }
});

// Atualizar estado de uma partida
app.patch('/api/matches/:id/state', async (req, res) => {
  try {
    const matchId = req.params.id;
    console.log(`[PATCH /api/matches/${matchId}/state] Iniciado`);

    const { matchState } = req.body;
    console.log(
      `[PATCH /state] Recebido matchState:`,
      JSON.stringify(matchState).substring(0, 200),
    );

    let state = {};
    try {
      state =
        typeof matchState === 'string'
          ? JSON.parse(matchState)
          : typeof matchState === 'object' && matchState !== null
            ? { ...matchState }
            : {};
    } catch (e) {
      console.error(`[PATCH /state] ❌ Erro ao parsear matchState:`, e.message);
      return res.status(400).json({ error: 'Estado inválido', details: e.message });
    }

    console.log(
      `[PATCH /state] ✓ matchState parseado. Server: ${state?.server}, startedAt: ${state?.startedAt?.substring(0, 19)}`,
    );

    const currentMatch = await prisma.match.findUnique({
      where: { id: matchId },
      select: { status: true, matchState: true },
    });
    if (!currentMatch) {
      console.warn(`[PATCH /state] ❌ Partida ${matchId} não encontrada`);
      return res.status(404).json({ error: 'Partida não encontrada' });
    }
    console.log(`[PATCH /state] ✓ Partida encontrada. Status atual: ${currentMatch.status}`);

    let status = currentMatch.status || 'NOT_STARTED';
    const isFinished = Boolean(state?.isFinished || state?.winner || state?.endedAt);
    const inProgress = Boolean(
      state?.startedAt || state?.server || state?.currentGame || state?.currentSetState,
    );
    if (isFinished) status = 'FINISHED';
    else if (inProgress && status === 'NOT_STARTED') status = 'IN_PROGRESS';

    console.log(
      `[PATCH /state] 🔄 Status: ${currentMatch.status} → ${status} (isFinished=${isFinished}, inProgress=${inProgress})`,
    );

    const updated = await prisma.match.update({
      where: { id: matchId },
      data: {
        matchState: JSON.stringify(state),
        status,
        updatedAt: new Date(),
      },
      select: MATCH_SELECT_FULL,
    });

    console.log(`[PATCH /state] ✅ Sucesso. Partida ${matchId} atualizada`);

    res.json({
      message: 'Estado atualizado',
      match: formatMatchFromDB(updated),
    });
  } catch (error) {
    console.error(`[PATCH /api/matches/${req.params.id}/state] ❌ Erro:`, error.message);
    console.error(`[PATCH /state] Stack:`, error.stack);
    res.status(500).json({ error: 'Erro ao atualizar estado da partida', details: error.message });
  }
});

// Partidas concluídas do usuário (criador ou jogador)
app.get('/api/matches/my-completed', async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: 'Authentication required' });

    const profile = await prisma.athleteProfile.findFirst({ where: { userId: ctx.userId } });

    const matches = await prisma.match.findMany({
      where: {
        status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'FINISHED'] },
        OR: [
          { createdByUserId: ctx.userId },
          ...(profile ? [{ player1Id: profile.id }, { player2Id: profile.id }] : []),
          { playersEmails: { has: ctx.email } },
        ],
      },
      select: {
        id: true,
        sportType: true,
        format: true,
        courtType: true,
        playerP1: true,
        playerP2: true,
        status: true,
        createdAt: true,
        createdByUserId: true,
        player1: { select: { id: true, name: true } },
        player2: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    });

    const result = matches.map((m) => ({
      id: m.id,
      sportType: m.sportType,
      format: m.format,
      courtType: m.courtType,
      playerP1: m.playerP1,
      playerP2: m.playerP2,
      status: m.status,
      createdAt: m.createdAt ? m.createdAt.toISOString() : null,
      createdByUserId: m.createdByUserId,
      annotationCount: 0,
      player1: m.player1,
      player2: m.player2,
    }));

    res.json(result);
  } catch (error) {
    console.error('[GET /api/matches/my-completed] Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar partidas concluídas' });
  }
});

// Partidas anotadas onde o usuário logado é jogador
app.get('/api/matches/annotated-for-me', async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: 'Authentication required' });

    const profile = await prisma.athleteProfile.findFirst({ where: { userId: ctx.userId } });

    const matches = await prisma.match.findMany({
      where: {
        // Sessões completadas: status='COMPLETED' OU encerradas (isActive=false + endedAt)
        annotationSessions: {
          some: {
            OR: [{ status: 'COMPLETED' }, { isActive: false, endedAt: { not: null } }],
          },
        },
        OR: [
          ...(profile ? [{ player1Id: profile.id }, { player2Id: profile.id }] : []),
          { playersEmails: { has: ctx.email } },
          { apontadorEmail: ctx.email },
          { dashboardShares: { some: { targetUserId: ctx.userId } } },
        ],
      },
      select: {
        id: true,
        sportType: true,
        format: true,
        courtType: true,
        playerP1: true,
        playerP2: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        player1: { select: { id: true, name: true } },
        player2: { select: { id: true, name: true } },
        annotationSessions: {
          where: {
            OR: [{ status: 'COMPLETED' }, { isActive: false, endedAt: { not: null } }],
          },
          select: {
            id: true,
            annotatorUserId: true,
            endedAt: true,
            finalStateSnapshot: true,
            annotator: { select: { id: true, name: true } },
          },
          orderBy: { endedAt: 'desc' },
        },
        dashboardShares: {
          where: { targetUserId: ctx.userId },
          orderBy: { notifiedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    });

    const enriched = matches.map((m) => ({
      id: m.id,
      sportType: m.sportType,
      format: m.format,
      courtType: m.courtType,
      playerP1: m.playerP1,
      playerP2: m.playerP2,
      status: m.status,
      createdAt: m.createdAt,
      player1: m.player1,
      player2: m.player2,
      completedAnnotations: m.annotationSessions.map((s) => ({
        id: s.id,
        annotatorId: s.annotatorUserId,
        annotatorName: s.annotator?.name ?? 'Anotador',
        endedAt: s.endedAt,
        hasFinalState: !!s.finalStateSnapshot,
      })),
      comparisonAvailable: m.annotationSessions.length >= 2,
      myShare: m.dashboardShares[0] ?? null,
      isNew: !m.dashboardShares[0] || m.dashboardShares[0].status === 'PENDING',
    }));

    res.json(enriched);
  } catch (error) {
    console.error('[GET /api/matches/annotated-for-me] Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar partidas anotadas para o usuário' });
  }
});

// Partidas que o usuário logado anotou
app.get('/api/matches/annotated-by-me', async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: 'Authentication required' });

    // Cleanup: fechar sessões órfãs (IN_PROGRESS) do usuário em partidas já FINISHED
    // Corrige dados históricos criados antes do fix no handleEndMatch
    await prisma.matchAnnotationSession.updateMany({
      where: {
        annotatorUserId: ctx.userId,
        status: 'IN_PROGRESS',
        isActive: true,
        match: { status: 'FINISHED' },
      },
      data: {
        status: 'COMPLETED',
        isActive: false,
        endedAt: new Date(),
      },
    });

    const sessions = await prisma.matchAnnotationSession.findMany({
      where: {
        annotatorUserId: ctx.userId,
        OR: [{ status: 'COMPLETED' }, { isActive: false, endedAt: { not: null } }],
      },
      include: {
        match: {
          select: {
            id: true,
            sportType: true,
            format: true,
            courtType: true,
            playerP1: true,
            playerP2: true,
            status: true,
            createdAt: true,
            player1: { select: { id: true, name: true } },
            player2: { select: { id: true, name: true } },
            annotationSessions: {
              where: {
                OR: [{ status: 'COMPLETED' }, { isActive: false, endedAt: { not: null } }],
              },
              select: {
                id: true,
                annotatorUserId: true,
                endedAt: true,
                annotator: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { endedAt: 'desc' },
      take: 30,
    });

    const result = sessions.map((s) => ({
      ...s.match,
      mySession: {
        id: s.id,
        endedAt: s.endedAt,
        hasFinalState: !!s.finalStateSnapshot,
        finalStateSnapshot: s.finalStateSnapshot
          ? typeof s.finalStateSnapshot === 'string'
            ? s.finalStateSnapshot
            : JSON.stringify(s.finalStateSnapshot)
          : null,
        matchStateSnapshot: s.matchStateSnapshot
          ? typeof s.matchStateSnapshot === 'string'
            ? s.matchStateSnapshot
            : JSON.stringify(s.matchStateSnapshot)
          : null,
      },
      completedAnnotations: s.match.annotationSessions.map((sa) => ({
        id: sa.id,
        annotatorId: sa.annotatorUserId,
        annotatorName: sa.annotator?.name ?? 'Anotador',
        endedAt: sa.endedAt,
      })),
      comparisonAvailable: s.match.annotationSessions.length >= 2,
    }));

    res.json(result);
  } catch (error) {
    console.error('[GET /api/matches/annotated-by-me] Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar anotações realizadas' });
  }
});

// Dados de relatório de uma sessão específica
app.get('/api/matches/:id/sessions/:sessionId/report-data', async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: 'Authentication required' });

    const session = await prisma.matchAnnotationSession.findUnique({
      where: { id: req.params.sessionId },
      include: {
        match: {
          select: {
            id: true,
            sportType: true,
            format: true,
            courtType: true,
            playerP1: true,
            playerP2: true,
            matchState: true,
            player1: { select: { name: true } },
            player2: { select: { name: true } },
          },
        },
        annotator: { select: { id: true, name: true } },
      },
    });

    if (!session || session.matchId !== req.params.id) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    // Tenta usar o finalStateSnapshot da sessão.
    // Fallback: usa o matchState da partida (salvo a cada ponto via syncState).
    let snapshotData = null;
    if (session.finalStateSnapshot) {
      try {
        snapshotData = JSON.parse(session.finalStateSnapshot);
      } catch {
        snapshotData = null;
      }
    }
    if (!snapshotData && session.match.matchState) {
      try {
        snapshotData =
          typeof session.match.matchState === 'string'
            ? JSON.parse(session.match.matchState)
            : session.match.matchState;
      } catch {
        snapshotData = null;
      }
    }

    // Remover matchState do objeto match antes de enviar (não é necessário no frontend)
    const { matchState: _ms, ...matchWithoutState } = session.match;

    res.json({
      session: {
        id: session.id,
        annotatorName: session.annotator?.name ?? 'Anotador',
        endedAt: session.endedAt,
        finalStateSnapshot: snapshotData,
      },
      match: matchWithoutState,
    });
  } catch (error) {
    console.error(
      `[GET /api/matches/${req.params.id}/sessions/${req.params.sessionId}/report-data] Erro:`,
      error,
    );
    res.status(500).json({ error: 'Erro ao buscar dados do relatório' });
  }
});

// PATCH /api/matches/:id/metadata — dados editáveis pelo criador da partida
app.patch('/api/matches/:id/metadata', async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: 'Authentication required' });
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      select: { id: true, createdByUserId: true },
    });
    if (!match) return res.status(404).json({ error: 'Partida não encontrada' });
    if (match.createdByUserId !== ctx.userId && ctx.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Apenas o criador da partida pode editar os dados' });
    }
    const { nickname, visibility, openForAnnotation } = req.body || {};
    const data = {};

    if (nickname !== undefined) data.nickname = nickname || null;
    if (visibility !== undefined) data.visibility = visibility;
    if (openForAnnotation !== undefined) data.openForAnnotation = Boolean(openForAnnotation);
    const updated = await prisma.match.update({
      where: { id: req.params.id },
      data,
      select: MATCH_SELECT_FULL,
    });
    res.json(formatMatchFromDB(updated));
  } catch (error) {
    console.error(`[PATCH /api/matches/${req.params.id}/metadata] Erro:`, error);
    res.status(500).json({ error: 'Erro ao atualizar dados da partida' });
  }
});

// GET /api/matches/:id/sessions — lista sessões de anotação de uma partida
app.get('/api/matches/:id/sessions', async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: 'Authentication required' });

    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });
    if (!match) return res.status(404).json({ error: 'Partida não encontrada' });

    const sessions = await prisma.matchAnnotationSession.findMany({
      where: { matchId: req.params.id },
      select: {
        id: true,
        matchId: true,
        annotatorUserId: true,
        startedAt: true,
        endedAt: true,
        matchStateSnapshot: true,
        finalStateSnapshot: true,
        isActive: true,
        status: true,
        createdAt: true,
      },
    });

    res.json(sessions);
  } catch (error) {
    console.error(`[GET /api/matches/${req.params.id}/sessions] Erro:`, error);
    res.status(500).json({ error: 'Erro ao buscar sessões de anotação' });
  }
});

// POST /api/matches/:id/sessions — inicia/cria sessão de anotação
app.post('/api/matches/:id/sessions', async (req, res) => {
  try {
    console.log(`[POST /api/matches/${req.params.id}/sessions] Iniciado`);
    const ctx = await extractCtx(req);
    if (!ctx) {
      console.warn(`[POST /sessions] ❌ Autenticação falhou`);
      return res.status(401).json({ error: 'Authentication required' });
    }
    console.log(`[POST /sessions] ✓ Usuário: ${ctx.userId}`);

    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      select: { id: true, matchState: true },
    });
    if (!match) {
      console.warn(`[POST /sessions] ❌ Partida ${req.params.id} não encontrada`);
      return res.status(404).json({ error: 'Partida não encontrada' });
    }
    console.log(`[POST /sessions] ✓ Partida encontrada: ${req.params.id}`);

    // Garantir que o usuário existe no banco (evita FK constraint em dev)
    const userInDb = await prisma.user.findUnique({ where: { id: ctx.userId } });
    if (!userInDb) {
      try {
        await prisma.user.create({
          data: {
            id: ctx.userId,
            email: ctx.email,
            name: ctx.email.split('@')[0],
            passwordHash: '__dev_placeholder__',
          },
        });
        console.warn(`[POST /sessions] ⚠️ Usuário ${ctx.userId} reconstituído no banco via JWT`);
      } catch (createErr) {
        // Email já existe com outro ID — redireciona para o usuário existente
        const userByEmail = await prisma.user.findUnique({ where: { email: ctx.email } });
        if (userByEmail) {
          ctx.userId = userByEmail.id;
          console.warn(`[POST /sessions] ⚠️ Redirecionando para userId existente: ${ctx.userId}`);
        } else {
          console.error(`[POST /sessions] ❌ Falha ao reconstituir usuário:`, createErr.message);
          throw createErr;
        }
      }
    }

    // Verificar se já há uma sessão ativa do mesmo anotador
    const existingSession = await prisma.matchAnnotationSession.findFirst({
      where: {
        matchId: req.params.id,
        annotatorUserId: ctx.userId,
        status: 'IN_PROGRESS',
      },
    });

    if (existingSession) {
      console.log(`[POST /sessions] ✓ Sessão já existe: ${existingSession.id}`);
      // Retornar a sessão existente
      return res.json(existingSession);
    }

    // Criar nova sessão
    console.log(`[POST /sessions] 🔄 Criando nova sessão para userId=${ctx.userId}`);
    const session = await prisma.matchAnnotationSession.create({
      data: {
        matchId: req.params.id,
        annotatorUserId: ctx.userId,
        matchStateSnapshot: match.matchState || null,
        isActive: true,
        status: 'IN_PROGRESS',
      },
    });

    console.log(`[POST /sessions] ✅ Nova sessão criada: ${session.id}`);
    res.json(session);
  } catch (error) {
    console.error(`[POST /api/matches/${req.params.id}/sessions] ❌ Erro:`, error.message);
    console.error(`[POST /sessions] Stack:`, error.stack);
    res.status(500).json({ error: 'Erro ao criar sessão de anotação', details: error.message });
  }
});

// POST /api/matches/:id/sessions/:sessionId/abandon — marca sessão como ABANDONED (beforeunload)
app.post('/api/matches/:id/sessions/:sessionId/abandon', async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) {
      console.warn(`[POST /abandon] ❌ Autenticação falhou`);
      return res.status(401).json({ error: 'Authentication required' });
    }

    const session = await prisma.matchAnnotationSession.findUnique({
      where: { id: req.params.sessionId },
      select: {
        id: true,
        matchId: true,
        annotatorUserId: true,
        isActive: true,
        status: true,
      },
    });

    if (!session || session.matchId !== req.params.id) {
      console.warn(`[POST /abandon] ❌ Sessão ${req.params.sessionId} não encontrada`);
      return res.status(404).json({ error: 'Session not found' });
    }

    // Só o anotador ou ADMIN pode marcar como ABANDONED
    if (session.annotatorUserId !== ctx.userId && ctx.role !== 'ADMIN') {
      console.warn(
        `[POST /abandon] ❌ Autorização negada para ${ctx.userId} em sessão de ${session.annotatorUserId}`,
      );
      return res.status(403).json({
        error: 'Only the annotator or admin can abandon a session',
      });
    }

    // Se já foi finalizada, não faz nada (idempotent)
    if (session.status === 'COMPLETED' || session.status === 'ABANDONED') {
      console.log(`[POST /abandon] ℹ️ Sessão ${session.id} já está ${session.status} (idempotent)`);
      return res.json({
        message: 'Session already ended',
        id: session.id,
        status: session.status,
      });
    }

    const matchStateSnapshot = req.body?.matchStateSnapshot
      ? typeof req.body.matchStateSnapshot === 'string'
        ? req.body.matchStateSnapshot
        : JSON.stringify(req.body.matchStateSnapshot)
      : null;

    const updated = await prisma.matchAnnotationSession.update({
      where: { id: req.params.sessionId },
      data: {
        status: 'ABANDONED',
        isActive: false,
        endedAt: new Date(),
        ...(matchStateSnapshot ? { matchStateSnapshot } : {}),
      },
      include: {
        annotator: { select: { id: true, name: true, email: true } },
      },
    });

    console.log(`[POST /abandon] ✅ Sessão ${session.id} marcada como ABANDONED via beforeunload`);
    res.json(updated);
  } catch (error) {
    console.error(
      `[POST /api/matches/${req.params.id}/sessions/${req.params.sessionId}/abandon] ❌ Erro:`,
      error.message,
    );
    res.status(500).json({
      error: 'Erro ao marcar sessão como ABANDONED',
      details: error.message,
    });
  }
});

// PATCH /api/matches/:id/sessions/:sessionId — encerra ou marca sessão como ABANDONED
app.patch('/api/matches/:id/sessions/:sessionId', async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: 'Authentication required' });

    const session = await prisma.matchAnnotationSession.findUnique({
      where: { id: req.params.sessionId },
      select: { id: true, matchId: true, annotatorUserId: true, isActive: true },
    });
    if (!session || session.matchId !== req.params.id) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }
    if (session.annotatorUserId !== ctx.userId && ctx.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Apenas o anotador pode encerrar a sessão' });
    }
    if (!session.isActive) {
      // Idempotente: retornar 200 ao invés de 400.
      // Evita race condition entre React cleanup PATCH e beforeunload fetch keepalive.
      return res.json({ id: session.id, status: session.status, alreadyEnded: true });
    }

    const newStatus = req.body?.status || 'COMPLETED';
    if (!['COMPLETED', 'ABANDONED', 'IN_PROGRESS'].includes(newStatus)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      select: { matchState: true },
    });

    const updateData = {
      status: newStatus,
      ...(newStatus === 'ABANDONED' && {
        isActive: false,
        // Garantir que matchStateSnapshot é sempre uma STRING (JSON)
        matchStateSnapshot: (() => {
          const snapshot = req.body?.matchStateSnapshot;
          if (snapshot) {
            // Se é string, usa direto; se é object, stringify
            return typeof snapshot === 'string' ? snapshot : JSON.stringify(snapshot);
          }
          // Fallback para matchState da partida (converter para string se for object)
          if (match?.matchState) {
            return typeof match.matchState === 'string'
              ? match.matchState
              : JSON.stringify(match.matchState);
          }
          return null;
        })(),
      }),
      ...(newStatus === 'COMPLETED' && {
        isActive: false,
        endedAt: new Date(),
        finalStateSnapshot: req.body?.finalState
          ? JSON.stringify(req.body.finalState)
          : match?.matchState || null,
      }),
    };

    const updated = await prisma.matchAnnotationSession.update({
      where: { id: req.params.sessionId },
      data: updateData,
    });

    console.log(
      `[PATCH /sessions/${req.params.sessionId}] ✅ Status → ${newStatus}`,
      newStatus === 'ABANDONED'
        ? `(snapshot length: ${updateData.matchStateSnapshot?.length || 0})`
        : '',
    );
    res.json(updated);
  } catch (error) {
    console.error(
      `[PATCH /api/matches/${req.params.id}/sessions/${req.params.sessionId}] Erro:`,
      error.message,
    );
    res.status(500).json({ error: 'Erro ao atualizar sessão', details: error.message });
  }
});

// POST /api/matches/:id/claim — salva partida no histórico do usuário logado
app.post('/api/matches/:id/claim', async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: 'Authentication required' });

    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });
    if (!match) return res.status(404).json({ error: 'Partida não encontrada' });

    const existing = await prisma.matchDashboardShare.findFirst({
      where: { matchId: req.params.id, targetUserId: ctx.userId },
    });

    let share;
    if (existing) {
      share = await prisma.matchDashboardShare.update({
        where: { id: existing.id },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      });
    } else {
      share = await prisma.matchDashboardShare.create({
        data: {
          matchId: req.params.id,
          targetUserId: ctx.userId,
          shareType: 'ANNOTATION',
          status: 'ACCEPTED',
          respondedAt: new Date(),
        },
      });
    }

    res.json({ ok: true, shareId: share.id, status: share.status });
  } catch (error) {
    console.error(`[POST /api/matches/${req.params.id}/claim] Erro:`, error);
    res.status(500).json({ error: 'Erro ao salvar partida no histórico' });
  }
});

// GET /api/matches/discover — partidas públicas disponíveis para anotação (ANTES de :id!)
app.get('/api/matches/discover', async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: 'Authentication required' });

    const sp = new URL(`http://localhost${req.url}`).searchParams;
    const matches = await prisma.match.findMany({
      where: {
        visibility: 'PUBLIC',
        openForAnnotation: true,
        status: { not: 'FINISHED' },
        ...(sp.get('sportType') ? { sportType: sp.get('sportType') } : {}),
        ...(sp.get('clubId') ? { clubId: sp.get('clubId') } : {}),
      },
      select: {
        id: true,
        sportType: true,
        format: true,
        courtType: true,
        scheduledAt: true,
        status: true,
        visibility: true,
        openForAnnotation: true,
        playerP1: true,
        playerP2: true,
        player1: { select: { id: true, name: true } },
        player2: { select: { id: true, name: true } },
        club: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
      take: 50,
    });
    res.json(matches);
  } catch (error) {
    console.error('[GET /api/matches/discover] Erro:', error);
    res.status(500).json({ error: 'Erro ao carregar partidas disponíveis' });
  }
});

// GET /api/matches/tournament-suggestions — sugestões de torneios (ANTES de :id!)
app.get('/api/matches/tournament-suggestions', async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: 'Authentication required' });

    const sp = new URL(`http://localhost${req.url}`).searchParams;
    const tournamentFilter = sp.get('tournamentName');

    const [tournaments, rounds] = await Promise.all([
      prisma.match.findMany({
        where: {
          clubId: ctx.clubId ?? undefined,
          tournamentName: { not: null },
        },
        distinct: ['tournamentName'],
        select: { tournamentName: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.match.findMany({
        where: {
          clubId: ctx.clubId ?? undefined,
          roundName: { not: null },
          ...(tournamentFilter ? { tournamentName: tournamentFilter } : {}),
        },
        distinct: ['roundName'],
        select: { roundName: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    res.json({
      tournaments: tournaments.map((t) => t.tournamentName).filter(Boolean),
      rounds: rounds.map((r) => r.roundName).filter(Boolean),
    });
  } catch (error) {
    console.error('[GET /api/matches/tournament-suggestions] Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar sugestões de torneios' });
  }
});

// Buscar partida específica (rota genérica — deve ficar DEPOIS de rotas estáticas)
app.get('/api/matches/:id', async (req, res) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      select: MATCH_SELECT_FULL,
    });
    if (!match) return res.status(404).json({ error: 'Partida não encontrada' });
    res.json(formatMatchFromDB(match));
  } catch (error) {
    console.error(`[GET /api/matches/${req.params.id}] Erro:`, error);
    res.status(500).json({ error: 'Erro ao buscar partida' });
  }
});

// Atualizar partida com ações especiais (endMatch, reopen, etc.)
app.patch('/api/matches/:id', async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: 'Authentication required' });

    console.debug(
      '[dev-server PATCH /api/matches/:id] req.body:',
      JSON.stringify(req.body),
      'action:',
      req.body?.action,
    );

    // Ação especial: encerrar partida manualmente
    if (req.body?.action === 'endMatch') {
      console.debug(
        '[dev-server endMatch] Processing for matchId:',
        req.params.id,
        'userId:',
        ctx.userId,
      );
      const matchToEnd = await prisma.match.findUnique({
        where: { id: req.params.id },
        select: { createdByUserId: true, status: true, matchState: true },
      });

      if (!matchToEnd) {
        return res.status(404).json({ error: 'Match not found', matchId: req.params.id });
      }

      if (matchToEnd.createdByUserId !== ctx.userId && ctx.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Apenas o criador pode encerrar a partida' });
      }

      if (matchToEnd.status === 'FINISHED') {
        return res.status(409).json({ error: 'Match already finished' });
      }

      // Atualizar match para FINISHED
      const endedMatch = await prisma.match.update({
        where: { id: req.params.id },
        data: {
          status: 'FINISHED',
          endedAt: new Date(),
          ...(req.body.winner !== undefined ? { winner: req.body.winner } : {}),
        },
      });

      // Finalizar todas as sessions deste match
      await prisma.matchAnnotationSession.updateMany({
        where: { matchId: req.params.id, isActive: true },
        data: { isActive: false, status: 'COMPLETED', endedAt: new Date() },
      });

      console.debug('[dev-server endMatch] Match ended successfully:', endedMatch.id);
      return res.json(formatMatchFromDB(endedMatch));
    }

    // Ação especial: reabrir partida finalizada
    if (req.body?.action === 'reopenMatch') {
      console.debug('[dev-server reopenMatch] Processing for matchId:', req.params.id);
      const matchToReopen = await prisma.match.findUnique({
        where: { id: req.params.id },
        select: { createdByUserId: true, status: true },
      });

      if (!matchToReopen) {
        return res.status(404).json({ error: 'Match not found' });
      }

      if (matchToReopen.createdByUserId !== ctx.userId && ctx.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Apenas o criador pode reabrir a partida' });
      }

      if (matchToReopen.status !== 'FINISHED') {
        return res.status(400).json({ error: 'Only finished matches can be reopened' });
      }

      const reopenedMatch = await prisma.match.update({
        where: { id: req.params.id },
        data: { status: 'IN_PROGRESS', endedAt: null, winner: null },
      });

      console.debug('[dev-server reopenMatch] Match reopened successfully:', reopenedMatch.id);
      return res.json(formatMatchFromDB(reopenedMatch));
    }

    // Fallback: delegue ao updateMatch service
    const svc = await getMatchService();
    const updated = await svc.updateMatch(req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    console.error(`[PATCH /api/matches/${req.params.id}] Erro:`, error);
    res.status(500).json({ error: 'Erro ao atualizar partida', details: error.message });
  }
});

// Estatísticas de uma partida — delega ao matchService.js
app.get('/api/matches/:id/stats', async (req, res) => {
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
app.get('/api/matches/:id/reviews', async (req, res) => {
  const ctx = await extractCtx(req);
  if (!ctx) return res.status(401).json({ error: 'Authentication required' });
  return res.json([]);
});

// PATCH /api/matches/:id/reviews/:reviewId — removido
app.patch('/api/matches/:id/reviews/:reviewId', (_req, res) => {
  return res.status(410).json({ error: 'Sistema de revisão removido' });
});

// GET /api/reviews/pending — removido, retorna vazio para compatibilidade
app.get('/api/reviews/pending', async (req, res) => {
  const ctx = await extractCtx(req);
  if (!ctx) return res.status(401).json({ error: 'Authentication required' });
  return res.json([]);
});

// POST /api/matches/download-review — removido
app.post('/api/matches/download-review', (_req, res) => {
  return res.status(410).json({ error: 'Sistema de revisão removido' });
});

// DELETE /api/matches/:id/local-only — remove cópia privada (central intacta)
app.delete('/api/matches/:id/local-only', async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: 'Authentication required' });

    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        createdByUserId: true,
      },
    });
    if (!match) return res.status(404).json({ error: 'Partida não encontrada' });
    if (match.createdByUserId !== ctx.userId)
      return res.status(403).json({ error: 'Sem permissão para remover esta partida' });

    await prisma.match.delete({ where: { id: req.params.id } });
    res.json({ message: 'Cópia local removida com sucesso.' });
  } catch (error) {
    console.error('[DELETE /api/matches/:id/local-only] Erro:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// DELETE /api/matches/:id — exclui partida (apenas criador ou ADMIN)
app.delete('/api/matches/:id', async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: 'Authentication required' });

    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      select: { id: true, createdByUserId: true, status: true },
    });
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (match.createdByUserId !== ctx.userId && ctx.role !== 'ADMIN') {
      return res
        .status(403)
        .json({ error: 'Apenas o criador ou administrador pode excluir a partida' });
    }
    // Criador e admin podem deletar partidas em qualquer estado
    await prisma.match.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/matches/:id] Erro:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Fallback SPA
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Rota de API não encontrada' });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
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
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
