// frontend/src/services/tenantMiddleware.js
// Middleware de multi-tenancy para Vercel Serverless Functions — Fase 1
// Injeta userId, clubId e role no contexto da requisição a partir do JWT.

import { verifyToken } from "./authService.js";

/**
 * Headers CORS padrão para todas as respostas.
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Club-ID, X-Tenant-Version",
};

/**
 * Extrai o token JWT do header Authorization.
 * @param {import('http').IncomingMessage} req
 * @returns {string|null}
 */
function extractToken(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization;
  if (!auth) return null;
  const parts = auth.split(" ");
  if (parts.length === 2 && parts[0] === "Bearer") return parts[1];
  return null;
}

/**
 * Resultado do middleware de autenticação.
 * @typedef {{ userId: string, email: string, clubId: string|null, role: string }} TenantContext
 */

/**
 * Middleware que valida JWT e injeta contexto de tenant na requisição.
 * Rotas públicas podem passar `{ required: false }` para tornar auth opcional.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {{ required?: boolean }} options
 * @returns {{ authenticated: boolean, context?: TenantContext }}
 */
export function authMiddleware(req, res, options = { required: true }) {
  const token = extractToken(req);

  if (!token) {
    if (options.required) {
      res.writeHead(401, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      res.end(
        JSON.stringify({ error: "Authentication required", code: "NO_TOKEN" }),
      );
      return { authenticated: false };
    }
    return { authenticated: false, context: null };
  }

  const result = verifyToken(token);

  if (!result.valid) {
    if (options.required) {
      const status = result.error === "Token expired" ? 401 : 403;
      res.writeHead(status, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      res.end(JSON.stringify({ error: result.error, code: "INVALID_TOKEN" }));
      return { authenticated: false };
    }
    return { authenticated: false, context: null };
  }

  const context = {
    userId: result.payload.userId,
    email: result.payload.email,
    clubId: result.payload.clubId || req.headers["x-club-id"] || null,
    role: result.payload.role || "ATHLETE",
  };

  // Injeta no request para handlers subsequentes
  req.tenantContext = context;

  return { authenticated: true, context };
}

/**
 * Middleware de autorização por role.
 * Deve ser chamado APÓS authMiddleware.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {string[]} allowedRoles - Roles permitidas (ex: ['ADMIN', 'COACH'])
 * @returns {boolean} true se autorizado
 */
export function requireRole(req, res, allowedRoles) {
  const ctx = req.tenantContext;
  if (!ctx) {
    res.writeHead(401, { ...corsHeaders, "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not authenticated", code: "NO_CONTEXT" }));
    return false;
  }

  if (!allowedRoles.includes(ctx.role)) {
    res.writeHead(403, { ...corsHeaders, "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: `Insufficient permissions. Required: ${allowedRoles.join("|")}`,
        code: "INSUFFICIENT_ROLE",
      }),
    );
    return false;
  }

  return true;
}

/**
 * Middleware que garante que a query filtra pelo clubId do contexto.
 * Previne IDOR (Insecure Direct Object Reference) entre clubes.
 *
 * @param {TenantContext} ctx
 * @param {object} prismaWhere - cláusula where do Prisma
 * @returns {object} where com clubId injetado
 */
export function enforceClubScope(ctx, prismaWhere = {}) {
  if (!ctx?.clubId) return prismaWhere; // Partida pública, sem escopo

  return {
    ...prismaWhere,
    clubId: ctx.clubId,
  };
}

/**
 * Handler wrapper que adiciona CORS + auth a qualquer handler de API.
 * Uso: export default withAuth(handler, { required: true, roles: ['ADMIN'] })
 *
 * @param {Function} handler - (req, res, context) => void
 * @param {{ required?: boolean, roles?: string[] }} options
 * @returns {Function}
 */
export function withAuth(handler, options = {}) {
  return async (req, res) => {
    // CORS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }

    const { required = true, roles } = options;
    const auth = authMiddleware(req, res, { required });

    if (required && !auth.authenticated) return; // Resposta já enviada

    if (auth.authenticated && roles) {
      if (!requireRole(req, res, roles)) return; // Resposta já enviada
    }

    try {
      await handler(req, res, auth.context);
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, {
          ...corsHeaders,
          "Content-Type": "application/json",
        });
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
    }
  };
}
