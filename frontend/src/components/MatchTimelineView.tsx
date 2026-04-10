// frontend/src/components/MatchTimelineView.tsx
// Timeline detalhada de pontos de uma partida para análise pós-jogo.
// Mostra cada ponto com: saque → rally → resultado, filtros e contexto de placar.

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { PointDetails } from '../core/scoring/types';
import {
  filterPointsHistory,
  countByFilter,
  formatGameScoreLabel,
  formatPointTime,
  summarizePoint,
  SERVE_TYPE_LABELS,
  RESULT_TYPE_LABELS,
  SHOT_TYPE_LABELS,
  SERVE_EFFECT_LABELS,
  SERVE_DIRECTION_LABELS,
  RALLY_SITUACAO_LABELS,
  RALLY_GOLPE_LABELS,
  RALLY_EFEITO_LABELS,
  RALLY_DIRECAO_LABELS,
  RALLY_GOLPE_ESP_LABELS,
} from '../services/timelineUtils';
import type { TimelineFilterCriteria } from '../services/timelineUtils';
import './MatchTimelineView.css';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MatchTimelineViewProps {
  /** Histórico completo de pontos da partida */
  pointsHistory: PointDetails[];
  /** Nomes dos jogadores */
  playerNames: { p1: string; p2: string };
}

// ─── Ícone Chevron (SVG inline para evitar dependência de lib) ────────────────

const ChevronDown: React.FC<{ className?: string }> = ({ className }) => (
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
    className={className}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// ─── Card de Ponto ────────────────────────────────────────────────────────────

interface PointCardProps {
  point: PointDetails;
  index: number;
  originalIndex: number;
  playerNames: { p1: string; p2: string };
  forceExpand?: boolean;
}

const PointCard: React.FC<PointCardProps> = React.memo(
  ({ point, index, originalIndex, playerNames, forceExpand }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const expanded = isExpanded || !!forceExpand;
    const handleToggle = useCallback(() => setIsExpanded((prev) => !prev), []);
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsExpanded((prev) => !prev);
      }
    }, []);

    const isP1 = point.result.winner === 'PLAYER_1';
    const winnerName = isP1 ? playerNames.p1 : playerNames.p2;
    const winnerClass = isP1 ? 'p1' : 'p2';
    const isBreakPoint = point.context?.isBreakPoint ?? false;
    const isAce = point.serve?.type === 'ACE';
    const isDoubleFault = point.serve?.type === 'DOUBLE_FAULT';
    const isWinner =
      point.result.type === 'WINNER' && !isAce && point.serve?.type !== 'SERVICE_WINNER';
    const isServiceWinner = point.serve?.type === 'SERVICE_WINNER';
    const isUnforced = point.result.type === 'UNFORCED_ERROR';
    const isForced = point.result.type === 'FORCED_ERROR';

    // Contexto de placar (card resumo, linha superior)
    const contextLabel = point.context
      ? `Set ${point.context.setNumber} · ${point.context.gamesP1}-${point.context.gamesP2} · ${formatGameScoreLabel(
          point.context.gameScoreP1,
          point.context.gameScoreP2,
        )}`
      : null;

    return (
      <li
        className={[
          'match-timeline__card',
          `match-timeline__card--${winnerClass}`,
          isBreakPoint ? 'match-timeline__card--breakpoint' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label={`Ponto ${originalIndex + 1}: ${winnerName} venceu`}
      >
        {/* Header clicável */}
        <button
          className="match-timeline__card-header"
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          aria-expanded={expanded}
          aria-controls={`timeline-detail-${originalIndex}`}
          aria-label={`Ponto ${originalIndex + 1}: ${winnerName} venceu`}
          type="button"
        >
          <span className="match-timeline__card-num">#{originalIndex + 1}</span>

          <span
            className={`match-timeline__card-winner match-timeline__card-winner--${winnerClass}`}
          >
            {winnerName}
          </span>

          {contextLabel && <span className="match-timeline__card-context">{contextLabel}</span>}

          <span className="match-timeline__card-summary">{summarizePoint(point)}</span>

          {/* Tags rápidas */}
          <span className="match-timeline__card-tags">
            {isBreakPoint && (
              <span className="match-timeline__tag match-timeline__tag--breakpoint">BP</span>
            )}
            {isAce && <span className="match-timeline__tag match-timeline__tag--ace">Ace</span>}
            {isDoubleFault && (
              <span className="match-timeline__tag match-timeline__tag--fault">DF</span>
            )}
            {isServiceWinner && (
              <span className="match-timeline__tag match-timeline__tag--winner">SvW</span>
            )}
            {isWinner && <span className="match-timeline__tag match-timeline__tag--winner">W</span>}
            {isUnforced && (
              <span className="match-timeline__tag match-timeline__tag--error">ENF</span>
            )}
            {isForced && (
              <span className="match-timeline__tag match-timeline__tag--forced">EF</span>
            )}
            {point.timestamp > 0 && (
              <span className="match-timeline__tag match-timeline__tag--ts">
                {formatPointTime(point.timestamp)}
              </span>
            )}
          </span>

          <span
            className={`match-timeline__card-chevron${expanded ? 'match-timeline__card-chevron--open' : ''}`}
            aria-hidden="true"
          >
            <ChevronDown />
          </span>
        </button>

        {/* Detalhe: sempre no DOM, hidden via atributo (CSS print pode sobrescrever) */}
        <div
          id={`timeline-detail-${originalIndex}`}
          className="match-timeline__card-detail"
          role="region"
          aria-label={`Detalhes do ponto ${originalIndex + 1}`}
          hidden={!expanded}
        >
            {/* ── Saque ──────────────────────────────────────────────────── */}
            {point.serve && (
              <div className="match-timeline__detail-section">
                <p className="match-timeline__detail-section-title">Saque</p>
                <div className="match-timeline__detail-grid">
                  <span className="match-timeline__detail-item">
                    <span className="match-timeline__detail-label">Tipo:</span>
                    <span
                      className={[
                        'match-timeline__detail-value',
                        isAce ? 'match-timeline__detail-value--green' : '',
                        isDoubleFault ? 'match-timeline__detail-value--red' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {SERVE_TYPE_LABELS[point.serve.type] ?? point.serve.type}
                    </span>
                  </span>

                  <span className="match-timeline__detail-item">
                    <span className="match-timeline__detail-label">Saque:</span>
                    <span className="match-timeline__detail-value">
                      {point.serve.isFirstServe ? '1º' : '2º'}
                    </span>
                  </span>

                  {point.serve.serveEffect && (
                    <span className="match-timeline__detail-item">
                      <span className="match-timeline__detail-label">Efeito:</span>
                      <span className="match-timeline__detail-value">
                        {SERVE_EFFECT_LABELS[point.serve.serveEffect] ?? point.serve.serveEffect}
                      </span>
                    </span>
                  )}

                  {point.serve.direction && (
                    <span className="match-timeline__detail-item">
                      <span className="match-timeline__detail-label">Direção:</span>
                      <span className="match-timeline__detail-value">
                        {SERVE_DIRECTION_LABELS[point.serve.direction] ?? point.serve.direction}
                      </span>
                    </span>
                  )}

                  {point.serve.errorType && (
                    <span className="match-timeline__detail-item">
                      <span className="match-timeline__detail-label">Erro:</span>
                      <span className="match-timeline__detail-value match-timeline__detail-value--red">
                        {point.serve.errorType === 'out' ? 'Fora' : 'Na Rede'}
                      </span>
                    </span>
                  )}

                  {/* Detalhes do 1º saque em dupla falta */}
                  {isDoubleFault && point.serve.firstFault && (
                    <>
                      <span className="match-timeline__detail-divider">|</span>
                      <span className="match-timeline__detail-item">
                        <span className="match-timeline__detail-label">1ª falta:</span>
                        <span className="match-timeline__detail-value">
                          {[
                            point.serve.firstFault.serveEffect
                              ? SERVE_EFFECT_LABELS[point.serve.firstFault.serveEffect]
                              : null,
                            point.serve.firstFault.direction
                              ? SERVE_DIRECTION_LABELS[point.serve.firstFault.direction]
                              : null,
                            point.serve.firstFault.errorType
                              ? point.serve.firstFault.errorType === 'out'
                                ? 'Fora'
                                : 'Na Rede'
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── Rally ──────────────────────────────────────────────────── */}
            <div className="match-timeline__detail-section">
              <p className="match-timeline__detail-section-title">Rally</p>
              <div className="match-timeline__detail-grid">
                <span className="match-timeline__detail-item">
                  <span className="match-timeline__detail-label">Trocas:</span>
                  <span className="match-timeline__detail-value match-timeline__detail-value--highlight">
                    {point.rally.ballExchanges}
                  </span>
                </span>

                {point.rallyDetails && (
                  <>
                    <span className="match-timeline__detail-item">
                      <span className="match-timeline__detail-label">Situação:</span>
                      <span className="match-timeline__detail-value">
                        {RALLY_SITUACAO_LABELS[point.rallyDetails.situacao] ??
                          point.rallyDetails.situacao}
                      </span>
                    </span>

                    <span className="match-timeline__detail-item">
                      <span className="match-timeline__detail-label">Vencedor:</span>
                      <span className="match-timeline__detail-value">
                        {point.rallyDetails.vencedor === 'sacador' ? 'Sacador' : 'Devolvedor'}
                      </span>
                    </span>

                    <span className="match-timeline__detail-item">
                      <span className="match-timeline__detail-label">Golpe:</span>
                      <span className="match-timeline__detail-value">
                        {RALLY_GOLPE_LABELS[point.rallyDetails.golpe] ?? point.rallyDetails.golpe}
                        {point.rallyDetails.efeito
                          ? ` (${RALLY_EFEITO_LABELS[point.rallyDetails.efeito] ?? point.rallyDetails.efeito})`
                          : ''}
                      </span>
                    </span>

                    {point.rallyDetails.direcao && (
                      <span className="match-timeline__detail-item">
                        <span className="match-timeline__detail-label">Direção:</span>
                        <span className="match-timeline__detail-value">
                          {RALLY_DIRECAO_LABELS[point.rallyDetails.direcao] ??
                            point.rallyDetails.direcao}
                        </span>
                      </span>
                    )}

                    {point.rallyDetails.golpe_esp && (
                      <span className="match-timeline__detail-item">
                        <span className="match-timeline__detail-label">Esp.:</span>
                        <span className="match-timeline__detail-value">
                          {RALLY_GOLPE_ESP_LABELS[point.rallyDetails.golpe_esp] ??
                            point.rallyDetails.golpe_esp}
                        </span>
                      </span>
                    )}

                    {(point.rallyDetails.subtipo1 ?? point.rallyDetails.subtipo2) && (
                      <span className="match-timeline__detail-item">
                        <span className="match-timeline__detail-label">Subtipo:</span>
                        <span className="match-timeline__detail-value">
                          {[point.rallyDetails.subtipo1, point.rallyDetails.subtipo2]
                            .filter(Boolean)
                            .join(' / ')}
                        </span>
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ── Resultado ──────────────────────────────────────────────── */}
            <div className="match-timeline__detail-section">
              <p className="match-timeline__detail-section-title">Resultado</p>
              <div className="match-timeline__detail-grid">
                <span className="match-timeline__detail-item">
                  <span className="match-timeline__detail-label">Tipo:</span>
                  <span
                    className={[
                      'match-timeline__detail-value',
                      point.result.type === 'WINNER'
                        ? 'match-timeline__detail-value--green'
                        : point.result.type === 'UNFORCED_ERROR'
                          ? 'match-timeline__detail-value--red'
                          : 'match-timeline__detail-value--orange',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {RESULT_TYPE_LABELS[point.result.type] ?? point.result.type}
                  </span>
                </span>

                {point.result.finalShot && (
                  <span className="match-timeline__detail-item">
                    <span className="match-timeline__detail-label">Golpe:</span>
                    <span className="match-timeline__detail-value">
                      {SHOT_TYPE_LABELS[point.result.finalShot] ?? point.result.finalShot}
                    </span>
                  </span>
                )}

                <span className="match-timeline__detail-item">
                  <span className="match-timeline__detail-label">Vencedor:</span>
                  <span
                    className={`match-timeline__detail-value match-timeline__detail-value--highlight match-timeline__card-winner--${winnerClass}`}
                  >
                    {winnerName}
                  </span>
                </span>

                {isBreakPoint && (
                  <span className="match-timeline__detail-item">
                    <span className="match-timeline__detail-value match-timeline__detail-value--yellow">
                      Breakpoint
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* ── Contexto de placar ─────────────────────────────────────── */}
            {point.context && (
              <div className="match-timeline__detail-section">
                <p className="match-timeline__detail-section-title">Contexto</p>
                <div className="match-timeline__detail-grid">
                  <span className="match-timeline__detail-item">
                    <span className="match-timeline__detail-label">Set:</span>
                    <span className="match-timeline__detail-value">{point.context.setNumber}</span>
                  </span>
                  <span className="match-timeline__detail-item">
                    <span className="match-timeline__detail-label">Games:</span>
                    <span className="match-timeline__detail-value">
                      {point.context.gamesP1}–{point.context.gamesP2}
                    </span>
                  </span>
                  <span className="match-timeline__detail-item">
                    <span className="match-timeline__detail-label">Ponto:</span>
                    <span className="match-timeline__detail-value">
                      {formatGameScoreLabel(point.context.gameScoreP1, point.context.gameScoreP2)}
                    </span>
                  </span>
                  <span className="match-timeline__detail-item">
                    <span className="match-timeline__detail-label">Sets:</span>
                    <span className="match-timeline__detail-value">
                      {point.context.setsWonP1}–{point.context.setsWonP2}
                    </span>
                  </span>
                  <span className="match-timeline__detail-item">
                    <span className="match-timeline__detail-label">Saque:</span>
                    <span className="match-timeline__detail-value">
                      {point.context.server === 'PLAYER_1' ? playerNames.p1 : playerNames.p2}
                    </span>
                  </span>
                  {point.context.isTiebreak && (
                    <span className="match-timeline__detail-item">
                      <span className="match-timeline__detail-value match-timeline__detail-value--highlight">
                        Tiebreak
                      </span>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
      </li>
    );
  },
);

PointCard.displayName = 'PointCard';

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

  // Aplica filtros à lista de pontos
  const filtered = useMemo(
    () => filterPointsHistory(pointsHistory, criteria),
    [pointsHistory, criteria],
  );

  // Mapa de índice original para exibição após filtros
  const originalIndices = useMemo(() => {
    if (Object.values(criteria).every((v) => v === undefined || v === null || v === false)) {
      return filtered.map((_, i) => i);
    }
    return filtered.map((pt) => pointsHistory.indexOf(pt));
  }, [filtered, pointsHistory, criteria]);

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
    () => countByFilter(pointsHistory, { playerWinner: 'PLAYER_1' }),
    [pointsHistory],
  );
  const countP2 = useMemo(
    () => countByFilter(pointsHistory, { playerWinner: 'PLAYER_2' }),
    [pointsHistory],
  );
  const countBP = useMemo(
    () => countByFilter(pointsHistory, { breakPointsOnly: true }),
    [pointsHistory],
  );
  const countWinners = useMemo(
    () => countByFilter(pointsHistory, { winnersOnly: true }),
    [pointsHistory],
  );
  const countErrors = useMemo(
    () => countByFilter(pointsHistory, { errorsOnly: true }),
    [pointsHistory],
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
