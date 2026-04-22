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
}) => {
  const isSecondServe = serveStep === 'second';

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
      {!isFinished && !isModalOpen && (
        <div className={`quick-actions-row serve-${server === 'PLAYER_1' ? 'left' : 'right'}`}>
          <button
            className={`serve-step-btn serve-info ${isSecondServe ? 'second-serve serve-step-second' : 'first-serve serve-step-first'}`}
            disabled
          >
            {isSecondServe ? '2º Saque' : '1º Saque'}
          </button>
          <button className="action-quick-btn" onClick={onAce}>
            Ace
          </button>
          <button className="action-quick-btn action-quick-fault" onClick={handleOutClick}>
            Out
          </button>
          <button className="action-quick-btn action-quick-fault" onClick={handleNetClick}>
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
      </div>
    </div>
  );
};

export default ActionBar;
