// frontend/src/services/tenantMiddleware.ts
// Middleware de multi-tenancy para Vercel Serverless Functions — Fase 1
// Injeta userId, clubId e role no contexto da requisição a partir do JWT.
import { verifyToken } from './authService.js';
// Em produção configure ALLOWED_ORIGIN com o domínio real (ex: https://meuapp.vercel.app)
// SECURITY: Nunca usar '*' — que permite qualquer origem. Em dev, restringir ao
// endereço do Vite. Em produção, ALLOWED_ORIGIN deve ser configurado explicitamente.
const _allowedOriginTenant = process.env.ALLOWED_ORIGIN ??
    (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173');
export const corsHeaders = {
    'Access-Control-Allow-Origin': _allowedOriginTenant,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Club-ID, X-Tenant-Version',
};
function extractToken(req) {
    const auth = (req.headers?.authorization ?? req.headers?.['x-authorization']);
    if (!auth)
        return null;
    const parts = auth.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer')
        return parts[1] ?? null;
    return null;
}
/**
 * Middleware que valida JWT e injeta contexto de tenant na requisição.
 */
export function authMiddleware(req, res, options = { required: true }) {
    const token = extractToken(req);
    if (!token) {
        if (options.required) {
            res.writeHead(401, {
                ...corsHeaders,
                'Content-Type': 'application/json',
            });
            res.end(JSON.stringify({ error: 'Authentication required', code: 'NO_TOKEN' }));
            return { authenticated: false };
        }
        return { authenticated: false, context: null };
    }
    const result = verifyToken(token);
    if (!result.valid) {
        if (options.required) {
            const status = result.error === 'Token expired' ? 401 : 403;
            res.writeHead(status, {
                ...corsHeaders,
                'Content-Type': 'application/json',
            });
            res.end(JSON.stringify({ error: result.error, code: 'INVALID_TOKEN' }));
            return { authenticated: false };
        }
        return { authenticated: false, context: null };
    }
    const payload = result.payload;
    const context = {
        userId: payload.userId,
        email: payload.email,
        clubId: (payload.clubId ?? req.headers['x-club-id'] ?? null),
        role: (payload.role ?? 'ATHLETE'),
    };
    req.tenantContext = context;
    return { authenticated: true, context };
}
/**
 * Middleware de autorização por role.
 */
export function requireRole(req, res, allowedRoles) {
    const ctx = req.tenantContext;
    if (!ctx) {
        res.writeHead(401, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not authenticated', code: 'NO_CONTEXT' }));
        return false;
    }
    if (!allowedRoles.includes(ctx.role)) {
        res.writeHead(403, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: `Insufficient permissions. Required: ${allowedRoles.join('|')}`,
            code: 'INSUFFICIENT_ROLE',
        }));
        return false;
    }
    return true;
}
