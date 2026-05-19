import React, { useState, useEffect } from 'react';
import type { TennisFormat, Player } from '../../core/scoring/types';
import {
  validateSetResult,
  validatePartialSetResult,
  parseSetResultString,
  getServerForNextSet,
  type SetResult,
  type SetValidation,
  type PartialSetValidation,
} from '../../core/scoring/setResultValidator';
import './EditScoreModal.css';

interface EditScoreModalProps {
  isOpen: boolean;
  matchFormat: TennisFormat;
  playerNames: { p1: string; p2: string };
  currentSets: { PLAYER_1: number; PLAYER_2: number };
  currentServer: Player;
  completedSets?: Array<{ games: Record<Player, number>; winner: Player }>;
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
  completedSets = [],
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const maxSets = totalSetsForFormat(matchFormat);
  const isContinuing = completedSets.length > 0;

  // Build completed set winners array
  const buildCompletedSetWinners = (): Array<'p1' | 'p2'> => {
    const winners: Array<'p1' | 'p2'> = [];
    completedSets.forEach((set) => {
      if (set.games.PLAYER_1 > set.games.PLAYER_2) {
        winners.push('p1');
      } else {
        winners.push('p2');
      }
    });
    return winners;
  };

  const [resultInput, setResultInput] = useState('');
  const [validation, setValidation] = useState<PartialSetValidation | null>(null);
  const [completedSetWinners, setCompletedSetWinners] = useState<Array<'p1' | 'p2'>>(
    buildCompletedSetWinners(),
  );
  const [nextServer, setNextServer] = useState<Player>(currentServer);
  const [editingSetIndex, setEditingSetIndex] = useState(completedSetWinners.length);
  const [currentPartialGames, setCurrentPartialGames] = useState<{ p1: number; p2: number } | null>(
    null,
  );

  // Reset quando modal abre
  useEffect(() => {
    if (isOpen) {
      setResultInput('');
      setValidation(null);
      setCompletedSetWinners(buildCompletedSetWinners());
      setEditingSetIndex(buildCompletedSetWinners().length);
      setNextServer(currentServer);
      setCurrentPartialGames(null);
    }
  }, [isOpen]);

  // Validar input em tempo real (aceita completo ou parcial)
  const handleResultChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const input = e.target.value;
    setResultInput(input);

    if (input.trim() === '') {
      setValidation(null);
      setCurrentPartialGames(null);
      return;
    }

    const parsed = parseSetResultString(input);
    if (!parsed) {
      setValidation({
        isValid: false,
        error: 'Digite no formato: 6x4, 7-6, etc',
        p1Games: 0,
        p2Games: 0,
        isCompleted: false,
      });
      setCurrentPartialGames(null);
      return;
    }

    const result = validatePartialSetResult(parsed, matchFormat);
    setValidation(result);
    setCurrentPartialGames({ p1: result.p1Games, p2: result.p2Games });

    // Se resultado é válido e tem vencedor, determinar próximo servidor
    if (result.isValid && result.winner) {
      const player = result.winner === 'PLAYER_1' ? 'PLAYER_1' : 'PLAYER_2';
      const nextSrv = getServerForNextSet(
        player,
        currentServer,
        completedSetWinners.length,
        matchFormat,
      );
      setNextServer(nextSrv);
    }
  };

  // Confirmar resultado do set e ir para próximo
  const handleConfirmSetResult = async (): Promise<void> => {
    if (!validation?.isValid) return;

    let newWinners: Array<'p1' | 'p2'>;

    // Se tem vencedor (set completo), adiciona à lista de vencedores
    if (validation.winner) {
      const winner = validation.winner === 'PLAYER_1' ? 'p1' : 'p2';
      newWinners = [...completedSetWinners, winner];
      setCompletedSetWinners(newWinners);
    } else {
      // Se é parcial, apenas avança para próximo set (sem vencedor)
      newWinners = [...completedSetWinners, 'p1']; // placeholder
      setCompletedSetWinners(newWinners);
    }

    // Reset para próximo set
    setResultInput('');
    setValidation(null);
    setCurrentPartialGames(null);
    setEditingSetIndex((prev) => prev + 1);
  };

  // Confirmar todos os sets e fechar modal
  const handleConfirmAllSets = (): void => {
    onConfirm(completedSetWinners, nextServer);
  };

  const canConfirmSetResult = validation?.isValid || false;
  const canConfirmMatch = completedSetWinners.length > 0;

  const isFirstSetOnly = maxSets === 1;

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
            ✅ Você pode retomar a anotação de onde parou. Digite o resultado de cada set e continue
            anotando.
          </p>

          {/* Seção: Sets já finalizados */}
          {completedSetWinners.length > 0 && (
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
                      className={`edit-score-set-winner ${set.winner === 'PLAYER_1' ? 'p1' : 'p2'}`}
                    >
                      {set.winner === 'PLAYER_1' ? playerNames.p1 : playerNames.p2}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seção: Set em edição */}
          {!isFirstSetOnly && editingSetIndex < maxSets && (
            <div className="edit-score-section edit-score-section-active">
              <p className="edit-score-section-label">✏️ Placar do Set {editingSetIndex + 1}</p>
              <div className="edit-score-input-group">
                <label className="edit-score-input-label">Digite o resultado (ex: 6x4, 7-6):</label>
                <input
                  type="text"
                  className={`edit-score-input ${
                    validation?.isValid ? 'valid' : validation?.error ? 'invalid' : ''
                  }`}
                  value={resultInput}
                  onChange={handleResultChange}
                  placeholder="6x4"
                  autoFocus
                />
                {validation?.error && <p className="edit-score-error">{validation.error}</p>}
                {validation?.isValid && (
                  <div className="edit-score-success">
                    {validation.isCompleted && validation.winner ? (
                      <>
                        <p className="edit-score-success-winner">
                          {validation.winner === 'PLAYER_1' ? playerNames.p1 : playerNames.p2}{' '}
                          venceu o set
                        </p>
                        {editingSetIndex < maxSets - 1 && (
                          <p className="edit-score-success-server">
                            Próximo saque:{' '}
                            <strong>
                              {nextServer === 'PLAYER_1' ? playerNames.p1 : playerNames.p2}
                            </strong>
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="edit-score-success-partial">
                          📝 Set em andamento: {validation.p1Games}x{validation.p2Games}
                        </p>
                        <p className="edit-score-success-info">
                          Você pode continuar anotando daqui em diante
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {editingSetIndex < maxSets - 1 && (
                <button
                  className={`edit-score-btn-next-set ${canConfirmSetResult ? 'active' : ''}`}
                  onClick={handleConfirmSetResult}
                  disabled={!canConfirmSetResult}
                >
                  {validation?.isCompleted ? '➜ Próximo Set' : '✓ Continuar Anotando'}
                </button>
              )}
            </div>
          )}

          {/* Se completou todos os sets necessários */}
          {editingSetIndex >= maxSets && (
            <div className="edit-score-section edit-score-section-complete">
              <p className="edit-score-section-label">✅ Placar Completo</p>
              <div className="edit-score-summary">
                <span>{playerNames.p1}</span>
                <span className="edit-score-summary-score">
                  {completedSetWinners.filter((w) => w === 'p1').length} —{' '}
                  {completedSetWinners.filter((w) => w === 'p2').length}
                </span>
                <span>{playerNames.p2}</span>
              </div>
            </div>
          )}
        </div>

        <div className="edit-score-footer">
          <button className="edit-score-btn-cancel" onClick={onCancel}>
            Cancelar
          </button>
          <button
            className="edit-score-btn-confirm"
            onClick={handleConfirmAllSets}
            disabled={!canConfirmMatch}
          >
            Confirmar Placar
          </button>
        </div>
      </div>
    </div>
  );
};
