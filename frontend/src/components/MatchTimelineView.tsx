// frontend/src/components/MatchTimelineView.tsx
// Timeline de pontos — tabela fixa onde cada ponto é uma linha.
// Colunas: GAME · PONTO · ACE ou DF · TROCAS · SITUAÇÃO · RESULTADO · GOLPE · ERROU: · DIREÇÃO · EFEITO · ESPECIAIS

import React, { useState, useCallback, useMemo } from 'react';
import type { PointDetails } from '../core/scoring/types';
import {
  filterPointsHistory,
  countByFilter,
  enrichPointsWithBallDetection,
} from '../services/timelineUtils';
import type { TimelineFilterCriteria } from '../services/timelineUtils';
import './MatchTimelineView.css';

// ─── Helpers de formatação ────────────────────────────────────────────────────

const EFFECT_SHORT: Record<string, string> = { TopSpin: 'TOP', Slice: 'SLI', Flat: 'FLA' };
const DIR_SHORT: Record<string, string> = { Fechado: 'FEC', Centro: 'CEN', Aberto: 'AB' };
const EFFECT_MED: Record<string, string> = { TopSpin: 'Top', Slice: 'Sli', Flat: 'Flat' };
const DIR_MED: Record<string, string> = { Fechado: 'Fec', Centro: 'Cen', Aberto: 'Ab' };

function formatAceOrDf(point: PointDetails): string {
  if (!point.serve) return '–';
  const { type, serveEffect, direction, firstFault } = point.serve;

  if (type === 'ACE' || type === 'SERVICE_WINNER') {
    const prefix = type === 'ACE' ? 'ACE' : 'SW';
    const e = serveEffect ? (EFFECT_SHORT[serveEffect] ?? serveEffect) : '';
    const d = direction ? (DIR_SHORT[direction] ?? direction) : '';
    return [prefix, e, d].filter(Boolean).join('-');
  }

  if (type === 'DOUBLE_FAULT') {
    const feParts = [
      firstFault?.serveEffect ? (EFFECT_MED[firstFault.serveEffect] ?? firstFault.serveEffect) : '',
      firstFault?.direction ? (DIR_MED[firstFault.direction] ?? firstFault.direction) : '',
    ].filter(Boolean);
    const seParts = [
      serveEffect ? (EFFECT_MED[serveEffect] ?? serveEffect) : '',
      direction ? (DIR_MED[direction] ?? direction) : '',
    ].filter(Boolean);
    const firstStr = feParts.length ? `-${feParts.join('-')}` : '';
    const secondStr = seParts.length ? ` - ${seParts.join(' - ')}` : '';
    return `DF: 1o.${firstStr} > 2o.${secondStr}`;
  }

  return '–';
}

function isServeEndingPoint(point: PointDetails): boolean {
  return (
    !!point.serve &&
    (point.serve.type === 'ACE' ||
      point.serve.type === 'DOUBLE_FAULT' ||
      point.serve.type === 'SERVICE_WINNER')
  );
}

function getTrocas(point: PointDetails): number {
  if (isServeEndingPoint(point)) return 1;
  return point.rally.ballExchanges > 0 ? point.rally.ballExchanges : 1;
}

function formatResultado(point: PointDetails): string {
  const t = point.result.type;
  if (t === 'WINNER') return 'Winner';
  if (t === 'UNFORCED_ERROR') return 'ENF';
  if (t === 'FORCED_ERROR') return 'EF';
  return t;
}

const SITUACAO_PT: Record<string, string> = {
  devolucao: 'Devolução',
  fundo: 'Fundo',
  rede: 'Rede',
  passada: 'Passada',
};

const DIRECAO_PT: Record<string, string> = {
  cruzada: 'cruzada',
  paralela: 'paralela',
  centro: 'centro',
  'inside-in': 'Inside-In',
  'inside-out': 'Inside-Out',
};

const SUBTIPO1_PT: Record<string, string> = {
  PassingShot: 'Passing Shot',
  ServeReturn: 'Devolução',
};

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

  const enrichedPoints = useMemo(
    () => enrichPointsWithBallDetection(pointsHistory),
    [pointsHistory],
  );

  const filtered = useMemo(
    () => filterPointsHistory(enrichedPoints, criteria),
    [enrichedPoints, criteria],
  );

  const toggleFilter = useCallback(
    <K extends keyof TimelineFilterCriteria>(key: K, value: TimelineFilterCriteria[K]) => {
      setCriteria((prev) => {
        if (prev[key] === value) {
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

  // Agrupar pontos filtrados por número de set
  const setGroups = useMemo(() => {
    const groups: Array<{ setNumber: number; points: PointDetails[] }> = [];
    for (const pt of filtered) {
      const setNum = pt.context?.setNumber ?? 1;
      const last = groups[groups.length - 1];
      if (last && last.setNumber === setNum) {
        last.points.push(pt);
      } else {
        groups.push({ setNumber: setNum, points: [pt] });
      }
    }
    return groups;
  }, [filtered]);

  if (pointsHistory.length === 0) {
    return (
      <div className="match-timeline">
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

      {/* Tabela de pontos */}
      {filtered.length === 0 ? (
        <p className="match-timeline__empty">Nenhum ponto corresponde aos filtros selecionados.</p>
      ) : (
        <div className="match-timeline__table-wrap">
          <table className="match-timeline__table" aria-label="Timeline de pontos da partida">
            <colgroup>
              <col style={{ width: '6%' }} /> {/* GAME */}
              <col style={{ width: '7%' }} /> {/* PONTO */}
              <col style={{ width: '14%' }} /> {/* ACE ou DF */}
              <col style={{ width: '5%' }} /> {/* TROCAS */}
              <col style={{ width: '9%' }} /> {/* SITUAÇÃO */}
              <col style={{ width: '9%' }} /> {/* RESULTADO */}
              <col style={{ width: '6%' }} /> {/* GOLPE */}
              <col style={{ width: '8%' }} /> {/* TIPO DE ERRO */}
              <col style={{ width: '6%' }} /> {/* ONDE ERROU */}
              <col style={{ width: '9%' }} /> {/* DIREÇÃO */}
              <col style={{ width: '9%' }} /> {/* EFEITO */}
              <col style={{ width: '10%' }} /> {/* ESPECIAIS */}
            </colgroup>
            <thead>
              <tr className="match-timeline__col-header">
                <th scope="col">GAME</th>
                <th scope="col">PONTO</th>
                <th scope="col">ACE ou DF</th>
                <th scope="col">TROCAS</th>
                <th scope="col">SITUAÇÃO</th>
                <th scope="col">RESULTADO</th>
                <th scope="col">GOLPE</th>
                <th scope="col">TIPO DE ERRO</th>
                <th scope="col">ONDE ERROU:</th>
                <th scope="col">DIREÇÃO</th>
                <th scope="col">EFEITO</th>
                <th scope="col">ESPECIAIS</th>
              </tr>
            </thead>
            <tbody>
              {setGroups.map((group) => {
                const firstPt = group.points[0];
                const firstServer = firstPt?.context?.server;
                const serverName = firstServer === 'PLAYER_1' ? playerNames.p1 : playerNames.p2;
                const receiverName = firstServer === 'PLAYER_1' ? playerNames.p2 : playerNames.p1;

                return (
                  <React.Fragment key={`set-${group.setNumber}`}>
                    {/* Separador de Set */}
                    <tr className="match-timeline__set-row" aria-label={`Set ${group.setNumber}`}>
                      <td colSpan={2} className="match-timeline__set-label">
                        SET {group.setNumber}
                      </td>
                      <td colSpan={10} className="match-timeline__set-players">
                        {serverName} – {receiverName}
                      </td>
                    </tr>

                    {/* Linhas de pontos */}
                    {group.points.map((point, i) => {
                      const serveEnding = isServeEndingPoint(point);
                      const rd = point.rallyDetails;
                      const isP1Win = point.result.winner === 'PLAYER_1';
                      const isBreakPt = point.context?.isBreakPoint ?? false;
                      const aceOrDf = formatAceOrDf(point);

                      // Detectar interrupção de marcação (gap no pointNumber)
                      const noFiltersActive = Object.keys(criteria).length === 0;
                      const prevPoint = i > 0 ? group.points[i - 1] : null;
                      const hasGap =
                        noFiltersActive &&
                        prevPoint &&
                        point.pointNumber != null &&
                        prevPoint.pointNumber != null &&
                        point.pointNumber - prevPoint.pointNumber > 1;

                      return (
                        <React.Fragment key={i}>
                          {hasGap && (
                            <tr className="match-timeline__interrupted-row">
                              <td colSpan={12} className="match-timeline__interrupted-cell">
                                marcação interrompida
                              </td>
                            </tr>
                          )}
                          <tr
                            key={`pt-${i}`}
                            className={[
                              'match-timeline__row',
                              isP1Win ? 'match-timeline__row--p1' : 'match-timeline__row--p2',
                              isBreakPt ? 'match-timeline__row--bp' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            aria-label={`Ponto: ${isP1Win ? playerNames.p1 : playerNames.p2} venceu`}
                          >
                            {/* GAME */}
                            <td className="match-timeline__cell match-timeline__cell--game">
                              {point.context
                                ? `${point.context.gamesP1}-${point.context.gamesP2}`
                                : '–'}
                            </td>

                            {/* PONTO */}
                            <td className="match-timeline__cell match-timeline__cell--ponto">
                              {point.context
                                ? `${point.context.gameScoreP1}x${point.context.gameScoreP2}`
                                : '–'}
                            </td>

                            {/* ACE ou DF */}
                            <td
                              className={[
                                'match-timeline__cell',
                                'match-timeline__cell--ace-df',
                                serveEnding
                                  ? point.serve?.type === 'DOUBLE_FAULT'
                                    ? 'match-timeline__cell--df'
                                    : 'match-timeline__cell--ace'
                                  : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                            >
                              {aceOrDf}
                            </td>

                            {/* TROCAS */}
                            <td className="match-timeline__cell match-timeline__cell--trocas">
                              {getTrocas(point)}
                            </td>

                            {/* SITUAÇÃO */}
                            <td className="match-timeline__cell">
                              {serveEnding
                                ? ''
                                : rd?.situacao
                                  ? (SITUACAO_PT[rd.situacao] ?? rd.situacao)
                                  : '–'}
                            </td>

                            {/* RESULTADO */}
                            <td
                              className={[
                                'match-timeline__cell',
                                !serveEnding
                                  ? `match-timeline__cell--res-${point.result.type}`
                                  : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                            >
                              {serveEnding ? '' : formatResultado(point)}
                            </td>

                            {/* GOLPE */}
                            <td className="match-timeline__cell">
                              {serveEnding ? '' : (rd?.golpe ?? '–')}
                            </td>

                            {/* TIPO DE ERRO */}
                            <td className="match-timeline__cell">
                              {serveEnding
                                ? ''
                                : rd?.subtipo1
                                  ? (SUBTIPO1_PT[rd.subtipo1] ?? rd.subtipo1)
                                  : '–'}
                            </td>

                            {/* ONDE ERROU: */}
                            <td
                              className={[
                                'match-timeline__cell',
                                rd?.subtipo2 === 'Out' ? 'match-timeline__cell--out' : '',
                                rd?.subtipo2 === 'Net' ? 'match-timeline__cell--net' : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                            >
                              {serveEnding
                                ? ''
                                : rd?.subtipo2
                                  ? rd.subtipo2 === 'Out'
                                    ? 'out'
                                    : 'net'
                                  : '–'}
                            </td>

                            {/* DIREÇÃO */}
                            <td className="match-timeline__cell">
                              {serveEnding
                                ? ''
                                : rd?.direcao
                                  ? (DIRECAO_PT[rd.direcao] ?? rd.direcao)
                                  : '–'}
                            </td>

                            {/* EFEITO */}
                            <td className="match-timeline__cell">
                              {serveEnding ? '' : (rd?.efeito ?? '–')}
                            </td>

                            {/* ESPECIAIS */}
                            <td className="match-timeline__cell">
                              {serveEnding ? '' : (rd?.golpe_esp ?? '–')}
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MatchTimelineView;
