const { PrismaClient } = require('@prisma/client');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.development') });

// Inicializar Prisma (compartilhado via globalThis)
let prisma;
if (globalThis.__prisma) {
  prisma = globalThis.__prisma;
} else {
  prisma = new PrismaClient({ log: ['query', 'error'] });
  globalThis.__prisma = prisma;
}

// Cache dos servicos ESM
let _matchService = null;
async function getMatchService() {
  if (!_matchService) {
    _matchService = await import('../src/services/matchService.ts');
  }
  return _matchService;
}

let _authService = null;
async function getAuthService() {
  if (!_authService) {
    _authService = await import('../src/services/authService.js');
  }
  return _authService;
}

async function extractCtx(req) {
  const auth = req.headers?.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const svc = await getAuthService();
  const result = svc.verifyToken(auth.split(' ')[1]);
  return result.valid ? result.payload : null;
}

module.exports = {
  prisma,
  getMatchService,
  getAuthService,
  extractCtx,
};
