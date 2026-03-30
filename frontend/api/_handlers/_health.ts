// frontend/api/_handlers/_health.ts
import type { ServerResponse } from 'node:http';
import type { ApiRequest } from '../_lib/types.js';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Payload-Version',
};

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { ...corsHeaders, 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

export default async function handler(req: ApiRequest, res: ServerResponse): Promise<void> {
  Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Método não permitido' });
    return;
  }

  sendJson(res, 200, {
    status: 'ok',
    message: 'Backend RacketApp rodando na Vercel!',
    timestamp: new Date().toISOString(),
  });
}
