// frontend/src/components/MatchTimelineView.tsx
// Timeline detalhada de pontos de uma partida para análise pós-jogo.
// Mostra cada ponto com: saque → rally → resultado, filtros e contexto de placar.

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { PointDetails } from '../core/scoring/types';
import {
  filterPointsHistory,
  countByFilter,
  enrichPointsWithBallDetection,
} from '../services/timelineUtils';
import type { TimelineFilterCriteria } from '../services/timelineUtils';
import PointCard from './PointCard';
import './MatchTimelineView.css';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MatchTimelineViewProps {
  /** Histórico completo de pontos da partida */
  pointsHistory: PointDetails[];
  /** Nomes dos jogadores */
  playerNames: { p1: string; p2: string };
}

// ─── Componente principal ────────────────────────────────────────────────────

const MatchTimelineView: React.FC<MatchTimelineViewProps> = ({ pointsHistory, playerNames }) => {
  const [criteria, setCriteria] = useState<TimelineFilterCriteria>({});
  const [printMode, setPrintMode] = useState(false);

  useEffect(() => {
    const onBefore = () => {
      console.log('[MatchTimelineView] beforeprint disparado — expandindo todos os cards');
      setPrintMode(true);
    };
    const onAfter = () => {
      console.log('[MatchTimelineView] afterprint disparado — recolhendo cards');
      setPrintMode(false);
    };
    window.addEventListener('beforeprint', onBefore);
    window.addEventListener('afterprint', onAfter);
    return () => {
      window.removeEventListener('beforeprint', onBefore);
      window.removeEventListener('afterprint', onAfter);
    };
  }, []);

  // Enriquece pontos com detecção de game ball e set ball
  const enrichedPoints = useMemo(
    () => enrichPointsWithBallDetection(pointsHistory),
    [pointsHistory],
  );

  // Aplica filtros à lista de pontos enriquecida
  const filtered = useMemo(
    () => filterPointsHistory(enrichedPoints, criteria),
    [enrichedPoints, criteria],
  );

  // Mapa de índice original para exibição após filtros
  const originalIndices = useMemo(() => {
    if (Object.values(criteria).every((v) => v === undefined || v === null || v === false)) {
      return filtered.map((_, i) => i);
    }
    return filtered.map((pt) => enrichedPoints.indexOf(pt));
  }, [filtered, enrichedPoints, criteria]);

  const toggleFilter = useCallback(
    <K extends keyof TimelineFilterCriteria>(key: K, value: TimelineFilterCriteria[K]) => {
      setCriteria((prev) => {
        const current = prev[key];
        // Toggle: se já está ativo com o mesmo valor, remove
        if (current === value) {
          const next = { ...prev };
          delete next[key];
          return next;
        }
        return { ...prev, [key]: value };
      });
    },
    [],
  );

  const clearFilters = useCallback(() => setCriteria({}), []);
  const hasActiveFilters = Object.keys(criteria).length > 0;

  // Contagens para badges
  const countP1 = useMemo(
    () => countByFilter(enrichedPoints, { playerWinner: 'PLAYER_1' }),
    [enrichedPoints],
  );
  const countP2 = useMemo(
    () => countByFilter(enrichedPoints, { playerWinner: 'PLAYER_2' }),
    [enrichedPoints],
  );
  const countBP = useMemo(
    () => countByFilter(enrichedPoints, { breakPointsOnly: true }),
    [enrichedPoints],
  );
  const countWinners = useMemo(
    () => countByFilter(enrichedPoints, { winnersOnly: true }),
    [enrichedPoints],
  );
  const countErrors = useMemo(
    () => countByFilter(enrichedPoints, { errorsOnly: true }),
    [enrichedPoints],
  );

  if (pointsHistory.length === 0) {
    return (
      <div className="match-timeline">
        <h2 className="match-timeline__title">Timeline de Pontos</h2>
        <p className="match-timeline__empty">
          Esta sessão não possui pontos detalhados registrados.
        </p>
      </div>
    );
  }

  return (
    <div className="match-timeline">
      {/* Cabeçalho */}
      <div className="match-timeline__header">
        <h2 className="match-timeline__title">Timeline de Pontos</h2>
        <span className="match-timeline__count">
          {filtered.length === pointsHistory.length
            ? `${pointsHistory.length} pontos`
            : `${filtered.length} de ${pointsHistory.length} pontos`}
        </span>
      </div>

      {/* Filtros */}
      <div className="match-timeline__filters" role="group" aria-label="Filtros da timeline">
        <button
          className={[
            'match-timeline__filter-chip',
            'match-timeline__filter-chip--p1',
            criteria.playerWinner === 'PLAYER_1' ? 'match-timeline__filter-chip--active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => toggleFilter('playerWinner', 'PLAYER_1')}
          aria-pressed={criteria.playerWinner === 'PLAYER_1'}
          type="button"
        >
          {playerNames.p1}
          <span className="match-timeline__filter-badge">{countP1}</span>
        </button>

        <button
          className={[
            'match-timeline__filter-chip',
            'match-timeline__filter-chip--p2',
            criteria.playerWinner === 'PLAYER_2' ? 'match-timeline__filter-chip--active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => toggleFilter('playerWinner', 'PLAYER_2')}
          aria-pressed={criteria.playerWinner === 'PLAYER_2'}
          type="button"
        >
          {playerNames.p2}
          <span className="match-timeline__filter-badge">{countP2}</span>
        </button>

        {countBP > 0 && (
          <button
            className={[
              'match-timeline__filter-chip',
              criteria.breakPointsOnly ? 'match-timeline__filter-chip--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => toggleFilter('breakPointsOnly', true)}
            aria-pressed={!!criteria.breakPointsOnly}
            type="button"
          >
            Breakpoints
            <span className="match-timeline__filter-badge">{countBP}</span>
          </button>
        )}

        <button
          className={[
            'match-timeline__filter-chip',
            criteria.winnersOnly ? 'match-timeline__filter-chip--active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => toggleFilter('winnersOnly', true)}
          aria-pressed={!!criteria.winnersOnly}
          type="button"
        >
          Winners / Aces
          <span className="match-timeline__filter-badge">{countWinners}</span>
        </button>

        <button
          className={[
            'match-timeline__filter-chip',
            criteria.errorsOnly ? 'match-timeline__filter-chip--active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => toggleFilter('errorsOnly', true)}
          aria-pressed={!!criteria.errorsOnly}
          type="button"
        >
          Erros
          <span className="match-timeline__filter-badge">{countErrors}</span>
        </button>

        {hasActiveFilters && (
          <button
            className="match-timeline__filter-chip"
            onClick={clearFilters}
            type="button"
            aria-label="Limpar todos os filtros"
          >
            ✕ Limpar
          </button>
        )}
      </div>

      {/* Lista de pontos */}
      {filtered.length === 0 ? (
        <p className="match-timeline__empty">Nenhum ponto corresponde aos filtros selecionados.</p>
      ) : (
        <ol className="match-timeline__list" aria-label="Pontos da partida">
          {filtered.map((point, i) => (
            <PointCard
              key={originalIndices[i]}
              point={point}
              index={i}
              originalIndex={originalIndices[i]}
              playerNames={playerNames}
              forceExpand={printMode}
            />
          ))}
        </ol>
      )}
    </div>
  );
};

export default MatchTimelineView;
