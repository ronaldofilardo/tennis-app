// PointCard — expandable card showing a single tennis point with all details
// Extracted from MatchTimelineView.tsx to keep parent component under 500 lines

import React, { useState, useCallback } from 'react';
import type { PointDetails } from '../core/scoring/types';
import {
  formatGameScoreLabel,
  formatPointTime,
  summarizePoint,
  SERVE_TYPE_LABELS,
  RESULT_TYPE_LABELS,
  SHOT_TYPE_LABELS,
  SERVE_EFFECT_LABELS,
  SERVE_DIRECTION_LABELS,
  RALLY_GOLPE_LABELS,
  RALLY_EFEITO_LABELS,
  RALLY_DIRECAO_LABELS,
  RALLY_SITUACAO_LABELS,
  RALLY_GOLPE_ESP_LABELS,
} from '../services/timelineUtils';

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
    const isGameBall = point.context?.isGameBall ?? false;
    const isSetBall = point.context?.isSetBall ?? false;
    const isServerP1 = point.context?.server === 'PLAYER_1';
    const isAce = point.serve?.type === 'ACE';
    const isDoubleFault = point.serve?.type === 'DOUBLE_FAULT';
    const isWinner =
      point.result.type === 'WINNER' && !isAce && point.serve?.type !== 'SERVICE_WINNER';
    const isServiceWinner = point.serve?.type === 'SERVICE_WINNER';
    const isUnforced = point.result.type === 'UNFORCED_ERROR';
    const isForced = point.result.type === 'FORCED_ERROR';

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
          {point.context && (
            <span
              className={`match-timeline__server-indicator match-timeline__server-indicator--${isServerP1 ? 'p1' : 'p2'}`}
              title={`Sacador: ${isServerP1 ? playerNames.p1 : playerNames.p2}`}
            >
              {isServerP1 ? 'S' : 'D'}
            </span>
          )}
          <span
            className={`match-timeline__card-winner match-timeline__card-winner--${winnerClass}`}
          >
            {winnerName}
          </span>
          <span className="match-timeline__card-summary">{summarizePoint(point)}</span>
          {point.context && (
            <span className="match-timeline__card-score">
              {formatGameScoreLabel(point.context.gameScoreP1, point.context.gameScoreP2)}
            </span>
          )}
          <span className="match-timeline__card-tags">
            {point.editStatus === 'interrupted' && (
              <span
                className="match-timeline__tag match-timeline__tag--interrupted"
                title="Marcação interrompida - buraco na contagem"
              >
                ⚠️ INTERR
              </span>
            )}
            {isSetBall && (
              <span className="match-timeline__tag match-timeline__tag--setball">SB</span>
            )}
            {isGameBall && (
              <span className="match-timeline__tag match-timeline__tag--gameball">GB</span>
            )}
            {isBreakPoint && (
              <span className="match-timeline__tag match-timeline__tag--breakpoint">BP</span>
            )}
            {isAce && <span className="match-timeline__tag match-timeline__tag--ace">ACE</span>}
            {isDoubleFault && (
              <span className="match-timeline__tag match-timeline__tag--fault">DF</span>
            )}
            {isServiceWinner && (
              <span className="match-timeline__tag match-timeline__tag--winner">SW</span>
            )}
            {isWinner && <span className="match-timeline__tag match-timeline__tag--winner">W</span>}
            {isUnforced && (
              <span className="match-timeline__tag match-timeline__tag--error">ENF</span>
            )}
            {isForced && (
              <span className="match-timeline__tag match-timeline__tag--forced">EF</span>
            )}
          </span>
          {point.timestamp > 0 && (
            <span className="match-timeline__card-ts" aria-hidden="true">
              {formatPointTime(point.timestamp)}
            </span>
          )}
          <span
            className={`match-timeline__card-chevron${expanded ? 'match-timeline__card-chevron--open' : ''}`}
            aria-hidden="true"
          >
            <ChevronDown />
          </span>
        </button>

        <div
          id={`timeline-detail-${originalIndex}`}
          className={`match-timeline__card-detail${expanded ? 'match-timeline__card-detail--open' : ''}`}
          role="region"
          aria-label={`Detalhes do ponto ${originalIndex + 1}`}
        >
          <div className="match-timeline__card-detail-inner">
            {point.context && (
              <div className="match-timeline__detail-row">
                <span className="match-timeline__detail-key">Set</span>
                <span className="match-timeline__detail-val">
                  {point.context.setNumber}
                  <span className="match-timeline__detail-dim">
                    {' '}
                    &middot; {point.context.gamesP1}&ndash;{point.context.gamesP2} games &middot;{' '}
                    {point.context.setsWonP1}&ndash;{point.context.setsWonP2} sets
                  </span>
                  {point.context.isTiebreak && (
                    <span className="match-timeline__detail-badge">TB</span>
                  )}
                </span>
              </div>
            )}
            {point.serve && (
              <div className="match-timeline__detail-row">
                <span className="match-timeline__detail-key">Saque</span>
                <span className="match-timeline__detail-val">
                  {SERVE_TYPE_LABELS[point.serve.type] ?? point.serve.type}
                  <span className="match-timeline__detail-dim">
                    {' '}
                    &middot; {point.serve.isFirstServe ? '1\u00ba' : '2\u00ba'}
                  </span>
                  {point.serve.serveEffect && (
                    <span className="match-timeline__detail-dim">
                      {' '}
                      &middot;{' '}
                      {SERVE_EFFECT_LABELS[point.serve.serveEffect] ?? point.serve.serveEffect}
                    </span>
                  )}
                  {point.serve.direction && (
                    <span className="match-timeline__detail-dim">
                      {' '}
                      &middot;{' '}
                      {SERVE_DIRECTION_LABELS[point.serve.direction] ?? point.serve.direction}
                    </span>
                  )}
                  {point.serve.errorType && (
                    <span className="match-timeline__detail-error">
                      {' '}
                      ({point.serve.errorType === 'out' ? 'Out' : 'Net'})
                    </span>
                  )}
                </span>
              </div>
            )}
            {(point.rally.ballExchanges > 1 || point.rallyDetails) && (
              <div className="match-timeline__detail-row">
                <span className="match-timeline__detail-key">Rally</span>
                <span className="match-timeline__detail-val">
                  {point.rally.ballExchanges} trocas
                  {point.rallyDetails && (
                    <>
                      <span className="match-timeline__detail-dim">
                        {' '}
                        &middot; {point.rallyDetails.vencedor === 'sacador' ? '[S]' : '[D]'}
                      </span>
                      {point.rallyDetails.situacao && (
                        <span className="match-timeline__detail-dim">
                          {' '}
                          &middot;{' '}
                          {RALLY_SITUACAO_LABELS[point.rallyDetails.situacao] ??
                            point.rallyDetails.situacao}
                        </span>
                      )}
                      {point.rallyDetails.subtipo1 && (
                        <span className="match-timeline__detail-dim">
                          {' '}
                          &middot;{' '}
                          {point.rallyDetails.subtipo1 === 'PassingShot'
                            ? 'Passing Shot'
                            : 'Dev. Saque'}
                        </span>
                      )}{' '}
                      {RALLY_GOLPE_LABELS[point.rallyDetails.golpe] ?? point.rallyDetails.golpe}
                      {point.rallyDetails.efeito && (
                        <span className="match-timeline__detail-dim">
                          {' '}
                          (
                          {RALLY_EFEITO_LABELS[point.rallyDetails.efeito] ??
                            point.rallyDetails.efeito}
                          )
                        </span>
                      )}
                      {point.rallyDetails.direcao && (
                        <span className="match-timeline__detail-dim">
                          {' '}
                          &middot;{' '}
                          {RALLY_DIRECAO_LABELS[point.rallyDetails.direcao] ??
                            point.rallyDetails.direcao}
                        </span>
                      )}
                      {point.rallyDetails.subtipo2 && (
                        <span className="match-timeline__detail-error">
                          {' '}
                          ({point.rallyDetails.subtipo2 === 'Out' ? 'Out' : 'Rede'})
                        </span>
                      )}
                      {point.rallyDetails.golpe_esp && (
                        <span className="match-timeline__detail-badge">
                          {' '}
                          &middot;{' '}
                          {RALLY_GOLPE_ESP_LABELS[point.rallyDetails.golpe_esp] ??
                            point.rallyDetails.golpe_esp}
                        </span>
                      )}
                    </>
                  )}
                </span>
              </div>
            )}
            <div className="match-timeline__detail-row">
              <span className="match-timeline__detail-key">Resultado</span>
              <span className="match-timeline__detail-val">
                {RESULT_TYPE_LABELS[point.result.type] ?? point.result.type}
                {point.result.finalShot && (
                  <span className="match-timeline__detail-dim">
                    {' '}
                    &middot; {SHOT_TYPE_LABELS[point.result.finalShot] ?? point.result.finalShot}
                  </span>
                )}{' '}
                &middot;{' '}
                <span className={`match-timeline__detail-winner--${winnerClass}`}>
                  {winnerName}
                </span>
              </span>
            </div>
          </div>
        </div>
      </li>
    );
  },
);

PointCard.displayName = 'PointCard';

export default PointCard;
