import React from 'react';
import type { PointDetails } from '../core/scoring/types';
import './MatchStatsModal.css';

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
  stats
  , nickname
}) => {

  // Fallback defensivo para evitar crash se player1/player2 vierem undefined
  if (!isOpen) return null;
  if (!stats) {
    return (
      <div className="match-stats-modal-overlay" onClick={onClose}>
        <div className="match-stats-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>📊 Comparativo de Estatísticas</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          <div style={{ padding: 24 }}>
            <p>Carregando estatísticas...</p>
          </div>
        </div>
      </div>
    );
  }
  const safeStats = {
    player1: stats.player1 ?? ({} as PlayerStats),
    player2: stats.player2 ?? ({} as PlayerStats),
    match: stats.match ?? ({} as MatchStats),
    totalPoints: stats.totalPoints ?? 0,
    pointsHistory: stats.pointsHistory ?? [],
  };
  const hasDetailedData = safeStats.totalPoints > 0 && safeStats.player1 && safeStats.player2;

  const formatStat = (value: number, suffix = '', decimals = 0): string => {
    if (value === 999) return '∞';
    return `${value.toFixed(decimals)}${suffix}`;
  };

  const StatComparison: React.FC<{
    label: string;
    p1Value: number;
    p2Value: number;
    suffix?: string;
    decimals?: number;
    isPercentage?: boolean;
    higherIsBetter?: boolean;
  }> = ({ label, p1Value, p2Value, suffix = '', decimals = 0, isPercentage = false, higherIsBetter = true }) => {
    // Ocultar linhas com ambos valores zero para reduzir ruído, exceto para labels importantes
    const alwaysShow = [
      'Pontos Conquistados',
      '% 1º Saque',
      'Aces',
      'Duplas Faltas'
    ];
    if (!alwaysShow.includes(label)) {
      const bothZero = (p1Value === 0 || p1Value === null || p1Value === undefined) && (p2Value === 0 || p2Value === null || p2Value === undefined);
      if (bothZero) return null;
    }

    const p1Better = higherIsBetter ? p1Value > p2Value : p1Value < p2Value;
    const p2Better = higherIsBetter ? p2Value > p1Value : p2Value < p1Value;
    
    return (
      <div className="stat-comparison-row">
        <div className={`stat-value ${p1Better ? 'better' : ''}`}>
          {formatStat(p1Value, isPercentage ? '%' : suffix, decimals)}
        </div>
        <div className="stat-label">{label}</div>
        <div className={`stat-value ${p2Better ? 'better' : ''}`}>
          {formatStat(p2Value, isPercentage ? '%' : suffix, decimals)}
        </div>
      </div>
    );
  };

  return (
    <div className="match-stats-modal-overlay" onClick={onClose}>
      <div className="match-stats-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📊 Comparativo de Estatísticas</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="match-info">
            {nickname ? <div className="match-nickname">{nickname}</div> : null}
            <div className="players-header">
              <div className="player-header">{playerNames.p1}</div>
              <div className="vs-divider">vs</div>
              <div className="player-header">{playerNames.p2}</div>
            </div>
            <p className="match-details">ID: {matchId} • Total: {safeStats.totalPoints} pontos</p>
          </div>

          {!(hasDetailedData && safeStats.player1 && safeStats.player2) ? (
            <div className="no-data-message">
              <div className="no-data-icon">📈</div>
              <h3>Sem Dados Detalhados</h3>
              <p>Esta partida foi jogada sem o <strong>Modo Detalhado</strong> ativado.</p>
              <p>Para coletar estatísticas completas, ative o "📊 Modo Detalhado" durante a próxima partida.</p>
              
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
              {/* Resumo Geral */}
              <div className="stats-section">
                <h4>📋 Resumo Geral</h4>
                <div className="comparison-grid">
                  <StatComparison 
                    label="Pontos Conquistados" 
                    p1Value={safeStats.player1.pointsWon ?? 0} 
                    p2Value={safeStats.player2.pointsWon ?? 0}
                  />
                </div>
              </div>

              {/* Estatísticas de Saque */}
              <div className="stats-section">
                <h4>🏓 Saque</h4>
                <div className="comparison-grid">
                  <StatComparison 
                    label="Aces" 
                    p1Value={safeStats.player1.aces ?? 0} 
                    p2Value={safeStats.player2.aces ?? 0}
                  />
                  <StatComparison 
                    label="Duplas Faltas" 
                    p1Value={safeStats.player1.doubleFaults ?? 0} 
                    p2Value={safeStats.player2.doubleFaults ?? 0}
                    higherIsBetter={false}
                  />
                  <StatComparison 
                    label="% 1º Saque" 
                    p1Value={safeStats.player1.firstServePercentage ?? 0} 
                    p2Value={safeStats.player2.firstServePercentage ?? 0}
                    isPercentage={true}
                    decimals={1}
                  />
                  <StatComparison 
                    label="% Pontos 1º Saque" 
                    p1Value={safeStats.player1.firstServeWinPercentage ?? 0} 
                    p2Value={safeStats.player2.firstServeWinPercentage ?? 0}
                    isPercentage={true}
                    decimals={1}
                  />
                  {/* Removido: % Pontos 2º Saque para reduzir redundância */}
                  <StatComparison 
                    label="% Eficiência Saque" 
                    p1Value={safeStats.player1.serviceHoldPercentage ?? 0} 
                    p2Value={safeStats.player2.serviceHoldPercentage ?? 0}
                    isPercentage={true}
                    decimals={1}
                  />
                </div>
              </div>

              {/* Return */}
              <div className="stats-section">
                <h4>↩️ Return</h4>
                <div className="comparison-grid">
                  <StatComparison 
                    label="% Pontos no Return" 
                    p1Value={safeStats.player1.returnWinPercentage ?? 0} 
                    p2Value={safeStats.player2.returnWinPercentage ?? 0}
                    isPercentage={true}
                    decimals={1}
                  />
                  {/* Break Points compacto: total (salvos) */}
                  <div className="stat-comparison-row">
                    <div className={`stat-value ${safeStats.player1.breakPoints > (safeStats.player2.breakPoints ?? 0) ? 'better' : ''}`}>
                      {`${safeStats.player1.breakPoints ?? 0} (${safeStats.player1.breakPointsSaved ?? 0})`}
                    </div>
                    <div className="stat-label">Break Pts (tot / salvos)</div>
                    <div className={`stat-value ${safeStats.player2.breakPoints > (safeStats.player1.breakPoints ?? 0) ? 'better' : ''}`}>
                      {`${safeStats.player2.breakPoints ?? 0} (${safeStats.player2.breakPointsSaved ?? 0})`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Golpes e Rally */}
              <div className="stats-section">
                <h4>🎯 Golpes e Rally</h4>
                <div className="comparison-grid">
                  <StatComparison 
                    label="Winners" 
                    p1Value={safeStats.player1.winners ?? 0} 
                    p2Value={safeStats.player2.winners ?? 0}
                  />
                  <StatComparison 
                    label="Erros Não Forçados" 
                    p1Value={safeStats.player1.unforcedErrors ?? 0} 
                    p2Value={safeStats.player2.unforcedErrors ?? 0}
                    higherIsBetter={false}
                  />
                  <StatComparison 
                    label="Erros Forçados" 
                    p1Value={safeStats.player1.forcedErrors ?? 0} 
                    p2Value={safeStats.player2.forcedErrors ?? 0}
                    higherIsBetter={false}
                  />
                  <StatComparison 
                    label="Razão Winner/Erro" 
                    p1Value={safeStats.player1.winnerToErrorRatio ?? 0} 
                    p2Value={safeStats.player2.winnerToErrorRatio ?? 0}
                    decimals={2}
                  />
                  <StatComparison 
                    label="Índice Dominância" 
                    p1Value={safeStats.player1.dominanceRatio ?? 0} 
                    p2Value={safeStats.player2.dominanceRatio ?? 0}
                    decimals={2}
                  />
                  <StatComparison 
                    label="Rallies Curtos (≤4)" 
                    p1Value={safeStats.player1.shortRallies ?? 0} 
                    p2Value={safeStats.player2.shortRallies ?? 0}
                  />
                  <StatComparison 
                    label="Rallies Longos (≥9)" 
                    p1Value={safeStats.player1.longRallies ?? 0} 
                    p2Value={safeStats.player2.longRallies ?? 0}
                  />
                </div>
              </div>

              {/* Performance Comparativa */}
              <div className="stats-section">
                <h4>⭐ Performance Geral</h4>
                <div className="performance-overview">
                  {/* Normalizar valores pelo maior entre os dois para cada categoria */}
                  {(() => {
                    const maxServiceHold = Math.max(stats.player1.serviceHoldPercentage ?? 0, stats.player2.serviceHoldPercentage ?? 0, 1);
                    const maxAgg = Math.max(stats.player1.winnerToErrorRatio ?? 0, stats.player2.winnerToErrorRatio ?? 0, 1);
                    const maxReturn = Math.max(stats.player1.returnWinPercentage ?? 0, stats.player2.returnWinPercentage ?? 0, 1);
                    // expor no jsx via closure
                    return (
                      <div className="performance-bars-inner" data-max-service={maxServiceHold} data-max-agg={maxAgg} data-max-return={maxReturn}>
                        {/** inner content rendered below using these maxima */}
                      </div>
                    );
                  })()}
                  <div className="performance-bars">
                    <div className="performance-category">
                      <span className="category-label">Eficiência no Saque</span>
                      <div className="progress-container">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill p1" 
                            style={{width: `${Math.min(100, (stats.player1.serviceHoldPercentage ?? 0) / Math.max(1, Math.max(stats.player1.serviceHoldPercentage ?? 0, stats.player2.serviceHoldPercentage ?? 0)) * 100)}%`}}
                          ></div>
                        </div>
                        <span className="progress-value">{stats.player1.serviceHoldPercentage}%</span>
                      </div>
                      <div className="progress-container">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill p2" 
                            style={{width: `${Math.min(100, (stats.player2.serviceHoldPercentage ?? 0) / Math.max(1, Math.max(stats.player1.serviceHoldPercentage ?? 0, stats.player2.serviceHoldPercentage ?? 0)) * 100)}%`}}
                          ></div>
                        </div>
                        <span className="progress-value">{stats.player2.serviceHoldPercentage}%</span>
                      </div>
                    </div>

                    <div className="performance-category">
                      <span className="category-label">Agressividade (W/UE)</span>
                      <div className="progress-container">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill p1" 
                            style={{width: `${Math.min(100, (stats.player1.winnerToErrorRatio ?? 0) / Math.max(1, Math.max(stats.player1.winnerToErrorRatio ?? 0, stats.player2.winnerToErrorRatio ?? 0)) * 100)}%`}}
                          ></div>
                        </div>
                        <span className="progress-value">{formatStat(stats.player1.winnerToErrorRatio, '', 2)}</span>
                      </div>
                      <div className="progress-container">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill p2" 
                            style={{width: `${Math.min(100, (stats.player2.winnerToErrorRatio ?? 0) / Math.max(1, Math.max(stats.player1.winnerToErrorRatio ?? 0, stats.player2.winnerToErrorRatio ?? 0)) * 100)}%`}}
                          ></div>
                        </div>
                        <span className="progress-value">{formatStat(stats.player2.winnerToErrorRatio, '', 2)}</span>
                      </div>
                    </div>

                    <div className="performance-category">
                      <span className="category-label">Poder de Return</span>
                      <div className="progress-container">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill p1" 
                            style={{width: `${Math.min(100, (stats.player1.returnWinPercentage ?? 0) / Math.max(1, Math.max(stats.player1.returnWinPercentage ?? 0, stats.player2.returnWinPercentage ?? 0)) * 100)}%`}}
                          ></div>
                        </div>
                        <span className="progress-value">{stats.player1.returnWinPercentage}%</span>
                      </div>
                      <div className="progress-container">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill p2" 
                            style={{width: `${Math.min(100, (stats.player2.returnWinPercentage ?? 0) / Math.max(1, Math.max(stats.player1.returnWinPercentage ?? 0, stats.player2.returnWinPercentage ?? 0)) * 100)}%`}}
                          ></div>
                        </div>
                        <span className="progress-value">{stats.player2.returnWinPercentage}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Estatísticas da Partida */}
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

export default MatchStatsModal;