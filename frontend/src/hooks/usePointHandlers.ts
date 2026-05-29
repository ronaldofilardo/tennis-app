// src/hooks/usePointHandlers.ts
// Handles point flow: addPoint, undo, edit score, and point detail modals.

import { useCallback } from 'react';
import type { Player, PointDetails, RallyDetails } from '../core/scoring/types';
import type { SetEditData } from '../components/scoreboard/EditScoreModal';
import { httpClient } from '../config/httpClient';
import { resolvePlayerName } from '../data/players';
import type { ScoreboardHandlerDeps } from './ScoreboardHandlerDeps';
import { calculateDefaultBallExchanges } from '../core/scoring/ballExchangeRules';

type PointHandlerDeps = ScoreboardHandlerDeps & {
  handleEndMatch: () => Promise<void>;
};

export function usePointHandlers(deps: PointHandlerDeps) {
  const {
    scoringSystemRef,
    matchData,
    matchId,
    currentUser,
    autoFinishRef,
    syncTimeoutRef,
    annotationSessionIdRef,
    scoreLog,
    toast,
    dispatch,
    serveStep,
    firstServeError,
    pendingPointPlayer,
    forceRerender,
    setServeStepSafe,
    handleEndMatch,
    ballExchangeCount,
  } = deps;

  const getSystem = () => scoringSystemRef.current;

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

  const handlePointDetailsOpen = useCallback(
    (player: Player) => {
      dispatch({ type: 'POINT_DETAILS_OPEN', player });
    },
    [dispatch],
  );

  const handlePointDetailsConfirm = useCallback(
    (details: RallyDetails | undefined, passedBallExchangeCount?: number) => {
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

      // Usar ballExchangeCount passado ou app state como fallback
      const finalBallExchangeCount = Math.max(1, passedBallExchangeCount ?? ballExchangeCount);

      if (pendingPointPlayer) {
        if (details) {
          addPoint(pendingPointPlayer, {
            rallyDetails: details,
            result: { winner: pendingPointPlayer, type: 'WINNER' },
            serve: { isFirstServe: !isSecond, ...firstFaultPayload },
            rally: { ballExchanges: finalBallExchangeCount },
          } as Partial<PointDetails>);
        } else {
          addPoint(pendingPointPlayer, {
            serve: { isFirstServe: !isSecond, ...firstFaultPayload },
            result: { winner: pendingPointPlayer, type: 'WINNER' },
            rally: { ballExchanges: finalBallExchangeCount },
          } as Partial<PointDetails>);
        }
      }

      // Reset ball exchange counter após confirmar
      dispatch({ type: 'BALL_EXCHANGE_RESET' });
    },
    [dispatch, serveStep, firstServeError, pendingPointPlayer, addPoint, ballExchangeCount],
  );

  const handlePointDetailsCancel = useCallback(() => {
    dispatch({ type: 'POINT_DETAILS_RESET' });
    dispatch({ type: 'BALL_EXCHANGE_RESET' });
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

  const markPointsAsInterrupted = useCallback((count: number = 1): void => {
    const sys = getSystem();
    if (!sys) return;
    const history = sys.getPointsHistory();
    if (!history) return;

    // Marcar últimos N pontos como interrompidos
    for (let i = Math.max(0, history.length - count); i < history.length; i++) {
      if (history[i]) {
        history[i].editStatus = 'interrupted';
      }
    }
  }, []);

  const handleEditScore = useCallback(
    async (setsData: SetEditData[], newServer: Player): Promise<void> => {
      const scoringSystem = getSystem();
      if (!scoringSystem) return;
      try {
        const currentState = scoringSystem.getState();

        // Separar sets completos dos parciais
        const completedSets = setsData.filter((set) => !set.isPartial);
        const partialSet = setsData.find((set) => set.isPartial);

        // Contar sets ganhos por cada jogador (apenas dos sets completos)
        const p1Sets = completedSets.filter((set) => set.p1Games > set.p2Games).length;
        const p2Sets = completedSets.filter((set) => set.p2Games > set.p1Games).length;

        // Detectar encerramento de partida baseado nos sets inseridos
        const setsToWin = currentState.config?.setsToWin ?? 2;
        const matchIsOver = p1Sets >= setsToWin || p2Sets >= setsToWin;
        const matchWinner: Player | undefined = matchIsOver
          ? p1Sets >= setsToWin
            ? 'PLAYER_1'
            : 'PLAYER_2'
          : undefined;

        // Construir array de sets finalizados com scores reais
        const completedSetsState = completedSets.map((set, idx) => ({
          setNumber: idx + 1,
          games: {
            PLAYER_1: set.p1Games,
            PLAYER_2: set.p2Games,
          } as Record<Player, number>,
          winner: (set.p1Games > set.p2Games ? 'PLAYER_1' : 'PLAYER_2') as Player,
        }));

        const currentPointsHistory = currentState.currentGame.pointsHistory || [];

        // Calcular set número e games do set em andamento
        const currentSetNumber = completedSets.length + 1;
        const currentSetGames = partialSet
          ? { PLAYER_1: partialSet.p1Games, PLAYER_2: partialSet.p2Games }
          : { PLAYER_1: 0, PLAYER_2: 0 };

        // Restaurar pontos do game se o set parcial os forneceu
        const restoredPoints: Record<Player, string> = partialSet?.currentGamePoints
          ? {
              PLAYER_1: String(partialSet.currentGamePoints.PLAYER_1),
              PLAYER_2: String(partialSet.currentGamePoints.PLAYER_2),
            }
          : { PLAYER_1: '0', PLAYER_2: '0' };

        const newState = {
          ...currentState,
          sets: { PLAYER_1: p1Sets, PLAYER_2: p2Sets },
          currentSet: currentSetNumber,
          currentSetState: { games: currentSetGames as Record<Player, number> },
          currentGame: {
            points: restoredPoints,
            server: newServer,
            isTiebreak: false,
            isMatchTiebreak: false,
            pointsHistory: currentPointsHistory,
          },
          server: newServer,
          isFinished: matchIsOver,
          winner: matchWinner,
          completedSets: completedSetsState,
          config: currentState.config,
        };

        scoringSystem.loadState(newState);
        setServeStepSafe('none');
        forceRerender();

        if (matchIsOver) {
          // Partida encerrada: sincronizar estado final e acionar encerramento.
          // Não reativar a sessão — ela será encerrada por handleEndMatch.
          if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
          const sys = getSystem();
          try {
            await sys?.syncState?.();
          } catch {
            // syncState pode falhar com 409 se o match já estava FINISHED — ignorar
          }
          await handleEndMatch();
        } else {
          // Partida em andamento: reativar sessão suspensa e agendar sync normal
          const sessionId = annotationSessionIdRef.current;
          if (matchId && sessionId) {
            httpClient
              .patch(`/matches/${matchId}/sessions/${sessionId}`, { status: 'IN_PROGRESS' })
              .catch(() => {
                // Non-critical: sessão pode já estar ativa ou ter sido encerrada
              });
          }

          if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
          syncTimeoutRef.current = window.setTimeout(() => {
            const sys = getSystem();
            sys?.syncState?.()?.catch(() => {
              scoreLog.warn('Falha no syncState após edição de placar', { matchId });
              const histLen = sys?.getPointsHistory?.()?.length ?? 0;
              markPointsAsInterrupted(Math.min(5, histLen));
              forceRerender();
            });
          }, 250);
        }
      } catch (err) {
        scoreLog.warn('Erro ao editar placar', { matchId, error: err });
        // Marcar últimos 5 pontos como interrompidos se falhar
        const histLen = getSystem()?.getPointsHistory?.()?.length ?? 0;
        markPointsAsInterrupted(Math.min(5, histLen));
        forceRerender();
      }
    },
    [
      setServeStepSafe,
      forceRerender,
      syncTimeoutRef,
      scoreLog,
      matchId,
      markPointsAsInterrupted,
      annotationSessionIdRef,
      handleEndMatch,
    ],
  );

  return {
    addPoint,
    handlePointDetailsOpen,
    handlePointDetailsConfirm,
    handlePointDetailsCancel,
    handleFault,
    handleUndo,
    getLastPointDetails,
    handleEditScore,
  };
}
