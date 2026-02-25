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

// ─── Cache do serviço ESM ────────────────────────────────────────────────────
// As rotas principais delegam ao matchService.js (fonte da verdade)
let _matchService = null;
async function getMatchService() {
  if (!_matchService) {
    _matchService = await import("./src/services/matchService.js");
  }
  return _matchService;
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

// Autenticação (simplificada para desenvolvimento)
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (email && password) {
    res.json({ user: { role: "annotator", email }, token: "dev-mock-token" });
  } else {
    res.status(401).json({ error: "Credenciais inválidas" });
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
