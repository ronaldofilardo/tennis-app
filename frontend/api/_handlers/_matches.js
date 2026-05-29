// frontend/api/_handlers/_matches.js
// Dispatcher consolidado — todas as rotas /api/matches/*
// Lógica dividida em módulos por responsabilidade:
//   _matches-helpers.js       → generateComparison, createDashboardShares, parsePath
//   _matches-special-routes.js → my-shares, my-completed, suspended, annotated, visible, discover
//   _matches-sessions.js      → /:id/sessions (iniciar, encerrar, listar, abandonar)
//   _matches-id.js            → /:id/comparison, share, state, stats, tournament, CRUD
//   _matches-root.js          → /api/matches (GET lista, POST criar)

import { handleCors, sendJson } from '../_lib/authMiddleware.js';
import { parsePath } from './_matches-helpers.js';
import { handleSpecialRoutes } from './_matches-special-routes.js';
import { handleSessionRoutes } from './_matches-sessions.js';
import { handleIdRoutes } from './_matches-id.js';
import { handleRootRoutes } from './_matches-root.js';

export default async function handler(req, res) {
  try {
    if (handleCors(req, res)) return;

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const parsedPath = parsePath(url);
    const { id, sub, isMetadata, isClaim } = parsedPath;

    // DEBUG: Log todas as requisições para matches
    console.debug(
      '[MatchesHandler] URL:',
      url.pathname,
      'Method:',
      req.method,
      'id:',
      id,
      'sub:',
      sub,
      'isMetadata:',
      isMetadata,
      'isClaim:',
      isClaim,
    );

    // 1. Rotas especiais GET (my-shares, my-completed, suspended, annotated, visible, discover)
    const specialHandled = await handleSpecialRoutes(req, res, url, parsedPath);
    if (specialHandled !== false) return;

    // 2. Rotas /:id/sessions
    if (id && sub === 'sessions') {
      return handleSessionRoutes(req, res, url, parsedPath);
    }

    // 3. Rotas /:id/comparison, share, state, stats, tournament-suggestions, CRUD
    const idHandled = await handleIdRoutes(req, res, url, parsedPath);
    if (idHandled !== false) return;

    // 4. Rotas raiz /api/matches (GET lista, POST criar)
    return handleRootRoutes(req, res, url);
  } catch (error) {
    console.error('Erro interno em matches:', error);
    const msg =
      error instanceof Error
        ? error.message
        : error != null
          ? String(error)
          : 'Internal server error';
    return sendJson(res, 500, { error: msg });
  }
}
