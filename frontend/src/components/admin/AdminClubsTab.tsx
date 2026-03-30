import React from 'react';
import type { AdminClub } from '../../types/admin';
import { PAGE_SIZE, PLAN_LABELS, PLAN_COLORS } from '../../types/admin';

interface AdminClubsTabProps {
  clubs: AdminClub[];
  clubsTotal: number;
  clubSearch: string;
  loadingClubs: boolean;
  clubsPage: number;
  clubsTotalPages: number;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onPageChange: (offset: number) => void;
  onShowMembers: (club: AdminClub) => void;
  onCreateClick: () => void;
  clubsOffset: number;
}

const AdminClubsTab: React.FC<AdminClubsTabProps> = ({
  clubs,
  clubsTotal,
  clubSearch,
  loadingClubs,
  clubsPage,
  clubsTotalPages,
  onSearchChange,
  onSearch,
  onPageChange,
  onShowMembers,
  onCreateClick,
  clubsOffset,
}) => (
  <div className="admin-clubs-tab">
    <div className="section-header">
      <h3>Todos os Clubes {clubsTotal > 0 && <span className="count-badge">{clubsTotal}</span>}</h3>
      <button className="admin-btn-primary" onClick={onCreateClick}>
        + Criar Clube
      </button>
    </div>

    {/* Search */}
    <div className="admin-search-bar">
      <input
        type="text"
        placeholder="Buscar por nome ou slug..."
        value={clubSearch}
        onChange={(e) => onSearchChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSearch()}
        className="admin-search-input"
      />
      <button className="admin-btn-primary" onClick={onSearch}>
        Buscar
      </button>
    </div>

    {/* Table */}
    {loadingClubs ? (
      <div className="admin-loading">
        <div className="admin-loading-spinner" />
        Carregando clubes...
      </div>
    ) : clubs.length === 0 ? (
      <p className="admin-muted">Nenhum clube encontrado.</p>
    ) : (
      <>
        <div className="admin-table">
          <div className="admin-table-header clubs-grid">
            <span>Nome</span>
            <span>Slug</span>
            <span>Plano</span>
            <span>Membros</span>
            <span>Criado em</span>
          </div>
          {clubs.map((club) => (
            <div
              key={club.id}
              className="admin-table-row clubs-grid admin-table-row--clickable"
              onClick={() => onShowMembers(club)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onShowMembers(club)}
              aria-label={`Ver membros de ${club.name}`}
            >
              <span className="cell-name">{club.name}</span>
              <span className="cell-slug">/{club.slug}</span>
              <span>
                <span className={`plan-badge ${PLAN_COLORS[club.planType] || ''}`}>
                  {PLAN_LABELS[club.planType] || club.planType}
                </span>
              </span>
              <span className="cell-number">{club.memberCount}</span>
              <span className="cell-date">
                {new Date(club.createdAt).toLocaleDateString('pt-BR')}
              </span>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {clubsTotalPages > 1 && (
          <div className="admin-pagination">
            <button
              className="admin-btn-secondary"
              disabled={clubsPage <= 1}
              onClick={() => onPageChange(clubsOffset - PAGE_SIZE)}
            >
              ← Anterior
            </button>
            <span className="pagination-info">
              Página {clubsPage} de {clubsTotalPages}
            </span>
            <button
              className="admin-btn-secondary"
              disabled={clubsPage >= clubsTotalPages}
              onClick={() => onPageChange(clubsOffset + PAGE_SIZE)}
            >
              Próxima →
            </button>
          </div>
        )}
      </>
    )}
  </div>
);

export default AdminClubsTab;
