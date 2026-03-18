// frontend/src/services/offlineDb.ts
// Camada de persistência local via IndexedDB (idb).
// Armazena partidas e eventos de ponto criados offline.

import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "racket-offline";
const DB_VERSION = 1;

export type SyncStatus = "PENDING" | "SYNCED" | "FAILED";

export interface PendingMatch {
  /** ID temporário local — substituído pelo ID real após sync */
  tempId: string;
  matchData: Record<string, unknown>;
  syncStatus: SyncStatus;
  createdAt: number;
  /** ID real do servidor após sync bem-sucedido */
  serverId?: string;
  errorMessage?: string;
}

export interface PendingPointEvent {
  id: string;
  /** tempId da partida correspondente */
  tempMatchId: string;
  events: Array<{
    type: string;
    player: string;
    timestamp: number;
    extra?: Record<string, unknown>;
  }>;
  syncStatus: SyncStatus;
  createdAt: number;
  errorMessage?: string;
}

let _db: IDBPDatabase | null = null;

async function getDb(): Promise<IDBPDatabase> {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("pendingMatches")) {
        const matchStore = db.createObjectStore("pendingMatches", {
          keyPath: "tempId",
        });
        matchStore.createIndex("syncStatus", "syncStatus");
      }
      if (!db.objectStoreNames.contains("pendingPointEvents")) {
        const eventsStore = db.createObjectStore("pendingPointEvents", {
          keyPath: "id",
        });
        eventsStore.createIndex("tempMatchId", "tempMatchId");
        eventsStore.createIndex("syncStatus", "syncStatus");
      }
    },
  });
  return _db;
}

// ── pendingMatches ──────────────────────────────────────────────────────────

export async function savePendingMatch(match: PendingMatch): Promise<void> {
  const db = await getDb();
  await db.put("pendingMatches", match);
}

export async function getPendingMatches(): Promise<PendingMatch[]> {
  const db = await getDb();
  return db.getAllFromIndex("pendingMatches", "syncStatus", "PENDING");
}

export async function updatePendingMatchStatus(
  tempId: string,
  syncStatus: SyncStatus,
  serverId?: string,
  errorMessage?: string,
): Promise<void> {
  const db = await getDb();
  const existing = await db.get("pendingMatches", tempId);
  if (!existing) return;
  await db.put("pendingMatches", {
    ...existing,
    syncStatus,
    ...(serverId ? { serverId } : {}),
    ...(errorMessage ? { errorMessage } : {}),
  });
}

// ── pendingPointEvents ──────────────────────────────────────────────────────

export async function savePendingPointEvent(
  event: PendingPointEvent,
): Promise<void> {
  const db = await getDb();
  await db.put("pendingPointEvents", event);
}

export async function getPendingPointEvents(
  tempMatchId: string,
): Promise<PendingPointEvent[]> {
  const db = await getDb();
  return db.getAllFromIndex("pendingPointEvents", "tempMatchId", tempMatchId);
}

export async function getAllPendingPointEvents(): Promise<PendingPointEvent[]> {
  const db = await getDb();
  return db.getAllFromIndex("pendingPointEvents", "syncStatus", "PENDING");
}

export async function updatePointEventStatus(
  id: string,
  syncStatus: SyncStatus,
  errorMessage?: string,
): Promise<void> {
  const db = await getDb();
  const existing = await db.get("pendingPointEvents", id);
  if (!existing) return;
  await db.put("pendingPointEvents", {
    ...existing,
    syncStatus,
    ...(errorMessage ? { errorMessage } : {}),
  });
}
