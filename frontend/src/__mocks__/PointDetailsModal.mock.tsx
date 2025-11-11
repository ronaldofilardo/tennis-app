import React from 'react';

// Estado simulado para o ScoreboardV2
let mockState = {
  gamesP1: 0,
  gamesP2: 0,
  finished: false,
};

export function __resetMockPointDetailsModal() {
  mockState = { gamesP1: 0, gamesP2: 0, finished: false };
}

export default function MockPointDetailsModal({ isOpen, onConfirm, onCancel }: any) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    // Simula avanço do placar e finalização
    if (!mockState.finished) {
      if (mockState.gamesP1 === 0) {
        mockState.gamesP1 = 1;
      } else {
        mockState.finished = true;
      }
    }
    onConfirm({ Resultado: 'Winner', Golpe: 'Forehand - FH', Efeito: 'Flat', Direcao: 'Paralela' }, 'PLAYER_1');
  };

  return (
    <div className="point-details-modal-overlay">
      <div className="point-details-modal" data-testid="point-details-modal">
        <div className="modal-header">
          <h3>🎾 Detalhes do Ponto</h3>
          <div className="winner-display">
            Ponto para: <strong>Jogador 1</strong>
          </div>
        </div>
        <div className="modal-content">
          <div className="section">
            <h4>Resultado</h4>
            <div className="button-group">
              <button onClick={() => {}} className="active">Winner</button>
            </div>
          </div>
          <div className="section">
            <h4>Golpe</h4>
            <div className="button-group">
              <button onClick={() => {}}>Forehand - FH</button>
            </div>
          </div>
          <div className="section">
            <h4>Efeito</h4>
            <div className="button-group">
              <button onClick={() => {}}>Flat</button>
            </div>
          </div>
          <div className="section">
            <h4>Direção</h4>
            <div className="button-group">
              <button onClick={() => {}}>Paralela</button>
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button className="cancel-btn" aria-label="Cancel" onClick={onCancel}>Cancelar</button>
          <button className="confirm-btn" aria-label="Confirm" onClick={handleConfirm}>Confirmar Ponto</button>
        </div>
      </div>
    </div>
  );
}
