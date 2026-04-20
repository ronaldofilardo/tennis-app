import React, { useState } from 'react';
import './ConfirmDeleteMatchModal.css';

interface ConfirmDeleteMatchModalProps {
  isOpen: boolean;
  matchId: string;
  players: { p1: string; p2: string };
  onConfirm: (matchId: string, reason?: string) => Promise<void>;
  onCancel: () => void;
}

export const ConfirmDeleteMatchModal: React.FC<ConfirmDeleteMatchModalProps> = ({
  isOpen,
  matchId,
  players,
  onConfirm,
  onCancel,
}) => {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onConfirm(matchId, reason || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar partida');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setReason('');
    setError(null);
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div className="confirm-delete-modal-overlay" onClick={handleCancel}>
      <div className="confirm-delete-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-delete-modal-header">
          <h2>Deletar Partida</h2>
          <button className="confirm-delete-modal-close" onClick={handleCancel}>
            ✕
          </button>
        </div>

        <div className="confirm-delete-modal-body">
          <p className="confirm-delete-modal-warning">
            ⚠️ Você está prestes a deletar a partida entre <strong>{players.p1}</strong> e{' '}
            <strong>{players.p2}</strong>.
          </p>
          <p className="confirm-delete-modal-info">Esta ação é irreversível.</p>

          <div className="confirm-delete-modal-form-group">
            <label htmlFor="delete-reason">Motivo da deleção (opcional):</label>
            <textarea
              id="delete-reason"
              className="confirm-delete-modal-textarea"
              placeholder="Descreva brevemente o motivo..."
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              maxLength={500}
              disabled={isLoading}
            />
            <small>{reason.length}/500</small>
          </div>

          {error && <div className="confirm-delete-modal-error">{error}</div>}
        </div>

        <div className="confirm-delete-modal-footer">
          <button
            className="confirm-delete-modal-btn-cancel"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            className="confirm-delete-modal-btn-delete"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Deletando...' : 'Deletar Partida'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteMatchModal;
