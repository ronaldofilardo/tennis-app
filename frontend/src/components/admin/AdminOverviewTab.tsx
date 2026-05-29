import './AdminOverviewTab.css';
import React from 'react';
import type { AdminStats } from '../../types/admin';
import { ROLE_LABELS, ROLE_ICONS } from '../../types/admin';

interface AdminOverviewTabProps {
  stats: AdminStats;
}

const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({ stats }) => (
  <div className="admin-overview">
    {/* KPI Cards */}
    <div className="admin-kpi-grid">
      <div className="kpi-card kpi-admin">
        <div className="kpi-icon">👥</div>
        <div className="kpi-value">{stats.totalUsers}</div>
        <div className="kpi-label">Usuários Total</div>
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
    </div>

    {/* Roles Breakdown */}
    <div className="admin-section">
      <h3>Usuários por Papel</h3>
      <div className="role-breakdown">
        {(stats.membershipsByRole ?? []).map((r) => {
          const totalUsers = stats.membershipsByRole.reduce(
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
                    width: `${totalUsers > 0 ? (r.count / totalUsers) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

export default AdminOverviewTab;
