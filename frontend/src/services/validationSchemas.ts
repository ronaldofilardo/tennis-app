// frontend/src/services/validationSchemas.ts — Esquemas de validação Zod para APIs

import { z } from 'zod';

// Helper: aceita email OU CPF (11 dígitos) como identificador de login
function emailOrCpf() {
  return z.string().refine(
    (val) => {
      const cpfRegex = /^\d{11}$/;
      if (cpfRegex.test(val)) return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(val);
    },
    { message: 'Deve ser um email válido ou CPF com 11 dígitos' },
  );
}

// Esquema para criação de partida
export const MatchCreateSchema = z.object({
  sportType: z
    .string({ error: 'O campo sportType é obrigatório.' })
    .min(1, 'O campo sportType não pode ser vazio.'),
  format: z
    .string({ error: 'O campo format é obrigatório.' })
    .min(1, 'O campo format não pode ser vazio.'),
  courtType: z.string().optional().nullable(),
  players: z.object(
    {
      p1: z
        .string({ error: 'O jogador p1 é obrigatório.' })
        .min(1, 'O nome do jogador p1 não pode ser vazio.'),
      p2: z
        .string({ error: 'O jogador p2 é obrigatório.' })
        .min(1, 'O nome do jogador p2 não pode ser vazio.'),
    },
    { error: 'O objeto players é obrigatório.' },
  ),
  nickname: z.string().optional().nullable(),
  visibility: z.enum(['PUBLIC', 'CLUB', 'PLAYERS_ONLY']).default('PLAYERS_ONLY'),
  apontadorEmail: emailOrCpf().optional().nullable(),
  visibleTo: z.string().optional().nullable(),
  clubId: z.string().optional().nullable(),
  createdByUserId: z.string().optional().nullable(),
  club_id: z.string().optional().nullable(),
  openForAnnotation: z.boolean().optional().default(false),
  scheduledAt: z.string().datetime({ offset: true }).optional().nullable(),
  venueId: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  _meta: z
    .object({
      payloadVersion: z.string().optional(),
      clientTimestamp: z.string().optional(),
      clubId: z.string().nullable().optional(),
    })
    .optional()
    .nullable(),
});

// Esquema para atualização de partida
export const MatchUpdateSchema = z
  .object({
    score: z.string().optional(),
    winner: z.string().nullable().optional(),
    completedSets: z.array(z.unknown()).optional(),
    openForAnnotation: z.boolean().optional(),
  })
  .strict();

// Esquema para atualização de estado da partida
export const MatchStateUpdateSchema = z
  .object({
    matchState: z.union([
      z.string().min(1, 'matchState string não pode ser vazio'),
      z.object({}).passthrough(),
    ]),
  })
  .strict();

// Esquema para parâmetros de query de matches visíveis
export const VisibleMatchesQuerySchema = z
  .object({
    email: emailOrCpf().optional(),
    role: z.string().optional(),
  })
  .strict();

// Esquema para ID de partida (parâmetro de rota)
export const MatchIdSchema = z
  .string()
  .min(1, 'ID da partida não pode ser vazio')
  .max(100, 'ID da partida muito longo');

// Função utilitária para validar payload de estado de partida
export function validateMatchStatePayload(data: unknown): {
  success: boolean;
  data?: unknown;
  error?: string;
} {
  if (
    data &&
    typeof data === 'object' &&
    'sets' in data &&
    'currentSet' in data &&
    'currentSetState' in data &&
    'currentGame' in data &&
    'server' in data &&
    'config' in data
  ) {
    return { success: true, data };
  }
  return { success: false, error: 'Payload inválido' };
}

// Função utilitária para formatar erros Zod ou genéricos
export function validateAndFormatZodError(
  error: { errors?: Array<{ path?: string | string[]; message?: string }> } | Error | unknown,
): string {
  if (
    error &&
    typeof error === 'object' &&
    'errors' in error &&
    Array.isArray((error as { errors: unknown[] }).errors)
  ) {
    const zodError = error as { errors: Array<{ path?: string | string[]; message?: string }> };
    return zodError.errors
      .map(
        (e) =>
          (Array.isArray(e.path) ? e.path.join('.') : (e.path ?? '')) +
          (e.message ? ': ' + e.message : ''),
      )
      .join('\n');
  }
  const err = error as { message?: string };
  return `Erro de validação: ${err?.message ?? String(error)}`;
}
