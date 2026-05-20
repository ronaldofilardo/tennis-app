// Scoreboard UI state types, actions and reducer — extracted from useScoreboardEngine.ts
// to keep the main hook under 500 lines and improve maintainability.

import type { AnnotationSession } from '../core/scoring/types';
import type { Player } from '../core/scoring/types';

export type PendingServeError = { errorType: 'out' | 'net'; serveStep: 'first' | 'second' };
export type FirstServeError = {
  errorType?: 'out' | 'net';
  serveEffect?: string;
  direction?: string;
};

export interface ScoreboardUIState {
  isSetupOpen: boolean;
  elapsed: number;
  isServerEffectOpen: boolean;
  playerInFocus: Player | null;
  serveStep: 'none' | 'second';
  renderKey: number;
  isStatsOpen: boolean;
  statsData: unknown;
  isPointDetailsOpen: boolean;
  pendingPointPlayer: Player | null;
  isServeErrorModalOpen: boolean;
  pendingServeError: PendingServeError | null;
  firstServeError: FirstServeError | null;
  annotatorCount: number;
  editMatchOpen: boolean;
  fontScale: number;
  suspendedSession: AnnotationSession | null;
  previousAnnotationPoints: number;
}

export type ScoreboardUIAction =
  | { type: 'SETUP_SET'; isOpen: boolean }
  | { type: 'ELAPSED_SET'; value: number }
  | { type: 'SERVER_EFFECT_OPEN' }
  | { type: 'SERVER_EFFECT_CLOSE' }
  | { type: 'SERVER_EFFECT_CONFIRM' }
  | { type: 'PLAYER_IN_FOCUS_SET'; player: Player | null }
  | { type: 'SERVE_STEP_SET'; step: 'none' | 'second' }
  | { type: 'FORCE_RERENDER' }
  | { type: 'STATS_OPEN'; data: unknown }
  | { type: 'STATS_CLOSE' }
  | { type: 'POINT_DETAILS_OPEN'; player: Player }
  | { type: 'POINT_DETAILS_RESET' }
  | { type: 'SERVE_ERROR_OPEN'; error: PendingServeError }
  | { type: 'SERVE_ERROR_CLOSE' }
  | { type: 'FIRST_SERVE_ERROR_SET'; err: FirstServeError }
  | { type: 'FIRST_SERVE_ERROR_CLEAR' }
  | { type: 'EDIT_MATCH_OPEN' }
  | { type: 'EDIT_MATCH_CLOSE' }
  | { type: 'FONT_SCALE_SET'; scale: number }
  | { type: 'ANNOTATOR_COUNT_SET'; count: number }
  | { type: 'SUSPENDED_SESSION_SET'; session: AnnotationSession; pointsCount: number }
  | { type: 'SUSPENDED_SESSION_CLEAR' };

export function scoreboardUIReducer(
  state: ScoreboardUIState,
  action: ScoreboardUIAction,
): ScoreboardUIState {
  switch (action.type) {
    case 'SETUP_SET':
      return { ...state, isSetupOpen: action.isOpen };
    case 'ELAPSED_SET':
      return { ...state, elapsed: action.value };
    case 'SERVER_EFFECT_OPEN':
      return { ...state, isServerEffectOpen: true };
    case 'SERVER_EFFECT_CLOSE':
      return { ...state, isServerEffectOpen: false };
    case 'SERVER_EFFECT_CONFIRM':
      return { ...state, isServerEffectOpen: false, playerInFocus: null, firstServeError: null };
    case 'PLAYER_IN_FOCUS_SET':
      return { ...state, playerInFocus: action.player };
    case 'SERVE_STEP_SET':
      if (action.step === 'second' && state.serveStep !== 'none') return state;
      return { ...state, serveStep: action.step };
    case 'FORCE_RERENDER':
      return { ...state, renderKey: state.renderKey + 1 };
    case 'STATS_OPEN':
      return { ...state, isStatsOpen: true, statsData: action.data };
    case 'STATS_CLOSE':
      return { ...state, isStatsOpen: false, statsData: null };
    case 'POINT_DETAILS_OPEN':
      return { ...state, isPointDetailsOpen: true, pendingPointPlayer: action.player };
    case 'POINT_DETAILS_RESET':
      return {
        ...state,
        isPointDetailsOpen: false,
        pendingPointPlayer: null,
        firstServeError: null,
      };
    case 'SERVE_ERROR_OPEN':
      return { ...state, isServeErrorModalOpen: true, pendingServeError: action.error };
    case 'SERVE_ERROR_CLOSE':
      return { ...state, isServeErrorModalOpen: false, pendingServeError: null };
    case 'FIRST_SERVE_ERROR_SET':
      return { ...state, firstServeError: action.err };
    case 'FIRST_SERVE_ERROR_CLEAR':
      return { ...state, firstServeError: null };
    case 'EDIT_MATCH_OPEN':
      return { ...state, editMatchOpen: true };
    case 'EDIT_MATCH_CLOSE':
      return { ...state, editMatchOpen: false };
    case 'FONT_SCALE_SET':
      return { ...state, fontScale: action.scale };
    case 'ANNOTATOR_COUNT_SET':
      return { ...state, annotatorCount: action.count };
    case 'SUSPENDED_SESSION_SET':
      return {
        ...state,
        suspendedSession: action.session,
        previousAnnotationPoints: action.pointsCount,
      };
    case 'SUSPENDED_SESSION_CLEAR':
      return { ...state, suspendedSession: null, previousAnnotationPoints: 0 };
    default:
      return state;
  }
}

export function createInitialUIState(): ScoreboardUIState {
  const saved = localStorage.getItem('sb-font-scale');
  const parsed = saved ? parseFloat(saved) : 1.0;
  return {
    isSetupOpen: false,
    elapsed: 0,
    isServerEffectOpen: false,
    playerInFocus: null,
    serveStep: 'none',
    renderKey: 0,
    isStatsOpen: false,
    statsData: null,
    isPointDetailsOpen: false,
    pendingPointPlayer: null,
    isServeErrorModalOpen: false,
    pendingServeError: null,
    firstServeError: null,
    annotatorCount: 0,
    editMatchOpen: false,
    fontScale: isNaN(parsed) ? 1.0 : Math.min(2.0, Math.max(0.6, parsed)),
    suspendedSession: null,
    previousAnnotationPoints: 0,
  };
}
