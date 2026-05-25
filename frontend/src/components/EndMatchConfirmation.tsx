// frontend/src/components/EndMatchConfirmation.tsx
// Success state: Partida foi finalizada com sucesso

import React from 'react';
import './EndMatchModal.css';

interface EndMatchConfirmationProps {
  winner?: string | null;
}

const EndMatchConfirmation: React.FC<EndMatchConfirmationProps> = ({ winner }) => {
  return (
    <div className="end-match-success-container">
      <div className="end-match-success-icon">✓</div>
      <h3 style={{ margin: '0 0 0.5rem 0', color: '#22c55e' }}>Partida Finalizada!</h3>
      <p style={{ color: 'rgb(148, 163, 184)', marginTop: '0.5rem' }}>
        {winner
          ? `${winner === 'PLAYER_1' ? 'Jogador 1' : 'Jogador 2'} foi marcado como vencedor.`
          : 'A partida foi encerrada sem vencedor definido.'}
      </p>
    </div>
  );
};

export default EndMatchConfirmation;
