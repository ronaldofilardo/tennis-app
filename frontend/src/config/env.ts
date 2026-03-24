import { z } from 'zod';

/**
 * Schema de validação para variáveis de ambiente do frontend (Vite).
 *
 * Variáveis prefixadas com VITE_ são expostas ao client-side.
 * Variáveis sem prefixo VITE_ só existem no server-side (API routes, build).
 */
const envSchema = z.object({
  // Client-side (VITE_*)
  VITE_API_URL: z.string().optional().default(''),

  // Server-side (disponíveis apenas em API routes e build)
  NODE_ENV: z.enum(['development', 'test', 'production']).optional().default('development'),

  DATABASE_URL: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

function getClientEnv(): Env {
  // Em ambiente Vite, as variáveis ficam em import.meta.env
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return envSchema.parse({
      VITE_API_URL: import.meta.env.VITE_API_URL,
      NODE_ENV: import.meta.env.MODE,
      DATABASE_URL: undefined, // Não disponível no client
    });
  }

  // Fallback para ambiente Node (testes, SSR)
  return envSchema.parse({
    VITE_API_URL: process.env.VITE_API_URL,
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
  });
}

export const env = getClientEnv();
export type { Env };
