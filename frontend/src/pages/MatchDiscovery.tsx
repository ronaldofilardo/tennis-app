// frontend/src/pages/MatchDiscovery.tsx
// Página de descoberta de partidas públicas abertas para anotação.
// Qualquer usuário logado pode anotar uma partida listada aqui.

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { httpClient } from '../config/httpClient';
import { useToast } from '../components/Toast';
import { createLogger } from '../services/logger';
import './MatchDiscovery.css';

const log = createLogger('MatchDiscovery');

interface DiscoverMatch {
  id: string;
  sportType: string;
  format: string;
  courtType?: string;
  scheduledAt?: string;
  status: string;
  playerP1: string;
  playerP2: string;
  player1?: { id: string; name: string; clubId?: string };
  player2?: { id: string; name: string; clubId?: string };
  club?: { id: string; name: string; slug: string };
  homeClub?: { id: string; name: string; slug: string };
  awayClub?: { id: string; name: string; slug: string };
  createdBy?: { id: string; name: string };
  _count?: { annotationSessions: number };
}

const SPORT_LABELS: Record<string, string> = {
  TENNIS: 'Tênis',
  PADEL: 'Padel',
  BEACH_TENNIS: 'Beach Tennis',
};

const COURT_LABELS: Record<string, string> = {
  CLAY: 'Saibro',
  HARD: 'Dura',
  GRASS: 'Grama',
};

const SPORT_ICONS: Record<string, string> = {
  TENNIS: '🎾',
  PADEL: '🏓',
  BEACH_TENNIS: '🏖️',
};

function formatScheduled(date?: string): string {
  if (!date) return 'Horário a definir';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Horário a definir';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const MatchDiscovery: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const navigate = useNavigate();
  const toast = useToast();

  const [matches, setMatches] = useState<DiscoverMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [annotatingId, setAnnotatingId] = useState<string | null>(null);

  // Filtros
  const [sportFilter, setSportFilter] = useState<string>('');

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sportFilter) params.set('sportType', sportFilter);
      const res = await httpClient.get<DiscoverMatch[]>(`/matches/discover?${params.toString()}`);
      setMatches(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      log.error('Erro ao buscar partidas', err);
      toast.error('Não foi possível carregar as partidas.', 'Erro');
    } finally {
      setLoading(false);
    }
  }, [sportFilter, toast]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const handleAnnotate = async (matchId: string) => {
    setAnnotatingId(matchId);
    try {
      // Cria sessão de anotação para este usuário e navega para o placar
      await httpClient.post(`/matches/${matchId}/sessions`, {});
      navigate(`/match/${matchId}`);
    } catch (err) {
      log.error('Erro ao iniciar anotação', err);
      toast.error('Não foi possível iniciar a anotação.', 'Erro');
    } finally {
      setAnnotatingId(null);
    }
  };

  const renderClubNames = (match: DiscoverMatch): string => {
    const home = match.homeClub?.name || match.club?.name;
    const away = match.awayClub?.name;
    if (home && away && home !== away) return `${home} vs ${away}`;
    if (home) return home;
    return '';
  };

  return (
    <div className="match-discovery">
      <header className="match-discovery__header">
        <button
          className="match-discovery__back"
          onClick={() => (onBack ? onBack() : navigate('/dashboard'))}
          aria-label="Voltar ao Dashboard"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            width={18}
            height={18}
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="match-discovery__title-area">
          <h1 className="match-discovery__title">Partidas Abertas</h1>
          <p className="match-discovery__subtitle">
            Anote partidas de qualquer atleta da plataforma
          </p>
        </div>
      </header>

      {/* Filtros */}
      <div className="match-discovery__filters" role="group" aria-label="Filtros">
        <button
          className={`discovery-filter-chip${!sportFilter ? 'discovery-filter-chip--active' : ''}`}
          onClick={() => setSportFilter('')}
        >
          Todos
        </button>
        {Object.entries(SPORT_LABELS).map(([key, label]) => (
          <button
            key={key}
            className={`discovery-filter-chip${sportFilter === key ? 'discovery-filter-chip--active' : ''}`}
            onClick={() => setSportFilter(key === sportFilter ? '' : key)}
          >
            {SPORT_ICONS[key]} {label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading && (
        <div className="match-discovery__loading" aria-live="polite">
          <div className="match-discovery__spinner" aria-hidden="true" />
          Carregando partidas...
        </div>
      )}

      {!loading && matches.length === 0 && (
        <div className="match-discovery__empty">
          <span aria-hidden="true" className="match-discovery__empty-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              width={48}
              height={48}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <h3>Nenhuma partida aberta</h3>
          <p>
            Não há partidas públicas aguardando anotadores no momento. Tente novamente mais tarde ou
            crie uma nova partida.
          </p>
          <button className="match-discovery__cta" onClick={() => navigate('/match/new')}>
            Criar uma partida
          </button>
        </div>
      )}

      {!loading && matches.length > 0 && (
        <ul className="match-discovery__list" role="list">
          {matches.map((match) => {
            const p1Name = match.player1?.name || match.playerP1 || 'Atleta 1';
            const p2Name = match.player2?.name || match.playerP2 || 'Atleta 2';
            const clubNames = renderClubNames(match);
            const annotatorCount = match._count?.annotationSessions ?? 0;
            const isAnnotating = annotatingId === match.id;

            return (
              <li key={match.id} className="discovery-card" role="listitem">
                <div className="discovery-card__header">
                  <span className="discovery-card__sport-badge">
                    {SPORT_ICONS[match.sportType] || '🎾'}{' '}
                    {SPORT_LABELS[match.sportType] || match.sportType}
                  </span>
                  {match.courtType && (
                    <span className="discovery-card__court-badge">
                      {COURT_LABELS[match.courtType] || match.courtType}
                    </span>
                  )}
                  <span className="discovery-card__scheduled">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      width={13}
                      height={13}
                      aria-hidden="true"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {formatScheduled(match.scheduledAt)}
                  </span>
                </div>

                <div className="discovery-card__players">
                  <span className="discovery-card__player">{p1Name}</span>
                  <span className="discovery-card__vs">vs</span>
                  <span className="discovery-card__player">{p2Name}</span>
                </div>

                {clubNames && (
                  <div className="discovery-card__clubs">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      width={13}
                      height={13}
                      aria-hidden="true"
                    >
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    </svg>
                    {clubNames}
                  </div>
                )}

                <div className="discovery-card__footer">
                  <span className="discovery-card__annotators">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      width={13}
                      height={13}
                      aria-hidden="true"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    {annotatorCount === 0
                      ? 'Seja o primeiro anotador'
                      : `${annotatorCount} anotador${annotatorCount > 1 ? 'es' : ''}`}
                  </span>

                  <button
                    className="discovery-card__annotate-btn"
                    onClick={() => handleAnnotate(match.id)}
                    disabled={isAnnotating}
                    aria-busy={isAnnotating}
                  >
                    {isAnnotating ? (
                      <>
                        <svg
                          className="discovery-card__spinner"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          width={16}
                          height={16}
                          aria-hidden="true"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeOpacity="0.3"
                          />
                          <path
                            d="M12 2a10 10 0 0 1 10 10"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                        </svg>
                        Entrando...
                      </>
                    ) : (
                      'Anotar partida'
                    )}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default MatchDiscovery;
