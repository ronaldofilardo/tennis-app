// frontend/src/components/MatchComparisonView.tsx
// Visualiza comparativo ponto-a-ponto entre múltiplos anotadores.
// Destaques: consenso = verde, divergência = âmbar.

import React, { useState, useEffect, useCallback } from 'react';
import { httpClient } from '../config/httpClient';
import { createLogger } from '../services/logger';
import './MatchComparisonView.css';

const log = createLogger('MatchComparisonView');

interface ComparisonSession {
  id: string;
  annotatorId: string;
  name: string;
}

interface PointEntry {
  winner?: string;
  score?: string;
  timestamp?: string;
  [key: string]: unknown;
}

interface ComparisonPoint {
  index: number;
  consensus: boolean;
  sessions: Record<string, PointEntry | null>;
}

interface ComparisonPayload {
  sessions: ComparisonSession[];
  points: ComparisonPoint[];
}

interface MatchAnnotationComparison {
  id: string;
  matchId: string;
  payload: ComparisonPayload;
  status: string;
  updatedAt: string;
}

interface MatchComparisonViewProps {
  matchId: string;
  onClose: () => void;
}

const WINNER_LABELS: Record<string, string> = {
  PLAYER_1: 'P1',
  PLAYER_2: 'P2',
};

const MatchComparisonView: React.FC<MatchComparisonViewProps> = ({ matchId, onClose }) => {
  const [comparison, setComparison] = useState<MatchAnnotationComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComparison = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await httpClient.get<MatchAnnotationComparison>(`/matches/${matchId}/comparison`);
      setComparison(res.data);
    } catch (err) {
      log.error('Erro ao buscar comparativo', err);
      setError('Comparativo ainda não disponível.');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  if (loading) {
    return (
      <div className="comparison-view comparison-view--loading" role="status">
        <div className="comparison-view__spinner" aria-hidden="true" />
        Carregando comparativo...
      </div>
    );
  }

  if (error || !comparison) {
    return (
      <div className="comparison-view comparison-view--error">
        <p>{error || 'Comparativo não encontrado.'}</p>
        <button className="comparison-view__close-btn" onClick={onClose}>
          Fechar
        </button>
      </div>
    );
  }

  const { sessions, points } = comparison.payload;
  const divergentCount = points.filter((p) => !p.consensus).length;

  return (
    <div className="comparison-view" role="region" aria-label="Comparativo de anotações">
      <header className="comparison-view__header">
        <div>
          <h2 className="comparison-view__title">Comparativo de Anotações</h2>
          <p className="comparison-view__meta">
            {sessions.length} anotador{sessions.length > 1 ? 'es' : ''} · {points.length} pontos ·{' '}
            <span
              className={
                divergentCount > 0
                  ? 'comparison-view__badge--divergent'
                  : 'comparison-view__badge--consensus'
              }
            >
              {divergentCount > 0
                ? `${divergentCount} divergência${divergentCount > 1 ? 's' : ''}`
                : 'Consenso total'}
            </span>
          </p>
        </div>
        <button
          className="comparison-view__close-btn"
          onClick={onClose}
          aria-label="Fechar comparativo"
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
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </header>

      {points.length === 0 ? (
        <div className="comparison-view__empty">
          <p>Nenhum ponto registrado nas sessões.</p>
        </div>
      ) : (
        <div
          className="comparison-view__table-wrapper"
          role="table"
          aria-label="Pontos por anotador"
        >
          {/* Cabeçalho */}
          <div className="comparison-view__row comparison-view__row--head" role="row">
            <span
              className="comparison-view__cell comparison-view__cell--index"
              role="columnheader"
            >
              Ponto
            </span>
            {sessions.map((s) => (
              <span
                key={s.annotatorId}
                className="comparison-view__cell comparison-view__cell--session"
                role="columnheader"
                title={s.annotatorId}
              >
                {s.name}
              </span>
            ))}
            <span
              className="comparison-view__cell comparison-view__cell--status"
              role="columnheader"
            >
              Consenso
            </span>
          </div>

          {/* Pontos */}
          {points.map((point) => (
            <div
              key={point.index}
              className={`comparison-view__row${!point.consensus ? 'comparison-view__row--divergent' : ''}`}
              role="row"
            >
              <span className="comparison-view__cell comparison-view__cell--index" role="cell">
                {point.index + 1}
              </span>
              {sessions.map((s) => {
                const entry = point.sessions[s.annotatorId];
                const winner = entry?.winner;
                return (
                  <span
                    key={s.annotatorId}
                    className={`comparison-view__cell comparison-view__cell--session${
                      winner ? ` comparison-view__winner--${winner.toLowerCase()}` : ''
                    }`}
                    role="cell"
                  >
                    {winner ? (WINNER_LABELS[winner] ?? winner) : '—'}
                  </span>
                );
              })}
              <span
                className={`comparison-view__cell comparison-view__cell--status ${
                  point.consensus
                    ? 'comparison-view__badge--consensus'
                    : 'comparison-view__badge--divergent'
                }`}
                role="cell"
                aria-label={point.consensus ? 'Consenso' : 'Divergência'}
              >
                {point.consensus ? '✓' : '!'}
              </span>
            </div>
          ))}
        </div>
      )}

      <footer className="comparison-view__footer">
        <p className="comparison-view__last-updated">
          Atualizado em{' '}
          {new Date(comparison.updatedAt).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
        <button
          className="comparison-view__refresh-btn"
          onClick={fetchComparison}
          aria-label="Atualizar comparativo"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            width={14}
            height={14}
            aria-hidden="true"
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Atualizar
        </button>
      </footer>
    </div>
  );
};

export default MatchComparisonView;
