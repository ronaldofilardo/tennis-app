import React from 'react';
import type { ClubStats } from '../../types/gestor';
import {
  ROLE_LABELS,
  ROLE_ICONS,
  STATUS_LABELS,
  MATCH_STATUS_COLORS,
  VISIBILITY_ICONS,
} from '../../types/gestor';

interface GestorOverviewTabProps {
  stats: ClubStats;
  onSwitchToMatches: () => void;
  onSwitchToMembers: () => void;
  onNavigateToMatch: (id: string) => void;
}

const GestorOverviewTab: React.FC<GestorOverviewTabProps> = ({
  stats,
  onSwitchToMatches,
  onSwitchToMembers,
  onNavigateToMatch,
}) => (
  <div className="gestor-overview">
    {/* KPI Cards */}
    <div className="gestor-kpi-grid">
      <div className="kpi-card">
        <div className="kpi-icon">👥</div>
        <div className="kpi-value">{stats.totalMembers}</div>
        <div className="kpi-label">Membros</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-icon">🎾</div>
        <div className="kpi-value">{stats.totalMatches}</div>
        <div className="kpi-label">Partidas</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-icon">🏆</div>
        <div className="kpi-value">{stats.totalTournaments}</div>
        <div className="kpi-label">Torneios</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-icon">🟢</div>
        <div className="kpi-value">
          {stats.matchesByStatus.find((m) => m.status === 'IN_PROGRESS')?.count || 0}
        </div>
        <div className="kpi-label">Ao Vivo</div>
      </div>
    </div>

    {/* Recent Matches */}
    <div className="gestor-section">
      <div className="section-header">
        <h3>Partidas Recentes</h3>
        <button className="gestor-link-btn" onClick={onSwitchToMatches}>
          Ver todas →
        </button>
      </div>
      {stats.recentMatches.length === 0 ? (
        <p className="gestor-muted">Nenhuma partida registrada.</p>
      ) : (
        <div className="gestor-match-list">
          {stats.recentMatches.map((match) => (
            <div
              key={match.id}
              className="gestor-match-row"
              onClick={() => onNavigateToMatch(match.id)}
              role="button"
              tabIndex={0}
            >
              <div className="match-players">
                {match.playerP1} vs {match.playerP2}
              </div>
              <div className="match-meta">
                <span
                  className={`match-status-badge ${MATCH_STATUS_COLORS[match.status] || 'badge-neutral'}`}
                >
                  {STATUS_LABELS[match.status] || match.status}
                </span>
                {match.score && <span className="match-score">{match.score}</span>}
                <span className="match-vis">{VISIBILITY_ICONS[match.visibility] || '🔒'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Recent Members */}
    <div className="gestor-section">
      <div className="section-header">
        <h3>Membros Recentes</h3>
        <button className="gestor-link-btn" onClick={onSwitchToMembers}>
          Ver todos →
        </button>
      </div>
      {stats.recentMembers.length === 0 ? (
        <p className="gestor-muted">Nenhum membro no clube.</p>
      ) : (
        <div className="gestor-list">
          {stats.recentMembers.map((member) => (
            <div key={member.id} className="gestor-member-row">
              <div className="members-table-row small-row">
                <span className="member-cell-code">
                  <code>
                    {member.user.athleteProfile?.globalId
                      ? `[${member.user.athleteProfile.globalId.slice(0, 8).toUpperCase()}]`
                      : '—'}
                  </code>
                </span>
                <span className="member-cell-name">
                  <span className="member-avatar">
                    {member.user.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                  {member.user.name}
                </span>
                <span className="member-cell-email">
                  {member.user.email?.includes('@') ? (
                    member.user.email
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </span>
                <span className="member-cell-cpf">
                  {member.user.athleteProfile?.cpf ? (
                    (() => {
                      const d = member.user.athleteProfile.cpf.replace(/\D/g, '');
                      return d.length === 11
                        ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`
                        : d;
                    })()
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </span>
                <span className="member-role-tag">
                  {ROLE_ICONS[member.role] || '👤'} {ROLE_LABELS[member.role] || member.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

export default GestorOverviewTab;
