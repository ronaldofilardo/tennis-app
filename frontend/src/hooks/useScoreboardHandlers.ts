// All point/match handlers extracted from useScoreboardEngine.ts.
// Receives all dependencies as parameters so the parent hook can remain under 500 lines.

import React, { useCallback, useEffect } from 'react';
import { TennisScoring } from '../core/scoring/TennisScoring';
import type { PointDetails, RallyDetails, TennisFormat } from '../core/scoring/types';
import { getErrorMessage } from '../types/errors';
import { httpClient } from '../config/httpClient';
import { resolvePlayerName } from '../data/players';
import { endSession } from '../services/annotationSessionService';
import type { ScoreboardUIAction } from './scoreboardUIState';
import { useToast } from '../components/Toast';
import { createLogger } from '../services/logger';
import type { ScoreboardHandlerDeps } from './ScoreboardHandlerDeps';

export type { ScoreboardHandlerDeps } from './ScoreboardHandlerDeps';

export function useScoreboardHandlers(deps: ScoreboardHandlerDeps) {
  const {
    scoringSystemRef,
    matchData,
    setMatchData,
    setError,
    matchId,
    matchIdRef,
    currentUser,
    navigate,
    toast,
    scoreLog,
    dispatch,
    serveStep,
    firstServeError,
    pendingServeError,
    pendingPointPlayer,
    playerInFocus,
    autoFinishRef,
    syncTimeoutRef,
    annotationSessionIdRef,
    forceRerender,
    setServeStepSafe,
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

  const addPoint = useCallback(
    async (player: Player, details?: Partial<PointDetails>) => {
      const scoringSystem = getSystem();
      if (!scoringSystem) return;

      const pointDetails: Partial<PointDetails> = details || {
        serve: { isFirstServe: serveStep !== 'second' },
        result: { winner: player, type: 'WINNER' },
        rally: { ballExchanges: 1 },
      };

      if (details && !details.serve) {
        pointDetails.serve = { isFirstServe: serveStep !== 'second' };
      }

      if (!pointDetails.shotPlayer) {
        pointDetails.shotPlayer = player;
      }

      let newState: ReturnType<typeof scoringSystem.getState>;
      try {
        newState = scoringSystem.addPoint(player, pointDetails as PointDetails);
      } catch {
        return;
      }
      setServeStepSafe('none');
      forceRerender();

      if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = window.setTimeout(() => {
        const sys = getSystem();
        sys?.syncState()?.catch(() => {
          scoreLog.warn(
            'Falha no syncState após ponto (retry automático na próxima sincronização)',
            { matchId },
          );
        });
      }, 250);

      if (newState.isFinished && newState.winner) {
        scoreLog.info(`Partida finalizada! Vencedor: ${newState.winner}`);
        const players = {
          p1: resolvePlayerName(matchData!.players.p1),
          p2: resolvePlayerName(matchData!.players.p2),
        };
        const winnerName = newState.winner === 'PLAYER_1' ? players.p1 : players.p2;

        const isCreator = matchData?.createdByUserId === currentUser?.id;
        if (isCreator && !autoFinishRef.current) {
          autoFinishRef.current = true;
          try {
            const response = await httpClient.patch(`/matches/${matchId}`, {
              action: 'endMatch',
            });
            if (response.ok) {
              scoreLog.info('Partida auto-finalizada no DB com sucesso', { matchId });
            } else {
              scoreLog.warn('Falha ao auto-finalizar partida no DB', {
                matchId,
                status: response.status,
              });
            }
          } catch (err) {
            scoreLog.warn('Erro durante auto-finish PATCH', {
              matchId,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }

        setTimeout(() => {
          toast.success(
            `Vencedor: ${winnerName} | Placar: ${newState.sets.PLAYER_1} sets x ${newState.sets.PLAYER_2} sets`,
            '🏆 Partida Finalizada!',
          );
          handleEndMatch();
        }, 500);
      }
    },
    [
      serveStep,
      matchData,
      matchId,
      currentUser,
      autoFinishRef,
      syncTimeoutRef,
      scoreLog,
      toast,
      forceRerender,
      setServeStepSafe,
      handleEndMatch,
    ],
  );

  const handleSetupConfirm = useCallback(
    async (firstServer: Player) => {
      console.log(`[handleSetupConfirm] 🎬 Iniciado. firstServer=${firstServer}, matchId=${matchId}`);
      
      if (!matchData || !matchId) {
        console.error(`[handleSetupConfirm] ❌ Dados insuficientes: matchData=${!!matchData}, matchId=${matchId}`);
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
        
        console.log(`[handleSetupConfirm] 📤 Enviando PATCH /matches/${matchId}/state com state:`, state);

        const response = await httpClient.patch(`/matches/${matchId}/state`, {
          matchState: state,
        });
        
        console.log(`[handleSetupConfirm] 📥 Resposta PATCH:`, response);
        
        if (!response.ok) {
          const errMsg = `Falha na sincronização: ${response.status} - ${JSON.stringify(response.data)}`;
          console.error(`[handleSetupConfirm] ❌ ${errMsg}`);
          throw new Error(errMsg);
        }
        
        console.log(`[handleSetupConfirm] ✅ Sucesso!`);
      } catch (err) {
        console.error(`[handleSetupConfirm] ❌ Erro geral:`, err instanceof Error ? err.message : String(err));
        if (err instanceof Error) console.error(`[handleSetupConfirm] Stack:`, err.stack);
        setError('Erro ao iniciar partida. Tente novamente.');
      }
    },
    [matchData, matchId, scoringSystemRef, dispatch, setError],
  );

  const handlePointDetailsOpen = useCallback(
    (player: Player) => {
      dispatch({ type: 'POINT_DETAILS_OPEN', player });
    },
    [dispatch],
  );

  const handlePointDetailsConfirm = useCallback(
    (details: RallyDetails | undefined) => {
      dispatch({ type: 'POINT_DETAILS_RESET' });
      const isSecond = serveStep === 'second';
      const firstFaultPayload =
        isSecond && firstServeError
          ? {
              firstFault: {
                errorType: firstServeError.errorType,
                serveEffect: firstServeError.serveEffect as
                  | 'TopSpin'
                  | 'Slice'
                  | 'Flat'
                  | undefined,
                direction: firstServeError.direction as 'Fechado' | 'Centro' | 'Aberto' | undefined,
              },
            }
          : {};
      if (pendingPointPlayer) {
        if (details) {
          addPoint(pendingPointPlayer, {
            rallyDetails: details,
            result: { winner: pendingPointPlayer, type: 'WINNER' },
            serve: { isFirstServe: !isSecond, ...firstFaultPayload },
            rally: { ballExchanges: 1 },
          } as Partial<PointDetails>);
        } else {
          addPoint(pendingPointPlayer, {
            serve: { isFirstServe: !isSecond, ...firstFaultPayload },
            result: { winner: pendingPointPlayer, type: 'WINNER' },
            rally: { ballExchanges: 1 },
          } as Partial<PointDetails>);
        }
      }
    },
    [dispatch, serveStep, firstServeError, pendingPointPlayer, addPoint],
  );

  const handlePointDetailsCancel = useCallback(() => {
    dispatch({ type: 'POINT_DETAILS_RESET' });
  }, [dispatch]);

  const handleFault = useCallback(async () => {
    const scoringSystem = getSystem();
    if (!scoringSystem) return;
    const currentServer = scoringSystem.getState().server;
    const opponent = currentServer === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
    const pointDetails: Partial<PointDetails> = {
      serve: { type: 'DOUBLE_FAULT', isFirstServe: false },
      result: { winner: opponent, type: 'FORCED_ERROR' },
      rally: { ballExchanges: 1 },
    };
    addPoint(opponent, pointDetails);
  }, [addPoint]);

  const handleUndo = useCallback(async () => {
    const scoringSystem = getSystem();
    if (!scoringSystem) return;
    try {
      const prevState = scoringSystem.undoLastPoint();
      if (prevState) {
        setServeStepSafe('none');
        forceRerender();
        if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = window.setTimeout(() => {
          const sys = getSystem();
          sys?.syncState()?.catch(() => {
            scoreLog.warn(
              'Falha no syncState após undo (retry automático na próxima sincronização)',
              { matchId },
            );
          });
        }, 250);
      }
    } catch {
      scoreLog.warn('Erro ao desfazer ponto (UI já revertida)', { matchId });
    }
  }, [setServeStepSafe, forceRerender, syncTimeoutRef, scoreLog, matchId]);

  const getLastPointDetails = useCallback((): PointDetails | null => {
    return getSystem()?.getLastPointDetails() ?? null;
  }, []);

  const handleEditScore = useCallback(
    async (setWinners: Array<'p1' | 'p2'>, newServer: Player): Promise<void> => {
      const scoringSystem = getSystem();
      if (!scoringSystem) return;
      try {
        const currentState = scoringSystem.getState();
        const p1Sets = setWinners.filter((w) => w === 'p1').length;
        const p2Sets = setWinners.filter((w) => w === 'p2').length;
        const completedSets = setWinners.map((winner, idx) => ({
          setNumber: idx + 1,
          games: {
            PLAYER_1: winner === 'p1' ? 6 : 0,
            PLAYER_2: winner === 'p2' ? 6 : 0,
          } as Record<Player, number>,
          winner: (winner === 'p1' ? 'PLAYER_1' : 'PLAYER_2') as Player,
        }));
        const currentPointsHistory = currentState.currentGame.pointsHistory || [];

        const newState = {
          ...currentState,
          sets: { PLAYER_1: p1Sets, PLAYER_2: p2Sets },
          currentSet: setWinners.length + 1,
          currentSetState: { games: { PLAYER_1: 0, PLAYER_2: 0 } as Record<Player, number> },
          currentGame: {
            points: { PLAYER_1: '0', PLAYER_2: '0' } as Record<Player, string>,
            server: newServer,
            isTiebreak: false,
            isMatchTiebreak: false,
            pointsHistory: currentPointsHistory,
          },
          server: newServer,
          isFinished: false,
          winner: undefined,
          completedSets,
          config: currentState.config,
        };

        scoringSystem.loadState(newState);
        setServeStepSafe('none');
        forceRerender();

        if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = window.setTimeout(() => {
          const sys = getSystem();
          sys?.syncState()?.catch(() => {
            scoreLog.warn('Falha no syncState após edição de placar', { matchId });
          });
        }, 250);
      } catch {
        scoreLog.warn('Erro ao editar placar', { matchId });
      }
    },
    [setServeStepSafe, forceRerender, syncTimeoutRef, scoreLog, matchId],
  );

  const handleServerEffectConfirm = useCallback(
    (effect?: string, direction?: string) => {
      if (!playerInFocus) return;
      const isSecond = serveStep === 'second';
      const pointDetails: Partial<PointDetails> = {
        serve: {
          type: 'ACE',
          isFirstServe: !isSecond,
          serveEffect: effect as 'TopSpin' | 'Slice' | 'Flat' | undefined,
          direction: direction as 'Fechado' | 'Centro' | 'Aberto' | undefined,
          ...(isSecond && firstServeError
            ? {
                firstFault: {
                  errorType: firstServeError.errorType,
                  serveEffect: firstServeError.serveEffect as
                    | 'TopSpin'
                    | 'Slice'
                    | 'Flat'
                    | undefined,
                  direction: firstServeError.direction as
                    | 'Fechado'
                    | 'Centro'
                    | 'Aberto'
                    | undefined,
                },
              }
            : {}),
        },
        result: { winner: playerInFocus, type: 'WINNER' },
        rally: { ballExchanges: 1 },
      };
      addPoint(playerInFocus, pointDetails);
      dispatch({ type: 'SERVER_EFFECT_CONFIRM' });
    },
    [playerInFocus, serveStep, firstServeError, addPoint, dispatch],
  );

  const handleServeErrorOpen = useCallback(
    (errorType: 'out' | 'net', step: 'first' | 'second') => {
      dispatch({ type: 'SERVE_ERROR_OPEN', error: { errorType, serveStep: step } });
    },
    [dispatch],
  );

  const handleServeErrorConfirm = useCallback(
    (effect?: string, direction?: string) => {
      dispatch({ type: 'SERVE_ERROR_CLOSE' });
      if (!pendingServeError) return;

      if (pendingServeError.serveStep === 'first') {
        dispatch({
          type: 'FIRST_SERVE_ERROR_SET',
          err: { errorType: pendingServeError.errorType, serveEffect: effect, direction },
        });
        dispatch({ type: 'SERVE_STEP_SET', step: 'second' });
      } else {
        dispatch({ type: 'FIRST_SERVE_ERROR_CLEAR' });
        const scoringSystem = getSystem();
        if (!scoringSystem) return;
        const currentServer = scoringSystem.getState().server;
        const opponent = currentServer === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
        const pointDetails: Partial<PointDetails> = {
          serve: {
            type: 'DOUBLE_FAULT',
            isFirstServe: false,
            serveEffect: effect as 'TopSpin' | 'Slice' | 'Flat' | undefined,
            direction: direction as 'Fechado' | 'Centro' | 'Aberto' | undefined,
            errorType: pendingServeError.errorType,
            ...(firstServeError
              ? {
                  firstFault: {
                    errorType: firstServeError.errorType,
                    serveEffect: firstServeError.serveEffect as
                      | 'TopSpin'
                      | 'Slice'
                      | 'Flat'
                      | undefined,
                    direction: firstServeError.direction as
                      | 'Fechado'
                      | 'Centro'
                      | 'Aberto'
                      | undefined,
                  },
                }
              : {}),
          },
          result: { winner: opponent, type: 'FORCED_ERROR' },
          rally: { ballExchanges: 1 },
        };
        addPoint(opponent, pointDetails);
      }
    },
    [dispatch, pendingServeError, firstServeError, addPoint],
  );

  const handleServeErrorCancel = useCallback(() => {
    dispatch({ type: 'SERVE_ERROR_CLOSE' });
  }, [dispatch]);

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

  // ── Cleanup useEffect: marks session as ABANDONED on unmount ──
  useEffect(() => {
    return () => {
      const markSessionAbandoned = async () => {
        const sessionId = annotationSessionIdRef.current;
        const matchIdValue = matchIdRef.current;
        const sys = scoringSystemRef.current;
        const currentState = sys?.getState();

        if (sessionId && matchIdValue && currentState && !currentState.isFinished) {
          try {
            const stateSnapshot = JSON.stringify(currentState);
            await httpClient.patch(`/matches/${matchIdValue}/sessions/${sessionId}`, {
              status: 'ABANDONED',
              isActive: false,
              matchStateSnapshot: stateSnapshot,
            });
            scoreLog.info('Sessão marcada como ABANDONED ao sair', {
              matchId: matchIdValue,
              sessionId,
              hasState: !!currentState,
            });
          } catch (err: unknown) {
            scoreLog.warn('Falha ao marcar sessão como ABANDONED', {
              matchId: matchIdValue,
              sessionId,
              error: getErrorMessage(err),
            });
          }
        }
      };
      markSessionAbandoned();
    };
  }, []);

  return {
    handleEndMatch,
    addPoint,
    handleSetupConfirm,
    handlePointDetailsOpen,
    handlePointDetailsConfirm,
    handlePointDetailsCancel,
    handleFault,
    handleUndo,
    getLastPointDetails,
    handleEditScore,
    handleServerEffectConfirm,
    handleServeErrorOpen,
    handleServeErrorConfirm,
    handleServeErrorCancel,
    fetchStats,
  };
}
