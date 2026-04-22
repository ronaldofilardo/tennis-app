import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { httpClient } from '../config/httpClient';
import { useToast } from './Toast';
import { createLogger } from '../services/logger';
import './LocateMatchModal.css';

const log = createLogger('LocateMatchModal');

interface LocateMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LocateMatchModal: React.FC<LocateMatchModalProps> = ({ isOpen, onClose }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const toast = useToast();

  const handleLocate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code.trim()) {
      setError('Digite o código da partida');
      return;
    }

    setLoading(true);
    try {
      // Buscar partida por código público
      const response = await httpClient.get<{ id: string; name?: string }>(
        `/matches/by-code/${code.toUpperCase()}`,
      );

      if (response.data?.id) {
        toast.success('Partida encontrada!', 'Sucesso');
        setCode('');
        onClose();
        // Navigate to scoreboard for annotation
        navigate(`/scoreboard/${response.data.id}`, {
          state: { matchId: response.data.id, isLocated: true },
        });
      } else {
        setError('Partida não encontrada com este código');
      }
    } catch (err) {
      log.error('Erro ao buscar partida', err);
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Partida não encontrada. Verifique o código e tente novamente.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="locate-match-modal-overlay" onClick={onClose}>
      <div className="locate-match-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔍 Localizar Partida</h2>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            aria-label="Fechar"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleLocate} className="locate-form">
          <div className="form-group">
            <label htmlFor="match-code">Código da Partida</label>
            <input
              id="match-code"
              type="text"
              placeholder="Ex: TN42KX"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError(null);
              }}
              disabled={loading}
              maxLength={8}
              autoComplete="off"
              autoFocus
            />
            <p className="help-text">Digite o código único da partida (6-8 caracteres)</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-locate" disabled={loading || !code.trim()}>
              {loading ? 'Procurando...' : 'Localizar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LocateMatchModal;
