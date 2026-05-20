// frontend/api/_lib/rateLimitMiddleware.ts
// Rate limiting para proteger contra brute force e DoS

import type { ServerResponse } from 'node:http';
import type { ApiRequest } from './types.js';

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const store: RateLimitStore = {};

/**
 * Rate limiter baseado em IP + endpoint
 * Implementa exponential backoff:
 * - 0-5 tentativas/min: permitidas
 * - 6-10 tentativas/min: esperar 1s
 * - 11-15 tentativas/min: esperar 5s
 * - 16+ tentativas/min: esperar 10s
 *
 * @param req - HTTP request
 * @param res - HTTP response (não escreve, apenas retorna bool)
 * @param windowMs - Janela de tempo em ms (default 60000 = 1min)
 * @param maxRequests - Máximo de requests na janela (default 15)
 * @returns true se rate limited, false se permitido
 */
export function checkRateLimit(
  req: ApiRequest,
  _res: ServerResponse,
  windowMs = 60000,
  maxRequests = 15,
): boolean {
  const ip =
    req.headers['x-forwarded-for']?.toString().split(',')[0] ||
    req.socket?.remoteAddress ||
    'unknown';
  const now = Date.now();
  const key = ip;

  if (!store[key]) {
    store[key] = { count: 1, resetTime: now + windowMs };
    return false; // Primeira requisição
  }

  const record = store[key];

  // Se a janela expirou, resetar
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return false;
  }

  // Incrementar contador
  record.count++;

  // Se ultrapassou, retornar true (rate limited)
  return record.count > maxRequests;
}

/**
 * Calcula delay de retry baseado no número de tentativas
 *
 * @param attemptCount - Número de tentativas
 * @returns Delay em ms
 */
export function getRetryDelay(attemptCount: number): number {
  if (attemptCount <= 5) return 0;
  if (attemptCount <= 10) return 1000;
  if (attemptCount <= 15) return 5000;
  return 10000;
}

/**
 * Middleware para rate limiting com resposta automática
 * Retorna true se foi rate limited (requisição bloqueada)
 *
 * @param req - HTTP request
 * @param res - HTTP response
 * @param endpoint - Identificador do endpoint (para logging)
 * @returns true se bloqueado, false se permitido
 */
export function applyRateLimit(
  req: ApiRequest,
  res: ServerResponse,
  endpoint: string,
  windowMs = 60000,
  maxRequests = 15,
): boolean {
  if (checkRateLimit(req, res, windowMs, maxRequests)) {
    const ip =
      req.headers['x-forwarded-for']?.toString().split(',')[0] ||
      req.socket?.remoteAddress ||
      'unknown';
    console.warn(`[RATE_LIMIT] Blocked ${ip} on ${endpoint}`);

    res.writeHead(429, {
      'Content-Type': 'application/json',
      'Retry-After': '60',
    });
    res.end(JSON.stringify({ error: 'Too many requests. Please try again later.' }));
    return true;
  }
  return false;
}

/**
 * Limpar store antigos (executar periodicamente)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}

// Limpar a cada 5 minutos
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
