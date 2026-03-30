// frontend/src/services/businessLogic.ts - Lógica de negócio compartilhada
import { PrismaClient } from '@prisma/client';
// Cache de conexão Prisma otimizado para serverless
let prisma;
if (globalThis.__prisma) {
    prisma = globalThis.__prisma;
}
else {
    prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
    });
    globalThis.__prisma = prisma;
}
// Função compartilhada para buscar partida por ID com validação
export async function findMatchById(id) {
    const match = await prisma.match.findUnique({
        where: { id },
        select: {
            id: true,
            sportType: true,
            format: true,
            playerP1: true,
            playerP2: true,
            status: true,
            score: true,
            winner: true,
            completedSets: true,
            createdAt: true,
            matchState: true,
        },
    });
    if (!match) {
        throw Object.assign(new Error('Partida não encontrada'), { statusCode: 404 });
    }
    return match;
}
// Função compartilhada para parse seguro do matchState
export function safeParseMatchState(matchStateString) {
    if (!matchStateString)
        return null;
    try {
        return JSON.parse(matchStateString);
    }
    catch {
        return {};
    }
}
// Função compartilhada para parse seguro do completedSets
export function safeParseCompletedSets(completedSetsString) {
    if (!completedSetsString)
        return [];
    try {
        return JSON.parse(completedSetsString);
    }
    catch {
        return [];
    }
}
// Função compartilhada para determinar status da partida baseado no estado
export function determineMatchStatus(match, parsedState) {
    let status = match.status;
    if (parsedState && status === 'NOT_STARTED') {
        const isFinished = Boolean(parsedState.isFinished || parsedState.winner || parsedState.endedAt);
        const inProgressIndicators = Boolean(parsedState.startedAt ||
            parsedState.server ||
            parsedState.currentGame ||
            parsedState.currentSetState);
        if (isFinished) {
            status = 'FINISHED';
        }
        else if (inProgressIndicators) {
            status = 'IN_PROGRESS';
        }
    }
    return status;
}
// Função compartilhada para formatar resposta de partida
export function formatMatchResponse(match, parsedState = null, completedSets = null) {
    const state = parsedState ?? safeParseMatchState(match.matchState);
    const sets = completedSets ?? safeParseCompletedSets(match.completedSets);
    const status = determineMatchStatus(match, state);
    return {
        id: match.id,
        sportType: match.sportType,
        format: match.format,
        players: { p1: match.playerP1, p2: match.playerP2 },
        status,
        score: match.score,
        winner: match.winner,
        completedSets: sets,
        createdAt: match.createdAt ? match.createdAt.toISOString() : undefined,
        matchState: state,
        visibleTo: state?.visibleTo ?? 'both',
    };
}
// Função compartilhada para headers CORS
// SECURITY: Nunca usar '*' — que permite qualquer origem. Em dev, restringir ao
// endereço do Vite. Em produção, ALLOWED_ORIGIN deve ser configurado explicitamente.
const _allowedOriginBL = process.env.ALLOWED_ORIGIN ??
    (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173');
export const corsHeaders = {
    'Access-Control-Allow-Origin': _allowedOriginBL,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
// Função compartilhada para timeout de 8 segundos (Vercel)
export function createTimeoutHandler(res) {
    return setTimeout(() => {
        res.status(504).json({ error: 'Timeout na requisição' });
    }, 8000);
}
// Função compartilhada para lidar com CORS preflight
export function handleCors(res) {
    Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));
}
// Função compartilhada para tratamento de erros
export function handleApiError(error, res, timeout, _context = '') {
    clearTimeout(timeout);
    const statusCode = error?.statusCode ?? 500;
    const errorResponse = {
        error: error?.message ?? 'Erro interno',
        ...(error?.details ? { details: error.details } : {}),
    };
    res.status(statusCode).json(errorResponse);
}
