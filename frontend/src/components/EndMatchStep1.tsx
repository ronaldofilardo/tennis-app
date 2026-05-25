// frontend/src/components/EndMatchStep1.tsx
// Step 1: Seleção inicial — Indicar vencedor, Encerrar sem vencedor, ou Cancelar

import React from 'react';
import './EndMatchModal.css';

interface EndMatchStep1Props {
  isLoading: boolean;
  onIndicateWinner: () => void;
  onEndWithoutWinner: () => void;
  onCancel: () => void;
}

const EndMatchStep1: React.FC<EndMatchStep1Props> = ({
  isLoading,
  onIndicateWinner,
  onEndWithoutWinner,
  onCancel,
}) => {
  return (
    <div className="end-match-step-enter">
      <h3 className="end-match-modal-header" style={{ margin: 0, paddingBottom: '1rem' }}>
        Encerrar Partida?
      </h3>

      <p className="end-match-modal-info">
        Ao encerrar, a partida será marcada como finalizada e todas as sessões de anotação serão
        encerradas.
      </p>

      <div className="end-match-action-group" style={{ marginTop: '1.5rem' }}>
        <button
          onClick={onIndicateWinner}
          disabled={isLoading}
          className="end-match-btn-primary-action"
        >
          {isLoading ? 'Encerrando...' : 'Indicar Vencedor'}
        </button>
        <button
          onClick={onEndWithoutWinner}
          disabled={isLoading}
          className="end-match-btn-danger-action"
        >
          {isLoading ? 'Encerrando...' : 'Encerrar Sem Vencedor'}
        </button>
        <button onClick={onCancel} disabled={isLoading} className="end-match-btn-secondary-action">
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default EndMatchStep1;
