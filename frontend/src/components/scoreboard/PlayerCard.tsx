import React, { useState, useRef } from 'react';
// Note: longPress removido — marcador define o tempo necessário sem interrupção (demanda 4)
// Note: swipeUp removido — toque no placar abre detalhes do ponto (demanda 5)
import type { ViewMode } from './MatchHeader';
import './PlayerCard.css';

type GamePoint = '0' | '15' | '30' | '40' | 'AD' | number;

interface TechStats {
  firstServePercent: number;
  winners: number;
  unforced: number;
}

interface PlayerCardProps {
  player: 'PLAYER_1' | 'PLAYER_2';
  name: string;
  code?: string | null;
  score: GamePoint;
  games: number;
  sets: number;
  isServing: boolean;
  serveStep: 'none' | 'second';
  isTiebreak: boolean;
  isMatchPoint: boolean;
  isSetPoint: boolean;
  isBreakPoint: boolean;
  isAdvantage: boolean;
  isDeuce: boolean;
  viewMode: ViewMode;
  techStats?: TechStats;
  disabled?: boolean;
  onPress: () => void;
  onSwipeDown?: () => void;
}

function scoreToProgress(score: GamePoint, isTiebreak: boolean): number {
  if (isTiebreak) {
    const n = typeof score === 'number' ? score : parseInt(String(score), 10);
    return Math.min(n / 7, 1);
  }
  const map: Record<string, number> = {
    '0': 0,
    '15': 0.25,
    '30': 0.5,
    '40': 0.75,
    AD: 1,
  };
  return map[String(score)] ?? 0;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  name,
  code,
  score,
  games,
  sets,
  isServing,
  serveStep,
  isTiebreak,
  isMatchPoint,
  isSetPoint,
  isBreakPoint,
  isAdvantage,
  isDeuce,
  viewMode,
  techStats,
  disabled,
  onPress,
  onSwipeDown,
}) => {
  const [pressed, setPressed] = useState(false);
  const touchStartY = useRef<number>(0);
  const touchStartX = useRef<number>(0);
  const didSwipe = useRef(false);

  const colorClass = player === 'PLAYER_1' ? 'card-p1' : 'card-p2';
  const stateClass = isMatchPoint
    ? 'card-match-point'
    : isAdvantage && !isDeuce
      ? 'card-advantage'
      : '';

  const progress = scoreToProgress(score, isTiebreak);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    touchStartY.current = e.clientY;
    touchStartX.current = e.clientX;
    didSwipe.current = false;
    setPressed(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const dy = e.clientY - touchStartY.current;
    const dx = e.clientX - touchStartX.current;
    // Threshold aumentado para 80px para evitar ativação acidental após marcar ponto
    if (Math.abs(dy) > 80 && !didSwipe.current && Math.abs(dy) > Math.abs(dx)) {
      didSwipe.current = true;
      setPressed(false);
      if (dy > 0) {
        navigator.vibrate?.(30);
        onSwipeDown?.();
      }
    }
  };

  const handlePointerUp = () => {
    setPressed(false);
    // tap handled by onClick for test compatibility
  };

  const handleClick = () => {
    if (disabled || didSwipe.current) return;
    navigator.vibrate?.(50);
    onPress();
  };

  const handlePointerCancel = () => {
    setPressed(false);
  };

  return (
    <button
      className={[
        'player-card',
        colorClass,
        stateClass,
        pressed ? 'card-pressed' : '',
        isServing ? 'card-serving' : '',
        isDeuce ? 'card-deuce' : '',
        viewMode === 'family' ? 'card-family' : '',
        disabled ? 'card-disabled' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      type="button"
      disabled={disabled}
      aria-label={`+ Ponto ${name}`}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {/* Avatar (modo família) */}
      {viewMode === 'family' && <div className="player-avatar">{getInitials(name)}</div>}

      {/* Nome */}
      <div className="player-card-name">
        {name}
        {isServing && (
          <span className="serve-dot" aria-label="Sacando">
            ●
          </span>
        )}
      </div>

      {/* Código do Atleta */}
      {code && <div className="player-card-code">{code}</div>}

      {/* Indicador de saque */}
      {isServing && (
        <div className="serve-badge">🎾 {serveStep === 'second' ? '2º Saque' : '1º Saque'}</div>
      )}

      {/* Pontuação */}
      <div className="player-card-score">
        {isAdvantage && player === 'PLAYER_1' && score === 'AD' ? (
          <span className="score-adv">ADV</span>
        ) : isAdvantage && player === 'PLAYER_2' && score === 'AD' ? (
          <span className="score-adv">ADV</span>
        ) : (
          <span className="score-value">{score}</span>
        )}
      </div>

      {/* Games do set atual */}
      <div className="player-card-games">
        ({games} {games === 1 ? 'game' : 'games'})
      </div>

      {/* Sets */}
      <div className="player-card-sets">
        {Array.from({ length: sets }).map((_, i) => (
          <span key={i} className="set-dot">
            ●
          </span>
        ))}
      </div>

      {/* Barra de progresso */}
      <div className="game-progress-bar" aria-hidden="true">
        <div className="game-progress-fill" style={{ width: `${progress * 100}%` }} />
      </div>

      {/* Indicadores de break/set/match point */}
      {(isMatchPoint || isSetPoint || isBreakPoint) && (
        <div className="point-indicator">
          {isMatchPoint ? '🏆 Match Point' : isSetPoint ? '🎯 Set Point' : '⚡ Break Point'}
        </div>
      )}

      {/* Overlay técnico */}
      {viewMode === 'technical' && techStats && (
        <div className="tech-overlay">
          <span>1º: {techStats.firstServePercent}%</span>
          <span>W: {techStats.winners}</span>
          <span>UE: {techStats.unforced}</span>
        </div>
      )}

      {/* Instrução de gesto (hint) */}
      <div className="card-hint">Toque para marcar ponto</div>
      {/* Texto acessível — compatibilidade com getByText nos testes */}
      <span className="sr-only">+ Ponto {name}</span>
    </button>
  );
};

export default PlayerCard;
