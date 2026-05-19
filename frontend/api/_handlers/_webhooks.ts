// frontend/api/_handlers/_webhooks.ts
import type { ServerResponse } from 'node:http';
import { corsHeaders, sendJson } from '../_lib/authMiddleware.js';
import type { ApiRequest } from '../_lib/types.js';

function validateWebhookAuth(req: ApiRequest): boolean {
  const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!webhookToken) {
    console.warn('[webhooks] ASAAS_WEBHOOK_TOKEN not configured — stub mode');
    return true;
  }
  return req.headers['asaas-access-token'] === webhookToken;
}

export default async function handler(req: ApiRequest, res: ServerResponse): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  if (!validateWebhookAuth(req)) {
    console.error('[webhooks] Invalid webhook token');
    return sendJson(res, 401, { error: 'Invalid webhook token' });
  }

  try {
    console.log('[webhooks] Webhook received (subscription handling removed)');
    return sendJson(res, 200, { received: true, message: 'Subscription webhooks no longer processed' });
  } catch (err) {
    console.error('[webhooks] Error:', err);
    return sendJson(res, 500, { error: 'Internal server error' });
  }
}

