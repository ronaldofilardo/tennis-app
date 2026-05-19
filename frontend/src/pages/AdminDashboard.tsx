// frontend/src/pages/AdminDashboard.tsx
// Dashboard administrativo global — ADMIN only
// Visão geral: KPIs plataforma, lista de clubes, lista de usuários

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useToast } from '../components/Toast';
import type { AdminTabType } from '../types/admin';
import { PAGE_SIZE } from '../types/admin';
import AdminOverviewTab from '../components/admin/AdminOverviewTab';
import AdminUsersTab from '../components/admin/AdminUsersTab';
import AdminMatchesTab from '../components/admin/AdminMatchesTab';
import { useAdminData } from '../hooks/useAdminData';
import './AdminDashboard.css';

const AdminDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const navigation = useNavigation();
  const toast = useToast();

  const {
    state,
    fetchStats,
    fetchUsers,
    fetchAllMatches,
    handleSyncPasswords,
    setActiveTab,
    setUserSearch,
    setMatchStatusFilter,
  } = useAdminData(toast);

  const {
    activeTab,
    stats,
    loadingStats,
    error,
    users,
    usersTotal,
    usersOffset,
    loadingUsers,
    userSearch,
    allMatches,
    matchesTotal,
    matchesOffset,
    loadingMatches,
    matchStatusFilter,
    syncingPasswords,
  } = state;

  const isAdmin = currentUser?.activeRole === 'ADMIN';

  // === Pagination ===
  const usersPage = Math.floor(usersOffset / PAGE_SIZE) + 1;
  const usersTotalPages = Math.ceil(usersTotal / PAGE_SIZE);

  const matchesPage = Math.floor(matchesOffset / PAGE_SIZE) + 1;
  const matchesTotalPages = Math.ceil(matchesTotal / PAGE_SIZE);

  // === Guards ===
  if (!isAdmin) {
    return (
      <div className="admin-dashboard">
        <div className="admin-empty">
          <p>🔒 Acesso restrito. Apenas administradores da plataforma podem acessar este painel.</p>
          <button className="admin-btn-secondary" onClick={() => navigation.navigateToDashboard()}>
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-left">
          <h2>
            Painel <span>Admin</span>
          </h2>
          <span className="admin-role-tag">🔑 Administrador</span>
        </div>
        <div className="admin-header-actions">
          <button
            className="admin-btn-secondary"
            onClick={handleSyncPasswords}
            disabled={syncingPasswords}
            title="Recalcula a senha de todos os atletas para DDMMAAAA (data de nascimento)"
          >
            {syncingPasswords ? 'Sincronizando...' : '🔑 Sync Senhas Atletas'}
          </button>
          <button className="admin-btn-secondary" onClick={() => navigation.navigateToDashboard()}>
            ← Dashboard
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="admin-tabs">
        {(
          [
            { key: 'overview', label: 'Visão Geral', icon: '📊' },
            { key: 'users', label: 'Usuários', icon: '👥' },
            { key: 'matches', label: 'Partidas', icon: '🎾' },
          ] as Array<{
            key: AdminTabType;
            label: string;
            icon: string;
            badge?: number;
          }>
        ).map((tab) => (
          <button
            key={tab.key}
            className={`admin-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="tab-icon" aria-hidden="true">
              {tab.icon}
            </span>
            <span className="tab-label">{tab.label}</span>
            {tab.badge != null && tab.badge > 0 && (
              <span className="admin-tab-badge">{tab.badge}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="admin-content">
        {error && (
          <div className="admin-error">
            <p>{error}</p>
            <button className="admin-btn-secondary" onClick={fetchStats}>
              Tentar novamente
            </button>
          </div>
        )}

        {loadingStats && !stats && (
          <div className="admin-loading">
            <div className="admin-loading-spinner" />
            Carregando dados da plataforma...
          </div>
        )}

        {activeTab === 'overview' && stats && (
          <AdminOverviewTab stats={stats} />
        )}

        {activeTab === 'users' && (
          <AdminUsersTab
            users={users}
            usersTotal={usersTotal}
            userSearch={userSearch}
            loadingUsers={loadingUsers}
            usersPage={usersPage}
            usersTotalPages={usersTotalPages}
            onSearchChange={setUserSearch}
            onSearch={handleUserSearch}
            onPageChange={(offset) => fetchUsers(offset, userSearch)}
            usersOffset={usersOffset}
          />
        )}

        {activeTab === 'matches' && (
          <AdminMatchesTab
            allMatches={allMatches}
            matchesTotal={matchesTotal}
            matchStatusFilter={matchStatusFilter}
            loadingMatches={loadingMatches}
            matchesPage={matchesPage}
            matchesTotalPages={matchesTotalPages}
            onFilterChange={setMatchStatusFilter}
            onFilter={() => fetchAllMatches(0, matchStatusFilter)}
            onPageChange={(offset) => fetchAllMatches(offset, matchStatusFilter)}
            matchesOffset={matchesOffset}
          />
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
