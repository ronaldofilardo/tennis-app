// frontend/src/services/annotationSessionService.ts
// Serviço para gerenciar sessões de anotação de partidas.
// Multi-anotador: cada usuário tem sua própria sessão independente por partida.
// O "lock" exclusivo foi removido — múltiplos anotadores podem anotar simultaneamente.

import { API_URL } from '../config/api';
import { httpClient } from '../config/httpClient';

export interface AnnotationSession {
  id: string;
  matchId: string;
  annotatorUserId: string;
  startedAt: string;
  endedAt: string | null;
  matchStateSnapshot: string | null;
  finalStateSnapshot: string | null;
  isActive: boolean;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  createdAt: string;
  annotator?: { id?: string; name?: string | null; email?: string };
  endorsements?: Array<{
    id: string;
    endorsedByUserId: string;
    endorsedAt: string;
    endorsedBy?: { id: string; name?: string };
  }>;
}

export async function listSessions(matchId: string): Promise<AnnotationSession[]> {
  const response = await httpClient.get(`/matches/${matchId}/sessions`);
  if (!response.ok) throw new Error('Failed to list sessions');
  return response.data as AnnotationSession[];
}

/**
 * Inicia (ou retorna) uma sessão ativa para o usuário logado.
 * O backend não desativa sessões de outros anotadores.
 *
 * @param autoStarted - true quando chamado automaticamente ao carregar o scoreboard.
 *   Quando true, sessões suspensas (isActive=false) NÃO são reativadas, mantendo
 *   a partida visível em "anotações suspensas" no dashboard.
 *   Passe false (ou omita) para retomar explicitamente uma sessão suspensa.
 */
export async function startSession(
  matchId: string,
  autoStarted = false,
): Promise<AnnotationSession> {
  const response = await httpClient.post(`/matches/${matchId}/sessions`, { autoStarted });
  if (!response.ok) throw new Error('Failed to start session');
  return response.data as AnnotationSession;
}

/**
 * Encerra a sessão e salva o snapshot final para comparativo.
 * Status padrão: ABANDONED (permite que anotações suspensas retomadas e fechadas apareçam no dashboard)
 */
export async function endSession(
  matchId: string,
  sessionId: string,
  finalState?: unknown,
  status: 'COMPLETED' | 'ABANDONED' = 'ABANDONED',
): Promise<AnnotationSession> {
  const response = await httpClient.patch(`/matches/${matchId}/sessions/${sessionId}`, {
    status,
    ...(finalState ? { finalState } : {}),
  });
  if (!response.ok) throw new Error('Failed to end session');
  return response.data as AnnotationSession;
}

export async function endorseSession(matchId: string, sessionId: string): Promise<unknown> {
  const response = await httpClient.post(`/matches/${matchId}/sessions/${sessionId}/endorse`, {});
  if (!response.ok) throw new Error('Failed to endorse session');
  return response.data;
}

/**
 * Marca uma sessão como ABANDONED de forma confiável em produção.
 * Suporta dois transportes:
 * - 'keepalive': usa fetch com keepalive=true (confiável em unload/navegação SPA)
 * - 'patch': usa httpClient.patch (para fluxos síncronos)
 *
 * Fire-and-forget: chamadas não aguardam resposta por design.
 */
export interface MarkSessionAbandonedInput {
  matchId: string;
  sessionId: string;
  matchStateSnapshot: string;
  transport?: 'keepalive' | 'patch';
}

export async function markSessionAbandoned({
  matchId,
  sessionId,
  matchStateSnapshot,
  transport = 'patch',
}: MarkSessionAbandonedInput): Promise<void> {
  if (transport === 'keepalive') {
    // Use fetch com keepalive para sobreviver a unload/navegação
    const token = httpClient.getAuthConfig().token;
    const url = `${API_URL}/matches/${matchId}/sessions/${sessionId}/abandon`;

    try {
      fetch(url, {
        method: 'POST',
        keepalive: true,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ matchStateSnapshot }),
      }).catch(() => {
        // Silent fail em keepalive — não se pode fazer muito
      });
    } catch {
      // Silent fail em fetch
    }
    return;
  }

  // Fallback para PATCH via httpClient (síncrono, para lógica crítica)
  const response = await httpClient.patch(`/matches/${matchId}/sessions/${sessionId}`, {
    status: 'ABANDONED',
    isActive: false,
    matchStateSnapshot,
  });

  if (!response.ok) {
    throw new Error('Failed to mark session as abandoned');
  }
}
