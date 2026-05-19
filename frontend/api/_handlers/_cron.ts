// frontend/api/_handlers/_cron.ts
import type { ServerResponse } from 'node:http';
import { sendJson } from '../_lib/authMiddleware.js';
import type { ApiRequest } from '../_lib/types.js';

function validateCronAuth(req: ApiRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.warn('[cron] CRON_SECRET not configured — dev mode');
    return process.env.NODE_ENV === 'development';
  }
  return req.headers?.authorization === `Bearer ${cronSecret}`;
}

export default async function handler(req: ApiRequest, res: ServerResponse): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  if (!validateCronAuth(req)) {
    return sendJson(res, 401, { error: 'Unauthorized' });
  }

  try {
    console.log('[cron] Cron job executed (subscription check removed)');
    return sendJson(res, 200, {
      success: true,
      timestamp: new Date().toISOString(),
      message: 'Subscription checks no longer performed',
    });
  } catch (err) {
    console.error('[cron] Error:', err);
    return sendJson(res, 500, {
      error: 'Error in cron job',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
