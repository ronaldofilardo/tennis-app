// frontend/api/_lib/types.ts
// Tipos compartilhados entre todos os handlers da API

import type { IncomingMessage, ServerResponse } from 'node:http';

export interface ApiRequest extends IncomingMessage {
  body?: Record<string, unknown>;
  tenantContext?: {
    userId: string;
    email: string;
    clubId: string | null;
    role: string;
  };
}

export type ApiResponse = ServerResponse;

export interface UserContext {
  userId: string;
  email: string;
  clubId?: string;
  role?: string;
  platformRole?: string;
  planType?: string;
  subscriptionStatus?: string;
}

export function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Internal server error';
}

export function getErrorCode(err: unknown): string | undefined {
  return (err as { code?: string }).code;
}
