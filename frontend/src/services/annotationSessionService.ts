// frontend/src/services/annotationSessionService.ts
// Serviço para gerenciar sessões de anotação de partidas.
// Resolve problema C4 (split-brain placar) do plano arquitetural.

import httpClient from "../config/httpClient";

export interface AnnotationSession {
  id: string;
  matchId: string;
  annotatorUserId: string;
  startedAt: string;
  endedAt: string | null;
  matchStateSnapshot: string | null;
  isActive: boolean;
  createdAt: string;
  annotator: { id: string; name: string; email: string };
  endorsements: Array<{
    id: string;
    endorsedByUserId: string;
    endorsedAt: string;
    endorsedBy: { id: string; name: string };
  }>;
}

export async function listSessions(
  matchId: string,
): Promise<AnnotationSession[]> {
  const response = await httpClient.get(`/matches/${matchId}/sessions`);
  if (!response.ok) throw new Error("Failed to list sessions");
  return response.data as AnnotationSession[];
}

export async function startSession(
  matchId: string,
): Promise<AnnotationSession> {
  const response = await httpClient.post(`/matches/${matchId}/sessions`, {});
  if (!response.ok) throw new Error("Failed to start session");
  return response.data as AnnotationSession;
}

export async function endSession(
  matchId: string,
  sessionId: string,
): Promise<AnnotationSession> {
  const response = await httpClient.patch(
    `/matches/${matchId}/sessions/${sessionId}`,
    {},
  );
  if (!response.ok) throw new Error("Failed to end session");
  return response.data as AnnotationSession;
}

export async function endorseSession(
  matchId: string,
  sessionId: string,
): Promise<unknown> {
  const response = await httpClient.post(
    `/matches/${matchId}/sessions/${sessionId}/endorse`,
    {},
  );
  if (!response.ok) throw new Error("Failed to endorse session");
  return response.data;
}
