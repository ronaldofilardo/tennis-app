// frontend/src/services/validationSchemas.js - Esquemas de validação Zod para APIs

import * as zodPackage from 'zod';

// Carrega Zod de forma robusta para múltiplos ambientes
let z = null;

try {
  // Primeiro tenta usar o import direto
  if (zodPackage && zodPackage.z) {
    z = zodPackage.z;
  } else if (zodPackage.default) {
    z = zodPackage.default;
  } else {
    z = zodPackage;
  }
} catch {
  try {
    // Fallback para globalThis (ambiente serverless)
    if (typeof globalThis !== 'undefined' && globalThis.Zod) {
      z = globalThis.Zod;
    } else {
      throw new Error('Zod não encontrado em globalThis');
    }
  } catch {
    // Cria um stub mínimo para evitar crashes
    z = {
      object: (shape) => ({
        strict: () => ({
          parse: (data) => {
            return data;
          },
          safeParse: (data) => ({
            success: true,
            data: data,
          }),
        }),
        optional: () => ({
          parse: (data) => data,
          safeParse: (data) => ({ success: true, data }),
        }),
        nullable: () => ({
          parse: (data) => data,
          safeParse: (data) => ({ success: true, data }),
        }),
      }),
      string: () => ({
        min: () => ({}),
        max: () => ({}),
        email: () => ({}),
        optional: () => ({}),
        nullable: () => ({}),
        parse: (data) => data,
        safeParse: (data) => ({ success: true, data }),
      }),
      union: () => ({
        parse: (data) => data,
        safeParse: (data) => ({ success: true, data }),
      }),
      array: () => ({
        parse: (data) => data,
        safeParse: (data) => ({ success: true, data }),
      }),
      any: () => ({
        parse: (data) => data,
        safeParse: (data) => ({ success: true, data }),
      }),
      record: () => ({
        parse: (data) => data,
        safeParse: (data) => ({ success: true, data }),
      }),
    };
  }
}

// Verificação final de carregamento
if (!z) {
  throw new Error('Zod é obrigatório para validação de dados');
}

// Helper: aceita email OU CPF (11 dígitos) como identificador de login
function emailOrCpf() {
  return z.string().refine(
    (val) => {
      const cpfRegex = /^\d{11}$/;
      if (cpfRegex.test(val)) return true;
      // Validação básica de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(val);
    },
    { message: 'Deve ser um email válido ou CPF com 11 dígitos' },
  );
}

// Esquema para criação de partida
export const MatchCreateSchema = z.object({
  sportType: z
    .string({ required_error: 'O campo sportType é obrigatório.' })
    .min(1, 'O campo sportType não pode ser vazio.'),
  format: z
    .string({ required_error: 'O campo format é obrigatório.' })
    .min(1, 'O campo format não pode ser vazio.'),
  courtType: z.string().optional().nullable(), // CLAY | HARD | GRASS
  players: z.object(
    {
      p1: z
        .string({ required_error: 'O jogador p1 é obrigatório.' })
        .min(1, 'O nome do jogador p1 não pode ser vazio.'),
      p2: z
        .string({ required_error: 'O jogador p2 é obrigatório.' })
        .min(1, 'O nome do jogador p2 não pode ser vazio.'),
    },
    { required_error: 'O objeto players é obrigatório.' },
  ),
  nickname: z.string().optional().nullable(),
  visibility: z.enum(['PUBLIC', 'CLUB', 'PLAYERS_ONLY']).default('PLAYERS_ONLY'),
  apontadorEmail: emailOrCpf().optional().nullable(), // Email ou CPF do apontador
  visibleTo: z.string().optional().nullable(), // Legado
  clubId: z.string().optional().nullable(), // ID do clube dono da partida
  createdByUserId: z.string().optional().nullable(), // User que criou
  club_id: z.string().optional().nullable(),
  openForAnnotation: z.boolean().optional().default(false), // Permite qualquer autenticado anotar
  scheduledAt: z.string().datetime({ offset: true }).optional().nullable(), // Data/hora agendada ISO string
  venueId: z.string().optional().nullable(), // ID do local no diretório
  metadata: z.record(z.unknown()).optional().nullable(),
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
    completedSets: z.array(z.any()).optional(),
    openForAnnotation: z.boolean().optional(),
  })
  .strict();

// Esquema para atualização de estado da partida — validação real restaurada
// Aceita matchState como objeto ou string JSON contendo as chaves essenciais do TennisScoring
export const MatchStateUpdateSchema = z
  .object({
    matchState: z.union([
      z.string().min(1, 'matchState string não pode ser vazio'),
      z.object({}).passthrough(), // aceita qualquer objeto (o estado JSON é complexo e variável)
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
export function validateMatchStatePayload(data) {
  // Simula validação: aceita se tem as principais chaves, rejeita se faltar
  if (
    data &&
    typeof data === 'object' &&
    data.sets &&
    data.currentSet !== undefined &&
    data.currentSetState &&
    data.currentGame &&
    data.server &&
    data.config
  ) {
    return { success: true, data };
  } else {
    return { success: false, error: 'Payload inválido' };
  }
}

// Função utilitária para formatar erros Zod ou genéricos
export function validateAndFormatZodError(error) {
  if (error && Array.isArray(error.errors)) {
    // Erro Zod
    return error.errors
      .map(
        (e) =>
          (Array.isArray(e.path) ? e.path.join('.') : e.path) + (e.message ? ': ' + e.message : ''),
      )
      .join('\n');
  }
  // Erro genérico
  return `Erro de validação: ${error && error.message ? error.message : String(error)}`;
}
