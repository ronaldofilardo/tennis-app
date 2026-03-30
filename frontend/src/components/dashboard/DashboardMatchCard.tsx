import React from 'react';
import { resolvePlayerName } from '../../data/players';

type DashboardMatchPlayers = { p1: string; p2: string };
type DashboardMatch = {
  id: string | number;
  players?: DashboardMatchPlayers | string;
  sportType?: string;
  sport?: string;
  format?: string;
  courtType?: 'GRASS' | 'CLAY' | 'HARD';
  nickname?: string | null;
  status?: string;
  score?: string;
  completedSets?: Array<{
    setNumber: number;
    games: { PLAYER_1: number; PLAYER_2: number };
    winner: string;
  }>;
  visibleTo?: string;
  createdByUserId?: string | null;
  scheduledAt?: string | null;
  venueId?: string | null;
  venue?: { id: string; name: string; city?: string | null } | null;
  visibility?: string;
  openForAnnotation?: boolean;
  apontadorEmail?: string;
  playersEmails?: string[];
  matchState?: Record<string, unknown> | null;
};

const FORMAT_LABELS: Record<string, string> = {
  BEST_OF_3: 'Melhor de 3 · Tie-break todos os sets',
  BEST_OF_3_MATCH_TB: 'Melhor de 3 · Match tie-break no 3º set',
  BEST_OF_5: 'Melhor de 5 · Tie-break todos os sets',
  SINGLE_SET: 'Set único · Tie-break em 6-6',
  PRO_SET: 'Pro Set (8 games) · Tie-break em 8-8',
  MATCH_TIEBREAK: 'Match Tiebreak (10 pts)',
  SHORT_SET: 'Set curto (4 games) · Tie-break em 4-4',
  NO_AD: 'Melhor de 3 · No-Ad',
  FAST4: 'Fast4 · No-Ad · Tie-break em 3-3',
  SHORT_SET_NO_AD: 'Set curto (4 games) · No-Ad',
  NO_LET_TENNIS: 'Melhor de 3 · No-Let',
};

interface DashboardMatchCardProps {
  rawMatch: DashboardMatch;
  localMatchOverrides: Record<string, Partial<DashboardMatch>>;
  authUserId: string | undefined;
  loadingMatchId: string | number | null;
  canView: boolean;
  onStartMatch?: (match: DashboardMatch) => void;
  onContinueMatch?: (match: DashboardMatch, initialState?: unknown) => void;
  onEditMatch: (match: DashboardMatch) => void;
  onViewStats: (matchId: string | number) => Promise<void>;
  fetchMatchStateForContinue: (matchId: string | number) => Promise<unknown>;
  onToastWarning: (msg: string, title: string) => void;
}

const DashboardMatchCard: React.FC<DashboardMatchCardProps> = ({
  rawMatch,
  localMatchOverrides,
  authUserId,
  loadingMatchId,
  canView,
  onStartMatch,
  onContinueMatch,
  onEditMatch,
  onViewStats,
  fetchMatchStateForContinue,
  onToastWarning,
}) => {
  // Aplica overrides locais (edições feitas sem reload)
  const match = localMatchOverrides[String(rawMatch.id)]
    ? { ...rawMatch, ...localMatchOverrides[String(rawMatch.id)] }
    : rawMatch;
  const p1Name = resolvePlayerName(
    match.players && typeof match.players === 'object' ? match.players.p1 : '',
  );
  const p2Name = resolvePlayerName(
    match.players && typeof match.players === 'object' ? match.players.p2 : '',
  );

  // ── matchState helpers ─────────────────────────────
  const ms =
    match.matchState && typeof match.matchState === 'object'
      ? (match.matchState as Record<string, unknown>)
      : null;

  // viewLog
  const viewLog = Array.isArray(ms?.['viewLog'])
    ? (ms!['viewLog'] as Array<Record<string, unknown>>)
    : null;
  const lastView = viewLog?.length ? viewLog[viewLog.length - 1] : null;
  const lastStartedAt =
    typeof lastView?.['startedAt'] === 'string' ? String(lastView['startedAt']) : null;
  const lastEndedAt =
    typeof lastView?.['endedAt'] === 'string' ? String(lastView['endedAt']) : null;

  // ── Live score data ────────────────────────────────
  const currentGame =
    ms?.currentGame && typeof ms.currentGame === 'object'
      ? (ms.currentGame as Record<string, unknown>)
      : null;
  const isTiebreak = Boolean(currentGame?.['isTiebreak']);
  const isMatchTiebreak = Boolean(currentGame?.['isMatchTiebreak']);
  const currentSetState =
    ms?.currentSetState && typeof ms.currentSetState === 'object'
      ? (ms.currentSetState as Record<string, unknown>)
      : null;
  const currentSetGames = currentSetState?.['games'] as Record<string, number> | undefined;
  const setsObj =
    ms?.sets && typeof ms.sets === 'object' ? (ms.sets as Record<string, number>) : undefined;
  const pointsObj = currentGame?.['points'] as Record<string, string> | undefined;

  // ── Completed sets for partials ────────────────────
  const buildPartials = (source: unknown[]): string[] => {
    return source.flatMap((set) => {
      if (!set || typeof set !== 'object') return [];
      const s = set as Record<string, unknown>;
      const games = s['games'] as Record<string, number> | undefined;
      const tbs = s['tiebreakScore'] as Record<string, number> | undefined;
      const g1 = games?.PLAYER_1 ?? 0;
      const g2 = games?.PLAYER_2 ?? 0;
      if (tbs) {
        const tb1 = tbs.PLAYER_1 ?? 0;
        const tb2 = tbs.PLAYER_2 ?? 0;
        return s['winner'] === 'PLAYER_1' ? [`${g1}/${g2}(${tb1})`] : [`${g2}/${g1}(${tb2})`];
      }
      return [`${g1}/${g2}`];
    });
  };

  let completedSetsArr: unknown[] = [];
  if (Array.isArray(match.completedSets)) completedSetsArr = match.completedSets;
  else if (Array.isArray(ms?.['completedSets']))
    completedSetsArr = ms!['completedSets'] as unknown[];

  const setsPartials = buildPartials(completedSetsArr);

  // Live: add current set partial
  if (match.status === 'IN_PROGRESS' && currentSetState) {
    const g1 = currentSetGames?.PLAYER_1 ?? 0;
    const g2 = currentSetGames?.PLAYER_2 ?? 0;
    const p1 = pointsObj?.PLAYER_1 ?? '0';
    const p2 = pointsObj?.PLAYER_2 ?? '0';
    setsPartials.push(isTiebreak ? `${g1}(${p1})/${g2}(${p2}) TB` : `${g1}(${p1})/${g2}(${p2})`);
  }

  // ── Time helpers ───────────────────────────────────
  const started = typeof ms?.['startedAt'] === 'string' ? String(ms['startedAt']) : lastStartedAt;
  const ended = typeof ms?.['endedAt'] === 'string' ? String(ms['endedAt']) : lastEndedAt;
  let durationSec: number | null = null;
  if (typeof ms?.['durationSeconds'] === 'number') durationSec = Number(ms['durationSeconds']);
  if (durationSec == null && started && ended) {
    durationSec = Math.max(
      0,
      Math.floor((new Date(ended).getTime() - new Date(started).getTime()) / 1000),
    );
  }
  const timeLabel = started
    ? new Date(started).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;
  const durLabel =
    durationSec != null ? new Date(durationSec * 1000).toISOString().substr(11, 5) : null;

  // ── Card class ─────────────────────────────────────
  const cardClass = [
    'match-card',
    match.status === 'IN_PROGRESS'
      ? 'card--live'
      : match.status === 'FINISHED'
        ? 'card--finished'
        : 'card--pending',
  ].join(' ');

  // ── Court badge ────────────────────────────────────
  const courtMap: Record<string, { label: string; icon: string }> = {
    CLAY: { label: 'Saibro', icon: '🟤' },
    HARD: { label: 'Dura', icon: '🔵' },
    GRASS: { label: 'Grama', icon: '🟢' },
  };
  const ct = match.courtType ? courtMap[match.courtType] : null;

  // ── Status badge ───────────────────────────────────
  const statusInfo =
    match.status === 'IN_PROGRESS'
      ? { cls: 'badge--live', label: 'Ao Vivo' }
      : match.status === 'FINISHED'
        ? { cls: 'badge--finished', label: 'Finalizada' }
        : { cls: 'badge--pending', label: 'Aguardando' };

  return (
    <div
      className={cardClass}
      onClick={async () => {
        if (match.status === 'NOT_STARTED' && onStartMatch) {
          onStartMatch(match);
        } else if (match.status === 'IN_PROGRESS' && onContinueMatch) {
          const initialState = await fetchMatchStateForContinue(match.id);
          onContinueMatch(match, initialState);
        }
      }}
    >
      {/* ── Top row: sport + court | status ── */}
      <div className="card-top">
        <div className="card-top-left">
          <span className="card-sport-label">
            {(match.sportType || match.sport || 'Sport').toUpperCase()}
          </span>
          {ct && (
            <span
              className={`court-type-badge court-type-badge--${match.courtType!.toLowerCase()}`}
            >
              {ct.icon} {ct.label}
            </span>
          )}
        </div>
        <div className="card-top-right">
          <span className={`status-badge ${statusInfo.cls}`}>
            {match.status === 'IN_PROGRESS' && <span className="live-dot" />}
            {statusInfo.label}
          </span>
          {match.visibility && (
            <span
              className="visibility-badge"
              title={
                match.visibility === 'PUBLIC'
                  ? 'Pública'
                  : match.visibility === 'CLUB'
                    ? 'Clube'
                    : 'Apenas Jogadores'
              }
              style={{
                marginLeft: '8px',
                fontSize: '0.9rem',
                display: 'inline-block',
              }}
            >
              {match.visibility === 'PUBLIC' ? '🌐' : match.visibility === 'CLUB' ? '🏢' : '🔒'}
            </span>
          )}
        </div>
      </div>

      {/* ── Players ── */}
      <div className="card-players">
        <div className="card-player">
          <span className="player-name">{p1Name}</span>
        </div>
        <span className="card-vs">vs</span>
        <div className="card-player player--right">
          <span className="player-name">{p2Name}</span>
        </div>
      </div>

      {/* ── Live score (IN_PROGRESS only) ── */}
      {match.status === 'IN_PROGRESS' && ms && (
        <div className="card-live-score" data-testid={`live-status-${match.id}`}>
          <div className="live-score-header">
            <span className="live-score-label">Ao Vivo</span>
            {isTiebreak && (
              <span className="live-score-tiebreak">
                {isMatchTiebreak ? 'Match Tiebreak' : 'Tiebreak'}
              </span>
            )}
          </div>
          <div className="live-score-row">
            <div className="live-stat">
              <span className="live-stat-label">Sets</span>
              <span className="live-stat-value" data-testid={`live-status-sets-${match.id}`}>
                {setsObj?.PLAYER_1 ?? 0}
                <span
                  className="live-stat-sep"
                  style={{
                    fontSize: '.7rem',
                    color: 'var(--clr-text-muted)',
                    margin: '0 3px',
                  }}
                >
                  -
                </span>
                {setsObj?.PLAYER_2 ?? 0}
              </span>
            </div>
            <div className="live-stat">
              <span className="live-stat-label">Games</span>
              <span className="live-stat-value" data-testid={`live-status-games-${match.id}`}>
                {currentSetGames?.PLAYER_1 ?? 0}
                <span
                  style={{
                    fontSize: '.7rem',
                    color: 'var(--clr-text-muted)',
                    margin: '0 3px',
                  }}
                >
                  -
                </span>
                {currentSetGames?.PLAYER_2 ?? 0}
              </span>
            </div>
            <div className="live-stat">
              <span className="live-stat-label">Pontos</span>
              <span className="live-stat-value" data-testid={`live-status-points-${match.id}`}>
                {pointsObj?.PLAYER_1 ?? '0'}
                <span
                  style={{
                    fontSize: '.7rem',
                    color: 'var(--clr-text-muted)',
                    margin: '0 3px',
                  }}
                >
                  -
                </span>
                {pointsObj?.PLAYER_2 ?? '0'}
              </span>
            </div>
          </div>
          {setsPartials.length > 0 && (
            <div className="live-partials" data-testid={`live-status-partials-${match.id}`}>
              {setsPartials.join('  ·  ')}
            </div>
          )}
        </div>
      )}

      {/* ── Finished: parciais ── */}
      {match.status === 'FINISHED' && setsPartials.length > 0 && (
        <div className="card-finished-score" data-testid={`match-card-partials-${match.id}`}>
          <span className="card-partials">{setsPartials.join('  ·  ')}</span>
        </div>
      )}

      {/* ── Footer: format + time | stats button ── */}
      <div className="card-footer">
        <div className="card-footer-meta">
          {match.nickname && <span className="card-nickname">🏷 {match.nickname}</span>}
          <span className="card-format">
            {match.format ? FORMAT_LABELS[match.format] || match.format : ''}
          </span>
          {timeLabel && (
            <span className="card-time">
              🕐 {timeLabel}
              {durLabel ? ` · ${durLabel}` : ''}
            </span>
          )}
        </div>
        <div className="card-footer-actions">
          {authUserId && match.createdByUserId === authUserId && (
            <button
              className="edit-match-btn"
              onClick={(e) => {
                e.stopPropagation();
                onEditMatch(match);
              }}
              title="Editar dados da partida"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Editar
            </button>
          )}
          <button
            className="stats-button"
            onClick={async (e) => {
              e.stopPropagation();
              if (!canView) {
                onToastWarning(
                  'Você não tem permissão para ver o resultado desta partida.',
                  'Acesso Restrito',
                );
                return;
              }
              await onViewStats(match.id);
            }}
            title={canView ? 'Abrir relatório' : 'Acesso restrito'}
            disabled={!canView || (loadingMatchId !== null && loadingMatchId !== match.id)}
          >
            {loadingMatchId === match.id ? '⏳' : '📊 Relatório'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardMatchCard;
