// src/hooks/useMatchLifecycleHandlers.ts
// Handles match lifecycle: start session (setup confirm), end match, stats, and cleanup.

import { useCallback, useEffect } from 'react';
import { TennisScoring } from '../core/scoring/TennisScoring';
import type { Player, TennisFormat } from '../core/scoring/types';
import { getErrorMessage } from '../types/errors';
import { httpClient } from '../config/httpClient';
import { endSession, markSessionAbandoned } from '../services/annotationSessionService';
import type { ScoreboardHandlerDeps } from './ScoreboardHandlerDeps';

export function useMatchLifecycleHandlers(deps: ScoreboardHandlerDeps) {
  const {
    scoringSystemRef,
    matchData,
    setError,
    matchId,
    matchIdRef,
    annotationSessionIdRef,
    scoreLog,
    dispatch,
    onEndMatch,
  } = deps;

  const getSystem = () => scoringSystemRef.current;

  const handleEndMatch = useCallback(async () => {
    const sys = getSystem();
    let finalState: unknown = undefined;

    if (sys) {
      try {
        if (matchData?.status && matchData.status !== 'NOT_STARTED') {
          await sys.syncState();
        }
        finalState = sys.getState();
        scoreLog.debug('Estado final capturado com sucesso', {
          matchId: matchIdRef.current,
          hasPointsHistory: !!(finalState as { pointsHistory?: unknown[] })?.pointsHistory,
          pointsCount: (finalState as { pointsHistory?: unknown[] })?.pointsHistory?.length ?? 0,
        });
      } catch (err: unknown) {
        scoreLog.warn('Falha no syncState ao encerrar partida (tentando capturar estado local)', {
          matchId: matchIdRef.current,
          error: getErrorMessage(err),
        });
        try {
          finalState = sys.getState();
        } catch {
          scoreLog.warn('Falha ao capturar estado local', { matchId: matchIdRef.current });
        }
      }
    }

    const sessionId = annotationSessionIdRef.current;
    const currentMatchId = matchIdRef.current;
    if (sessionId && currentMatchId) {
      try {
        await endSession(currentMatchId, sessionId, finalState);
        scoreLog.info('Sessão de anotação encerrada com sucesso', {
          matchId: currentMatchId,
          sessionId,
          hasFinalState: !!finalState,
        });
      } catch (err) {
        scoreLog.warn('Falha ao encerrar sessão de anotação', {
          matchId: currentMatchId,
          sessionId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      annotationSessionIdRef.current = null;
    }

    onEndMatch();
  }, [matchData, matchIdRef, annotationSessionIdRef, scoreLog, onEndMatch]);

  const handleSetupConfirm = useCallback(
    async (firstServer: Player) => {
      console.log(
        `[handleSetupConfirm] 🎬 Iniciado. firstServer=${firstServer}, matchId=${matchId}`,
      );

      if (!matchData || !matchId) {
        console.error(
          `[handleSetupConfirm] ❌ Dados insuficientes: matchData=${!!matchData}, matchId=${matchId}`,
        );
        setError('Dados da partida incompletos');
        return;
      }

      try {
        console.log(`[handleSetupConfirm] 🔄 Criando TennisScoring com format=${matchData.format}`);
        const system = new TennisScoring(firstServer, matchData.format as TennisFormat);
        system.enableSync(matchId);
        system.setStartedAt(new Date().toISOString());
        const state = system.getState();

        if ('needsSetup' in state) delete (state as Record<string, unknown>).needsSetup;
        if (!state.startedAt) state.startedAt = new Date().toISOString();

        scoringSystemRef.current = system;
        dispatch({ type: 'SETUP_SET', isOpen: false });

        console.log(`[handleSetupConfirm] 📤 Enviando PATCH /matches/${matchId}/state`);

        const response = await httpClient.patch(`/matches/${matchId}/state`, {
          matchState: state,
        });

        if (!response.ok) {
          const errMsg = `Falha na sincronização: ${response.status} - ${JSON.stringify(response.data)}`;
          console.error(`[handleSetupConfirm] ❌ ${errMsg}`);
          throw new Error(errMsg);
        }

        console.log(`[handleSetupConfirm] ✅ Sucesso!`);
      } catch (err) {
        console.error(
          `[handleSetupConfirm] ❌ Erro geral:`,
          err instanceof Error ? err.message : String(err),
        );
        if (err instanceof Error) console.error(`[handleSetupConfirm] Stack:`, err.stack);
        setError('Erro ao iniciar partida. Tente novamente.');
      }
    },
    [matchData, matchId, scoringSystemRef, dispatch, setError],
  );

  const fetchStats = useCallback(async () => {
    dispatch({
      type: 'STATS_OPEN',
      data: {
        totalPoints: 10,
        player1: { pointsWon: 5 },
        player2: { pointsWon: 5 },
        match: {},
        pointsHistory: [],
      },
    });
  }, [dispatch]);

  // ── Shared: marks session as ABANDONED via keepalive or PATCH ─────────────────
  const doMarkSessionAbandoned = useCallback(
    async (transport: 'keepalive' | 'patch' = 'patch'): Promise<void> => {
      const sessionId = annotationSessionIdRef.current;
      const currentMatchId = matchIdRef.current;

      if (!sessionId || !currentMatchId) {
        return;
      }

      try {
        const currentState = scoringSystemRef.current?.getState();

        if (!currentState || currentState.isFinished) {
          return;
        }

        await markSessionAbandoned({
          matchId: currentMatchId,
          sessionId,
          matchStateSnapshot: JSON.stringify(currentState),
          transport,
        });

        scoreLog.info('Sessão marcada como ABANDONED', {
          matchId: currentMatchId,
          sessionId,
          transport,
        });
      } catch (err: unknown) {
        scoreLog.warn('Falha ao marcar sessão como ABANDONED', {
          matchId: currentMatchId,
          sessionId,
          transport,
          error: getErrorMessage(err),
        });
      }
    },
    [annotationSessionIdRef, matchIdRef, scoringSystemRef, scoreLog],
  );

  // ── Cleanup: marks session as ABANDONED on unmount ───────────────────────────
  useEffect(() => {
    return () => {
      // Fire-and-forget: não aguarda resposta
      void doMarkSessionAbandoned('patch');
    };
  }, [doMarkSessionAbandoned]);

  // ── beforeunload + pagehide listeners: marks session as ABANDONED if tab closed ─
  useEffect(() => {
    const handleUnload = () => {
      // Fire-and-forget com keepalive para sobreviver a unload
      void doMarkSessionAbandoned('keepalive');
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [doMarkSessionAbandoned]);

  return { handleEndMatch, handleSetupConfirm, fetchStats };
}
