// frontend/src/hooks/useAdminData.ts
// Extracts all state and fetch logic from AdminDashboard into a single hook with useReducer
// Implements Phase 13 (useReducer) + Phase 14 (extract inline fetch) for AdminDashboard

import { useReducer, useEffect, useCallback } from 'react';
import { httpClient } from '../config/httpClient';
import type {
  AdminStats,
  AdminClub,
  AdminUser,
  AdminMatch,
  PaginatedClubs,
  PaginatedUsers,
  PaginatedMatches,
  CreateClubForm,
  AdminTabType,
} from '../types/admin';
import { PAGE_SIZE, INITIAL_CREATE_FORM } from '../types/admin';
import type { ClubMember } from '../components/ClubMembersModal';

// ── State ─────────────────────────────────────────────────────────────────────

interface AdminDataState {
  activeTab: AdminTabType;
  // Stats
  stats: AdminStats | null;
  loadingStats: boolean;
  error: string | null;
  // Clubs
  clubs: AdminClub[];
  clubsTotal: number;
  clubsOffset: number;
  loadingClubs: boolean;
  clubSearch: string;
  // Users
  users: AdminUser[];
  usersTotal: number;
  usersOffset: number;
  loadingUsers: boolean;
  userSearch: string;
  // Matches
  allMatches: AdminMatch[];
  matchesTotal: number;
  matchesOffset: number;
  loadingMatches: boolean;
  matchStatusFilter: string;
  // Club members modal
  selectedClub: AdminClub | null;
  clubMembers: ClubMember[];
  loadingMembers: boolean;
  // Create club modal
  showCreateClub: boolean;
  createClubForm: CreateClubForm;
  creatingClub: boolean;
  // Misc
  syncingPasswords: boolean;
}

const initialState: AdminDataState = {
  activeTab: 'overview',
  stats: null,
  loadingStats: true,
  error: null,
  clubs: [],
  clubsTotal: 0,
  clubsOffset: 0,
  loadingClubs: false,
  clubSearch: '',
  users: [],
  usersTotal: 0,
  usersOffset: 0,
  loadingUsers: false,
  userSearch: '',
  allMatches: [],
  matchesTotal: 0,
  matchesOffset: 0,
  loadingMatches: false,
  matchStatusFilter: '',
  selectedClub: null,
  clubMembers: [],
  loadingMembers: false,
  showCreateClub: false,
  createClubForm: INITIAL_CREATE_FORM,
  creatingClub: false,
  syncingPasswords: false,
};

// ── Actions ───────────────────────────────────────────────────────────────────

type AdminDataAction =
  | { type: 'SET_TAB'; tab: AdminTabType }
  // Stats
  | { type: 'FETCH_STATS_START' }
  | { type: 'FETCH_STATS_SUCCESS'; stats: AdminStats }
  | { type: 'FETCH_STATS_ERROR'; error: string }
  // Clubs
  | { type: 'FETCH_CLUBS_START' }
  | { type: 'FETCH_CLUBS_SUCCESS'; clubs: AdminClub[]; total: number; offset: number }
  | { type: 'SET_CLUB_SEARCH'; search: string }
  // Users
  | { type: 'FETCH_USERS_START' }
  | { type: 'FETCH_USERS_SUCCESS'; users: AdminUser[]; total: number; offset: number }
  | { type: 'SET_USER_SEARCH'; search: string }
  // Matches
  | { type: 'FETCH_MATCHES_START' }
  | { type: 'FETCH_MATCHES_SUCCESS'; matches: AdminMatch[]; total: number; offset: number }
  | { type: 'SET_MATCH_STATUS_FILTER'; filter: string }
  // Members modal
  | { type: 'MEMBERS_OPEN'; club: AdminClub }
  | { type: 'MEMBERS_SUCCESS'; members: ClubMember[] }
  | { type: 'MEMBERS_CLOSE' }
  // Create club modal
  | { type: 'CREATE_CLUB_SHOW' }
  | { type: 'CREATE_CLUB_HIDE' }
  | { type: 'CREATE_CLUB_FIELD'; field: keyof CreateClubForm; value: string | boolean }
  | { type: 'CREATE_CLUB_START' }
  | { type: 'CREATE_CLUB_DONE' }
  // Sync passwords
  | { type: 'SYNC_START' }
  | { type: 'SYNC_DONE' };

function adminDataReducer(state: AdminDataState, action: AdminDataAction): AdminDataState {
  switch (action.type) {
    case 'SET_TAB':
      return { ...state, activeTab: action.tab };

    // Stats
    case 'FETCH_STATS_START':
      return { ...state, loadingStats: true, error: null };
    case 'FETCH_STATS_SUCCESS':
      return { ...state, loadingStats: false, stats: action.stats };
    case 'FETCH_STATS_ERROR':
      return { ...state, loadingStats: false, error: action.error };

    // Clubs
    case 'FETCH_CLUBS_START':
      return { ...state, loadingClubs: true };
    case 'FETCH_CLUBS_SUCCESS':
      return {
        ...state,
        loadingClubs: false,
        clubs: action.clubs,
        clubsTotal: action.total,
        clubsOffset: action.offset,
      };
    case 'SET_CLUB_SEARCH':
      return { ...state, clubSearch: action.search };

    // Users
    case 'FETCH_USERS_START':
      return { ...state, loadingUsers: true };
    case 'FETCH_USERS_SUCCESS':
      return {
        ...state,
        loadingUsers: false,
        users: action.users,
        usersTotal: action.total,
        usersOffset: action.offset,
      };
    case 'SET_USER_SEARCH':
      return { ...state, userSearch: action.search };

    // Matches
    case 'FETCH_MATCHES_START':
      return { ...state, loadingMatches: true };
    case 'FETCH_MATCHES_SUCCESS':
      return {
        ...state,
        loadingMatches: false,
        allMatches: action.matches,
        matchesTotal: action.total,
        matchesOffset: action.offset,
      };
    case 'SET_MATCH_STATUS_FILTER':
      return { ...state, matchStatusFilter: action.filter };

    // Members modal
    case 'MEMBERS_OPEN':
      return { ...state, selectedClub: action.club, clubMembers: [], loadingMembers: true };
    case 'MEMBERS_SUCCESS':
      return { ...state, loadingMembers: false, clubMembers: action.members };
    case 'MEMBERS_CLOSE':
      return { ...state, selectedClub: null, clubMembers: [] };

    // Create club modal
    case 'CREATE_CLUB_SHOW':
      return { ...state, showCreateClub: true };
    case 'CREATE_CLUB_HIDE':
      return { ...state, showCreateClub: false, createClubForm: INITIAL_CREATE_FORM };
    case 'CREATE_CLUB_FIELD': {
      const updated = { ...state.createClubForm, [action.field]: action.value };
      if (action.field === 'name' && typeof action.value === 'string') {
        updated.slug = action.value
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }
      return { ...state, createClubForm: updated };
    }
    case 'CREATE_CLUB_START':
      return { ...state, creatingClub: true };
    case 'CREATE_CLUB_DONE':
      return { ...state, creatingClub: false };

    // Sync
    case 'SYNC_START':
      return { ...state, syncingPasswords: true };
    case 'SYNC_DONE':
      return { ...state, syncingPasswords: false };

    default:
      return state;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface ToastHandle {
  error: (msg: string) => void;
  success: (msg: string) => void;
}

export interface UseAdminDataReturn {
  state: AdminDataState;
  fetchStats: () => Promise<void>;
  fetchClubs: (offset?: number, search?: string) => Promise<void>;
  fetchUsers: (offset?: number, search?: string) => Promise<void>;
  fetchAllMatches: (offset?: number, status?: string) => Promise<void>;
  handleShowMembers: (club: AdminClub) => Promise<void>;
  handleCloseMembers: () => void;
  handleClubSearch: () => void;
  handleUserSearch: () => void;
  handleCreateClub: () => Promise<void>;
  handleCreateClubFieldChange: (field: keyof CreateClubForm, value: string | boolean) => void;
  handleSyncPasswords: () => Promise<void>;
  setActiveTab: (tab: AdminTabType) => void;
  setClubSearch: (search: string) => void;
  setUserSearch: (search: string) => void;
  setMatchStatusFilter: (filter: string) => void;
  setShowCreateClub: (show: boolean) => void;
}

export function useAdminData(toast: ToastHandle): UseAdminDataReturn {
  const [state, dispatch] = useReducer(adminDataReducer, initialState);

  // === Fetch Stats ===
  const fetchStats = useCallback(async () => {
    dispatch({ type: 'FETCH_STATS_START' });
    try {
      const response = await httpClient.get<AdminStats>('/admin/stats');
      dispatch({ type: 'FETCH_STATS_SUCCESS', stats: response.data });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar estatísticas';
      dispatch({ type: 'FETCH_STATS_ERROR', error: message });
    }
  }, []);

  // === Fetch Clubs ===
  const fetchClubs = useCallback(
    async (offset = 0, search = '') => {
      dispatch({ type: 'FETCH_CLUBS_START' });
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(offset),
        });
        if (search) params.set('search', search);
        const response = await httpClient.get<PaginatedClubs>(`/admin/clubs?${params.toString()}`);
        dispatch({
          type: 'FETCH_CLUBS_SUCCESS',
          clubs: response.data.clubs || [],
          total: response.data.total || 0,
          offset,
        });
      } catch {
        toast.error('Erro ao carregar clubes.');
        dispatch({ type: 'FETCH_CLUBS_SUCCESS', clubs: [], total: 0, offset });
      }
    },
    [toast],
  );

  // === Fetch Users ===
  const fetchUsers = useCallback(
    async (offset = 0, search = '') => {
      dispatch({ type: 'FETCH_USERS_START' });
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(offset),
        });
        if (search) params.set('search', search);
        const response = await httpClient.get<PaginatedUsers>(`/admin/users?${params.toString()}`);
        dispatch({
          type: 'FETCH_USERS_SUCCESS',
          users: response.data.users || [],
          total: response.data.total || 0,
          offset,
        });
      } catch {
        toast.error('Erro ao carregar usuários.');
        dispatch({ type: 'FETCH_USERS_SUCCESS', users: [], total: 0, offset });
      }
    },
    [toast],
  );

  // === Fetch All Matches ===
  const fetchAllMatches = useCallback(
    async (offset = 0, status = '') => {
      dispatch({ type: 'FETCH_MATCHES_START' });
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(offset),
        });
        if (status) params.set('status', status);
        const response = await httpClient.get<PaginatedMatches>(
          `/admin/matches/all?${params.toString()}`,
        );
        dispatch({
          type: 'FETCH_MATCHES_SUCCESS',
          matches: response.data.matches || [],
          total: response.data.total || 0,
          offset,
        });
      } catch {
        toast.error('Erro ao carregar partidas.');
        dispatch({ type: 'FETCH_MATCHES_SUCCESS', matches: [], total: 0, offset });
      }
    },
    [toast],
  );

  // === Load stats on mount ===
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // === Load tab data on first switch ===
  useEffect(() => {
    if (state.activeTab === 'clubs' && state.clubs.length === 0) {
      fetchClubs(0, state.clubSearch);
    }
    if (state.activeTab === 'users' && state.users.length === 0) {
      fetchUsers(0, state.userSearch);
    }
    if (state.activeTab === 'matches' && state.allMatches.length === 0) {
      fetchAllMatches(0, state.matchStatusFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.activeTab]);

  // === Club Members ===
  const handleShowMembers = useCallback(
    async (club: AdminClub) => {
      dispatch({ type: 'MEMBERS_OPEN', club });
      try {
        const response = await httpClient.get<{ members: ClubMember[] }>(
          `/clubs/${club.id}/members`,
        );
        dispatch({ type: 'MEMBERS_SUCCESS', members: response.data.members ?? [] });
      } catch {
        toast.error('Erro ao carregar membros do clube.');
        dispatch({ type: 'MEMBERS_SUCCESS', members: [] });
      }
    },
    [toast],
  );

  const handleCloseMembers = useCallback(() => {
    dispatch({ type: 'MEMBERS_CLOSE' });
  }, []);

  // === Search handlers ===
  const handleClubSearch = useCallback(() => {
    fetchClubs(0, state.clubSearch);
  }, [fetchClubs, state.clubSearch]);

  const handleUserSearch = useCallback(() => {
    fetchUsers(0, state.userSearch);
  }, [fetchUsers, state.userSearch]);

  // === Create Club ===
  const handleCreateClub = useCallback(async () => {
    const { createClubForm, clubSearch } = state;
    if (
      !createClubForm.name.trim() ||
      !createClubForm.gestorName.trim() ||
      !createClubForm.gestorEmail.trim() ||
      !createClubForm.gestorPassword
    ) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    dispatch({ type: 'CREATE_CLUB_START' });
    try {
      await httpClient.post('/admin/clubs', createClubForm);
      toast.success(`Clube "${createClubForm.name}" criado com sucesso!`);
      dispatch({ type: 'CREATE_CLUB_HIDE' });
      fetchClubs(0, clubSearch);
      fetchStats();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar clube.';
      toast.error(msg);
    } finally {
      dispatch({ type: 'CREATE_CLUB_DONE' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.createClubForm, state.clubSearch, toast, fetchClubs, fetchStats]);

  const handleCreateClubFieldChange = useCallback(
    (field: keyof CreateClubForm, value: string | boolean) => {
      dispatch({ type: 'CREATE_CLUB_FIELD', field, value });
    },
    [],
  );

  // === Sync Passwords ===
  const handleSyncPasswords = useCallback(async () => {
    if (
      !window.confirm(
        'Isso irá recalcular a senha de TODOS os atletas com data de nascimento para o formato DDMMAAAA.\n\nContinuar?',
      )
    )
      return;
    dispatch({ type: 'SYNC_START' });
    try {
      const resp = await httpClient.post<{ updated: number; skipped: number }>(
        '/admin/athletes/sync-passwords',
        {},
      );
      toast.success(
        `Senhas sincronizadas: ${resp.data.updated} atletas atualizados, ${resp.data.skipped} ignorados.`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao sincronizar senhas.';
      toast.error(msg);
    } finally {
      dispatch({ type: 'SYNC_DONE' });
    }
  }, [toast]);

  // === Dispatch wrappers ===
  const setActiveTab = useCallback((tab: AdminTabType) => {
    dispatch({ type: 'SET_TAB', tab });
  }, []);

  const setClubSearch = useCallback((search: string) => {
    dispatch({ type: 'SET_CLUB_SEARCH', search });
  }, []);

  const setUserSearch = useCallback((search: string) => {
    dispatch({ type: 'SET_USER_SEARCH', search });
  }, []);

  const setMatchStatusFilter = useCallback((filter: string) => {
    dispatch({ type: 'SET_MATCH_STATUS_FILTER', filter });
  }, []);

  const setShowCreateClub = useCallback((show: boolean) => {
    dispatch({ type: show ? 'CREATE_CLUB_SHOW' : 'CREATE_CLUB_HIDE' });
  }, []);

  return {
    state,
    fetchStats,
    fetchClubs,
    fetchUsers,
    fetchAllMatches,
    handleShowMembers,
    handleCloseMembers,
    handleClubSearch,
    handleUserSearch,
    handleCreateClub,
    handleCreateClubFieldChange,
    handleSyncPasswords,
    setActiveTab,
    setClubSearch,
    setUserSearch,
    setMatchStatusFilter,
    setShowCreateClub,
  };
}
