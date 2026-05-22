// src/core/scoring/TennisSyncService.ts
// Stateless network sync function extracted from TennisScoring to reduce class size.
// Handles PATCH /matches/:id/state with timeout and auth token injection.

import { API_URL } from '../../config/api';
import type { EnhancedMatchState } from './types';

export interface SyncMatchStateParams {
  matchId: string;
  state: EnhancedMatchState;
  tokenProvider: (() => string | null) | null;
}

/**
 * Syncs match state to the backend.
 * Throws on HTTP error or network timeout (5 seconds).
 */
export async function syncMatchState(params: SyncMatchStateParams): Promise<boolean> {
  const { matchId, state, tokenProvider } = params;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  const url = `${API_URL}/matches/${matchId}/state`;
  const token = tokenProvider ? tokenProvider() : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ matchState: state }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
    }

    await response.json();
    return true;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
