import React, { useState } from 'react';
import './AthleteHeader.css';
import HamburgerMenuDropdown from './HamburgerMenuDropdown';
import type { DashboardView } from './HamburgerMenuDropdown';

export interface AthleteStats {
  wins: number;
  losses: number;
  totalMatches: number;
  winRate: number;
  /** Optional KPIs */
  currentStreak?: number;
  streakType?: 'win' | 'loss';
  avgFirstServe?: number;
  avgWinners?: number;
}

interface AthleteHeaderProps {
  name: string;
  email?: string;
  clubName?: string;
  stats: AthleteStats;
  /** Hamburger menu props — when provided, ☰ button is rendered */
  isMenuOpen?: boolean;
  onMenuToggle?: () => void;
  onMenuClose?: () => void;
  onSelectView?: (view: DashboardView) => void;
  onNewMatch?: () => void;
  pendingCount?: number;
  liveCount?: number;
}

const AthleteHeader: React.FC<AthleteHeaderProps> = ({
  name,
  clubName,
  stats,
  isMenuOpen = false,
  onMenuToggle,
  onMenuClose,
  onSelectView,
  onNewMatch,
  pendingCount = 0,
  liveCount = 0,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Avatar: first letter of name
  const initial = name ? name.charAt(0).toUpperCase() : '?';

  const streakLabel =
    stats.currentStreak && stats.currentStreak > 0
      ? `${stats.currentStreak}${stats.streakType === 'win' ? 'V' : 'D'} seguidas`
      : null;

  return (
    <div className="athlete-header" data-testid="athlete-header">
      {/* Main row — always visible */}
      <div className="athlete-header-main">
        {/* Left: avatar + info (clickable to expand KPIs) */}
        <div
          className="athlete-header-left"
          onClick={() => setIsExpanded(!isExpanded)}
          data-testid="athlete-header-toggle"
          role="button"
          aria-expanded={isExpanded}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setIsExpanded(!isExpanded);
          }}
        >
          <div className="athlete-avatar">{initial}</div>
          <div className="athlete-info">
            <p className="athlete-name">{name}</p>
            <p className="athlete-subtitle">{clubName || 'Dashboard do Atleta'}</p>
          </div>

          {/* Quick V/D inline */}
          <div className="athlete-quick-stats">
            <div className="athlete-quick-stat">
              <span className="athlete-quick-stat-value athlete-quick-stat-value--win">
                {stats.wins}
              </span>
              <span className="athlete-quick-stat-label">V</span>
            </div>
            <div className="athlete-quick-stat">
              <span className="athlete-quick-stat-value athlete-quick-stat-value--loss">
                {stats.losses}
              </span>
              <span className="athlete-quick-stat-label">D</span>
            </div>
          </div>

          <span className={`athlete-expand-icon${isExpanded ? 'athlete-expand-icon--open' : ''}`}>
            ▾
          </span>
        </div>

        {/* Right: hamburger button */}
        {onMenuToggle && (
          <button
            className="athlete-hamburger-btn"
            onClick={onMenuToggle}
            aria-label="Abrir menu"
            aria-expanded={isMenuOpen}
            aria-haspopup="true"
            data-testid="hamburger-btn"
          >
            <svg
              width="22"
              height="22"
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
        )}
      </div>

      {/* Hamburger dropdown menu */}
      {onMenuClose && onSelectView && onNewMatch && (
        <HamburgerMenuDropdown
          isOpen={isMenuOpen}
          onClose={onMenuClose}
          onSelectView={onSelectView}
          onNewMatch={onNewMatch}
          pendingCount={pendingCount}
          liveCount={liveCount}
        />
      )}

      {/* Expanded KPIs */}
      <div
        className={`athlete-details${isExpanded ? 'athlete-details--open' : ''}`}
        data-testid="athlete-details"
      >
        <div className="athlete-kpis">
          <div className="athlete-kpi-card">
            <span className="athlete-kpi-value">{stats.totalMatches}</span>
            <span className="athlete-kpi-label">Partidas</span>
          </div>
          <div className="athlete-kpi-card">
            <span className="athlete-kpi-value">
              {stats.winRate > 0 ? `${stats.winRate}%` : '—'}
            </span>
            <span className="athlete-kpi-label">Aproveit.</span>
          </div>
          <div className="athlete-kpi-card">
            <span className="athlete-kpi-value">{streakLabel || '—'}</span>
            <span className="athlete-kpi-label">Sequência</span>
          </div>
          <div className="athlete-kpi-card">
            <span className="athlete-kpi-value">
              {stats.avgFirstServe != null ? `${stats.avgFirstServe}%` : '—'}
            </span>
            <span className="athlete-kpi-label">1º Saque</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AthleteHeader;
