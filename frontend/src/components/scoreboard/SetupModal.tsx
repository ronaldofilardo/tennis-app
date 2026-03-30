import React from 'react';
import { TennisConfigFactory } from '../../core/scoring/TennisConfigFactory';
import type { TennisFormat, Player } from '../../core/scoring/types';

interface SetupModalProps {
  isOpen: boolean;
  players: { p1: string; p2: string };
  format: string;
  onConfirm: (firstServer: Player) => void;
  onCancel: () => void;
}

const SetupModal: React.FC<SetupModalProps> = ({
  isOpen,
  players,
  format,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;
  return (
    <div className="setup-modal-overlay">
      <div className="setup-modal">
        <h3>Configuração da Partida</h3>
        <p>
          <strong>Modo de jogo:</strong>{' '}
          {TennisConfigFactory.getFormatDisplayName(format as TennisFormat)}
        </p>
        <div className="server-selection">
          <h4>Quem saca primeiro?</h4>
          <div className="server-buttons">
            <button
              className="server-button"
              onClick={() => onConfirm('PLAYER_1')}
              aria-label={`${players.p1} saca primeiro`}
            >
              {players.p1}
            </button>
            <button
              className="server-button"
              onClick={() => onConfirm('PLAYER_2')}
              aria-label={`${players.p2} saca primeiro`}
            >
              {players.p2}
            </button>
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={onCancel} className="cancel-button">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupModal;
