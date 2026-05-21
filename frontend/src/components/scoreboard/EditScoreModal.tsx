import React, { useState, useEffect, ReactElement } from 'react';
import type { TennisFormat, Player } from '../../core/scoring/types';
import { getServerForNextSet } from '../../core/scoring/setResultValidator';
import './EditScoreModal.css';

export interface SetEditData {
  p1Games: number;
  p2Games: number;
  isPartial: boolean;
}

interface EditScoreModalProps {
  isOpen: boolean;
  matchFormat: TennisFormat;
  playerNames: { p1: string; p2: string };
  currentSets: { PLAYER_1: number; PLAYER_2: number };
  currentServer: Player;
  completedSets?: Array<{ games: Record<Player, number>; winner: Player }>;
  onConfirm: (setResults: SetEditData[], server: Player) => void;
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
    case 'MATCH_TIEBREAK':
      return 2; // 1 set regular + 1 match tiebreak decisivo
    default:
      return 1;
  }
}

/** Determina se um placar de set representa um set finalizado */
function isSetComplete(p1: number, p2: number): boolean {
  if (p1 === 0 && p2 === 0) return false;
  // Normal: um lado >= 6 e diferença >= 2
  if ((p1 >= 6 || p2 >= 6) && Math.abs(p1 - p2) >= 2) return true;
  // Tiebreak: 7-6
  if ((p1 === 7 && p2 === 6) || (p1 === 6 && p2 === 7)) return true;
  return false;
}

export function EditScoreModal(props: EditScoreModalProps): ReactElement | null {
  const {
    isOpen,
    matchFormat,
    playerNames,
    currentSets,
    currentServer,
    completedSets = [],
    onConfirm,
    onCancel,
  } = props;

  const [newSets, setNewSets] = useState<SetEditData[]>([]);
  const [p1Input, setP1Input] = useState('');
  const [p2Input, setP2Input] = useState('');
  const [nextServer, setNextServer] = useState<Player>(currentServer);

  useEffect(() => {
    if (isOpen) {
      setNewSets([]);
      setP1Input('');
      setP2Input('');
      setNextServer(currentServer);
    }
  }, [isOpen, currentServer]);

  if (!isOpen) {
    return null;
  }

  const maxSets = totalSetsForFormat(matchFormat);
  const isContinuing = completedSets.length > 0;

  const p1Val = p1Input === '' ? NaN : parseInt(p1Input, 10);
  const p2Val = p2Input === '' ? NaN : parseInt(p2Input, 10);
  const bothFilled = !isNaN(p1Val) && !isNaN(p2Val) && p1Val >= 0 && p2Val >= 0;
  const completed = bothFilled && isSetComplete(p1Val, p2Val);
  const partial = bothFilled && !completed;

  const totalEditedSets = completedSets.length + newSets.length;
  const canAddNextSet = completed && totalEditedSets < maxSets - 1;
  const canConfirm = newSets.length > 0 || bothFilled;

  const handleAddSet = (): void => {
    if (!completed) return;
    const data: SetEditData = { p1Games: p1Val, p2Games: p2Val, isPartial: false };
    const newList = [...newSets, data];
    setNewSets(newList);
    setP1Input('');
    setP2Input('');
    const winner: Player = p1Val > p2Val ? 'PLAYER_1' : 'PLAYER_2';
    setNextServer(getServerForNextSet(winner, currentServer, totalEditedSets, matchFormat));
  };

  const handleConfirm = (): void => {
    const finalSets = [...newSets];
    if (bothFilled) {
      finalSets.push({ p1Games: p1Val, p2Games: p2Val, isPartial: !completed });
    }
    onConfirm(finalSets, nextServer);
  };

  const p1SetsWon =
    completedSets.filter((s) => s.winner === 'PLAYER_1').length +
    newSets.filter((s) => s.p1Games > s.p2Games).length;
  const p2SetsWon =
    completedSets.filter((s) => s.winner === 'PLAYER_2').length +
    newSets.filter((s) => s.p2Games > s.p1Games).length;

  return (
    <div className="edit-score-overlay" onClick={onCancel}>
      <div className="edit-score-modal" onClick={(e) => e.stopPropagation()}>
        <div className="edit-score-header">
          <span className="edit-score-icon">{isContinuing ? '▶️' : '✏️'}</span>
          <h2 className="edit-score-title">
            {isContinuing ? 'Continuar Placar' : 'Ajustar Placar'}
          </h2>
          <button className="edit-score-close" onClick={onCancel}>
            ✕
          </button>
        </div>

        <div className="edit-score-body">
          <p className="edit-score-info">
            ✅ Informe o placar atual de cada set para retomar a anotação de onde parou.
          </p>

          {/* Sets já finalizados (do banco/engine — imutáveis) */}
          {completedSets.length > 0 && (
            <div className="edit-score-section">
              <p className="edit-score-section-label">📊 Sets Finalizados</p>
              <div className="edit-score-completed-sets">
                {completedSets.map((set, idx) => (
                  <div key={idx} className="edit-score-completed-set-row">
                    <span className="edit-score-set-num">Set {idx + 1}</span>
                    <span className="edit-score-set-result">
                      {set.games.PLAYER_1}x{set.games.PLAYER_2}
                    </span>
                    <span
                      className={set.winner === 'PLAYER_1' ? 'edit-score-set-winner p1' : 'edit-score-set-winner p2'}
                    >
                      {set.winner === 'PLAYER_1' ? playerNames.p1 : playerNames.p2}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sets adicionados nesta sessão de edição */}
          {newSets.length > 0 && (
            <div className="edit-score-section">
              <p className="edit-score-section-label">✅ Sets Adicionados</p>
              <div className="edit-score-completed-sets">
                {newSets.map((set, idx) => {
                  const setIdx = completedSets.length + idx;
                  return (
                    <div key={idx} className="edit-score-completed-set-row">
                      <span className="edit-score-set-num">Set {setIdx + 1}</span>
                      <span className="edit-score-set-result">
                        {set.p1Games}x{set.p2Games}
                      </span>
                      <span
                        className={set.p1Games > set.p2Games ? 'edit-score-set-winner p1' : 'edit-score-set-winner p2'}
                      >
                        {set.p1Games > set.p2Games ? playerNames.p1 : playerNames.p2}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Input do set atual */}
          {totalEditedSets < maxSets && (
            <div className="edit-score-section edit-score-section-active">
              <p className="edit-score-section-label">✏️ Set {totalEditedSets + 1}</p>
              <div className="edit-score-dual-input-row">
                <span className="edit-score-player-label">{playerNames.p1}</span>
                <input
                  type="number"
                  min="0"
                  max="13"
                  className={bothFilled && p1Val > p2Val ? 'edit-score-games-input winner' : 'edit-score-games-input'}
                  value={p1Input}
                  onChange={(e) => setP1Input(e.target.value)}
                  placeholder="0"
                  autoFocus
                />
                <span className="edit-score-vs">×</span>
                <input
                  type="number"
                  min="0"
                  max="13"
                  className={bothFilled && p2Val > p1Val ? 'edit-score-games-input winner' : 'edit-score-games-input'}
                  value={p2Input}
                  onChange={(e) => setP2Input(e.target.value)}
                  placeholder="0"
                />
                <span className="edit-score-player-label">{playerNames.p2}</span>
              </div>

              {bothFilled && (
                <p className={completed ? 'edit-score-set-feedback complete' : 'edit-score-set-feedback partial'}>
                  {completed ? (
                    <>
                      <strong>{p1Val > p2Val ? playerNames.p1 : playerNames.p2}</strong> venceu o
                      set
                    </>
                  ) : (
                    <>📝 Set em andamento — você continuará a anotar daqui</>
                  )}
                </p>
              )}

              {canAddNextSet && (
                <button className="edit-score-btn-next-set active" onClick={handleAddSet}>
                  ➜ Próximo Set
                </button>
              )}
            </div>
          )}

          {/* Resumo de sets */}
          {(p1SetsWon > 0 || p2SetsWon > 0) && (
            <div className="edit-score-summary">
              <span>{playerNames.p1}</span>
              <span className="edit-score-summary-score">
                {p1SetsWon} — {p2SetsWon}
              </span>
              <span>{playerNames.p2}</span>
            </div>
          )}
        </div>

        <div className="edit-score-footer">
          <button className="edit-score-btn-cancel" onClick={onCancel}>
            Cancelar
          </button>
          <button className="edit-score-btn-confirm" onClick={handleConfirm} disabled={!canConfirm}>
            Confirmar Placar
          </button>
        </div>
      </div>
    </div>
  );
}
