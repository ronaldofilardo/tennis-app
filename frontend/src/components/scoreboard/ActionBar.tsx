import React from 'react';
import './ActionBar.css';

interface ActionBarProps {
  canUndo: boolean;
  isFinished: boolean;
  serveStep: 'none' | 'second';
  server: 'PLAYER_1' | 'PLAYER_2';
  playerNames: { PLAYER_1: string; PLAYER_2: string };
  onUndo: () => void;
  onAce: () => void;
  onOut: () => void;
  onNet: () => void;
  onFault: () => void;
  ballExchangeCount?: number;
  onBallExchangeIncrement?: () => void;
  /** Handlers específicos para Out/Net no 2º saque (fallback: onFault) */
  onFaultOut?: () => void;
  onFaultNet?: () => void;
  onConfig?: () => void;
  /** Abre modal de ajuste de placar */
  onEditScore?: () => void;
  /** Controle do tamanho do placar */
  fontScale?: number;
  onFontScaleInc?: () => void;
  onFontScaleDec?: () => void;
  /** Esconde a barra de ações quando modal está aberto */
  isModalOpen?: boolean;
  /** Se true, desabilita completamente a entrada (partida encerrada manualmente) */
  isMatchFinalized?: boolean;
}

const ActionBar: React.FC<ActionBarProps> = ({
  canUndo,
  isFinished,
  serveStep,
  server,
  playerNames,
  onUndo,
  onAce,
  onOut,
  onNet,
  onFault,
  onFaultOut,
  onFaultNet,
  onConfig,
  onEditScore,
  fontScale = 1,
  onFontScaleInc,
  onFontScaleDec,
  isModalOpen = false,
  isMatchFinalized = false,
  ballExchangeCount = 0,
  onBallExchangeIncrement,
}) => {
  const isSecondServe = serveStep === 'second';
  const disabled = isFinished || isMatchFinalized;
  const isBallCountingActive = ballExchangeCount > 0;

  const handleOutClick = () => {
    if (isSecondServe) {
      (onFaultOut ?? onFault)();
    } else {
      onOut();
    }
  };

  const handleNetClick = () => {
    if (isSecondServe) {
      (onFaultNet ?? onFault)();
    } else {
      onNet();
    }
  };
  const returner: 'PLAYER_1' | 'PLAYER_2' = server === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';

  // Os botões de ponto ficam SEMPRE na mesma posição dos cards:
  // esquerda = PLAYER_1, direita = PLAYER_2 (independente de quem é sacador)
  const leftPlayer: 'PLAYER_1' | 'PLAYER_2' = 'PLAYER_1';
  const rightPlayer: 'PLAYER_1' | 'PLAYER_2' = 'PLAYER_2';
  const leftName = playerNames[leftPlayer];
  const rightName = playerNames[rightPlayer];
  const leftIsServer = server === leftPlayer;
  const rightIsServer = server === rightPlayer;

  return (
    <div className="action-bar">
      {/* Linha de saque */}
      {!disabled && !isModalOpen && (
        <div className={`quick-actions-row serve-${server === 'PLAYER_1' ? 'left' : 'right'}`}>
          <button
            className={`serve-step-btn serve-info ${isSecondServe ? 'second-serve serve-step-second' : 'first-serve serve-step-first'}`}
            disabled
          >
            {isSecondServe ? '2º Saque' : '1º Saque'}
          </button>
          <button
            className="action-quick-btn action-ace"
            onClick={onAce}
            disabled={isBallCountingActive}
            title={isBallCountingActive ? 'Desabilitar contador de bolas para continuar' : ''}
          >
            Ace
          </button>
          <button
            className="action-quick-btn action-quick-fault action-out"
            onClick={handleOutClick}
            disabled={isBallCountingActive}
            title={isBallCountingActive ? 'Desabilitar contador de bolas para continuar' : ''}
          >
            Out
          </button>
          <button
            className="action-quick-btn action-quick-fault action-net"
            onClick={handleNetClick}
            disabled={isBallCountingActive}
            title={isBallCountingActive ? 'Desabilitar contador de bolas para continuar' : ''}
          >
            Net
          </button>
        </div>
      )}

      {/* Linha de ações gerais */}
      <div className="main-actions">
        <button
          className={`main-action-btn undo-btn ${!canUndo || isFinished ? 'main-action-btn-disabled' : ''}`}
          onClick={onUndo}
          disabled={!canUndo || isFinished}
        >
          ↩ Correção (Undo)
        </button>

        {/* Controle de tamanho do placar */}
        <div className="font-scale-ctrl" aria-label="Tamanho do placar">
          <button
            className="font-scale-btn"
            onClick={onFontScaleDec}
            disabled={fontScale <= 0.6}
            aria-label="Diminuir placar"
            title="Diminuir"
          >
            A−
          </button>
          <button
            className="font-scale-btn"
            onClick={onFontScaleInc}
            disabled={fontScale >= 2.0}
            aria-label="Aumentar placar"
            title="Aumentar"
          >
            A+
          </button>
        </div>

        {onConfig && (
          <button className="main-action-btn config-btn" onClick={onConfig}>
            ⚙
          </button>
        )}
        {onEditScore && !isFinished && (
          <button
            className="main-action-btn edit-score-btn"
            onClick={onEditScore}
            title="Ajustar placar manualmente"
          >
            ✏️
          </button>
        )}

        {/* Ball Exchange Counter Inline */}
        {onBallExchangeIncrement && (
          <div className={`ball-exchange-inline ${ballExchangeCount > 0 ? 'active' : ''}`}>
            {ballExchangeCount > 0 && (
              <>
                <span className="ball-exchange-label">BOLAS:</span>
                <span className="ball-exchange-value">{ballExchangeCount}</span>
              </>
            )}
            <button
              className="ball-exchange-btn"
              onClick={onBallExchangeIncrement}
              title="Adicionar troca de bola"
              aria-label="Adicionar troca de bola"
              type="button"
            >
              +ball
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionBar;
