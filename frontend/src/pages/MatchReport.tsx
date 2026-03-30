// frontend/src/pages/MatchReport.tsx
// Relatório visual de uma sessão de anotação — imprimível como PDF.

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { httpClient } from '../config/httpClient';
import { createLogger } from '../services/logger';
import './MatchReport.css';

const log = createLogger('MatchReport');

interface MatchReportData {
  session: {
    id: string;
    annotatorName: string;
    endedAt: string | null;
    finalStateSnapshot: MatchStateSnapshot | null;
  };
  match: {
    id: string;
    sportType: string;
    format: string;
    courtType?: string | null;
    playerP1: string;
    playerP2: string;
    scheduledAt?: string | null;
    player1?: { name: string } | null;
    player2?: { name: string } | null;
    club?: { name: string } | null;
  };
}

interface MatchStateSnapshot {
  sets?: SetData[];
  currentSetState?: GameState;
  winner?: string;
  isFinished?: boolean;
  startedAt?: string;
  endedAt?: string;
  points?: PointEntry[];
  server?: string;
  score?: {
    sets: [number, number];
    currentGame?: [string, string];
  };
}

interface SetData {
  p1: number;
  p2: number;
  tiebreak?: boolean;
}

interface GameState {
  p1: string;
  p2: string;
}

interface PointEntry {
  ts?: string;
  winner: 'p1' | 'p2';
  type?: string;
  fault?: boolean;
  aces?: boolean;
  doubleFault?: boolean;
  winner_shot?: boolean;
  unforced_error?: boolean;
  forced_error?: boolean;
}

function sportLabel(sportType: string): string {
  const labels: Record<string, string> = {
    TENNIS: 'Tênis',
    PADEL: 'Padel',
    BEACH_TENNIS: 'Beach Tennis',
  };
  return labels[sportType] ?? sportType;
}

function courtLabel(courtType: string | null | undefined): string {
  const labels: Record<string, string> = {
    CLAY: 'Saibro',
    HARD: 'Quadra Dura',
    GRASS: 'Grama',
  };
  return courtType ? (labels[courtType] ?? courtType) : '';
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function computeStats(points: PointEntry[]): { p1: PointStats; p2: PointStats } {
  const init = (): PointStats => ({
    total: 0,
    aces: 0,
    doubleFaults: 0,
    winners: 0,
    unforcedErrors: 0,
    forcedErrors: 0,
  });
  const s = { p1: init(), p2: init() };

  for (const pt of points) {
    const side = pt.winner === 'p1' ? s.p1 : s.p2;
    const opp = pt.winner === 'p1' ? s.p2 : s.p1;
    side.total += 1;
    if (pt.aces) side.aces += 1;
    if (pt.doubleFault) opp.doubleFaults += 1;
    if (pt.winner_shot) side.winners += 1;
    if (pt.unforced_error) opp.unforcedErrors += 1;
    if (pt.forced_error) opp.forcedErrors += 1;
  }

  return s;
}

interface PointStats {
  total: number;
  aces: number;
  doubleFaults: number;
  winners: number;
  unforcedErrors: number;
  forcedErrors: number;
}

const MatchReport: React.FC = () => {
  const { matchId, sessionId } = useParams<{
    matchId: string;
    sessionId: string;
  }>();
  const navigate = useNavigate();

  const [data, setData] = useState<MatchReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId || !sessionId) {
      setError('Parâmetros inválidos.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const res = await httpClient.get<MatchReportData>(
          `/matches/${matchId}/sessions/${sessionId}/report-data`,
        );
        if (!cancelled) {
          setData(res.data);
        }
      } catch (err) {
        log.error('Erro ao carregar dados do relatório', err);
        if (!cancelled) {
          setError('Não foi possível carregar o relatório.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [matchId, sessionId]);

  if (loading) {
    return (
      <div className="match-report__loading" aria-live="polite" aria-busy="true">
        <div className="match-report__spinner" aria-hidden="true" />
        <p>Carregando relatório...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="match-report__error" role="alert">
        <p>{error ?? 'Relatório não encontrado.'}</p>
        <button className="match-report__btn match-report__btn--ghost" onClick={() => navigate(-1)}>
          Voltar
        </button>
      </div>
    );
  }

  const { session, match } = data;
  const snapshot = session.finalStateSnapshot;
  const points: PointEntry[] = snapshot?.points ?? [];
  const sets: SetData[] = snapshot?.sets ?? [];
  const stats = points.length > 0 ? computeStats(points) : null;

  const p1Name = match.player1?.name ?? match.playerP1;
  const p2Name = match.player2?.name ?? match.playerP2;

  return (
    <div className="match-report">
      {/* Toolbar — oculto na impressão */}
      <div className="match-report__toolbar no-print">
        <button
          className="match-report__btn match-report__btn--ghost"
          onClick={() => navigate(-1)}
          aria-label="Voltar"
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
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Voltar
        </button>

        <button
          className="match-report__btn match-report__btn--primary"
          onClick={() => window.print()}
          aria-label="Imprimir ou salvar como PDF"
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
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Imprimir / Salvar PDF
        </button>
      </div>

      {/* Conteúdo do relatório */}
      <div className="match-report__content">
        {/* Cabeçalho */}
        <header className="match-report__header">
          <div className="match-report__logo-row">
            <span className="match-report__app-name">Racket</span>
            <span className="match-report__tag">Relatório de Partida</span>
          </div>

          <div className="match-report__match-info">
            <div className="match-report__sport-format">
              <span className="match-report__sport">{sportLabel(match.sportType)}</span>
              {match.format && <span className="match-report__format">{match.format}</span>}
              {match.courtType && (
                <span className="match-report__court">{courtLabel(match.courtType)}</span>
              )}
            </div>

            {match.club?.name && <div className="match-report__club">{match.club.name}</div>}

            {match.scheduledAt && (
              <div className="match-report__match-date">{formatDateTime(match.scheduledAt)}</div>
            )}
          </div>

          <div className="match-report__players-row">
            <div className="match-report__player-block">
              <span className="match-report__player-label">Jogador 1</span>
              <span className="match-report__player-name">{p1Name}</span>
            </div>

            <span className="match-report__vs">VS</span>

            <div className="match-report__player-block match-report__player-block--right">
              <span className="match-report__player-label">Jogador 2</span>
              <span className="match-report__player-name">{p2Name}</span>
            </div>
          </div>
        </header>

        {/* Placar por Sets */}
        {sets.length > 0 && (
          <section className="match-report__section" aria-label="Placar por sets">
            <h2 className="match-report__section-title">Placar</h2>
            <div className="match-report__sets-table">
              <div className="match-report__sets-row match-report__sets-row--header">
                <span>Jogador</span>
                {sets.map((_, i) => (
                  <span key={i}>Set {i + 1}</span>
                ))}
                <span>Total</span>
              </div>
              <div className="match-report__sets-row">
                <span className="match-report__sets-player">{p1Name}</span>
                {sets.map((s, i) => (
                  <span key={i} className={s.p1 > s.p2 ? 'match-report__set-winner' : ''}>
                    {s.p1}
                  </span>
                ))}
                <span className="match-report__set-total">
                  {sets.filter((s) => s.p1 > s.p2).length}
                </span>
              </div>
              <div className="match-report__sets-row">
                <span className="match-report__sets-player">{p2Name}</span>
                {sets.map((s, i) => (
                  <span key={i} className={s.p2 > s.p1 ? 'match-report__set-winner' : ''}>
                    {s.p2}
                  </span>
                ))}
                <span className="match-report__set-total">
                  {sets.filter((s) => s.p2 > s.p1).length}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Estatísticas */}
        {stats && (
          <section className="match-report__section" aria-label="Estatísticas">
            <h2 className="match-report__section-title">Estatísticas</h2>
            <div className="match-report__stats-grid">
              {(
                [
                  ['Pontos vencidos', 'total'],
                  ['Aces', 'aces'],
                  ['Dupla falta', 'doubleFaults'],
                  ['Winners', 'winners'],
                  ['Erros não forçados', 'unforcedErrors'],
                  ['Erros forçados', 'forcedErrors'],
                ] as [string, keyof PointStats][]
              ).map(([label, key]) => (
                <div key={key} className="match-report__stat-row">
                  <span className="match-report__stat-value match-report__stat-value--p1">
                    {stats.p1[key]}
                  </span>
                  <span className="match-report__stat-label">{label}</span>
                  <span className="match-report__stat-value match-report__stat-value--p2">
                    {stats.p2[key]}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Timeline de pontos */}
        {points.length > 0 && (
          <section className="match-report__section" aria-label="Timeline de pontos">
            <h2 className="match-report__section-title">
              Timeline de Pontos ({points.length} pontos)
            </h2>
            <ol className="match-report__timeline" aria-label="Sequência de pontos">
              {points.map((pt, idx) => (
                <li
                  key={idx}
                  className={`match-report__timeline-item match-report__timeline-item--${pt.winner}`}
                  aria-label={`Ponto ${idx + 1}: ${pt.winner === 'p1' ? p1Name : p2Name} venceu${pt.aces ? ' (ace)' : ''}${pt.doubleFault ? ' (dupla falta)' : ''}${pt.winner_shot ? ' (winner)' : ''}${pt.unforced_error ? ' (erro não forçado)' : ''}`}
                >
                  <span className="match-report__timeline-num">{idx + 1}</span>
                  <span className="match-report__timeline-winner">
                    {pt.winner === 'p1' ? p1Name : p2Name}
                  </span>
                  {pt.aces && (
                    <span className="match-report__timeline-tag match-report__timeline-tag--ace">
                      Ace
                    </span>
                  )}
                  {pt.doubleFault && (
                    <span className="match-report__timeline-tag match-report__timeline-tag--fault">
                      Dupla falta
                    </span>
                  )}
                  {pt.winner_shot && (
                    <span className="match-report__timeline-tag match-report__timeline-tag--winner">
                      Winner
                    </span>
                  )}
                  {pt.unforced_error && (
                    <span className="match-report__timeline-tag match-report__timeline-tag--error">
                      Erro n/f
                    </span>
                  )}
                  {pt.forced_error && (
                    <span className="match-report__timeline-tag match-report__timeline-tag--forced">
                      Erro forçado
                    </span>
                  )}
                  {pt.ts && (
                    <span className="match-report__timeline-ts">
                      {new Date(pt.ts).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        {!snapshot && (
          <section className="match-report__section match-report__no-data">
            <p>Esta sessão não possui dados detalhados de anotação disponíveis.</p>
          </section>
        )}

        {/* Rodapé */}
        <footer className="match-report__footer">
          <p>
            Anotado por <strong>{session.annotatorName}</strong>
            {session.endedAt && <> · Encerrado em {formatDateTime(session.endedAt)}</>}
          </p>
          <p className="match-report__footer-app">
            Gerado pelo Racket · {new Date().toLocaleDateString('pt-BR')}
          </p>
        </footer>
      </div>
    </div>
  );
};

export default MatchReport;
