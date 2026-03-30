import React from 'react';
import type { AdminMatch } from '../../types/admin';
import { PAGE_SIZE, MATCH_STATUS_LABELS, MATCH_STATUS_COLORS } from '../../types/admin';

interface AdminMatchesTabProps {
  allMatches: AdminMatch[];
  matchesTotal: number;
  matchStatusFilter: string;
  loadingMatches: boolean;
  matchesPage: number;
  matchesTotalPages: number;
  onFilterChange: (value: string) => void;
  onFilter: () => void;
  onPageChange: (offset: number) => void;
  matchesOffset: number;
}

const AdminMatchesTab: React.FC<AdminMatchesTabProps> = ({
  allMatches,
  matchesTotal,
  matchStatusFilter,
  loadingMatches,
  matchesPage,
  matchesTotalPages,
  onFilterChange,
  onFilter,
  onPageChange,
  matchesOffset,
}) => (
  <div className="admin-matches-tab">
    <div className="section-header">
      <h3>
        Todas as Partidas {matchesTotal > 0 && <span className="count-badge">{matchesTotal}</span>}
      </h3>
    </div>

    {/* Filtro de Status */}
    <div className="admin-search-bar">
      <select
        className="admin-search-input"
        value={matchStatusFilter}
        onChange={(e) => onFilterChange(e.target.value)}
        aria-label="Filtrar por status"
      >
        <option value="">Todos os status</option>
        <option value="NOT_STARTED">Não iniciadas</option>
        <option value="IN_PROGRESS">Em andamento</option>
        <option value="FINISHED">Finalizadas</option>
      </select>
      <button className="admin-btn-primary" onClick={onFilter}>
        Filtrar
      </button>
    </div>

    {/* Tabela */}
    {loadingMatches ? (
      <div className="admin-loading">
        <div className="admin-loading-spinner" />
        Carregando partidas...
      </div>
    ) : allMatches.length === 0 ? (
      <p className="admin-muted">Nenhuma partida encontrada.</p>
    ) : (
      <>
        <div className="admin-table">
          <div className="admin-table-header matches-grid">
            <span>Jogadores</span>
            <span>Status</span>
            <span>Placar</span>
            <span>Clube</span>
            <span>Criador</span>
            <span>Data</span>
          </div>
          {allMatches.map((match) => (
            <div key={match.id} className="admin-table-row matches-grid">
              <span className="cell-name match-players">
                <span>{match.playerP1}</span>
                <span className="match-vs">vs</span>
                <span>{match.playerP2}</span>
              </span>
              <span>
                <span className={`match-status-badge ${MATCH_STATUS_COLORS[match.status] || ''}`}>
                  {MATCH_STATUS_LABELS[match.status] || match.status}
                </span>
              </span>
              <span className="cell-score">
                {match.score || <span className="cell-muted">—</span>}
              </span>
              <span className="cell-muted">{match.clubName || '—'}</span>
              <span className="cell-muted">{match.createdByName || '—'}</span>
              <span className="cell-date">
                {new Date(match.createdAt).toLocaleDateString('pt-BR')}
              </span>
            </div>
          ))}
        </div>

        {/* Paginação */}
        {matchesTotalPages > 1 && (
          <div className="admin-pagination">
            <button
              className="admin-btn-secondary"
              disabled={matchesPage <= 1}
              onClick={() => onPageChange(matchesOffset - PAGE_SIZE)}
            >
              ← Anterior
            </button>
            <span className="pagination-info">
              Página {matchesPage} de {matchesTotalPages}
            </span>
            <button
              className="admin-btn-secondary"
              disabled={matchesPage >= matchesTotalPages}
              onClick={() => onPageChange(matchesOffset + PAGE_SIZE)}
            >
              Próxima →
            </button>
          </div>
        )}
      </>
    )}
  </div>
);

export default AdminMatchesTab;
