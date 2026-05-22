// src/hooks/useServeHandlers.ts
// Handles serve flow: ACE effect confirmation, serve errors (out/net), double fault.

import { useCallback } from 'react';
import type { Player, PointDetails } from '../core/scoring/types';
import type { ScoreboardHandlerDeps } from './ScoreboardHandlerDeps';

type AddPointFn = (player: Player, details?: Partial<PointDetails>) => void | Promise<void>;

type ServeHandlerDeps = ScoreboardHandlerDeps & {
  addPoint: AddPointFn;
};

export function useServeHandlers(deps: ServeHandlerDeps) {
  const {
    scoringSystemRef,
    dispatch,
    serveStep,
    firstServeError,
    pendingServeError,
    playerInFocus,
    addPoint,
  } = deps;

  const getSystem = () => scoringSystemRef.current;

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

  return {
    handleServerEffectConfirm,
    handleServeErrorOpen,
    handleServeErrorConfirm,
    handleServeErrorCancel,
  };
}
