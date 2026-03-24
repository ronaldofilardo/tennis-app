// frontend/src/components/AnnotationSessionPanel.tsx
// Painel de sessões de anotação — integra no ScoreboardV2.
// Permite iniciar/encerrar sessões e endossar sessões finalizadas.

import React, { useState, useEffect, useCallback } from "react";
import {
  listSessions,
  startSession,
  endSession,
  endorseSession,
  type AnnotationSession,
} from "../services/annotationSessionService";

interface AnnotationSessionPanelProps {
  matchId: string;
  matchStatus: string;
  currentUserId: string;
  userRole: string;
}

const AnnotationSessionPanel: React.FC<AnnotationSessionPanelProps> = ({
  matchId,
  matchStatus,
  currentUserId,
  userRole,
}) => {
  const [sessions, setSessions] = useState<AnnotationSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await listSessions(matchId);
      setSessions(data);
      setError(null);
    } catch {
      setError("Erro ao carregar sessões");
    } finally {
      setIsLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen, fetchSessions]);

  const activeSession = sessions.find((s) => s.isActive);

  const handleStartSession = async () => {
    try {
      setIsLoading(true);
      await startSession(matchId);
      await fetchSessions();
    } catch {
      setError("Erro ao iniciar sessão");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async (sessionId: string) => {
    try {
      setIsLoading(true);
      await endSession(matchId, sessionId);
      await fetchSessions();
    } catch {
      setError("Erro ao encerrar sessão");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndorse = async (sessionId: string) => {
    try {
      setIsLoading(true);
      await endorseSession(matchId, sessionId);
      await fetchSessions();
    } catch {
      setError("Erro ao endossar sessão");
    } finally {
      setIsLoading(false);
    }
  };

  const canAnnotate = userRole !== "SPECTATOR" && matchStatus !== "FINISHED";
  const isMySession = activeSession?.annotatorUserId === currentUserId;

  if (!isOpen) {
    return (
      <button
        className="annotation-session-toggle"
        onClick={() => setIsOpen(true)}
        style={{
          padding: "6px 12px",
          fontSize: "0.85rem",
          background: activeSession ? "#22c55e" : "#64748b",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        {activeSession
          ? `📝 Sessão ativa (${activeSession.annotator.name})`
          : "📋 Sessões"}
      </button>
    );
  }

  return (
    <div
      className="annotation-session-panel"
      style={{
        background: "#1e293b",
        borderRadius: "8px",
        padding: "16px",
        marginTop: "8px",
        color: "#e2e8f0",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <h4 style={{ margin: 0, fontSize: "1rem" }}>Sessões de Anotação</h4>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: "none",
            border: "none",
            color: "#94a3b8",
            cursor: "pointer",
            fontSize: "1.2rem",
          }}
        >
          ✕
        </button>
      </div>

      {error && (
        <div
          style={{ color: "#ef4444", marginBottom: "8px", fontSize: "0.85rem" }}
        >
          {error}
        </div>
      )}

      {/* Ações */}
      {canAnnotate && !activeSession && (
        <button
          onClick={handleStartSession}
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "8px",
            background: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: isLoading ? "wait" : "pointer",
            marginBottom: "12px",
          }}
        >
          {isLoading ? "Iniciando..." : "Iniciar Sessão de Anotação"}
        </button>
      )}

      {activeSession && isMySession && (
        <button
          onClick={() => handleEndSession(activeSession.id)}
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "8px",
            background: "#ef4444",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: isLoading ? "wait" : "pointer",
            marginBottom: "12px",
          }}
        >
          {isLoading ? "Encerrando..." : "Encerrar Minha Sessão"}
        </button>
      )}

      {/* Lista de sessões */}
      {sessions.length === 0 && !isLoading && (
        <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
          Nenhuma sessão registrada.
        </p>
      )}

      {sessions.map((session) => (
        <div
          key={session.id}
          style={{
            background: session.isActive ? "#1a3a2a" : "#0f172a",
            borderRadius: "6px",
            padding: "10px",
            marginBottom: "6px",
            border: session.isActive
              ? "1px solid #22c55e"
              : "1px solid #334155",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.85rem",
            }}
          >
            <span>
              {session.isActive ? "🟢 " : "⚪ "}
              <strong>{session.annotator.name}</strong>
            </span>
            <span style={{ color: "#94a3b8" }}>
              {new Date(session.startedAt).toLocaleTimeString("pt-BR")}
              {session.endedAt &&
                ` → ${new Date(session.endedAt).toLocaleTimeString("pt-BR")}`}
            </span>
          </div>

          {/* Endossos */}
          {session.endorsements.length > 0 && (
            <div
              style={{ marginTop: "6px", fontSize: "0.8rem", color: "#94a3b8" }}
            >
              ✅ Endossado por:{" "}
              {session.endorsements.map((e) => e.endorsedBy.name).join(", ")}
            </div>
          )}

          {/* Botão de endossar (apenas sessões encerradas, não própria) */}
          {!session.isActive &&
            session.annotatorUserId !== currentUserId &&
            !session.endorsements.some(
              (e) => e.endorsedByUserId === currentUserId,
            ) && (
              <button
                onClick={() => handleEndorse(session.id)}
                disabled={isLoading}
                style={{
                  marginTop: "6px",
                  padding: "4px 10px",
                  background: "#0ea5e9",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                }}
              >
                Endossar
              </button>
            )}
        </div>
      ))}
    </div>
  );
};

export default AnnotationSessionPanel;
