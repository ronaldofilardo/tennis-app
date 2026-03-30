// frontend/src/pages/TournamentDashboard.tsx
// Dashboard de Torneios com listagem + modal de criação — Fase 3

import React, { useState, useEffect, useCallback } from 'react';
import { httpClient } from '../config/httpClient';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import TournamentModal from '../components/TournamentModal';
import './TournamentDashboard.css';

interface TournamentSummary {
  id: string;
  name: string;
  format: string;
  status: string;
  courtType?: string;
  startDate?: string;
  endDate?: string;
  maxPlayers?: number;
  _count?: {
    entries: number;
    matches: number;
    categories: number;
  };
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  REGISTRATION: 'Inscrições Abertas',
  IN_PROGRESS: 'Em Andamento',
  FINISHED: 'Finalizado',
  CANCELLED: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'status-draft',
  REGISTRATION: 'status-registration',
  IN_PROGRESS: 'status-progress',
  FINISHED: 'status-finished',
  CANCELLED: 'status-cancelled',
};

const FORMAT_LABELS: Record<string, string> = {
  SINGLE_ELIMINATION: 'Eliminação Simples',
  DOUBLE_ELIMINATION: 'Eliminação Dupla',
  ROUND_ROBIN: 'Todos contra Todos',
  GROUP_STAGE: 'Fase de Grupos',
};

const TournamentDashboard: React.FC = () => {
  const { activeClub } = useAuth();
  const navigation = useNavigation();

  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showModal, setShowModal] = useState(false);

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = filterStatus ? `?status=${filterStatus}` : '';
      const response = await httpClient.get<{
        tournaments: TournamentSummary[];
      }>(`/tournaments${params}`);
      setTournaments(response.data.tournaments || []);
    } catch {
      setError('Erro ao carregar torneios.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  const handleTournamentCreated = () => {
    setShowModal(false);
    fetchTournaments();
  };

  const handleOpenTournament = (id: string) => {
    navigation.navigateToMatch(id); // Temporário — será rota /tournaments/:id
  };

  return (
    <div className="tournament-dashboard">
      <div className="tournament-header">
        <div>
          <h2>Torneios</h2>
          {activeClub && <span className="tournament-club-tag">{activeClub.clubName}</span>}
        </div>
        <button className="btn-create-tournament" onClick={() => setShowModal(true)}>
          + Novo Torneio
        </button>
      </div>

      {/* Filtros */}
      <div className="tournament-filters">
        <button
          className={`filter-btn ${filterStatus === '' ? 'active' : ''}`}
          onClick={() => setFilterStatus('')}
        >
          Todos
        </button>
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <button
            key={key}
            className={`filter-btn ${filterStatus === key ? 'active' : ''}`}
            onClick={() => setFilterStatus(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading && <div className="tournament-loading">Carregando...</div>}
      {error && <div className="tournament-error">{error}</div>}

      {!loading && !error && tournaments.length === 0 && (
        <div className="tournament-empty">
          <p>Nenhum torneio encontrado.</p>
          <button className="btn-create-tournament" onClick={() => setShowModal(true)}>
            Criar primeiro torneio
          </button>
        </div>
      )}

      {!loading && tournaments.length > 0 && (
        <div className="tournament-grid">
          {tournaments.map((t) => (
            <div
              key={t.id}
              className="tournament-card"
              onClick={() => handleOpenTournament(t.id)}
              role="button"
              tabIndex={0}
            >
              <div className="tournament-card-header">
                <h3>{t.name}</h3>
                <span className={`tournament-status ${STATUS_COLORS[t.status] || ''}`}>
                  {STATUS_LABELS[t.status] || t.status}
                </span>
              </div>

              <div className="tournament-card-details">
                <div className="tournament-detail">
                  <span className="detail-label">Formato</span>
                  <span className="detail-value">{FORMAT_LABELS[t.format] || t.format}</span>
                </div>
                {t.courtType && (
                  <div className="tournament-detail">
                    <span className="detail-label">Quadra</span>
                    <span className="detail-value">{t.courtType}</span>
                  </div>
                )}
                {t._count && (
                  <>
                    <div className="tournament-detail">
                      <span className="detail-label">Inscritos</span>
                      <span className="detail-value">
                        {t._count.entries}
                        {t.maxPlayers ? `/${t.maxPlayers}` : ''}
                      </span>
                    </div>
                    <div className="tournament-detail">
                      <span className="detail-label">Categorias</span>
                      <span className="detail-value">{t._count.categories}</span>
                    </div>
                    <div className="tournament-detail">
                      <span className="detail-label">Partidas</span>
                      <span className="detail-value">{t._count.matches}</span>
                    </div>
                  </>
                )}
              </div>

              {t.startDate && (
                <div className="tournament-card-date">
                  {new Date(t.startDate).toLocaleDateString('pt-BR')}
                  {t.endDate && ` — ${new Date(t.endDate).toLocaleDateString('pt-BR')}`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de criação */}
      {showModal && (
        <TournamentModal onClose={() => setShowModal(false)} onCreated={handleTournamentCreated} />
      )}
    </div>
  );
};

export default TournamentDashboard;
