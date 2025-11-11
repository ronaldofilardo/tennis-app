/**
 * Servidor de teste E2E para Playwright
 * Usa banco de dados real (racket_mvp) para testes end-to-end
 */

const express = require("express");
const cors = require("cors");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
require("dotenv").config({ path: path.join(__dirname, ".env.test") });

const app = express();
const PORT = 3001;

// Inicializar Prisma
const prisma = new PrismaClient({
  log: ["query", "error"],
});

// Middleware
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, "dist")));

// Função auxiliar para formatar partidas do banco
function formatMatchFromDB(match) {
  let matchState = null;
  try {
    matchState = match.matchState ? JSON.parse(match.matchState) : null;
  } catch (e) {
    console.warn(
      `Erro ao fazer parse do matchState da partida ${match.id}:`,
      e
    );
    matchState = {};
  }

  let completedSets = [];
  try {
    completedSets = JSON.parse(match.completedSets || "[]");
  } catch (e) {
    console.warn(
      `Erro ao fazer parse do completedSets da partida ${match.id}:`,
      e
    );
    completedSets = [];
  }

  return {
    id: match.id,
    sportType: match.sportType,
    format: match.format,
    players: { p1: match.playerP1, p2: match.playerP2 },
    status: match.status,
    apontadorEmail: match.apontadorEmail,
    playersEmails: match.playersEmails || [],
    matchState,
    completedSets,
    createdAt: match.createdAt.toISOString(),
  };
}

// Rota para partidas visíveis - usa banco real
app.get("/api/matches/visible", async (req, res) => {
  try {
    const { email, role } = req.query;
    console.log(
      `[GET /api/matches/visible] Buscando partidas para email: ${email}`
    );

    const matches = await prisma.match.findMany({
      where: {
        OR: [{ apontadorEmail: email }, { playersEmails: { has: email } }],
      },
      select: {
        id: true,
        sportType: true,
        format: true,
        playerP1: true,
        playerP2: true,
        status: true,
        apontadorEmail: true,
        playersEmails: true,
        matchState: true,
        completedSets: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedMatches = matches.map(formatMatchFromDB);
    console.log(
      `[GET /api/matches/visible] Encontradas ${formattedMatches.length} partidas`
    );
    res.json(formattedMatches);
  } catch (error) {
    console.error("[GET /api/matches/visible] Erro:", error);
    res.status(500).json({ error: "Erro ao buscar partidas visíveis" });
  }
});

// API Routes

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Autenticação
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (email === "test@test.com" && password === "password") {
    res.json({
      user: { role: "annotator", email: "test@test.com" },
      token: "mock-jwt-token",
    });
  } else {
    res.status(401).json({ error: "Credenciais inválidas" });
  }
});

// Listar partidas
app.get("/api/matches", async (req, res) => {
  try {
    const matches = await prisma.match.findMany({
      select: {
        id: true,
        sportType: true,
        format: true,
        playerP1: true,
        playerP2: true,
        status: true,
        apontadorEmail: true,
        playersEmails: true,
        matchState: true,
        completedSets: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedMatches = matches.map(formatMatchFromDB);
    res.json(formattedMatches);
  } catch (error) {
    console.error("[GET /api/matches] Erro:", error);
    res.status(500).json({ error: "Erro ao buscar partidas" });
  }
});

// Criar partida
app.post("/api/matches", async (req, res) => {
  try {
    const userEmail =
      req.body.apontadorEmail || req.body.email || "play@email.com";
    const playersEmails = req.body.playersEmails || [userEmail];

    // Inclui o email do apontador e dos jogadores em playersEmails, sem duplicidade
    const emailsSet = new Set();
    if (userEmail) emailsSet.add(userEmail);
    if (req.body.players && req.body.players.p1)
      emailsSet.add(req.body.players.p1);
    if (req.body.players && req.body.players.p2)
      emailsSet.add(req.body.players.p2);
    const finalPlayersEmails = Array.from(emailsSet);

    const newMatch = await prisma.match.create({
      data: {
        sportType: req.body.sportType || "Tênis",
        format: req.body.format || "BEST_OF_3",
        nickname: req.body.nickname || null,
        apontadorEmail: userEmail,
        playerP1: req.body.players?.p1 || "Jogador 1",
        playerP2: req.body.players?.p2 || "Jogador 2",
        playersEmails: finalPlayersEmails,
        status: "NOT_STARTED",
        completedSets: JSON.stringify([]),
        matchState: JSON.stringify({
          playersIds: {
            p1: req.body.players?.p1 || "Jogador 1",
            p2: req.body.players?.p2 || "Jogador 2",
          },
          visibleTo: req.body.visibleTo || "both",
          needsSetup: true,
          startedAt: null,
        }),
      },
    });

    const formattedMatch = formatMatchFromDB(newMatch);
    console.log(`[POST /api/matches] Partida criada: ${formattedMatch.id}`);
    res.json(formattedMatch);
  } catch (error) {
    console.error("[POST /api/matches] Erro:", error);
    res.status(500).json({ error: "Erro ao criar partida" });
  }
});

// Buscar partida específica
app.get("/api/matches/:id", async (req, res) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        sportType: true,
        format: true,
        playerP1: true,
        playerP2: true,
        status: true,
        apontadorEmail: true,
        playersEmails: true,
        matchState: true,
        completedSets: true,
        createdAt: true,
      },
    });

    if (match) {
      const formattedMatch = formatMatchFromDB(match);
      res.json(formattedMatch);
    } else {
      res.status(404).json({ error: "Partida não encontrada" });
    }
  } catch (error) {
    console.error(`[GET /api/matches/${req.params.id}] Erro:`, error);
    res.status(500).json({ error: "Erro ao buscar partida" });
  }
});

// Buscar estado da partida
app.get("/api/matches/:id/state", async (req, res) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        sportType: true,
        format: true,
        playerP1: true,
        playerP2: true,
        status: true,
        apontadorEmail: true,
        playersEmails: true,
        matchState: true,
        completedSets: true,
        createdAt: true,
      },
    });

    if (match) {
      const formattedMatch = formatMatchFromDB(match);
      res.json(formattedMatch);
    } else {
      res.status(404).json({ error: "Partida não encontrada" });
    }
  } catch (error) {
    console.error(`[GET /api/matches/${req.params.id}/state] Erro:`, error);
    res.status(500).json({ error: "Erro ao buscar estado da partida" });
  }
});

// Atualizar estado da partida
app.patch("/api/matches/:id/state", async (req, res) => {
  try {
    const { matchState } = req.body;

    // Aceitar tanto objeto quanto string e garantir robustez no parse
    let state;
    try {
      if (typeof matchState === "string") {
        state = JSON.parse(matchState);
      } else if (typeof matchState === "object" && matchState !== null) {
        state = { ...matchState };
      } else {
        state = {};
      }
    } catch (e) {
      console.error(
        `[PATCH /api/matches/${req.params.id}/state] Erro ao fazer parse do matchState:`,
        e
      );
      state = {};
    }

    // Buscar estado atual da partida
    const currentMatch = await prisma.match.findUnique({
      where: { id: req.params.id },
      select: { status: true, matchState: true },
    });

    if (!currentMatch) {
      return res.status(404).json({ error: "Partida não encontrada" });
    }

    let currentState = {};
    try {
      currentState = currentMatch.matchState
        ? JSON.parse(currentMatch.matchState)
        : {};
    } catch (e) {
      console.warn(
        `[PATCH /api/matches/${req.params.id}/state] Erro ao fazer parse do estado atual:`,
        e
      );
      currentState = {};
    }

    // Inferir status
    let status = currentMatch.status || "NOT_STARTED";
    const isFinished = Boolean(
      state?.isFinished || state?.winner || state?.endedAt
    );
    const inProgressIndicators = Boolean(
      state?.startedAt ||
        state?.server ||
        state?.currentGame ||
        state?.currentSetState
    );

    if (isFinished) {
      status = "FINISHED";
    } else if (inProgressIndicators && status === "NOT_STARTED") {
      status = "IN_PROGRESS";
    }

    console.log(
      `[PATCH /api/matches/${req.params.id}/state] Atualizando status: ${currentMatch.status} -> ${status}`
    );

    const updatedMatch = await prisma.match.update({
      where: { id: req.params.id },
      data: {
        matchState: JSON.stringify(state),
        status,
        updatedAt: new Date(),
      },
    });

    const formattedMatch = formatMatchFromDB(updatedMatch);
    res.json({ message: "Estado atualizado", match: formattedMatch });
  } catch (error) {
    console.error(`[PATCH /api/matches/${req.params.id}/state] Erro:`, error);
    res.status(500).json({ error: "Erro ao atualizar estado da partida" });
  }
});

// Buscar estatísticas da partida
app.get("/api/matches/:id/stats", async (req, res) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        sportType: true,
        format: true,
        playerP1: true,
        playerP2: true,
        status: true,
        matchState: true,
        completedSets: true,
        createdAt: true,
      },
    });

    if (!match) {
      return res.status(404).json({ error: "Partida não encontrada" });
    }

    // Calcular estatísticas básicas (simplificado para E2E)
    const stats = {
      totalPoints: 100,
      player1: {
        pointsWon: 55,
        aces: 3,
        winners: 12,
        unforcedErrors: 8,
      },
      player2: {
        pointsWon: 45,
        aces: 1,
        winners: 8,
        unforcedErrors: 12,
      },
      match: {
        duration: 1800, // 30 minutos
        totalRallies: 89,
      },
      pointsHistory: [], // Histórico vazio para simplificar
    };

    res.json(stats);
  } catch (error) {
    console.error(`[GET /api/matches/${req.params.id}/stats] Erro:`, error);
    res.status(500).json({ error: "Erro ao buscar estatísticas da partida" });
  }
});

// Fallback para SPA (React Router), mas não para rotas de API
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ error: "API route not found" });
  } else {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  }
});

// Iniciar servidor
app.listen(PORT, async () => {
  try {
    // Testar conexão com o banco
    await prisma.$connect();
    console.log(`🚀 Servidor de teste E2E rodando na porta ${PORT}`);
    console.log(`🗄️ Conectado ao banco de dados racket_mvp_test`);
    console.log(`🔗 Acesse: http://localhost:${PORT}`);

    // Contar partidas existentes
    const matchCount = await prisma.match.count();
    console.log(`📊 ${matchCount} partidas encontradas no banco`);
  } catch (error) {
    console.error("❌ Erro ao conectar com o banco de dados:", error);
    process.exit(1);
  }
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("🛑 Encerrando servidor...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("🛑 Encerrando servidor...");
  await prisma.$disconnect();
  process.exit(0);
});
