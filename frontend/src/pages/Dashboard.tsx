import React, { useReducer, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MatchStatsModal from '../components/MatchStatsModal';
import AthleteHeader from '../components/AthleteHeader';

import type { DashboardView } from '../components/HamburgerMenuDropdown';
import FilterChips from '../components/FilterChips';
import type { MatchFilter } from '../components/FilterChips';
import LiveMatchesCarousel from '../components/LiveMatchesCarousel';
import PendingInvitesBanner from '../components/PendingInvitesBanner';
import NewMatchMenu from '../components/NewMatchMenu';
import '../components/NewMatchMenu.css';
import { useAuth } from '../contexts/AuthContext';
import { httpClient } from '../config/httpClient';

import { useToast } from '../components/Toast';

import CompletedMatchCard from '../components/CompletedMatchCard';
import EditMatchModal from '../components/EditMatchModal';
import type { EditableMatch } from '../components/EditMatchModal';
import DashboardMatchCard from '../components/dashboard/DashboardMatchCard';
import DashboardProfilePanel from '../components/dashboard/DashboardProfilePanel';
import DashboardAnnotatedSection from '../components/dashboard/DashboardAnnotatedSection';
import DashboardOpenMatchesSection from '../components/dashboard/DashboardOpenMatchesSection';
import DashboardEmptyStates from '../components/dashboard/DashboardEmptyStates';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboardMatchActions } from '../hooks/useDashboardMatchActions';
import { computeAthleteStats } from './dashboardHelpers';
import './Dashboard.css';

type DashboardMatchPlayers = { p1: string; p2: string };
type DashboardMatch = {
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

interface DashboardProps {
  onNewMatchClick: () => void;
  onDiscoverMatches?: () => void;
  onContinueMatch?: (match: DashboardMatch, initialState?: unknown) => void;
  onStartMatch?: (match: DashboardMatch) => void;
  matches: DashboardMatch[];
  loading: boolean;
  error: string | null;
  currentUser?: { email: string; name?: string; role?: string } | null;
  players?: Array<{ id: string; email?: string; name: string }>;
}

// ── Dashboard UI State Reducer ────────────────────────────────────────────────
interface DashboardUIState {
  isNewMatchMenuOpen: boolean;
  isHamburgerOpen: boolean;
  activeDashboardView: DashboardView;
  activeFilter: MatchFilter;
  editingMatch: DashboardMatch | null;
  localMatchOverrides: Record<string, Partial<DashboardMatch>>;
}

type DashboardUIAction =
  | { type: 'TOGGLE_NEW_MATCH_MENU' }
  | { type: 'CLOSE_NEW_MATCH_MENU' }
  | { type: 'TOGGLE_HAMBURGER' }
  | { type: 'CLOSE_HAMBURGER' }
  | { type: 'SELECT_VIEW'; view: DashboardView }
  | { type: 'OPEN_NEW_MATCH_FROM_MENU' }
  | { type: 'SET_FILTER'; filter: MatchFilter }
  | { type: 'SET_EDITING_MATCH'; match: DashboardMatch | null }
  | { type: 'UPDATE_MATCH_OVERRIDE'; matchId: string; overrides: Partial<DashboardMatch> };

function dashboardUIReducer(state: DashboardUIState, action: DashboardUIAction): DashboardUIState {
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

const initialDashboardUIState: DashboardUIState = {
  isNewMatchMenuOpen: false,
  isHamburgerOpen: false,
  activeDashboardView: 'none',
  activeFilter: 'all',
  editingMatch: null,
  localMatchOverrides: {},
};

const Dashboard: React.FC<DashboardProps> = ({
  onNewMatchClick,
  onDiscoverMatches,
  onContinueMatch,
  onStartMatch,
  matches,
  loading,
  error,
  currentUser,
}) => {
  // AREA 4 & 7: Toast e Logger
  const toast = useToast();
  const navigate = useNavigate();
  const { currentUser: authUser, logout, switchClub } = useAuth();
  const activeClubId = authUser?.activeClubId ?? null;

  // ── Match stats/actions via custom hook ─────────────────
  const {
    isStatsModalOpen,
    setIsStatsModalOpen,
    selectedMatch,
    matchStats,
    loadingMatchId,
    openStatsForMatch,
    fetchMatchStateForContinue,
    modalPlayerNames,
  } = useDashboardMatchActions(toast.error);

  // ── Data fetched via custom hook ────────────────────────
  const {
    openMatches,
    openMatchesLoading,
    annotatedMatches,
    setAnnotatedMatches,
    annotatedByMe,
    setAnnotatedByMe,
    annotatedLoading,
    completedMatches,
    setCompletedMatches,
    completedLoading,
    setOpenMatches,
    refetchCompleted,
  } = useDashboardData(authUser);

  // ── UI state via reducer ───────────────────────────────
  const [uiState, dispatchUI] = useReducer(dashboardUIReducer, initialDashboardUIState);
  const {
    isNewMatchMenuOpen,
    isHamburgerOpen,
    activeDashboardView,
    activeFilter,
    editingMatch,
    localMatchOverrides,
  } = uiState;
  const newMatchBtnRef = useRef<HTMLButtonElement>(null);

  const handleViewReport = useCallback(
    (sessionId: string, matchId: string) => {
      navigate(`/match-report/${matchId}/${sessionId}`);
    },
    [navigate],
  );

  const handleViewComparison = useCallback(
    (matchId: string) => {
      navigate(`/comparison/${matchId}`);
    },
    [navigate],
  );

  const handleDismissAnnotation = useCallback((matchId: string) => {
    setAnnotatedMatches((prev) => prev.filter((m) => m.id !== matchId));
    setAnnotatedByMe((prev) => prev.filter((m) => m.id !== matchId));
  }, []);

  const handleClaimMatch = useCallback(
    async (matchId: string) => {
      try {
        await httpClient.post(`/matches/${matchId}/claim`, undefined, { timeout: 8_000 });
        setAnnotatedMatches((prev) =>
          prev.map((m) =>
            m.id === matchId
              ? { ...m, myShare: { id: m.myShare?.id ?? matchId, status: 'ACCEPTED' } }
              : m,
          ),
        );
        refetchCompleted();
      } catch {
        /* silent */
      }
    },
    [refetchCompleted, setAnnotatedMatches],
  );

  const handleAnnotateOpenMatch = async (matchId: string) => {
    try {
      await httpClient.post(`/matches/${matchId}/sessions`, undefined, { timeout: 8_000 });
    } catch {
      /* prossegue mesmo com falha na criação de sessão */
    }
    setOpenMatches((prev) => prev.filter((m) => m.id !== matchId));
    if (onContinueMatch) {
      onContinueMatch({ id: matchId } as DashboardMatch);
    } else if (onStartMatch) {
      onStartMatch({ id: matchId } as DashboardMatch);
    }
  };

  // Só mostra partidas em que o usuário é apontador ou está em playersEmails
  const canViewMatch = (match: DashboardMatch) => {
    if (!currentUser) return false;
    const email = currentUser.email;
    if (!email) return false;
    // Se for apontador
    if (match.apontadorEmail === email) return true;
    // Se estiver em playersEmails
    if (Array.isArray(match.playersEmails) && match.playersEmails.includes(email)) return true;
    return false;
  };

  const visibleMatches = (Array.isArray(matches) ? matches : []).filter((match) =>
    canViewMatch(match),
  );

  // ── Computed: match counts by status ────────────────────
  const matchCounts = useMemo(() => {
    const counts = { all: 0, live: 0, finished: 0, pending: 0 };
    visibleMatches.forEach((m) => {
      counts.all++;
      if (m.status === 'IN_PROGRESS') counts.live++;
      else if (m.status === 'FINISHED') counts.finished++;
      else counts.pending++;
    });
    return counts;
  }, [visibleMatches]);

  // ── Computed: live matches for carousel ─────────────────
  const liveMatches = useMemo(
    () => visibleMatches.filter((m) => m.status === 'IN_PROGRESS'),
    [visibleMatches],
  );

  // ── Computed: filtered matches (excludes live when shown in carousel) ──
  const filteredMatches = useMemo(() => {
    let filtered = visibleMatches;

    if (activeFilter === 'live') {
      filtered = filtered.filter((m) => m.status === 'IN_PROGRESS');
    } else if (activeFilter === 'finished') {
      filtered = filtered.filter((m) => m.status === 'FINISHED');
    } else if (activeFilter === 'pending') {
      filtered = filtered.filter((m) => m.status !== 'IN_PROGRESS' && m.status !== 'FINISHED');
    } else {
      // "all" — exclude live from main list if they're in the carousel
      if (liveMatches.length > 0) {
        filtered = filtered.filter((m) => m.status !== 'IN_PROGRESS');
      }
    }

    return filtered;
  }, [visibleMatches, activeFilter, liveMatches.length]);

  // ── Computed: athlete quick stats ───────────────────────
  const athleteStats = useMemo(
    () => computeAthleteStats(visibleMatches, currentUser?.email || ''),
    [visibleMatches, currentUser?.email],
  );

  // ── Handle live match click (continue) ──────────────────
  const handleLiveMatchClick = useCallback(
    async (match: DashboardMatch) => {
      if (onContinueMatch) {
        const initialState = await fetchMatchStateForContinue(match.id);
        onContinueMatch(match, initialState);
      }
    },
    [onContinueMatch],
  );

  // ── Hamburger menu handlers ──────────────────────────────
  const handleMenuToggle = useCallback(() => {
    dispatchUI({ type: 'TOGGLE_HAMBURGER' });
  }, []);

  const handleMenuClose = useCallback(() => {
    dispatchUI({ type: 'CLOSE_HAMBURGER' });
  }, []);

  const handleSelectView = useCallback((view: DashboardView) => {
    dispatchUI({ type: 'SELECT_VIEW', view });
  }, []);

  return (
    <div className="dashboard" data-testid="dashboard">
      {/* ── Desktop header (hidden on mobile via CSS) ── */}
      <header className="dashboard-header">
        <h2>
          Minhas <span>Partidas</span>
        </h2>
        <div className="dashboard-actions" style={{ position: 'relative' }}>
          <button
            ref={newMatchBtnRef}
            onClick={() => dispatchUI({ type: 'TOGGLE_NEW_MATCH_MENU' })}
            className="new-match-button"
            aria-haspopup="true"
            aria-expanded={isNewMatchMenuOpen}
          >
            + Nova Partida
          </button>
          {isNewMatchMenuOpen && (
            <NewMatchMenu
              onCreateMatch={onNewMatchClick}
              onDiscoverMatches={() => {
                dispatchUI({ type: 'CLOSE_NEW_MATCH_MENU' });
                if (onDiscoverMatches) onDiscoverMatches();
              }}
              onClose={() => dispatchUI({ type: 'CLOSE_NEW_MATCH_MENU' })}
              anchorRef={newMatchBtnRef as React.RefObject<HTMLElement>}
            />
          )}
        </div>
      </header>

      {/* ── Mobile: Athlete Header with KPIs + Hamburger ── */}
      <AthleteHeader
        name={currentUser?.name || currentUser?.email || 'Atleta'}
        email={currentUser?.email}
        clubName={undefined}
        stats={athleteStats}
        isMenuOpen={isHamburgerOpen}
        onMenuToggle={handleMenuToggle}
        onMenuClose={handleMenuClose}
        onSelectView={handleSelectView}
        onNewMatch={() => dispatchUI({ type: 'OPEN_NEW_MATCH_FROM_MENU' })}
        pendingCount={openMatches.length}
        liveCount={liveMatches.length}
      />

      {/* ── Convites de clube pendentes (atleta confirma) ── */}
      {currentUser?.role === 'ATHLETE' && <PendingInvitesBanner />}

      {loading && (
        <div className="dashboard-loading">
          <div className="dashboard-loading-spinner" />
          Carregando partidas...
        </div>
      )}
      {error && <div className="dashboard-error">⚠ {error}</div>}

      <DashboardEmptyStates
        loading={loading}
        error={error}
        activeDashboardView={activeDashboardView}
        liveMatchesCount={liveMatches.length}
        openMatchesCount={openMatches.length}
        openMatchesLoading={openMatchesLoading}
        onMenuToggle={handleMenuToggle}
      />

      {/* ── Partidas abertas para anotação ── */}
      {!loading &&
        activeDashboardView === 'pending' &&
        (openMatchesLoading || openMatches.length > 0) && (
          <DashboardOpenMatchesSection
            openMatches={openMatches}
            openMatchesLoading={openMatchesLoading}
            onAnnotate={handleAnnotateOpenMatch}
          />
        )}

      {/* ── Partidas Anotadas ── */}
      {!loading &&
        activeDashboardView === 'history' &&
        (annotatedLoading || annotatedMatches.length > 0 || annotatedByMe.length > 0) && (
          <DashboardAnnotatedSection
            annotatedMatches={annotatedMatches}
            annotatedByMe={annotatedByMe}
            annotatedLoading={annotatedLoading}
            onViewReport={handleViewReport}
            onViewComparison={handleViewComparison}
            onDismiss={handleDismissAnnotation}
            onClaim={handleClaimMatch}
          />
        )}

      {/* ── Meu Histórico ── */}
      {!loading &&
        activeDashboardView === 'history' &&
        (completedLoading || completedMatches.length > 0) && (
          <section className="completed-section">
            <h3 className="completed-section__title">🏆 Meu Histórico</h3>
            {completedLoading ? (
              <p className="completed-section__loading">Carregando...</p>
            ) : (
              <div className="completed-section__list">
                {completedMatches.map((m) => (
                  <CompletedMatchCard key={m.id} match={m} onViewStats={openStatsForMatch} />
                ))}
              </div>
            )}
          </section>
        )}

      {/* ── Live Matches Carousel (pinned at top) ── */}
      {!loading && activeDashboardView === 'live' && liveMatches.length > 0 && (
        <LiveMatchesCarousel matches={liveMatches} onMatchClick={handleLiveMatchClick} />
      )}

      {/* ── Filter Chips ── */}
      {!loading && !error && visibleMatches.length > 0 && activeDashboardView === 'history' && (
        <FilterChips
          activeFilter={activeFilter}
          onFilterChange={(filter) => dispatchUI({ type: 'SET_FILTER', filter })}
          counts={matchCounts}
        />
      )}

      {/* ── Match list section title ── */}
      {!loading && activeDashboardView === 'history' && filteredMatches.length > 0 && (
        <span className="dashboard-section-title">
          {activeFilter === 'all'
            ? 'Histórico'
            : activeFilter === 'live'
              ? 'Ao Vivo'
              : activeFilter === 'finished'
                ? 'Finalizadas'
                : 'Aguardando'}
        </span>
      )}

      {/* ── Profile view ── */}
      {activeDashboardView === 'profile' && (
        <DashboardProfilePanel
          authUser={authUser}
          athleteStats={athleteStats}
          annotatedByMeCount={annotatedByMe.length}
          completedMatchesCount={completedMatches.length}
          onSwitchClub={switchClub}
          onLogout={logout}
        />
      )}

      {/* ── Match Cards List ── */}
      {activeDashboardView === 'history' && (
        <div className="match-list">
          {filteredMatches.map((rawMatch) => (
            <DashboardMatchCard
              key={rawMatch.id}
              rawMatch={rawMatch}
              localMatchOverrides={localMatchOverrides}
              authUserId={authUser?.id}
              loadingMatchId={loadingMatchId}
              canView={canViewMatch(rawMatch)}
              onStartMatch={onStartMatch}
              onContinueMatch={onContinueMatch}
              onEditMatch={(match) => dispatchUI({ type: 'SET_EDITING_MATCH', match })}
              onViewStats={openStatsForMatch}
              fetchMatchStateForContinue={fetchMatchStateForContinue}
              onToastWarning={toast.warning}
            />
          ))}
        </div>
      )}

      <MatchStatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        matchId={selectedMatch?.id?.toString() || ''}
        playerNames={modalPlayerNames}
        stats={matchStats}
        nickname={selectedMatch?.nickname || null}
      />

      {/* ── EditMatchModal ── */}
      {editingMatch && (
        <EditMatchModal
          match={
            {
              id: String(editingMatch.id),
              nickname: editingMatch.nickname,
              scheduledAt: editingMatch.scheduledAt,
              venueId: editingMatch.venueId,
              venue: editingMatch.venue,
              visibility: editingMatch.visibility,
              openForAnnotation: editingMatch.openForAnnotation,
              createdByUserId: editingMatch.createdByUserId,
              ...(localMatchOverrides[String(editingMatch.id)] ?? {}),
            } as EditableMatch
          }
          isOpen={true}
          onClose={() => dispatchUI({ type: 'SET_EDITING_MATCH', match: null })}
          onSaved={(updated) => {
            dispatchUI({
              type: 'UPDATE_MATCH_OVERRIDE',
              matchId: String(editingMatch.id),
              overrides: {
                nickname: (updated as EditableMatch).nickname,
                scheduledAt: (updated as EditableMatch).scheduledAt,
                venueId: (updated as EditableMatch).venueId,
                venue: (updated as EditableMatch).venue as DashboardMatch['venue'],
                visibility: (updated as EditableMatch).visibility,
                openForAnnotation: (updated as EditableMatch).openForAnnotation,
              },
            });
            dispatchUI({ type: 'SET_EDITING_MATCH', match: null });
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
