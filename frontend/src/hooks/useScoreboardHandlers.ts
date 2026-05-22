// Composite hook — assembles point, serve and match lifecycle handlers.
// Each domain is isolated in its own file for maintainability.

import type { ScoreboardHandlerDeps } from './ScoreboardHandlerDeps';
import { useMatchLifecycleHandlers } from './useMatchLifecycleHandlers';
import { usePointHandlers } from './usePointHandlers';
import { useServeHandlers } from './useServeHandlers';

export type { ScoreboardHandlerDeps } from './ScoreboardHandlerDeps';

export function useScoreboardHandlers(deps: ScoreboardHandlerDeps) {
  const matchHandlers = useMatchLifecycleHandlers(deps);
  const pointHandlers = usePointHandlers({ ...deps, handleEndMatch: matchHandlers.handleEndMatch });
  const serveHandlers = useServeHandlers({ ...deps, addPoint: pointHandlers.addPoint });

  return {
    ...matchHandlers,
    ...pointHandlers,
    ...serveHandlers,
  };
}
