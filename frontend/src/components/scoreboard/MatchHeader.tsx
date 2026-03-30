import React from 'react';
import './MatchHeader.css';

export type ViewMode = 'simple' | 'technical' | 'family';

interface CompletedSet {
  setNumber: number;
  games: { PLAYER_1: number; PLAYER_2: number };
  winner?: string;
  tiebreakScore?: { PLAYER_1: number; PLAYER_2: number };
}

interface MatchHeaderProps {
  sportType: string;
  completedSets: CompletedSet[];
  elapsed: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onBack: () => void;
  onMenu: () => void;
  onEdit?: () => void;
}

function formatElapsed(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatSetScore(set: CompletedSet): string {
  const { games, tiebreakScore, winner } = set;
  if (tiebreakScore) {
    const loserTb = winner === 'PLAYER_1' ? tiebreakScore.PLAYER_2 : tiebreakScore.PLAYER_1;
    return `${games.PLAYER_1}-${games.PLAYER_2}(${loserTb})`;
  }
  return `${games.PLAYER_1}-${games.PLAYER_2}`;
}

const VIEW_MODES: { id: ViewMode; label: string; icon: string }[] = [
  { id: 'simple', label: 'Simples', icon: '👁' },
  { id: 'technical', label: 'Técnico', icon: '📊' },
  { id: 'family', label: 'Família', icon: '👨‍👩‍👧' },
];

const MatchHeader: React.FC<MatchHeaderProps> = ({
  sportType,
  completedSets,
  elapsed,
  viewMode,
  onViewModeChange,
  onBack,
  onMenu,
  onEdit,
}) => {
  return (
    <div className="match-header">
      <div className="match-header-top">
        <button className="header-btn header-btn-back" onClick={onBack} aria-label="✕">
          ← Fechar
        </button>
        <div className="header-center">
          <span className="header-sport-type">{sportType}</span>
          {elapsed > 0 && <span className="header-elapsed">⏱ {formatElapsed(elapsed)}</span>}
        </div>
        {onEdit && (
          <button
            className="header-btn header-btn-edit"
            onClick={onEdit}
            aria-label="Editar partida"
            title="Editar partida"
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
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
        <button className="header-btn header-btn-menu" onClick={onMenu} aria-label="Menu">
          ≡
        </button>
      </div>

      {completedSets.length > 0 && (
        <div className="match-sets-row">
          {completedSets.map((set) => (
            <div
              key={set.setNumber}
              className={`set-badge ${set.winner === 'PLAYER_1' ? 'set-badge-p1' : 'set-badge-p2'}`}
            >
              {formatSetScore(set)}
            </div>
          ))}
        </div>
      )}

      <div className="view-mode-toggle" role="group" aria-label="Modo de visualização">
        {VIEW_MODES.map((mode) => (
          <button
            key={mode.id}
            className={`view-mode-btn ${viewMode === mode.id ? 'view-mode-btn-active' : ''}`}
            onClick={() => onViewModeChange(mode.id)}
          >
            <span className="view-mode-icon">{mode.icon}</span>
            <span className="view-mode-label">{mode.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MatchHeader;
