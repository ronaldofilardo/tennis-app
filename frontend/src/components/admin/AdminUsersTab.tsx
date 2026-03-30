import React from 'react';
import type { AdminUser } from '../../types/admin';
import {
  PAGE_SIZE,
  PLATFORM_ROLE_LABELS,
  PLATFORM_ROLE_COLORS,
  CLUB_INDEPENDENT_ROLES,
} from '../../types/admin';

interface AdminUsersTabProps {
  users: AdminUser[];
  usersTotal: number;
  userSearch: string;
  loadingUsers: boolean;
  usersPage: number;
  usersTotalPages: number;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onPageChange: (offset: number) => void;
  usersOffset: number;
}

const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
  usersTotal,
  userSearch,
  loadingUsers,
  usersPage,
  usersTotalPages,
  onSearchChange,
  onSearch,
  onPageChange,
  usersOffset,
}) => (
  <div className="admin-users-tab">
    <div className="section-header">
      <h3>
        Todos os Usuários {usersTotal > 0 && <span className="count-badge">{usersTotal}</span>}
      </h3>
    </div>

    {/* Search */}
    <div className="admin-search-bar">
      <input
        type="text"
        placeholder="Buscar por nome ou e-mail..."
        value={userSearch}
        onChange={(e) => onSearchChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSearch()}
        className="admin-search-input"
      />
      <button className="admin-btn-primary" onClick={onSearch}>
        Buscar
      </button>
    </div>

    {/* Table */}
    {loadingUsers ? (
      <div className="admin-loading">
        <div className="admin-loading-spinner" />
        Carregando usuários...
      </div>
    ) : users.length === 0 ? (
      <p className="admin-muted">Nenhum usuário encontrado.</p>
    ) : (
      <>
        <div className="admin-table">
          <div className="admin-table-header users-grid">
            <span>Nome</span>
            <span>E-mail</span>
            <span>Tipo</span>
            <span>Clube de Origem</span>
            <span>Status</span>
            <span>Clubes</span>
            <span>Criado em</span>
          </div>
          {users.map((user) => (
            <div key={user.id} className="admin-table-row users-grid">
              <span className="cell-name">
                <span className="user-avatar">{user.name?.charAt(0)?.toUpperCase() || '?'}</span>
                {user.name}
              </span>
              <span className="cell-email">{user.email}</span>
              <span className="cell-platform-role">
                <span
                  className={`platform-role-badge ${PLATFORM_ROLE_COLORS[user.platformRole] ?? 'pr-member'}`}
                >
                  {PLATFORM_ROLE_LABELS[user.platformRole] ?? user.platformRole}
                </span>
              </span>
              <span className="cell-primary-club">
                {CLUB_INDEPENDENT_ROLES.has(user.platformRole) ? '—' : (user.primaryClub ?? '—')}
              </span>
              <span className="cell-status">
                <span className={`status-dot ${user.isActive ? 'active' : 'inactive'}`} />
                {user.isActive ? 'Ativo' : 'Inativo'}
              </span>
              <span className="cell-number">{user.clubCount}</span>
              <span className="cell-date">
                {new Date(user.createdAt).toLocaleDateString('pt-BR')}
              </span>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {usersTotalPages > 1 && (
          <div className="admin-pagination">
            <button
              className="admin-btn-secondary"
              disabled={usersPage <= 1}
              onClick={() => onPageChange(usersOffset - PAGE_SIZE)}
            >
              ← Anterior
            </button>
            <span className="pagination-info">
              Página {usersPage} de {usersTotalPages}
            </span>
            <button
              className="admin-btn-secondary"
              disabled={usersPage >= usersTotalPages}
              onClick={() => onPageChange(usersOffset + PAGE_SIZE)}
            >
              Próxima →
            </button>
          </div>
        )}
      </>
    )}
  </div>
);

export default AdminUsersTab;
