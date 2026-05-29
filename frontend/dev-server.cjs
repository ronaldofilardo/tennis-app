/**
 * Servidor de desenvolvimento para o frontend
 * Usa banco de dados real (racket_mvp) para desenvolvimento local
 *
 * Rotas delegadas a:
 *   dev-server-routes/auth.cjs
 *   dev-server-routes/athletes.cjs
 *   dev-server-routes/matches-read.cjs
 *   dev-server-routes/matches-sessions.cjs
 *   dev-server-routes/matches-write.cjs
 *   dev-server-routes/matches-actions.cjs
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: path.join(__dirname, '.env.development') });

const app = express();
const PORT = 3001;

let prisma;
if (globalThis.__prisma) {
  prisma = globalThis.__prisma;
} else {
  prisma = new PrismaClient({ log: ['query', 'error'] });
  globalThis.__prisma = prisma;
}

let _matchService = null;
async function getMatchService() {
  if (!_matchService) {
    _matchService = await import('./src/services/matchService.ts');
  }
  return _matchService;
}

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.disable('etag');
app.use(express.static(path.join(__dirname, 'dist')));

// ─── Rotas ───────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

require('./dev-server-routes/auth.cjs')(app);
require('./dev-server-routes/athletes.cjs')(app);
require('./dev-server-routes/matches-read.cjs')(app);
require('./dev-server-routes/matches-sessions.cjs')(app);
require('./dev-server-routes/matches-write.cjs')(app);
require('./dev-server-routes/matches-actions.cjs')(app);

// Fallback SPA
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Rota de API nao encontrada' });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

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
