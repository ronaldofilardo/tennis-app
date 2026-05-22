/**
 * Modal que aparece quando usuário tenta rebaixar o placar de uma anotação retomada.
 * O piso (floor) é o placar no momento do abandono — não pode ser reduzido.
 */

import React from 'react';
import './ScoreFloorBlockedModal.css';

interface ScoreFloorBlockedModalProps {
  isOpen: boolean;
  floorLabel: string; // Ex: "2-2 Sets, Set 1 2-2"
  onCancel: () => void;
  onResetAnnotation: () => void;
  isLoading?: boolean;
}

export const ScoreFloorBlockedModal: React.FC<ScoreFloorBlockedModalProps> = ({
  isOpen,
  floorLabel,
  onCancel,
  onResetAnnotation,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="score-floor-modal-overlay" onClick={onCancel}>
      <div className="score-floor-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="score-floor-modal-header">
          <h2>Placar não pode ser reduzido</h2>
          <button className="score-floor-modal-close" onClick={onCancel} disabled={isLoading}>
            ✕
          </button>
        </div>

        <div className="score-floor-modal-body">
          <div className="score-floor-modal-warning">
            <span className="warning-icon">⚠️</span>
            <div className="warning-text">
              <p>
                Esta anotação foi retomada de um estado anterior. O placar não pode ser reduzido
                abaixo do que foi registrado no abandono.
              </p>
              <p className="floor-value">
                <strong>Piso do snapshot:</strong> {floorLabel}
              </p>
            </div>
          </div>

          <div className="score-floor-modal-info">
            <p>O que você pode fazer:</p>
            <ul>
              <li>✓ Aumentar o placar acima do piso</li>
              <li>✓ Cancelar e voltar ao snapshot</li>
              <li>✗ Reduzir o placar abaixo do piso</li>
            </ul>
          </div>
        </div>

        <div className="score-floor-modal-footer">
          <button className="score-floor-modal-btn-cancel" onClick={onCancel} disabled={isLoading}>
            Cancelar (volta ao snapshot)
          </button>
          <button
            className="score-floor-modal-btn-reset"
            onClick={onResetAnnotation}
            disabled={isLoading}
          >
            {isLoading ? 'Resetando...' : 'Resetar anotação'}
          </button>
        </div>
      </div>
    </div>
  );
};
