// frontend/src/components/ServerEffectModal.tsx

import React, { useState, useEffect } from 'react';
import type { Player } from '../core/scoring/types';
import './ServerEffectModal.css';

interface ServerEffectModalProps {
  isOpen: boolean;
  playerInFocus: Player;
  onConfirm: (effect?: string, direction?: string) => void;
  onCancel: () => void;
}

const ServerEffectModal: React.FC<ServerEffectModalProps> = ({ isOpen, playerInFocus, onConfirm, onCancel }) => {
  const [efeito, setEfeito] = useState<string | undefined>();
  const [direcao, setDirecao] = useState<string | undefined>();

  useEffect(() => {
    if (isOpen) {
      setEfeito(undefined);
      setDirecao(undefined);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm(efeito, direcao);
  };

  const efeitosFixos = ['Chapado', 'Top spin', 'Cortado'];
  const direcoesFixas = ['Fechado', 'Aberto'];

  if (!isOpen) return null;

  return (
    <div className="server-effect-modal-overlay" onClick={onCancel}>
      <div className="server-effect-modal" data-testid="server-effect-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🎾 Efeito do Saque</h3>
          <div className="winner-display">
            Ponto para: <strong>{playerInFocus === 'PLAYER_1' ? 'Jogador 1' : 'Jogador 2'}</strong>
          </div>
        </div>
        <div className="modal-content">
          <div className="section">
            <h4>Efeito (opcional)</h4>
            <div className="button-group">
              {efeitosFixos.map((e) => (
                <button
                  key={e}
                  className={efeito === e ? 'active' : ''}
                  onClick={() => setEfeito(e)}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="section">
            <h4>Direção (opcional)</h4>
            <div className="button-group">
              {direcoesFixas.map((d) => (
                <button
                  key={d}
                  className={direcao === d ? 'active' : ''}
                  onClick={() => setDirecao(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button className="cancel-btn" onClick={onCancel} aria-label="Cancel ServerEffect">Cancelar</button>
          <button className="confirm-btn" onClick={handleConfirm} aria-label="Confirm ServerEffect">
            Confirmar Ponto
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServerEffectModal;