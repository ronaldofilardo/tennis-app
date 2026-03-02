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
  // path param contém tudo após /api/ — ex: ["auth", "login"] ou ["health"]
  const { path = [] } = req.query;
  const module = Array.isArray(path) ? path[0] : path;

  const target = ROUTES[module];
  if (!target) {
    res.setHeader("Content-Type", "application/json");
    return res.status(404).json({ error: `Unknown API module: ${module}` });
  }

  return target(req, res);
}
