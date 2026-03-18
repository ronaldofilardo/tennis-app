// frontend/src/hooks/useOfflineSync.ts
// Detecta conectividade e dispara sync automático ao reconectar.
// Expõe { isOnline, pendingCount, isSyncing, lastSyncResult }.

import { useState, useEffect, useCallback, useRef } from "react";
import { getPendingMatches, getAllPendingPointEvents } from "../services/offlineDb";
import { syncOfflineQueue, type SyncResult } from "../services/offlineSyncService";

export interface OfflineSyncState {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncResult: SyncResult | null;
  /** Dispara sync manual */
  triggerSync: () => Promise<void>;
}

export function useOfflineSync(): OfflineSyncState {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  // Evita disparo duplo de sync
  const syncInProgress = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    const [matches, events] = await Promise.all([
      getPendingMatches(),
      getAllPendingPointEvents(),
    ]);
    setPendingCount(matches.length + events.length);
  }, []);

  const triggerSync = useCallback(async () => {
    if (syncInProgress.current || !navigator.onLine) return;
    syncInProgress.current = true;
    setIsSyncing(true);
    try {
      const result = await syncOfflineQueue();
      setLastSyncResult(result);
      await refreshPendingCount();
    } finally {
      syncInProgress.current = false;
      setIsSyncing(false);
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [triggerSync]);

  return { isOnline, pendingCount, isSyncing, lastSyncResult, triggerSync };
}
