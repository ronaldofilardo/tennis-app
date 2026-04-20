import React, { useState } from 'react';
import './EndMatchModal.css';

interface EndMatchModalProps {
  isOpen: boolean;
  matchId: string;
  players: { p1: string; p2: string };
  onConfirm: (
    matchId: string,
    status: 'FINISHED' | 'CANCELLED' | 'SUSPENDED',
    winner?: string,
    reason?: string,
  ) => Promise<void>;
  onCancel: () => void;
}

type MatchStatus = 'FINISHED' | 'CANCELLED' | 'SUSPENDED';

export const EndMatchModal: React.FC<EndMatchModalProps> = ({
  isOpen,
  matchId,
  players,
  onConfirm,
  onCancel,
}) => {
  const [status, setStatus] = useState<MatchStatus>('FINISHED');
  const [winner, setWinner] = useState<string>('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (status === 'FINISHED' && !winner) {
      setError('Selecione o vencedor para finalizar a partida');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await onConfirm(matchId, status, winner || undefined, reason || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao encerrar partida');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setStatus('FINISHED');
    setWinner('');
    setReason('');
    setError(null);
    onCancel();
  };

  if (!isOpen) return null;

  const statusLabel: Record<MatchStatus, string> = {
    FINISHED: 'Finalizar',
    CANCELLED: 'Cancelar',
    SUSPENDED: 'Suspender',
  };

  return (
    <div className="end-match-modal-overlay" onClick={handleCancel}>
      <div className="end-match-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="end-match-modal-header">
          <h2>Encerrar Partida</h2>
          <button className="end-match-modal-close" onClick={handleCancel}>
            ✕
          </button>
        </div>

        <div className="end-match-modal-body">
          <p className="end-match-modal-info">
            Partida entre <strong>{players.p1}</strong> e <strong>{players.p2}</strong>
          </p>

          <div className="end-match-modal-form-group">
            <label htmlFor="end-status">Status:</label>
            <div className="end-match-modal-status-group">
              {(['FINISHED', 'CANCELLED', 'SUSPENDED'] as MatchStatus[]).map((s) => (
                <label key={s} className="end-match-modal-status-label">
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    checked={status === s}
                    onChange={(e) => {
                      setStatus(e.target.value as MatchStatus);
                      setWinner('');
                    }}
                    disabled={isLoading}
                  />
                  {statusLabel[s]}
                </label>
              ))}
            </div>
          </div>

          {status === 'FINISHED' && (
            <div className="end-match-modal-form-group">
              <label htmlFor="winner">Vencedor:</label>
              <select
                id="winner"
                className="end-match-modal-select"
                value={winner}
                onChange={(e) => setWinner(e.target.value)}
                disabled={isLoading}
              >
                <option value="">Selecione o vencedor</option>
                <option value={players.p1}>{players.p1}</option>
                <option value={players.p2}>{players.p2}</option>
              </select>
            </div>
          )}

          {(status === 'CANCELLED' || status === 'SUSPENDED') && (
            <div className="end-match-modal-form-group">
              <label htmlFor="reason">Motivo:</label>
              <textarea
                id="reason"
                className="end-match-modal-textarea"
                placeholder="Descreva o motivo do cancelamento/suspensão..."
                value={reason}
                onChange={(e) => setReason(e.target.value.slice(0, 500))}
                maxLength={500}
                disabled={isLoading}
              />
              <small>{reason.length}/500</small>
            </div>
          )}

          {error && <div className="end-match-modal-error">{error}</div>}
        </div>

        <div className="end-match-modal-footer">
          <button
            className="end-match-modal-btn-cancel"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            className="end-match-modal-btn-confirm"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Encerrando...' : `${statusLabel[status]} Partida`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EndMatchModal;
