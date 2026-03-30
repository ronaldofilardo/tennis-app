// frontend/src/hooks/useConfirmClose.ts
// Hook para gerenciar confirmação antes de fechar modais com dados não salvos.
// Quando isDirty=false, fecha imediatamente (sem diálogo) — preserva comportamento
// original dos testes existentes.

import { useState, useCallback } from 'react';

interface UseConfirmCloseReturn {
  isConfirmOpen: boolean;
  handleOverlayClick: (e: React.MouseEvent<HTMLElement>) => void;
  confirmClose: () => void;
  cancelClose: () => void;
}

function useConfirmClose(isDirty: boolean, onClose: () => void): UseConfirmCloseReturn {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget) return;
      if (!isDirty) {
        onClose();
      } else {
        setIsConfirmOpen(true);
      }
    },
    [isDirty, onClose],
  );

  const confirmClose = useCallback(() => {
    setIsConfirmOpen(false);
    onClose();
  }, [onClose]);

  const cancelClose = useCallback(() => {
    setIsConfirmOpen(false);
  }, []);

  return { isConfirmOpen, handleOverlayClick, confirmClose, cancelClose };
}

export default useConfirmClose;
