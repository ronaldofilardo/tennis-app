// ScoreboardHandlerDeps — dependencies interface for useScoreboardHandlers hook
// Extracted to reduce hook file size

import React from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type { TennisScoring } from '../core/scoring/TennisScoring';
import type { Player, MatchData } from '../core/scoring/types';
import type { useToast } from '../components/Toast';
import type { createLogger } from '../services/logger';
import type { ScoreboardUIAction, PendingServeError, FirstServeError } from './scoreboardUIState';

export interface ScoreboardHandlerDeps {
  scoringSystemRef: React.MutableRefObject<TennisScoring | null>;
  matchData: MatchData | null;
  setMatchData: React.Dispatch<React.SetStateAction<MatchData | null>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  matchId: string | undefined;
  matchIdRef: React.MutableRefObject<string | null>;
  currentUser: { id: string; email?: string } | null;
  navigate: NavigateFunction;
  toast: ReturnType<typeof useToast>;
  scoreLog: ReturnType<typeof createLogger>;
  dispatch: React.Dispatch<ScoreboardUIAction>;
  serveStep: 'none' | 'second';
  firstServeError: FirstServeError | null;
  pendingServeError: PendingServeError | null;
  pendingPointPlayer: Player | null;
  playerInFocus: Player | null;
  autoFinishRef: React.MutableRefObject<boolean>;
  syncTimeoutRef: React.MutableRefObject<number | null>;
  annotationSessionIdRef: React.MutableRefObject<string | null>;
  forceRerender: () => void;
  setServeStepSafe: (step: 'none' | 'second') => void;
  onEndMatch: () => void;
  ballExchangeCount: number;
}
