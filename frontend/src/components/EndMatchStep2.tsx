// frontend/src/components/EndMatchStep2.tsx
// Step 2: Seleção de vencedor — Escolher entre Jogador 1 ou Jogador 2

import React from 'react';
import './EndMatchModal.css';

interface EndMatchStep2Props {
  selectedWinner: string | null;
  isLoading: boolean;
  onSelectWinner: (winner: 'PLAYER_1' | 'PLAYER_2') => void;
  onConfirm: () => void;
  onBack: () => void;
  player1Name?: string;
  player2Name?: string;
}

const EndMatchStep2: React.FC<EndMatchStep2Props> = ({
  selectedWinner,
  isLoading,
  onSelectWinner,
  onConfirm,
  onBack,
  player1Name = 'Jogador 1',
  player2Name = 'Jogador 2',
}) => {
  return (
    <div className="end-match-step-enter">
      <h3 className="end-match-modal-header" style={{ margin: 0, paddingBottom: '1rem' }}>
        Selecione o Vencedor
      </h3>

      <p className="end-match-modal-info" style={{ marginBottom: '1.5rem' }}>
        Quem venceu a partida?
      </p>

      <div className="end-match-action-group" style={{ marginBottom: '1.5rem', gap: '0.5rem' }}>
        <button
          onClick={() => onSelectWinner('PLAYER_1')}
          disabled={isLoading}
          className={`end-match-winner-btn ${selectedWinner === 'PLAYER_1' ? 'selected' : ''}`}
        >
          {player1Name}
        </button>
        <button
          onClick={() => onSelectWinner('PLAYER_2')}
          disabled={isLoading}
          className={`end-match-winner-btn ${selectedWinner === 'PLAYER_2' ? 'selected' : ''}`}
        >
          {player2Name}
        </button>
      </div>

      <div className="end-match-action-group">
        <button
          onClick={onConfirm}
          disabled={isLoading || !selectedWinner}
          className="end-match-btn-success-action"
        >
          {isLoading ? 'Confirmando...' : 'Confirmar'}
        </button>
        <button onClick={onBack} disabled={isLoading} className="end-match-btn-secondary-action">
          Voltar
        </button>
      </div>
    </div>
  );
};

export default EndMatchStep2;
