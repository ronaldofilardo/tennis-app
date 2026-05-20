// Dashboard UI state types, actions, reducer and initial state.
// Extracted from Dashboard.tsx to reduce component size.

import type { DashboardView } from '../components/HamburgerMenuDropdown';
import type { MatchFilter } from '../components/FilterChips';

// ── Match types ────────────────────────────────────────────────────────────────

export type DashboardMatchPlayers = { p1: string; p2: string };

export type DashboardMatch = {
  id: string | number;
  players?: DashboardMatchPlayers | string;
  sportType?: string;
  sport?: string;
  format?: string;
  courtType?: 'GRASS' | 'CLAY' | 'HARD';
  nickname?: string | null;
  status?: string;
  score?: string;
  completedSets?: Array<{
    setNumber: number;
    games: { PLAYER_1: number; PLAYER_2: number };
    winner: string;
  }>;
  visibleTo?: string;
  // Campos adicionados para edição
  createdByUserId?: string | null;
  scheduledAt?: string | null;
  venueId?: string | null;
  venue?: { id: string; name: string; city?: string | null } | null;
  visibility?: string;
  openForAnnotation?: boolean;
  matchState?: Record<string, unknown> | null;
};

// ── UI Reducer ────────────────────────────────────────────────────────────────

export interface DashboardUIState {
  isNewMatchMenuOpen: boolean;
  isHamburgerOpen: boolean;
  activeDashboardView: DashboardView;
  activeFilter: MatchFilter;
  editingMatch: DashboardMatch | null;
  localMatchOverrides: Record<string, Partial<DashboardMatch>>;
}

export type DashboardUIAction =
  | { type: 'TOGGLE_NEW_MATCH_MENU' }
  | { type: 'CLOSE_NEW_MATCH_MENU' }
  | { type: 'TOGGLE_HAMBURGER' }
  | { type: 'CLOSE_HAMBURGER' }
  | { type: 'SELECT_VIEW'; view: DashboardView }
  | { type: 'OPEN_NEW_MATCH_FROM_MENU' }
  | { type: 'SET_FILTER'; filter: MatchFilter }
  | { type: 'SET_EDITING_MATCH'; match: DashboardMatch | null }
  | { type: 'UPDATE_MATCH_OVERRIDE'; matchId: string; overrides: Partial<DashboardMatch> };

export function dashboardUIReducer(
  state: DashboardUIState,
  action: DashboardUIAction,
): DashboardUIState {
  switch (action.type) {
    case 'TOGGLE_NEW_MATCH_MENU':
      return { ...state, isNewMatchMenuOpen: !state.isNewMatchMenuOpen };
    case 'CLOSE_NEW_MATCH_MENU':
      return { ...state, isNewMatchMenuOpen: false };
    case 'TOGGLE_HAMBURGER':
      return { ...state, isHamburgerOpen: !state.isHamburgerOpen };
    case 'CLOSE_HAMBURGER':
      return { ...state, isHamburgerOpen: false };
    case 'SELECT_VIEW':
      return { ...state, activeDashboardView: action.view, isHamburgerOpen: false };
    case 'OPEN_NEW_MATCH_FROM_MENU':
      return { ...state, isHamburgerOpen: false, isNewMatchMenuOpen: true };
    case 'SET_FILTER':
      return { ...state, activeFilter: action.filter };
    case 'SET_EDITING_MATCH':
      return { ...state, editingMatch: action.match };
    case 'UPDATE_MATCH_OVERRIDE':
      return {
        ...state,
        localMatchOverrides: {
          ...state.localMatchOverrides,
          [action.matchId]: action.overrides,
        },
      };
    default:
      return state;
  }
}

export const initialDashboardUIState: DashboardUIState = {
  isNewMatchMenuOpen: false,
  isHamburgerOpen: false,
  activeDashboardView: 'none',
  activeFilter: 'all',
  editingMatch: null,
  localMatchOverrides: {},
};
