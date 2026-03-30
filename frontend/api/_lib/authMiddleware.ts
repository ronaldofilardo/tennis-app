// frontend/api/_lib/authMiddleware.ts
// Middleware centralizado de autenticação e autorização para API routes.

import type { ServerResponse } from 'node:http';
import { verifyToken } from '../../src/services/authService.js';
import type { ApiRequest, UserContext } from './types.js';

// Em produção configure ALLOWED_ORIGIN com o domínio real
const _allowedOrigin =
  process.env.ALLOWED_ORIGIN || (process.env.NODE_ENV === 'production' ? '' : '*');

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': _allowedOrigin,
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Club-ID, X-Payload-Version',
  ...(process.env.NODE_ENV !== 'production' ? {} : { 'Access-Control-Allow-Credentials': 'true' }),
};

/** Responde a preflight CORS (OPTIONS). Retorna true se tratou a requisição. */
export function handleCors(req: ApiRequest, res: ServerResponse): boolean {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return true;
  }
  return false;
}

/** Extrai e verifica o contexto de autenticação do request. */
export function extractContext(req: ApiRequest): UserContext | null {
  const auth = req.headers?.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const result = verifyToken(auth.split(' ')[1]);
  return result.valid ? (result.payload as UserContext) : null;
}

/** Exige autenticação. Retorna o contexto ou envia 401 e retorna null. */
export function requireAuth(req: ApiRequest, res: ServerResponse): UserContext | null {
  const ctx = extractContext(req);
  if (!ctx) {
    res.writeHead(401, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Authentication required' }));
    return null;
  }
  return ctx;
}

const ROLE_HIERARCHY = ['ADMIN', 'GESTOR', 'COACH', 'ATHLETE', 'SPECTATOR'];

/** Exige autenticação + uma das roles permitidas. Envia 401/403 automaticamente. */
export function requireRole(
  req: ApiRequest,
  res: ServerResponse,
  ...allowedRoles: string[]
): UserContext | null {
  const ctx = requireAuth(req, res);
  if (!ctx) return null;

  if (!allowedRoles.includes(ctx.role ?? '')) {
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

/** Exige que o usuário tenha acesso ao clube especificado. */
export function requireClubAccess(
  req: ApiRequest,
  res: ServerResponse,
  clubId: string,
  ...allowedRoles: string[]
): UserContext | null {
  const ctx =
    allowedRoles.length > 0 ? requireRole(req, res, ...allowedRoles) : requireAuth(req, res);

  if (!ctx) return null;

  if (ctx.role === 'ADMIN') return ctx;

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

/** Helper para enviar respostas JSON padronizadas. */
export function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  res.writeHead(statusCode, {
    ...corsHeaders,
    'Content-Type': 'application/json',
  });
  res.end(JSON.stringify(data));
}

/** Helper para enviar erro 405 Method Not Allowed. */
export function methodNotAllowed(res: ServerResponse, allowedMethods: string[] = []): void {
  sendJson(res, 405, {
    error: 'Method not allowed',
    allowed: allowedMethods,
  });
}

// Suprimir aviso de unused — ROLE_HIERARCHY está reservado para uso futuro
void ROLE_HIERARCHY;
