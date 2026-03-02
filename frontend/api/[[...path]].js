// frontend/api/[...path].js
// Único ponto de entrada para toda a API — Vercel Hobby (1 função)
// Roteia: /api/auth/*, /api/matches/*, /api/clubs/*, etc.

import authHandler from "./_auth.js";
import matchesHandler from "./_matches.js";
import clubsHandler from "./_clubs.js";
import athletesHandler from "./_athletes.js";
import tournamentsHandler from "./_tournaments.js";
import adminHandler from "./_admin.js";
import webhooksHandler from "./_webhooks.js";
import cronHandler from "./_cron.js";
import healthHandler from "./_health.js";

const ROUTES = {
  auth: authHandler,
  matches: matchesHandler,
  clubs: clubsHandler,
  athletes: athletesHandler,
  tournaments: tournamentsHandler,
  admin: adminHandler,
  webhooks: webhooksHandler,
  cron: cronHandler,
  health: healthHandler,
};

export default async function handler(req, res) {
  // Extrair o módulo diretamente de req.url (mais confiável que req.query em Node.js raw)
  // URL: /api/auth/login → parts = ['api','auth','login'] → module = 'auth'
  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  // O rewrite do Vercel (/api/:path* → /api/[[...path]]) injeta "path" nos search params.
  // Remover aqui para que nenhum sub-handler veja essa chave espúria.
  parsedUrl.searchParams.delete("path");
  req.url = parsedUrl.pathname + (parsedUrl.search || "");

  const parts = parsedUrl.pathname.split("/").filter(Boolean); // remove strings vazias
  const module = parts[1]; // parts[0]='api', parts[1]='auth'|'health'|etc.

  const target = ROUTES[module];
  if (!target) {
    res.setHeader("Content-Type", "application/json");
    return res.status(404).json({ error: `Unknown API module: ${module}` });
  }

  return target(req, res);
}
