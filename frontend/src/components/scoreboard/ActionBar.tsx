import React from "react";
import "./ActionBar.css";

interface ActionBarProps {
  canUndo: boolean;
  isFinished: boolean;
  serveStep: "none" | "second";
  server: "PLAYER_1" | "PLAYER_2";
  playerNames: { PLAYER_1: string; PLAYER_2: string };
  onUndo: () => void;
  onAce: () => void;
  onOut: () => void;
  onNet: () => void;
  onFault: () => void;
  /** Handlers específicos para Out/Net no 2º saque (fallback: onFault) */
  onFaultOut?: () => void;
  onFaultNet?: () => void;
  onStats: () => void;
  onConfig?: () => void;
  /** Controle do tamanho do placar */
  fontScale?: number;
  onFontScaleInc?: () => void;
  onFontScaleDec?: () => void;
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
  onStats,
  onConfig,
  fontScale = 1,
  onFontScaleInc,
  onFontScaleDec,
}) => {
  const isSecondServe = serveStep === "second";
  const returner: "PLAYER_1" | "PLAYER_2" =
    server === "PLAYER_1" ? "PLAYER_2" : "PLAYER_1";

  // Os botões de ponto ficam SEMPRE na mesma posição dos cards:
  // esquerda = PLAYER_1, direita = PLAYER_2 (independente de quem é sacador)
  const leftPlayer: "PLAYER_1" | "PLAYER_2" = "PLAYER_1";
  const rightPlayer: "PLAYER_1" | "PLAYER_2" = "PLAYER_2";
  const leftName = playerNames[leftPlayer];
  const rightName = playerNames[rightPlayer];
  const leftIsServer = server === leftPlayer;
  const rightIsServer = server === rightPlayer;

  return (
    <div className="action-bar">
      {/* Linha de saque */}
      {!isFinished && (
        <div
          className={`quick-actions-row serve-${server === "PLAYER_1" ? "left" : "right"}`}
        >
          <button
            className={`serve-step-btn serve-info ${isSecondServe ? "second-serve serve-step-second" : "first-serve serve-step-first"}`}
            disabled
          >
            {isSecondServe ? "2º Saque" : "1º Saque"}
          </button>
          <button className="action-quick-btn" onClick={onAce}>
            Ace
          </button>
          <button
            className="action-quick-btn action-quick-fault"
            onClick={isSecondServe ? (onFaultOut ?? onFault) : onOut}
          >
            Out
          </button>
          <button
            className="action-quick-btn action-quick-fault"
            onClick={isSecondServe ? (onFaultNet ?? onFault) : onNet}
          >
            Net
          </button>
        </div>
      )}

      {/* Linha de ações gerais */}
      <div className="main-actions">
        <button
          className={`main-action-btn undo-btn ${!canUndo || isFinished ? "main-action-btn-disabled" : ""}`}
          onClick={onUndo}
          disabled={!canUndo || isFinished}
        >
          ↩ Correção (Undo)
        </button>
        <button className="main-action-btn stats-btn" onClick={onStats}>
          📊 Stats
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
      </div>
    </div>
  );
};

export default ActionBar;
