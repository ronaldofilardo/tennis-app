// frontend/src/services/offlineSyncService.ts
// Processa a fila offline: envia partidas e eventos para o servidor quando
// a conexão for restabelecida. Estratégia: last-write-wins.

import {
  getPendingMatches,
  getAllPendingPointEvents,
  updatePendingMatchStatus,
  updatePointEventStatus,
} from "./offlineDb";
import httpClient from "../config/httpClient";

export interface SyncResult {
  matchesSynced: number;
  matchesFailed: number;
  eventsSynced: number;
  eventsFailed: number;
}

/**
 * Processa toda a fila offline em ordem:
 * 1. Cria partidas pendentes no servidor
 * 2. Envia eventos de ponto vinculados a cada partida
 */
export async function syncOfflineQueue(): Promise<SyncResult> {
  const result: SyncResult = {
    matchesSynced: 0,
    matchesFailed: 0,
    eventsSynced: 0,
    eventsFailed: 0,
  };

  // ── Sync partidas ────────────────────────────────────────────────────────
  const pendingMatches = await getPendingMatches();
  // Mapa tempId → serverId para substituição nos eventos
  const tempToServerId = new Map<string, string>();

  for (const pending of pendingMatches) {
    try {
      const res = await httpClient.post<{ id: string }>(
        "/matches",
        pending.matchData,
      );
      const serverId = res.data.id;
      await updatePendingMatchStatus(pending.tempId, "SYNCED", serverId);
      tempToServerId.set(pending.tempId, serverId);
      result.matchesSynced++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "sync error";
      await updatePendingMatchStatus(pending.tempId, "FAILED", undefined, msg);
      result.matchesFailed++;
    }
  }

  // ── Sync eventos de pontos ───────────────────────────────────────────────
  const pendingEvents = await getAllPendingPointEvents();

  for (const eventBatch of pendingEvents) {
    // Resolver o ID real da partida (pode ter sido sincronizado agora ou já ter serverId)
    const serverId = tempToServerId.get(eventBatch.tempMatchId);

    if (!serverId) {
      // Partida não sincronizou — não há como enviar os eventos ainda
      result.eventsFailed++;
      continue;
    }

    try {
      // Envia eventos de ponto como uma atualização de estado da partida
      await httpClient.patch(`/matches/${serverId}/state`, {
        events: eventBatch.events,
        offlineSync: true,
      });
      await updatePointEventStatus(eventBatch.id, "SYNCED");
      result.eventsSynced++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "sync error";
      await updatePointEventStatus(eventBatch.id, "FAILED", msg);
      result.eventsFailed++;
    }
  }

  return result;
}
