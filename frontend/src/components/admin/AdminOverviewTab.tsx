import React from 'react';
import type { AdminStats } from '../../types/admin';
import { PLAN_LABELS, PLAN_COLORS, ROLE_LABELS, ROLE_ICONS } from '../../types/admin';

interface AdminOverviewTabProps {
  stats: AdminStats;
  onSwitchToClubs: () => void;
}

const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({ stats, onSwitchToClubs }) => (
  <div className="admin-overview">
    {/* KPI Cards */}
    <div className="admin-kpi-grid">
      <div className="kpi-card kpi-admin">
        <div className="kpi-icon">👥</div>
        <div className="kpi-value">{stats.totalUsers}</div>
        <div className="kpi-label">Usuários Total</div>
      </div>
      <div className="kpi-card kpi-admin">
        <div className="kpi-icon">🏢</div>
        <div className="kpi-value">{stats.totalClubs}</div>
        <div className="kpi-label">Clubes Total</div>
      </div>
      <div className="kpi-card kpi-highlight">
        <div className="kpi-icon">🔥</div>
        <div className="kpi-value">{stats.activeUsersLastWeek}</div>
        <div className="kpi-label">Ativos (7d)</div>
      </div>
      <div className="kpi-card kpi-growth">
        <div className="kpi-icon">👤➕</div>
        <div className="kpi-value">{stats.newUsersThisMonth}</div>
        <div className="kpi-label">Novos usuários (mês)</div>
      </div>
      <div className="kpi-card kpi-growth">
        <div className="kpi-icon">🏠➕</div>
        <div className="kpi-value">{stats.newClubsThisMonth}</div>
        <div className="kpi-label">Novos clubes (mês)</div>
      </div>
    </div>

    {/* Clubs by Plan */}
    <div className="admin-section">
      <h3>Clubes por Plano</h3>
      <div className="plan-breakdown">
        {(stats.clubsByPlan ?? []).map((p) => (
          <div key={p.plan} className={`plan-card ${PLAN_COLORS[p.plan] || ''}`}>
            <div className="plan-count">{p.count}</div>
            <div className="plan-label">{PLAN_LABELS[p.plan] || p.plan}</div>
          </div>
        ))}
      </div>
    </div>

    {/* Memberships by Role */}
    <div className="admin-section">
      <h3>Memberships por Papel</h3>
      <div className="role-breakdown">
        {(stats.membershipsByRole ?? []).map((r) => {
          const totalMemberships = stats.membershipsByRole.reduce(
            (sum, item) => sum + item.count,
            0,
          );
          return (
            <div key={r.role} className="role-row">
              <span className="role-icon">{ROLE_ICONS[r.role] || '👤'}</span>
              <span className="role-name">{ROLE_LABELS[r.role] || r.role}</span>
              <span className="role-count">{r.count}</span>
              <div className="role-bar">
                <div
                  className="role-bar-fill"
                  style={{
                    width: `${totalMemberships > 0 ? (r.count / totalMemberships) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {/* Top Clubs */}
    <div className="admin-section">
      <div className="section-header">
        <h3>Top 10 Clubes por Membros</h3>
        <button className="admin-link-btn" onClick={onSwitchToClubs}>
          Ver todos →
        </button>
      </div>
      {stats.topClubsByMembers.length === 0 ? (
        <p className="admin-muted">Nenhum clube cadastrado.</p>
      ) : (
        <div className="admin-top-clubs">
          {(stats.topClubsByMembers ?? []).map((club, idx) => (
            <div key={club.id} className="top-club-row">
              <span className="top-club-rank">#{idx + 1}</span>
              <div className="top-club-info">
                <span className="top-club-name">{club.name}</span>
                <span className="top-club-slug">/{club.slug}</span>
              </div>
              <span className={`plan-badge ${PLAN_COLORS[club.planType] || ''}`}>
                {PLAN_LABELS[club.planType] || club.planType}
              </span>
              <div className="top-club-stats">
                <span title="Membros">👥 {club.memberCount} membros</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Recent Clubs */}
    <div className="admin-section">
      <div className="section-header">
        <h3>Clubes Recentes</h3>
      </div>
      {stats.recentClubs.length === 0 ? (
        <p className="admin-muted">Nenhum clube recente.</p>
      ) : (
        <div className="admin-recent-clubs">
          {(stats.recentClubs ?? []).map((club) => (
            <div key={club.id} className="recent-club-card">
              <div className="recent-club-header">
                <span className="recent-club-name">{club.name}</span>
                <span className={`plan-badge ${PLAN_COLORS[club.planType] || ''}`}>
                  {PLAN_LABELS[club.planType] || club.planType}
                </span>
              </div>
              <div className="recent-club-meta">
                <span>/{club.slug}</span>
                <span>👥 {club.memberCount}</span>
                <span>{new Date(club.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

export default AdminOverviewTab;
