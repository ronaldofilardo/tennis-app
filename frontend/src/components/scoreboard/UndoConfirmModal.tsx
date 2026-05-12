import React from 'react';
import type { PointDetails, Player } from '../../core/scoring/types';
import './UndoConfirmModal.css';

interface UndoConfirmModalProps {
  isOpen: boolean;
  lastPoint: PointDetails | null;
  playerNames: { PLAYER_1: string; PLAYER_2: string };
  onConfirm: () => void;
  onCancel: () => void;
}

function describePoint(
  point: PointDetails,
  playerNames: { PLAYER_1: string; PLAYER_2: string },
): string {
  const winnerName = playerNames[point.result.winner as Player];

  if (point.serve?.type === 'ACE') {
    return `Ace de ${winnerName}`;
  }
  if (point.serve?.type === 'DOUBLE_FAULT') {
    const server: Player = point.result.winner === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
    return `Dupla falta de ${playerNames[server]}`;
  }

  const typeLabel: Record<string, string> = {
    WINNER: 'vencedor',
    UNFORCED_ERROR: 'erro não forçado',
    FORCED_ERROR: 'erro forçado',
  };
  const label = typeLabel[point.result.type] ?? 'ponto';
  return `${winnerName} — ${label}`;
}

export const UndoConfirmModal: React.FC<UndoConfirmModalProps> = ({
  isOpen,
  lastPoint,
  playerNames,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const description = lastPoint ? describePoint(lastPoint, playerNames) : 'último ponto registrado';

  return (
    <div className="undo-confirm-overlay" onClick={onCancel}>
      <div className="undo-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="undo-confirm-header">
          <span className="undo-confirm-icon">↩</span>
          <h2 className="undo-confirm-title">Desfazer ponto?</h2>
        </div>

        <div className="undo-confirm-body">
          <p className="undo-confirm-label">Ponto a ser desfeito:</p>
          <p className="undo-confirm-point">{description}</p>
          {lastPoint?.context && (
            <p className="undo-confirm-context">
              Set {lastPoint.context.setNumber} · {lastPoint.context.gamesP1}-
              {lastPoint.context.gamesP2} (games)
            </p>
          )}
        </div>

        <div className="undo-confirm-footer">
          <button className="undo-confirm-btn-cancel" onClick={onCancel}>
            Cancelar
          </button>
          <button className="undo-confirm-btn-confirm" onClick={onConfirm}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};
