import React from 'react';
import type { ClubStats } from '../../types/gestor';
import { STATUS_LABELS, MATCH_STATUS_COLORS, VISIBILITY_ICONS } from '../../types/gestor';

interface GestorMatchesTabProps {
  stats: ClubStats;
  onNavigateToMatch: (id: string) => void;
  onNavigateToNewMatch: () => void;
  onRefresh: () => void;
}

const GestorMatchesTab: React.FC<GestorMatchesTabProps> = ({
  stats,
  onNavigateToMatch,
  onNavigateToNewMatch,
  onRefresh,
}) => (
  <div className="gestor-matches-tab">
    <div className="section-header">
      <h3>Partidas do Clube</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="gestor-btn-primary" onClick={onNavigateToNewMatch}>
          + Nova Partida
        </button>
        <button className="gestor-btn-secondary" onClick={onRefresh} title="Recarregar partidas">
          🔄 Atualizar
        </button>
      </div>
    </div>

    {/* Status Summary */}
    <div className="status-summary">
      {stats.matchesByStatus.map((m) => (
        <div key={m.status} className="status-pill">
          <span className="status-pill-label">{STATUS_LABELS[m.status] || m.status}</span>
          <span className="status-pill-count">{m.count}</span>
        </div>
      ))}
    </div>

    {/* Full Match List */}
    {stats.recentMatches.length === 0 ? (
      <p className="gestor-muted">Nenhuma partida registrada.</p>
    ) : (
      <div className="gestor-match-list full-list">
        {stats.recentMatches.map((match) => (
          <div
            key={match.id}
            className="gestor-match-card"
            onClick={() => onNavigateToMatch(match.id)}
            role="button"
            tabIndex={0}
          >
            <div className="match-card-header">
              <span
                className={`match-status-badge ${MATCH_STATUS_COLORS[match.status] || 'badge-neutral'}`}
              >
                {STATUS_LABELS[match.status] || match.status}
              </span>
              <span className="match-vis">{VISIBILITY_ICONS[match.visibility] || '🔒'}</span>
            </div>
            <div className="match-card-players">
              <span className="player-name">{match.playerP1}</span>
              <span className="match-vs">vs</span>
              <span className="player-name">{match.playerP2}</span>
            </div>
            {match.score && <div className="match-card-score">{match.score}</div>}
            <div className="match-card-footer">
              <span className="match-format">{match.format}</span>
              <span className="match-date">
                {new Date(match.createdAt).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default GestorMatchesTab;
