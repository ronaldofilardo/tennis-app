import React from 'react';
import './CompletedMatchCard.css';

export interface CompletedMatch {
  id: string;
  sportType: string;
  format: string;
  courtType?: string | null;
  playerP1: string;
  playerP2: string;
  player1?: { id: string; name: string } | null;
  player2?: { id: string; name: string } | null;
  scheduledAt?: string | null;
  createdAt: string;
  annotationCount: number;
}

interface CompletedMatchCardProps {
  match: CompletedMatch;
  onViewStats: (matchId: string) => void;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function sportLabel(sportType: string): string {
  const labels: Record<string, string> = {
    TENNIS: 'Tênis',
    PADEL: 'Padel',
    BEACH_TENNIS: 'Beach Tennis',
  };
  return labels[sportType] ?? sportType;
}

const CompletedMatchCard: React.FC<CompletedMatchCardProps> = ({ match, onViewStats }) => {
  const p1Name = match.player1?.name ?? match.playerP1;
  const p2Name = match.player2?.name ?? match.playerP2;
  const dateLabel = match.scheduledAt ? formatDate(match.scheduledAt) : formatDate(match.createdAt);

  return (
    <article
      className="completed-match-card"
      role="article"
      aria-label={`Partida concluída: ${p1Name} vs ${p2Name}`}
    >
      <div className="completed-match-card__meta">
        <span className="completed-match-card__sport">{sportLabel(match.sportType)}</span>
        {match.format && <span className="completed-match-card__format">{match.format}</span>}
        <span className="completed-match-card__date">{dateLabel}</span>
        {match.annotationCount > 0 && (
          <span
            className="completed-match-card__badge--annotated"
            aria-label={`${match.annotationCount} anotação${match.annotationCount !== 1 ? 'ões' : ''}`}
            title="Partida anotada"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Anotada
          </span>
        )}
      </div>

      <div className="completed-match-card__players">
        <span className="completed-match-card__player">{p1Name}</span>
        <span className="completed-match-card__vs">vs</span>
        <span className="completed-match-card__player">{p2Name}</span>
      </div>

      <footer className="completed-match-card__actions">
        <button
          className="completed-match-card__btn completed-match-card__btn--stats"
          onClick={() => onViewStats(match.id)}
          aria-label={`Ver estatísticas de ${p1Name} vs ${p2Name}`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          Ver estatísticas
        </button>
      </footer>
    </article>
  );
};

export default React.memo(CompletedMatchCard);
