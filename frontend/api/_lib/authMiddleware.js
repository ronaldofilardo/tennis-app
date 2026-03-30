// frontend/api/_lib/authMiddleware.js
// Middleware centralizado de autenticação e autorização para API routes.
// Substitui as N cópias de extractContext() espalhadas pelos handlers.

import { verifyToken } from '../../src/services/authService.js';

// ============================================================
// CORS Headers reutilizáveis
// ============================================================

// Em produção configure ALLOWED_ORIGIN com o domínio real (ex: https://meuapp.vercel.app)
// Nunca use "*" em produção — viola a política de credentials: 'include'
const _allowedOrigin =
  process.env.ALLOWED_ORIGIN || (process.env.NODE_ENV === 'production' ? '' : '*');

export const corsHeaders = {
  'Access-Control-Allow-Origin': _allowedOrigin,
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Club-ID, X-Payload-Version',
  ...(process.env.NODE_ENV !== 'production' ? {} : { 'Access-Control-Allow-Credentials': 'true' }),
};

/**
 * Responde a preflight CORS (OPTIONS).
 * @param {import('http').ServerResponse} res
 */
export function handleCors(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return true;
  }
  return false;
}

// ============================================================
// Extração de contexto do JWT
// ============================================================

/**
 * Extrai e verifica o contexto de autenticação do request.
 * @param {import('http').IncomingMessage} req
 * @returns {{ userId: string, email: string, clubId?: string, role?: string, planType?: string, subscriptionStatus?: string } | null}
 */
export function extractContext(req) {
  const auth = req.headers?.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const result = verifyToken(auth.split(' ')[1]);
  return result.valid ? result.payload : null;
}

// ============================================================
// Guards de autenticação e autorização
// ============================================================

/**
 * Exige autenticação. Retorna o contexto ou envia 401 e retorna null.
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {{ userId: string, email: string, clubId?: string, role?: string } | null}
 */
export function requireAuth(req, res) {
  const ctx = extractContext(req);
  if (!ctx) {
    res.writeHead(401, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Authentication required' }));
    return null;
  }
  return ctx;
}

/**
 * Hierarquia de roles (da mais alta para a mais baixa).
 * Usado por requireRole para verificar role mínima.
 */
const ROLE_HIERARCHY = ['ADMIN', 'GESTOR', 'COACH', 'ATHLETE', 'SPECTATOR'];

/**
 * Exige autenticação + uma das roles permitidas.
 * Envia 401 (não autenticado) ou 403 (sem permissão) automaticamente.
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {...string} allowedRoles — Roles permitidas (ex: "GESTOR", "ADMIN")
 * @returns {{ userId: string, email: string, clubId?: string, role?: string } | null}
 */
export function requireRole(req, res, ...allowedRoles) {
  const ctx = requireAuth(req, res);
  if (!ctx) return null; // 401 já enviado

  if (!allowedRoles.includes(ctx.role)) {
    res.writeHead(403, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: ctx.role,
      }),
    );
    return null;
  }
  return ctx;
}

/**
 * Exige que o usuário tenha acesso ao clube especificado.
 * Verifica se o clubId do JWT corresponde ao clubId do request.
 * ADMIN bypassa esta verificação.
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {string} clubId — ID do clube que está sendo acessado
 * @param {...string} allowedRoles — Roles permitidas (opcional, padrão: qualquer autenticado)
 * @returns {{ userId: string, email: string, clubId?: string, role?: string } | null}
 */
export function requireClubAccess(req, res, clubId, ...allowedRoles) {
  const ctx =
    allowedRoles.length > 0 ? requireRole(req, res, ...allowedRoles) : requireAuth(req, res);

  if (!ctx) return null; // 401 ou 403 já enviado

  // ADMIN tem acesso a qualquer clube
  if (ctx.role === 'ADMIN') return ctx;

  // Verificar se o clube do JWT corresponde ao clube solicitado
  if (ctx.clubId !== clubId) {
    res.writeHead(403, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'Access denied to this club',
        detail: 'You can only access data from your active club',
      }),
    );
    return null;
  }

  return ctx;
}

/**
 * Helper para enviar respostas JSON padronizadas.
 * @param {import('http').ServerResponse} res
 * @param {number} statusCode
 * @param {object} data
 */
export function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    ...corsHeaders,
    'Content-Type': 'application/json',
  });
  res.end(JSON.stringify(data));
}

/**
 * Helper para enviar erro 405 Method Not Allowed.
 * @param {import('http').ServerResponse} res
 * @param {string[]} allowedMethods
 */
export function methodNotAllowed(res, allowedMethods = []) {
  sendJson(res, 405, {
    error: 'Method not allowed',
    allowed: allowedMethods,
  });
}
