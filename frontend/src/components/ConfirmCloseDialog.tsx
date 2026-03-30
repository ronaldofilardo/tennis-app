// frontend/src/components/ConfirmCloseDialog.tsx
// Diálogo de confirmação exibido dentro de modais quando o usuário tenta
// fechar com dados não salvos.

import React from 'react';
import './ConfirmCloseDialog.css';

interface ConfirmCloseDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  message?: string;
}

const ConfirmCloseDialog: React.FC<ConfirmCloseDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  message = 'As alterações não salvas serão perdidas.',
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="confirm-close-backdrop"
      role="alertdialog"
      aria-modal="true"
      aria-label="Confirmar fechamento"
    >
      <div className="confirm-close-dialog">
        <p className="confirm-close-message">{message}</p>
        <div className="confirm-close-actions">
          <button type="button" className="confirm-close-cancel" onClick={onCancel}>
            Continuar editando
          </button>
          <button type="button" className="confirm-close-confirm" onClick={onConfirm}>
            Sim, fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmCloseDialog;
