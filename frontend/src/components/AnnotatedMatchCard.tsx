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
  winner?: string | null;
  completedSets?: Array<{
    setNumber: number;
    games: { PLAYER_1: number; PLAYER_2: number };
    winner: string;
  }> | null;
  tournamentName?: string | null;
  roundName?: string | null;
  nickname?: string | null;
  bracketType?: string | null;
  temperature?: number | null;
  humidity?: number | null;
  completedAnnotations: CompletedAnnotation[];
  comparisonAvailable: boolean;
  myShare?: { id: string; status: string } | null;
  isNew?: boolean;
  mySession?: {
    id: string;
    endedAt: string | null;
    hasFinalState: boolean;
    finalStateSnapshot?: string | null;
    matchStateSnapshot?: string | null;
  };
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

const FORMAT_LABELS: Record<string, string> = {
  BEST_OF_3: 'Melhor de 3 sets',
  BEST_OF_3_MATCH_TB: 'Melhor de 3 c/ Match TB',
  BEST_OF_5: 'Melhor de 5 sets',
  SINGLE_SET: 'Set único',
  PRO_SET: 'Pro Set (8 games)',
  MATCH_TIEBREAK: 'Match Tiebreak',
  SHORT_SET: 'Set curto (4 games)',
  NO_AD: 'Melhor de 3 · No-Ad',
  FAST4: 'Fast4',
  SHORT_SET_NO_AD: 'Set curto · No-Ad',
  NO_LET_TENNIS: 'Melhor de 3 · No-Let',
};

const COURT_LABELS: Record<string, string> = {
  CLAY: 'Saibro',
  HARD: 'Quadra dura',
  GRASS: 'Grama',
  CARPET: 'Carpete',
  INDOOR: 'Indoor',
  OUTDOOR: 'Outdoor',
};

const BRACKET_LABELS: Record<string, string> = {
  SINGLE_ELIMINATION: 'Eliminatória',
  DOUBLE_ELIMINATION: 'Dupla eliminatória',
  ROUND_ROBIN: 'Round-robin',
  SWISS: 'Suíço',
  GROUP_STAGE: 'Fase de grupos',
  LADDER: 'Ranking',
  FRIENDLY: 'Amistoso',
};

function formatMatchResult(
  winner: string | null | undefined,
  p1Name: string,
  p2Name: string,
  completedSets: Array<{ games: { PLAYER_1: number; PLAYER_2: number } }> | null | undefined,
): { winnerName: string; loserName: string; score: string } | null {
  if (!winner || !completedSets || completedSets.length === 0) return null;
  const isP1 = winner === 'PLAYER_1';
  const winnerName = isP1 ? p1Name : p2Name;
  const loserName = isP1 ? p2Name : p1Name;
  const score = completedSets
    .map((s) => {
      const w = isP1 ? s.games.PLAYER_1 : s.games.PLAYER_2;
      const l = isP1 ? s.games.PLAYER_2 : s.games.PLAYER_1;
      return `${w}-${l}`;
    })
    .join(', ');
  return { winnerName, loserName, score };
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

  // Sessão a usar para ver a timeline: anotador usa a própria sessão; atleta usa a primeira anotação
  const sessionForTimeline = viewerRole === 'ANNOTATOR' ? match.mySession : firstAnnotation;
  const canViewTimeline = sessionForTimeline != null;
  const sessionIdForTimeline =
    viewerRole === 'ANNOTATOR' ? match.mySession?.id : firstAnnotation?.id;

  const formatPt = FORMAT_LABELS[match.format] ?? match.format;
  const courtPt = match.courtType ? (COURT_LABELS[match.courtType] ?? match.courtType) : null;
  const bracketPt = match.bracketType
    ? (BRACKET_LABELS[match.bracketType] ?? match.bracketType)
    : null;
  const matchResult = formatMatchResult(match.winner, p1Name, p2Name, match.completedSets);

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
          {match.format && <span className="annotated-match-card__format">{formatPt}</span>}
          {dateLabel && <span className="annotated-match-card__date">{dateLabel}</span>}
        </div>

        <div className="annotated-match-card__result-inline">
          {matchResult ? (
            <>
              <span className="annotated-match-card__result-player">{matchResult.winnerName}</span>
              <span className="annotated-match-card__result-score">{matchResult.score}</span>
              <span className="annotated-match-card__result-player">{matchResult.loserName}</span>
            </>
          ) : (
            <>
              <span className="annotated-match-card__result-player">{p1Name}</span>
              <span className="annotated-match-card__result-score"> vs </span>
              <span className="annotated-match-card__result-player">{p2Name}</span>
            </>
          )}
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

      {(match.tournamentName ||
        match.roundName ||
        courtPt ||
        match.nickname ||
        formatPt ||
        bracketPt ||
        match.temperature !== null ||
        match.humidity !== null ||
        match.scheduledAt) && (
        <div className="annotated-match-card__details-wrapper">
          <div className="annotated-match-card__details-top">
            {formatPt && (
              <div className="annotated-match-card__detail-cell">
                <span className="annotated-match-card__detail-label">Modo de jogo</span>
                <span className="annotated-match-card__detail-value">{formatPt}</span>
              </div>
            )}
            {courtPt && (
              <div className="annotated-match-card__detail-cell">
                <span className="annotated-match-card__detail-label">Quadra</span>
                <span className="annotated-match-card__detail-value">📍 {courtPt}</span>
              </div>
            )}
            {match.nickname && (
              <div className="annotated-match-card__detail-cell">
                <span className="annotated-match-card__detail-label">Apelido</span>
                <span className="annotated-match-card__detail-value">{match.nickname}</span>
              </div>
            )}
            {match.temperature !== null && (
              <div className="annotated-match-card__detail-cell">
                <span className="annotated-match-card__detail-label">Temperatura</span>
                <span className="annotated-match-card__detail-value">{match.temperature}°C</span>
              </div>
            )}
            {match.humidity !== null && (
              <div className="annotated-match-card__detail-cell">
                <span className="annotated-match-card__detail-label">Umidade</span>
                <span className="annotated-match-card__detail-value">{match.humidity}%</span>
              </div>
            )}
          </div>

          {(match.tournamentName || match.roundName || bracketPt) && (
            <div className="annotated-match-card__details-boxes">
              {match.tournamentName && (
                <div className="annotated-match-card__box-cell">
                  <span className="annotated-match-card__detail-label">Torneio</span>
                  <div className="annotated-match-card__detail-box">{match.tournamentName}</div>
                </div>
              )}
              {match.roundName && (
                <div className="annotated-match-card__box-cell">
                  <span className="annotated-match-card__detail-label">Rodada</span>
                  <div className="annotated-match-card__detail-box annotated-match-card__detail-box--active">
                    {match.roundName}
                  </div>
                </div>
              )}
              {bracketPt && (
                <div className="annotated-match-card__box-cell">
                  <span className="annotated-match-card__detail-label">Tipo de chave</span>
                  <div className="annotated-match-card__detail-box annotated-match-card__detail-box--select">
                    <span>{bracketPt}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <footer className="annotated-match-card__actions">
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
              ↓ Salvar
            </button>
          ))}
        {canViewTimeline && sessionIdForTimeline && (
          <button
            className="annotated-match-card__btn annotated-match-card__btn--secondary"
            onClick={() => onViewReport(sessionIdForTimeline, match.id)}
            aria-label="Ver timeline e detalhes da anotação"
          >
            Ver timeline
          </button>
        )}
        {match.comparisonAvailable && (
          <button
            className="annotated-match-card__btn annotated-match-card__btn--primary"
            onClick={() => onViewComparison(match.id)}
            aria-label="Ver comparativo de anotações"
          >
            Ver comparativo
          </button>
        )}
        {!canViewTimeline && !match.comparisonAvailable && (
          <button
            className="annotated-match-card__btn annotated-match-card__btn--primary"
            disabled
            aria-label="Dados da anotação ainda não disponíveis"
          >
            Sem dados
          </button>
        )}
      </footer>
    </article>
  );
};

export default AnnotatedMatchCard;
