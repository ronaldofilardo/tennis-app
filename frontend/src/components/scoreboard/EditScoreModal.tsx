import React, { useState, useEffect } from 'react';
import type { TennisFormat, Player } from '../../core/scoring/types';
import './EditScoreModal.css';

interface EditScoreModalProps {
  isOpen: boolean;
  matchFormat: TennisFormat;
  playerNames: { p1: string; p2: string };
  currentSets: { PLAYER_1: number; PLAYER_2: number };
  currentServer: Player;
  onConfirm: (setWinners: Array<'p1' | 'p2'>, server: Player) => void;
  onCancel: () => void;
}

/** Total de sets possíveis no formato */
function totalSetsForFormat(format: TennisFormat): number {
  switch (format) {
    case 'BEST_OF_5':
      return 5;
    case 'BEST_OF_3':
    case 'BEST_OF_3_MATCH_TB':
    case 'NO_AD':
    case 'NO_LET_TENNIS':
      return 3;
    default:
      // SINGLE_SET, PRO_SET, MATCH_TIEBREAK, SHORT_SET, FAST4, SHORT_SET_NO_AD
      return 1;
  }
}

export const EditScoreModal: React.FC<EditScoreModalProps> = ({
  isOpen,
  matchFormat,
  playerNames,
  currentSets,
  currentServer,
  onConfirm,
  onCancel,
}) => {
  const maxSets = totalSetsForFormat(matchFormat);

  // Reconstruct initial setWinners from currentSets
  const buildInitialSetWinners = (): Array<'p1' | 'p2' | null> => {
    const total = currentSets.PLAYER_1 + currentSets.PLAYER_2;
    const winners: Array<'p1' | 'p2' | null> = Array(maxSets).fill(null);
    // Preenche os sets já disputados de forma fictícia (não sabemos a ordem real)
    let p1Remaining = currentSets.PLAYER_1;
    let p2Remaining = currentSets.PLAYER_2;
    for (let i = 0; i < total && i < maxSets; i++) {
      if (p1Remaining > 0) {
        winners[i] = 'p1';
        p1Remaining--;
      } else if (p2Remaining > 0) {
        winners[i] = 'p2';
        p2Remaining--;
      }
    }
    return winners;
  };

  const [setWinners, setSetWinners] = useState<Array<'p1' | 'p2' | null>>(buildInitialSetWinners);
  const [server, setServer] = useState<Player>(currentServer);

  // Reset ao abrir
  useEffect(() => {
    if (isOpen) {
      setSetWinners(buildInitialSetWinners());
      setServer(currentServer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSetWinner = (setIndex: number, winner: 'p1' | 'p2' | null): void => {
    setSetWinners((prev) => {
      const next = [...prev];
      next[setIndex] = winner;
      // Limpar sets posteriores se este foi desmarcado
      if (winner === null) {
        for (let i = setIndex + 1; i < next.length; i++) {
          next[i] = null;
        }
      }
      return next;
    });
  };

  const p1Sets = setWinners.filter((w) => w === 'p1').length;
  const p2Sets = setWinners.filter((w) => w === 'p2').length;

  const handleConfirm = (): void => {
    const played = setWinners.filter((w) => w !== null) as Array<'p1' | 'p2'>;
    onConfirm(played, server);
  };

  const setIndices = Array.from({ length: maxSets }, (_, i) => i);
  const isFirstSetOnly = maxSets === 1;

  return (
    <div className="edit-score-overlay" onClick={onCancel}>
      <div className="edit-score-modal" onClick={(e) => e.stopPropagation()}>
        <div className="edit-score-header">
          <span className="edit-score-icon">✏️</span>
          <h2 className="edit-score-title">Ajustar Placar</h2>
          <button className="edit-score-close" onClick={onCancel}>✕</button>
        </div>

        <div className="edit-score-body">
          <p className="edit-score-warning">
            ⚠️ O histórico de pontos anteriores será apagado.
          </p>

          {!isFirstSetOnly && (
            <div className="edit-score-section">
              <p className="edit-score-section-label">Vencedor de cada set</p>
              <div className="edit-score-sets">
                {setIndices.map((i) => (
                  <div key={i} className="edit-score-set-row">
                    <span className="edit-score-set-num">Set {i + 1}</span>
                    <div className="edit-score-set-btns">
                      <button
                        className={`edit-score-set-btn ${setWinners[i] === 'p1' ? 'active' : ''}`}
                        onClick={() => handleSetWinner(i, setWinners[i] === 'p1' ? null : 'p1')}
                      >
                        {playerNames.p1}
                      </button>
                      <button
                        className={`edit-score-set-btn ${setWinners[i] === 'p2' ? 'active' : ''}`}
                        onClick={() => handleSetWinner(i, setWinners[i] === 'p2' ? null : 'p2')}
                      >
                        {playerNames.p2}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="edit-score-summary">
                <span>{playerNames.p1}</span>
                <span className="edit-score-summary-score">{p1Sets} — {p2Sets}</span>
                <span>{playerNames.p2}</span>
              </div>
            </div>
          )}

          <div className="edit-score-section">
            <p className="edit-score-section-label">Quem saca agora?</p>
            <div className="edit-score-server-btns">
              <button
                className={`edit-score-server-btn ${server === 'PLAYER_1' ? 'active' : ''}`}
                onClick={() => setServer('PLAYER_1')}
              >
                {playerNames.p1}
              </button>
              <button
                className={`edit-score-server-btn ${server === 'PLAYER_2' ? 'active' : ''}`}
                onClick={() => setServer('PLAYER_2')}
              >
                {playerNames.p2}
              </button>
            </div>
          </div>
        </div>

        <div className="edit-score-footer">
          <button className="edit-score-btn-cancel" onClick={onCancel}>
            Cancelar
          </button>
          <button className="edit-score-btn-confirm" onClick={handleConfirm}>
            Confirmar Placar
          </button>
        </div>
      </div>
    </div>
  );
};
