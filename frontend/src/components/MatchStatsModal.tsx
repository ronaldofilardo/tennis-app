import React from 'react';
import type { PointDetails } from '../core/scoring/types';
import StatComparisonRow, { formatStat } from './StatComparisonRow';
import { normalizeMatchStats } from '../utils/normalizeMatchStats';
import './MatchStatsModal.css';
import { ErrorBoundary } from './ErrorBoundary';

export interface PlayerStats {
  // Pontos
  pointsWon: number;

  // Saque
  totalServes: number;
  firstServes: number;
  secondServes: number;
  firstServeWins: number;
  secondServeWins: number;
  aces: number;
  doubleFaults: number;
  serviceWinners: number;
  servicePointsWon: number;

  // Return
  returnPointsWon: number;

  // Golpes
  winners: number;
  unforcedErrors: number;
  forcedErrors: number;

  // Rally
  shortRallies: number;
  longRallies: number;

  // Break Points
  breakPoints: number;
  breakPointsSaved: number;

  // Percentuais
  firstServePercentage: number;
  firstServeWinPercentage: number;
  secondServeWinPercentage: number;
  serviceHoldPercentage: number;
  breakPointConversion: number;
  winnerToErrorRatio: number;
  returnWinPercentage: number;
  dominanceRatio: number;
}

export interface MatchStats {
  avgRallyLength: number;
  longestRally: number;
  shortestRally: number;
  totalRallies: number;
}

export interface MatchStatsData {
  totalPoints: number;
  player1: PlayerStats;
  player2: PlayerStats;
  match: MatchStats;
  pointsHistory: PointDetails[];
}

interface MatchStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
  playerNames: { p1: string; p2: string };
  stats: MatchStatsData | null;
  nickname?: string | null;
}

const MatchStatsModal: React.FC<MatchStatsModalProps> = ({
  isOpen,
  onClose,
  matchId,
  playerNames,
  stats,
  nickname,
}) => {
  // Fallback defensivo para evitar crash se player1/player2 vierem undefined
  if (!isOpen) return null;
  if (!stats) {
    return (
      <div className="match-stats-modal-overlay" onClick={onClose}>
        <div className="match-stats-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>📊 Comparativo de Estatísticas</h2>
            <button className="print-button" title="Imprimir" onClick={() => window.print()}>
              🖨️
            </button>
            <button className="close-button" onClick={onClose}>
              ×
            </button>
          </div>
          <div className="modal-content">
            <p className="loading-message">Carregando estatísticas...</p>
          </div>
        </div>
      </div>
    );
  }

  // Utilitário para garantir número
  const ensureNumber = (value: unknown): number => {
    return typeof value === 'number' && !isNaN(value) ? value : 0;
  };

  // Placar visual estilo digital
  const renderScoreboardSection = () => {
    // Placar removido conforme solicitado
    return null;
  };

  const safeStats = normalizeMatchStats(stats);
  const hasDetailedData = safeStats.totalPoints > 0 && safeStats.player1 && safeStats.player2;

  return (
    <div className="match-stats-modal-overlay" onClick={onClose}>
      <div className="match-stats-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📊 Comparativo de Estatísticas</h2>
          <button className="print-button" title="Imprimir" onClick={() => window.print()}>
            🖨️
          </button>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="match-info">
            {nickname ? <div className="match-nickname">{nickname}</div> : null}
            <div className="players-header">
              <div className="player-header">{playerNames.p1}</div>
              <div className="vs-divider">vs</div>
              <div className="player-header">{playerNames.p2}</div>
            </div>
            <p className="match-details">
              ID: {matchId} • Total: {safeStats.totalPoints} pontos
            </p>
          </div>

          {!(hasDetailedData && safeStats.player1 && safeStats.player2) ? (
            <div className="no-data-message">
              <div className="no-data-icon">📈</div>
              <h3>Sem Dados Detalhados</h3>
              <p>
                Esta partida foi jogada sem o <strong>Modo Detalhado</strong> ativado.
              </p>
              <p>
                Para coletar estatísticas completas, ative o "📊 Modo Detalhado" durante a próxima
                partida.
              </p>

              <div className="future-features">
                <h4>Estatísticas disponíveis no Modo Detalhado:</h4>
                <ul>
                  <li>🏓 Aces e duplas faltas</li>
                  <li>🎯 Winners e erros não forçados</li>
                  <li>⚡ Duração e intensidade dos rallies</li>
                  <li>📈 Percentual de primeiro saque</li>
                  <li>🏸 Análise de golpes comparativa</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="stats-content">
              <div className="stats-section">
                <h4>📋 Estatísticas Detalhadas</h4>
                <div className="comparison-grid">
                  <StatComparisonRow
                    label="% 1º Saque"
                    p1Value={
                      safeStats.player1.firstServes > 0
                        ? (100 * safeStats.player1.firstServes) / safeStats.player1.totalServes
                        : 0
                    }
                    p2Value={
                      safeStats.player2.firstServes > 0
                        ? (100 * safeStats.player2.firstServes) / safeStats.player2.totalServes
                        : 0
                    }
                    isPercentage={true}
                    decimals={1}
                  />

                  <StatComparisonRow
                    label="ENF/EF"
                    p1Value={safeStats.player1.unforcedErrors + safeStats.player1.forcedErrors}
                    p2Value={safeStats.player2.unforcedErrors + safeStats.player2.forcedErrors}
                    higherIsBetter={false}
                  />

                  <StatComparisonRow
                    label="Duplas Faltas"
                    p1Value={safeStats.player1.doubleFaults}
                    p2Value={safeStats.player2.doubleFaults}
                    higherIsBetter={false}
                  />

                  <StatComparisonRow
                    label="Pts 1º Saque"
                    p1Value={safeStats.player1.firstServeWins}
                    p2Value={safeStats.player2.firstServeWins}
                    suffix={
                      safeStats.player1.firstServes > 0 ? ` / ${safeStats.player1.firstServes}` : ''
                    }
                    decimals={0}
                  />

                  <StatComparisonRow
                    label="Pts 2º Saque"
                    p1Value={safeStats.player1.secondServeWins}
                    p2Value={safeStats.player2.secondServeWins}
                    suffix={
                      safeStats.player1.secondServes > 0
                        ? ` / ${safeStats.player1.secondServes}`
                        : ''
                    }
                    decimals={0}
                  />

                  <StatComparisonRow
                    label="Winners"
                    p1Value={safeStats.player1.winners}
                    p2Value={safeStats.player2.winners}
                  />

                  <StatComparisonRow
                    label="Aproveitamento Efetivo (AE)"
                    p1Value={safeStats.player1.pointsWon}
                    p2Value={safeStats.player2.pointsWon}
                    suffix={safeStats.totalPoints > 0 ? ` / ${safeStats.totalPoints}` : ''}
                    decimals={0}
                  />
                </div>
              </div>

              <div className="stats-section">
                <h4>🏓 Saque</h4>
                <div className="comparison-grid">
                  <StatComparisonRow
                    label="Aces"
                    p1Value={safeStats.player1.aces ?? 0}
                    p2Value={safeStats.player2.aces ?? 0}
                  />
                  <StatComparisonRow
                    label="Duplas Faltas"
                    p1Value={safeStats.player1.doubleFaults ?? 0}
                    p2Value={safeStats.player2.doubleFaults ?? 0}
                    higherIsBetter={false}
                  />
                  <StatComparisonRow
                    label="% 1º Saque"
                    p1Value={safeStats.player1.firstServePercentage ?? 0}
                    p2Value={safeStats.player2.firstServePercentage ?? 0}
                    isPercentage={true}
                    decimals={1}
                  />
                  <StatComparisonRow
                    label="% Pontos 1º Saque"
                    p1Value={safeStats.player1.firstServeWinPercentage ?? 0}
                    p2Value={safeStats.player2.firstServeWinPercentage ?? 0}
                    isPercentage={true}
                    decimals={1}
                  />
                  <StatComparisonRow
                    label="% Eficiência Saque"
                    p1Value={safeStats.player1.serviceHoldPercentage ?? 0}
                    p2Value={safeStats.player2.serviceHoldPercentage ?? 0}
                    isPercentage={true}
                    decimals={1}
                  />
                </div>
              </div>

              <div className="stats-section">
                <h4>↩️ Return</h4>
                <div className="comparison-grid">
                  <StatComparisonRow
                    label="% Pontos no Return"
                    p1Value={safeStats.player1.returnWinPercentage ?? 0}
                    p2Value={safeStats.player2.returnWinPercentage ?? 0}
                    isPercentage={true}
                    decimals={1}
                  />
                  <div className="stat-comparison-row">
                    <div
                      className={`stat-value ${safeStats.player1.breakPoints > (safeStats.player2.breakPoints ?? 0) ? 'better' : ''}`}
                    >
                      {`${safeStats.player1.breakPoints ?? 0} (${safeStats.player1.breakPointsSaved ?? 0})`}
                    </div>
                    <div className="stat-label">Break Pts (tot / salvos)</div>
                    <div
                      className={`stat-value ${safeStats.player2.breakPoints > (safeStats.player1.breakPoints ?? 0) ? 'better' : ''}`}
                    >
                      {`${safeStats.player2.breakPoints ?? 0} (${safeStats.player2.breakPointsSaved ?? 0})`}
                    </div>
                  </div>
                </div>
              </div>

              <div className="stats-section">
                <h4>🎯 Golpes e Rally</h4>
                <div className="comparison-grid">
                  <StatComparisonRow
                    label="Winners"
                    p1Value={safeStats.player1.winners ?? 0}
                    p2Value={safeStats.player2.winners ?? 0}
                  />
                  <StatComparisonRow
                    label="Erros Não Forçados"
                    p1Value={safeStats.player1.unforcedErrors ?? 0}
                    p2Value={safeStats.player2.unforcedErrors ?? 0}
                    higherIsBetter={false}
                  />
                  <StatComparisonRow
                    label="Erros Forçados"
                    p1Value={safeStats.player1.forcedErrors ?? 0}
                    p2Value={safeStats.player2.forcedErrors ?? 0}
                    higherIsBetter={false}
                  />
                  <StatComparisonRow
                    label="Razão Winner/Erro"
                    p1Value={safeStats.player1.winnerToErrorRatio ?? 0}
                    p2Value={safeStats.player2.winnerToErrorRatio ?? 0}
                    decimals={2}
                  />
                  <StatComparisonRow
                    label="Índice Dominância"
                    p1Value={safeStats.player1.dominanceRatio ?? 0}
                    p2Value={safeStats.player2.dominanceRatio ?? 0}
                    decimals={2}
                  />
                  <StatComparisonRow
                    label="Rallies Curtos (≤4)"
                    p1Value={safeStats.player1.shortRallies ?? 0}
                    p2Value={safeStats.player2.shortRallies ?? 0}
                  />
                  <StatComparisonRow
                    label="Rallies Longos (≥9)"
                    p1Value={safeStats.player1.longRallies ?? 0}
                    p2Value={safeStats.player2.longRallies ?? 0}
                  />
                </div>
              </div>

              <div className="stats-section">
                <h4>⭐ Performance Geral</h4>
                <div className="performance-overview">
                  {(() => {
                    const maxServiceHold = Math.max(
                      stats.player1.serviceHoldPercentage ?? 0,
                      stats.player2.serviceHoldPercentage ?? 0,
                      1,
                    );
                    const maxAgg = Math.max(
                      stats.player1.winnerToErrorRatio ?? 0,
                      stats.player2.winnerToErrorRatio ?? 0,
                      1,
                    );
                    const maxReturn = Math.max(
                      stats.player1.returnWinPercentage ?? 0,
                      stats.player2.returnWinPercentage ?? 0,
                      1,
                    );
                    // expor no jsx via closure
                    return (
                      <div
                        className="performance-bars-inner"
                        data-max-service={maxServiceHold}
                        data-max-agg={maxAgg}
                        data-max-return={maxReturn}
                      ></div>
                    );
                  })()}
                  <div className="performance-bars">
                    <div className="performance-category">
                      <span className="category-label">Eficiência no Saque</span>
                      <div className="progress-container">
                        <div className="progress-bar">
                          <div
                            className="progress-fill p1"
                            style={{
                              width: `${Math.min(100, ((stats.player1.serviceHoldPercentage ?? 0) / Math.max(1, Math.max(stats.player1.serviceHoldPercentage ?? 0, stats.player2.serviceHoldPercentage ?? 0))) * 100)}%`,
                            }}
                          ></div>
                        </div>
                        <span className="progress-value">
                          {stats.player1.serviceHoldPercentage}%
                        </span>
                      </div>
                      <div className="progress-container">
                        <div className="progress-bar">
                          <div
                            className="progress-fill p2"
                            style={{
                              width: `${Math.min(100, ((stats.player2.serviceHoldPercentage ?? 0) / Math.max(1, Math.max(stats.player1.serviceHoldPercentage ?? 0, stats.player2.serviceHoldPercentage ?? 0))) * 100)}%`,
                            }}
                          ></div>
                        </div>
                        <span className="progress-value">
                          {stats.player2.serviceHoldPercentage}%
                        </span>
                      </div>
                    </div>

                    <div className="performance-category">
                      <span className="category-label">Agressividade (W/UE)</span>
                      <div className="progress-container">
                        <div className="progress-bar">
                          <div
                            className="progress-fill p1"
                            style={{
                              width: `${Math.min(100, ((stats.player1.winnerToErrorRatio ?? 0) / Math.max(1, Math.max(stats.player1.winnerToErrorRatio ?? 0, stats.player2.winnerToErrorRatio ?? 0))) * 100)}%`,
                            }}
                          ></div>
                        </div>
                        <span className="progress-value">
                          {formatStat(stats.player1.winnerToErrorRatio, '', 2)}
                        </span>
                      </div>
                      <div className="progress-container">
                        <div className="progress-bar">
                          <div
                            className="progress-fill p2"
                            style={{
                              width: `${Math.min(100, ((stats.player2.winnerToErrorRatio ?? 0) / Math.max(1, Math.max(stats.player1.winnerToErrorRatio ?? 0, stats.player2.winnerToErrorRatio ?? 0))) * 100)}%`,
                            }}
                          ></div>
                        </div>
                        <span className="progress-value">
                          {formatStat(stats.player2.winnerToErrorRatio, '', 2)}
                        </span>
                      </div>
                    </div>

                    <div className="performance-category">
                      <span className="category-label">Poder de Return</span>
                      <div className="progress-container">
                        <div className="progress-bar">
                          <div
                            className="progress-fill p1"
                            style={{
                              width: `${Math.min(100, ((stats.player1.returnWinPercentage ?? 0) / Math.max(1, Math.max(stats.player1.returnWinPercentage ?? 0, stats.player2.returnWinPercentage ?? 0))) * 100)}%`,
                            }}
                          ></div>
                        </div>
                        <span className="progress-value">{stats.player1.returnWinPercentage}%</span>
                      </div>
                      <div className="progress-container">
                        <div className="progress-bar">
                          <div
                            className="progress-fill p2"
                            style={{
                              width: `${Math.min(100, ((stats.player2.returnWinPercentage ?? 0) / Math.max(1, Math.max(stats.player1.returnWinPercentage ?? 0, stats.player2.returnWinPercentage ?? 0))) * 100)}%`,
                            }}
                          ></div>
                        </div>
                        <span className="progress-value">{stats.player2.returnWinPercentage}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="stats-section">
                <h4>⚡ Dados da Partida</h4>
                <div className="match-stats-summary">
                  <div className="match-stat-item">
                    <span className="label">Rally Médio:</span>
                    <span className="value">{safeStats.match.avgRallyLength ?? 0} trocas</span>
                  </div>
                  <div className="match-stat-item">
                    <span className="label">Rally Mais Longo:</span>
                    <span className="value">{safeStats.match.longestRally ?? 0} trocas</span>
                  </div>
                  <div className="match-stat-item">
                    <span className="label">Rally Mais Curto:</span>
                    <span className="value">{safeStats.match.shortestRally ?? 0} trocas</span>
                  </div>
                  <div className="match-stat-item">
                    <span className="label">Total de Rallies:</span>
                    <span className="value">{safeStats.match.totalRallies ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="close-btn" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

const MatchStatsModalWithBoundary: React.FC<MatchStatsModalProps> = (props) => (
  <ErrorBoundary>
    <MatchStatsModal {...props} />
  </ErrorBoundary>
);

export default MatchStatsModalWithBoundary;
