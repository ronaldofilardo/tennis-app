import React from 'react';
import './AnnotatedMatchCard.css';

export interface CompletedAnnotation {
  id: string;
  annotatorId: string;
  annotatorName: string;
  endedAt: string | null;
  hasFinalState?: boolean;
}

export interface AnnotatedMatch {
  id: string;
  sportType: string;
  format: string;
  courtType?: string | null;
  playerP1: string;
  playerP2: string;
  scheduledAt?: string | null;
  createdAt?: string | null;
  player1?: { id: string; name: string } | null;
  player2?: { id: string; name: string } | null;
  club?: { id: string; name: string } | null;
  completedAnnotations: CompletedAnnotation[];
  comparisonAvailable: boolean;
  myShare?: { id: string; status: string } | null;
  isNew?: boolean;
  mySession?: { id: string; endedAt: string | null; hasFinalState: boolean };
}

interface AnnotatedMatchCardProps {
  match: AnnotatedMatch;
  viewerRole: 'PLAYER' | 'ANNOTATOR';
  onViewReport: (sessionId: string, matchId: string) => void;
  onViewComparison: (matchId: string) => void;
  onDismiss: (matchId: string) => void;
  onClaim?: (matchId: string) => void;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

const AnnotatedMatchCard: React.FC<AnnotatedMatchCardProps> = ({
  match,
  viewerRole,
  onViewReport,
  onViewComparison,
  onDismiss,
  onClaim,
}) => {
  const p1Name = match.player1?.name ?? match.playerP1;
  const p2Name = match.player2?.name ?? match.playerP2;
  const clubName = match.club?.name;
  const dateLabel = match.scheduledAt
    ? formatDate(match.scheduledAt)
    : match.createdAt
      ? formatDate(match.createdAt)
      : null;

  const firstAnnotation = match.completedAnnotations[0];
  const annotatorNames = match.completedAnnotations
    .map((a) => a.annotatorName)
    .slice(0, 3)
    .join(', ');

  const latestEndedAt = match.completedAnnotations
    .filter((a) => a.endedAt)
    .sort((a, b) => new Date(b.endedAt!).getTime() - new Date(a.endedAt!).getTime())[0]?.endedAt;

  const canViewReport = !match.comparisonAvailable && firstAnnotation?.hasFinalState;

  return (
    <article
      className="annotated-match-card"
      role="article"
      aria-label={`Partida anotada: ${p1Name} vs ${p2Name}`}
    >
      <header className="annotated-match-card__header">
        <div className="annotated-match-card__meta">
          {viewerRole === 'PLAYER' && match.isNew && (
            <span className="annotated-match-card__badge--new" aria-label="Nova notificação">
              NOVO
            </span>
          )}
          <span className="annotated-match-card__sport">{sportLabel(match.sportType)}</span>
          {match.format && <span className="annotated-match-card__format">{match.format}</span>}
          {dateLabel && <span className="annotated-match-card__date">{dateLabel}</span>}
        </div>

        <button
          className="annotated-match-card__dismiss"
          onClick={() => onDismiss(match.id)}
          aria-label="Ignorar esta notificação"
          title="Ignorar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </header>

      <div className="annotated-match-card__players">
        <span className="annotated-match-card__player">{p1Name}</span>
        <span className="annotated-match-card__vs">vs</span>
        <span className="annotated-match-card__player">{p2Name}</span>
        {clubName && <span className="annotated-match-card__club">· {clubName}</span>}
      </div>

      <div className="annotated-match-card__annotation-info">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="annotated-match-card__pencil-icon"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>

        {match.comparisonAvailable ? (
          <span>
            {match.completedAnnotations.length} anotadores: <strong>{annotatorNames}</strong>
          </span>
        ) : (
          <span>
            {viewerRole === 'PLAYER' ? 'Anotado por: ' : 'Anotação por: '}
            <strong>{firstAnnotation?.annotatorName ?? '—'}</strong>
          </span>
        )}
      </div>

      {latestEndedAt && (
        <div className="annotated-match-card__ended-at">
          Encerrado em: <time dateTime={latestEndedAt}>{formatDateTime(latestEndedAt)}</time>
        </div>
      )}

      {viewerRole === 'ANNOTATOR' && match.mySession && (
        <div className="annotated-match-card__my-session-info">
          Sua anotação encerrada em:{' '}
          <time dateTime={match.mySession.endedAt ?? ''}>
            {formatDateTime(match.mySession.endedAt)}
          </time>
        </div>
      )}

      <footer className="annotated-match-card__actions">
        {viewerRole === 'PLAYER' &&
          onClaim &&
          (match.myShare?.status === 'ACCEPTED' ? (
            <span className="annotated-match-card__badge--claimed">✓ No seu histórico</span>
          ) : (
            <button
              className="annotated-match-card__btn annotated-match-card__btn--ghost"
              onClick={() => onClaim(match.id)}
              aria-label="Salvar no seu histórico"
            >
              ↓ Salvar no histórico
            </button>
          ))}
        {match.comparisonAvailable ? (
          <button
            className="annotated-match-card__btn annotated-match-card__btn--primary"
            onClick={() => onViewComparison(match.id)}
            aria-label="Ver comparativo de anotações"
          >
            Ver comparativo
          </button>
        ) : canViewReport && firstAnnotation ? (
          <button
            className="annotated-match-card__btn annotated-match-card__btn--primary"
            onClick={() => onViewReport(firstAnnotation.id, match.id)}
            aria-label="Ver relatório da anotação"
          >
            Ver relatório
          </button>
        ) : (
          <button
            className="annotated-match-card__btn annotated-match-card__btn--primary"
            onClick={() => firstAnnotation && onViewReport(firstAnnotation.id, match.id)}
            aria-label="Ver detalhes da anotação"
            disabled={!firstAnnotation}
          >
            Ver detalhes
          </button>
        )}
      </footer>
    </article>
  );
};

export default AnnotatedMatchCard;
