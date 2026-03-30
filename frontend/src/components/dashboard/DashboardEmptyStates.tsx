import React from 'react';
import type { DashboardView } from '../HamburgerMenuDropdown';

interface DashboardEmptyStatesProps {
  loading: boolean;
  error: string | null;
  activeDashboardView: DashboardView;
  liveMatchesCount: number;
  openMatchesCount: number;
  openMatchesLoading: boolean;
  onMenuToggle: () => void;
}

const DashboardEmptyStates: React.FC<DashboardEmptyStatesProps> = ({
  loading,
  error,
  activeDashboardView,
  liveMatchesCount,
  openMatchesCount,
  openMatchesLoading,
  onMenuToggle,
}) => {
  return (
    <>
      {/* ── Empty hero state (default view) ── */}
      {!loading && !error && activeDashboardView === 'none' && (
        <div className="dashboard-hero" data-testid="dashboard-hero">
          <div className="dashboard-hero__icon">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </div>
          <h3 className="dashboard-hero__title">Bem-vindo ao RacketApp</h3>
          <p className="dashboard-hero__text">
            Use o menu
            <button
              className="dashboard-hero__menu-link"
              onClick={onMenuToggle}
              aria-label="Abrir menu"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            para criar uma partida, ver o histórico ou acompanhar partidas ao vivo.
          </p>
        </div>
      )}

      {/* ── Empty state for live view ── */}
      {!loading && activeDashboardView === 'live' && liveMatchesCount === 0 && (
        <div className="dashboard-empty">
          <span className="dashboard-empty-icon">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </span>
          <h3>Nenhuma partida ao vivo</h3>
          <p>Quando houver partidas em andamento, elas aparecerão aqui.</p>
        </div>
      )}

      {/* ── Empty state for pending view ── */}
      {!loading &&
        activeDashboardView === 'pending' &&
        !openMatchesLoading &&
        openMatchesCount === 0 && (
          <div className="dashboard-empty">
            <span className="dashboard-empty-icon">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
            <h3>Nenhuma partida aguardando</h3>
            <p>Quando houver partidas abertas para anotação, elas aparecerão aqui.</p>
          </div>
        )}
    </>
  );
};

export default DashboardEmptyStates;
