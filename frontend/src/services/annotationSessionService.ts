// frontend/src/services/annotationSessionService.ts
// Serviço para gerenciar sessões de anotação de partidas.
// Multi-anotador: cada usuário tem sua própria sessão independente por partida.
// O "lock" exclusivo foi removido — múltiplos anotadores podem anotar simultaneamente.

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
  annotator: { id: string; name: string; email: string };
  endorsements: Array<{
    id: string;
    endorsedByUserId: string;
    endorsedAt: string;
    endorsedBy: { id: string; name: string };
  }>;
}

export async function listSessions(matchId: string): Promise<AnnotationSession[]> {
  const response = await httpClient.get(`/matches/${matchId}/sessions`);
  if (!response.ok) throw new Error('Failed to list sessions');
  return response.data as AnnotationSession[];
}

/**
 * Inicia (ou retorna) una sessão ativa para o usuário logado.
 * O backend não desativa sessões de outros anotadores.
 */
export async function startSession(matchId: string): Promise<AnnotationSession> {
  const response = await httpClient.post(`/matches/${matchId}/sessions`, {});
  if (!response.ok) throw new Error('Failed to start session');
  return response.data as AnnotationSession;
}

/**
 * Encerra a sessão e salva o snapshot final para comparativo.
 */
export async function endSession(
  matchId: string,
  sessionId: string,
  finalState?: unknown,
): Promise<AnnotationSession> {
  const response = await httpClient.patch(
    `/matches/${matchId}/sessions/${sessionId}`,
    finalState ? { finalState } : {},
  );
  if (!response.ok) throw new Error('Failed to end session');
  return response.data as AnnotationSession;
}

export async function endorseSession(matchId: string, sessionId: string): Promise<unknown> {
  const response = await httpClient.post(`/matches/${matchId}/sessions/${sessionId}/endorse`, {});
  if (!response.ok) throw new Error('Failed to endorse session');
  return response.data;
}
