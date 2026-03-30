// frontend/api/_handlers/_venues.js
// Router — /api/venues
//   GET  /api/venues       → lista todos os locais (busca opcional ?q=nome)
//   POST /api/venues       → cria novo local

import { handleCors, extractContext, sendJson, methodNotAllowed } from '../_lib/authMiddleware.js';
import prisma from '../_lib/prisma.js';

export default async function venuesHandler(req, res) {
  if (handleCors(req, res)) return;

  const ctx = await extractContext(req);
  if (!ctx) return sendJson(res, 401, { error: 'Authentication required' });

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url, 'http://localhost');
      const q = url.searchParams.get('q')?.trim() ?? '';
      const venues = await prisma.venue.findMany({
        where: q ? { name: { contains: q, mode: 'insensitive' } } : undefined,
        orderBy: { name: 'asc' },
        take: 20,
        select: { id: true, name: true, address: true, city: true },
      });
      return sendJson(res, 200, venues);
    }

    if (req.method === 'POST') {
      const { name, address, city } = req.body ?? {};
      if (!name?.trim()) {
        return sendJson(res, 400, { error: 'O nome do local é obrigatório' });
      }
      const venue = await prisma.venue.create({
        data: {
          name: name.trim(),
          address: address?.trim() || null,
          city: city?.trim() || null,
          createdByUserId: ctx.userId,
        },
        select: { id: true, name: true, address: true, city: true },
      });
      return sendJson(res, 201, venue);
    }

    return methodNotAllowed(res, ['GET', 'POST']);
  } catch (error) {
    console.error('[/api/venues] Erro:', error);
    return sendJson(res, 500, { error: 'Erro interno ao processar locais' });
  }
}
