// frontend/src/components/OfflineBanner.tsx
// Exibe banner quando o app está offline e indica itens na fila de sync.

import React from "react";
import { useOfflineSync } from "../hooks/useOfflineSync";
import "./OfflineBanner.css";

const OfflineBanner: React.FC = () => {
  const { isOnline, pendingCount, isSyncing, triggerSync } = useOfflineSync();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className={`offline-banner ${isOnline ? "offline-banner--syncing" : "offline-banner--offline"}`}
      role="status"
      aria-live="polite"
    >
      <span className="offline-banner-icon">{isOnline ? "🔄" : "📵"}</span>
      <span className="offline-banner-text">
        {!isOnline && "Sem conexão — alterações serão sincronizadas ao reconectar"}
        {isOnline && isSyncing && "Sincronizando dados offline…"}
        {isOnline && !isSyncing && pendingCount > 0 && (
          <>
            {pendingCount}{" "}
            {pendingCount === 1 ? "item pendente" : "itens pendentes"} de sync
          </>
        )}
      </span>
      {isOnline && !isSyncing && pendingCount > 0 && (
        <button
          className="offline-banner-sync-btn"
          onClick={triggerSync}
          aria-label="Sincronizar agora"
        >
          Sincronizar
        </button>
      )}
    </div>
  );
};

export default OfflineBanner;
