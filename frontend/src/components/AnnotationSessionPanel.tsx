// frontend/src/components/AnnotationSessionPanel.tsx
// Painel de sessões de anotação — integra no ScoreboardV2.
// Permite iniciar/encerrar sessões e endossar sessões finalizadas.

import React, { useState, useEffect, useCallback } from 'react';
import {
  listSessions,
  startSession,
  endSession,
  endorseSession,
  type AnnotationSession,
} from '../services/annotationSessionService';

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
      setError('Erro ao carregar sessões');
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
      setError('Erro ao iniciar sessão');
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
      setError('Erro ao encerrar sessão');
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
      setError('Erro ao endossar sessão');
    } finally {
      setIsLoading(false);
    }
  };

  const canAnnotate = userRole !== 'SPECTATOR' && matchStatus !== 'FINISHED';
  const isMySession = activeSession?.annotatorUserId === currentUserId;

  if (!isOpen) {
    return (
      <button
        className={`annotation-session-toggle cursor-pointer rounded-md border-none px-3 py-1.5 text-sm text-white ${activeSession ? 'bg-green-500' : 'bg-slate-500'}`}
        onClick={() => setIsOpen(true)}
      >
        {activeSession ? `📝 Sessão ativa (${activeSession.annotator.name})` : '📋 Sessões'}
      </button>
    );
  }

  return (
    <div className="annotation-session-panel mt-2 rounded-lg bg-slate-800 p-4 text-slate-200">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="m-0 text-base">Sessões de Anotação</h4>
        <button
          onClick={() => setIsOpen(false)}
          className="cursor-pointer border-none bg-transparent text-xl text-slate-400"
        >
          ✕
        </button>
      </div>

      {error && <div className="mb-2 text-sm text-red-500">{error}</div>}

      {/* Ações */}
      {canAnnotate && !activeSession && (
        <button
          onClick={handleStartSession}
          disabled={isLoading}
          className={`mb-3 w-full rounded-md border-none bg-blue-500 p-2 text-white ${isLoading ? 'cursor-wait' : 'cursor-pointer'}`}
        >
          {isLoading ? 'Iniciando...' : 'Iniciar Sessão de Anotação'}
        </button>
      )}

      {activeSession && isMySession && (
        <button
          onClick={() => handleEndSession(activeSession.id)}
          disabled={isLoading}
          className={`mb-3 w-full rounded-md border-none bg-red-500 p-2 text-white ${isLoading ? 'cursor-wait' : 'cursor-pointer'}`}
        >
          {isLoading ? 'Encerrando...' : 'Encerrar Minha Sessão'}
        </button>
      )}

      {/* Lista de sessões */}
      {sessions.length === 0 && !isLoading && (
        <p className="text-sm text-slate-400">Nenhuma sessão registrada.</p>
      )}

      {sessions.map((session) => (
        <div
          key={session.id}
          className={`mb-1.5 rounded-md border p-2.5 ${session.isActive ? 'border-green-500 bg-emerald-950' : 'border-slate-700 bg-slate-950'}`}
        >
          <div className="flex justify-between text-sm">
            <span>
              {session.isActive ? '🟢 ' : '⚪ '}
              <strong>{session.annotator.name}</strong>
            </span>
            <span className="text-slate-400">
              {new Date(session.startedAt).toLocaleTimeString('pt-BR')}
              {session.endedAt && ` → ${new Date(session.endedAt).toLocaleTimeString('pt-BR')}`}
            </span>
          </div>

          {/* Endossos */}
          {session.endorsements.length > 0 && (
            <div className="mt-1.5 text-xs text-slate-400">
              ✅ Endossado por: {session.endorsements.map((e) => e.endorsedBy.name).join(', ')}
            </div>
          )}

          {/* Botão de endossar (apenas sessões encerradas, não própria) */}
          {!session.isActive &&
            session.annotatorUserId !== currentUserId &&
            !session.endorsements.some((e) => e.endorsedByUserId === currentUserId) && (
              <button
                onClick={() => handleEndorse(session.id)}
                disabled={isLoading}
                className="mt-1.5 cursor-pointer rounded border-none bg-sky-500 px-2.5 py-1 text-xs text-white"
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
