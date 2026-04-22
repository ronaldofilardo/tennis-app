// frontend/src/components/ServerEffectModal.tsx

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Player } from '../core/scoring/types';
import useConfirmClose from '../hooks/useConfirmClose';
import ConfirmCloseDialog from './ConfirmCloseDialog';
import './ServerEffectModal.css';

interface ServerEffectModalProps {
  isOpen: boolean;
  playerInFocus: Player;
  onConfirm: (effect?: string, direction?: string) => void;
  onCancel: () => void;
  fontScale?: number;
  /** "winner" = modal de Ace/sacada (padrão) | "error" = modal de erro Out/Net */
  context?: 'winner' | 'error';
  /** Tipo do erro — presente quando context="error" */
  errorType?: 'out' | 'net';
  /** Qual saque errou — presente quando context="error" */
  serveStep?: 'first' | 'second';
}

const ServerEffectModal: React.FC<ServerEffectModalProps> = ({
  isOpen,
  playerInFocus,
  onConfirm,
  onCancel,
  fontScale = 1,
  context = 'winner',
  errorType,
  serveStep = 'first',
}) => {
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

  const efeitosFixos = ['TopSpin', 'Slice', 'Flat'];
  const direcoesFixas = ['Aberto', 'Centro', 'Fechado'];

  const isError = context === 'error';
  const errorLabel = errorType === 'net' ? 'Net' : 'Out';
  const serveLabel = serveStep === 'second' ? '2º Saque' : '1º Saque';

  const confirmLabel = isError
    ? serveStep === 'second'
      ? 'Registrar Dupla Falta'
      : 'Registrar e Continuar'
    : 'Confirmar Ponto';

  const isFormDirty = efeito !== undefined || direcao !== undefined;
  const { isConfirmOpen, handleOverlayClick, confirmClose, cancelClose } = useConfirmClose(
    isFormDirty,
    onCancel,
  );

  if (!isOpen) return null;

  return createPortal(
    <div className="server-effect-modal-overlay" onClick={handleOverlayClick}>
      <ConfirmCloseDialog isOpen={isConfirmOpen} onConfirm={confirmClose} onCancel={cancelClose} />
      <div
        className={`server-effect-modal${isError ? 'server-effect-modal--error' : ''}`}
        data-testid="server-effect-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ '--sb-scale': String(fontScale) } as React.CSSProperties}
      >
        <div className="modal-header">
          {isError ? (
            <>
              <h3>⚠️ Erro de Saque ({errorLabel})</h3>
              <div className="winner-display">
                <strong>{serveLabel}</strong>
              </div>
            </>
          ) : (
            <>
              <h3>🎾 Efeito do Saque</h3>
              <div className="winner-display">
                Ponto para:{' '}
                <strong>{playerInFocus === 'PLAYER_1' ? 'Jogador 1' : 'Jogador 2'}</strong>
              </div>
            </>
          )}
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
          <button className="confirm-btn" onClick={handleConfirm} aria-label="Confirm ServerEffect">
            {confirmLabel}
          </button>
          <button className="cancel-btn" onClick={onCancel} aria-label="Cancel ServerEffect">
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ServerEffectModal;
