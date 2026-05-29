import React, { useState, useEffect, useRef, ReactElement } from 'react';
import type { TennisFormat, Player } from '../../core/scoring/types';
import { getServerForNextSet } from '../../core/scoring/setResultValidator';
import './EditScoreModal.css';

export interface SetEditData {
  p1Games: number;
  p2Games: number;
  isPartial: boolean;
  currentGamePoints?: { PLAYER_1: number | string; PLAYER_2: number | string };
}

interface EditScoreModalProps {
  isOpen: boolean;
  matchFormat: TennisFormat;
  playerNames: { p1: string; p2: string };
  currentSets: { PLAYER_1: number; PLAYER_2: number };
  currentServer: Player;
  completedSets?: Array<{ games: Record<Player, number>; winner: Player }>;
  currentGamePoints?: { PLAYER_1: number | string; PLAYER_2: number | string };
  onConfirm: (setResults: SetEditData[], server: Player) => void;
  onCancel: () => void;
}

/** Número de sets necessários para vencer no formato */
function setsToWinForFormat(format: TennisFormat): number {
  switch (format) {
    case 'BEST_OF_5':
      return 3;
    case 'BEST_OF_3':
    case 'BEST_OF_3_MATCH_TB':
    case 'NO_AD':
    case 'NO_LET_TENNIS':
      return 2;
    default:
      return 1;
  }
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
    currentGamePoints,
    onConfirm,
    onCancel,
  } = props;

  const [newSets, setNewSets] = useState<SetEditData[]>([]);
  const [p1Input, setP1Input] = useState('');
  const [p2Input, setP2Input] = useState('');
  const [p1Points, setP1Points] = useState<string>('0');
  const [p2Points, setP2Points] = useState<string>('0');
  const [nextServer, setNextServer] = useState<Player>(currentServer);

  // Rastrear se já foi inicializado nesta abertura para não resetar inputs ao digitar
  const initializedRef = useRef(false);

  const maxSets = totalSetsForFormat(matchFormat);
  const setsToWin = setsToWinForFormat(matchFormat);
  const p1Val = p1Input === '' ? NaN : parseInt(p1Input, 10);
  const p2Val = p2Input === '' ? NaN : parseInt(p2Input, 10);
  const bothFilled = !isNaN(p1Val) && !isNaN(p2Val) && p1Val >= 0 && p2Val >= 0;
  const completed = bothFilled && isSetComplete(p1Val, p2Val);
  const totalEditedSets = completedSets.length + newSets.length;
  // Detectar se a partida já está encerrada pelos sets existentes (imutáveis do engine)
  const p1SetsWonFromProp = completedSets.filter((s) => s.winner === 'PLAYER_1').length;
  const p2SetsWonFromProp = completedSets.filter((s) => s.winner === 'PLAYER_2').length;
  const matchAlreadyOver = p1SetsWonFromProp >= setsToWin || p2SetsWonFromProp >= setsToWin;
  const canAddNextSet = completed && totalEditedSets < maxSets - 1 && !matchAlreadyOver;

  useEffect(() => {
    if (isOpen) {
      // Primeira vez abrindo o modal
      setNewSets([]);
      setNextServer(currentServer);
      initializedRef.current = false; // Reset para próxima abertura
    } else {
      // Modal fechou
      initializedRef.current = false;
    }
  }, [isOpen, currentServer]);

  // Efeito separado para pré-carregar inputs apenas UMA VEZ quando modal abre em modo continue
  useEffect(() => {
    if (isOpen && !initializedRef.current) {
      // Pré-carregar games do set em andamento, independente de haver sets completos.
      // Bug anterior: condição `isContinuing &&` impedia pre-load no primeiro set parcial.
      if (currentSets.PLAYER_1 > 0 || currentSets.PLAYER_2 > 0) {
        setP1Input(currentSets.PLAYER_1.toString());
        setP2Input(currentSets.PLAYER_2.toString());
      } else {
        setP1Input('');
        setP2Input('');
      }
      // Pré-carregar pontos do game se fornecidos
      setP1Points(currentGamePoints?.PLAYER_1 != null ? String(currentGamePoints.PLAYER_1) : '0');
      setP2Points(currentGamePoints?.PLAYER_2 != null ? String(currentGamePoints.PLAYER_2) : '0');
      initializedRef.current = true; // Marcar como inicializado
    }
  }, [isOpen, completedSets.length, currentSets.PLAYER_1, currentSets.PLAYER_2, currentGamePoints]);

  // Limpar refs ao desmontar
  useEffect(() => {
    return () => {
      initializedRef.current = false;
    };
  }, []);

  if (!isOpen) {
    return null;
  }

  const isContinuing = completedSets.length > 0;
  const partial = bothFilled && !completed;
  // canConfirm: permite confirmar quando há novos sets, inputs preenchidos,
  // OU quando há sets existentes já completos (ex: retomada de SINGLE_SET já com set ganho)
  const canConfirm = newSets.length > 0 || bothFilled || completedSets.length > 0;

  const handleAddSet = (): void => {
    if (!completed) return;
    // Use isSetComplete() para determinar corretamente se set é parcial
    const data: SetEditData = {
      p1Games: p1Val,
      p2Games: p2Val,
      isPartial: !isSetComplete(p1Val, p2Val),
    };
    const newList = [...newSets, data];
    setNewSets(newList);
    setP1Input('');
    setP2Input('');
    const winner: Player = p1Val > p2Val ? 'PLAYER_1' : 'PLAYER_2';
    setNextServer(getServerForNextSet(winner, currentServer, totalEditedSets, matchFormat));
  };

  const handleGameInputChange = (value: string, setter: (v: string) => void): void => {
    // Allow empty string
    if (value === '') {
      setter('');
      return;
    }
    // Only allow digits
    if (!/^\d+$/.test(value)) {
      return;
    }
    // Limitar a max 50 (cobre qualquer formato razoável de tênis incluindo long sets)
    const num = parseInt(value, 10);
    if (num > 50) {
      setter('50');
    } else {
      setter(value.replace(/^0+(?=[1-9]|$)/, '')); // Remove leading zeros but keep single 0
    }
  };

  const handlePointsSelectChange = (value: string, setter: (v: string) => void): void => {
    // Select only accepts valid tennis points: 0, 15, 30, 40
    setter(value);
  };

  const handleConfirm = (): void => {
    const finalSets = [...newSets];
    if (bothFilled) {
      const setData: SetEditData = { p1Games: p1Val, p2Games: p2Val, isPartial: !completed };
      if (!completed) {
        // Pontos podem ser numéricos (0/15/30/40/tiebreak) ou string (DEUCE/AD)
        const parsePointVal = (v: string): number | string => {
          if (v === 'DEUCE' || v === 'AD') return v;
          return parseInt(v || '0', 10);
        };
        setData.currentGamePoints = {
          PLAYER_1: parsePointVal(p1Points),
          PLAYER_2: parsePointVal(p2Points),
        };
      }
      finalSets.push(setData);
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

          {/* Se é retomação com set anterior (currentSets > 0) */}
          {isContinuing && (currentSets.PLAYER_1 > 0 || currentSets.PLAYER_2 > 0) && (
            <div
              className="edit-score-section"
              style={{ backgroundColor: 'rgba(34, 197, 94, 0.05)', borderColor: '#22c55e' }}
            >
              <p className="edit-score-section-label">📝 Set Anterior (Abandonado)</p>
              <p style={{ margin: '8px 0', fontSize: '14px', color: '#9ca3af' }}>
                Você estava anotando:{' '}
                <strong>
                  {playerNames.p1}: {currentSets.PLAYER_1}
                </strong>{' '}
                ×{' '}
                <strong>
                  {playerNames.p2}: {currentSets.PLAYER_2}
                </strong>
              </p>
              <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>
                ℹ️ Os campos abaixo já estão preenchidos. Você pode editar se necessário.
              </p>
            </div>
          )}

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
                      className={
                        set.winner === 'PLAYER_1'
                          ? 'edit-score-set-winner p1'
                          : 'edit-score-set-winner p2'
                      }
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
                        className={
                          set.p1Games > set.p2Games
                            ? 'edit-score-set-winner p1'
                            : 'edit-score-set-winner p2'
                        }
                      >
                        {set.p1Games > set.p2Games ? playerNames.p1 : playerNames.p2}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Aviso quando partida já está encerrada pelos sets existentes */}
          {matchAlreadyOver && (
            <div
              className="edit-score-section"
              style={{ backgroundColor: 'rgba(234, 179, 8, 0.08)', borderColor: '#eab308' }}
            >
              <p style={{ margin: 0, fontSize: '13px', color: '#eab308' }}>
                ⚠️ O placar atual já encerra a partida — não é possível adicionar mais sets.
              </p>
            </div>
          )}

          {/* Input do set atual */}
          {totalEditedSets < maxSets && !matchAlreadyOver && (
            <div className="edit-score-section edit-score-section-active">
              <p className="edit-score-section-label">✏️ Set {totalEditedSets + 1}</p>
              <div className="edit-score-dual-input-row">
                <span className="edit-score-player-label">{playerNames.p1}</span>
                <input
                  type="number"
                  className={
                    bothFilled && p1Val > p2Val
                      ? 'edit-score-games-input winner'
                      : 'edit-score-games-input'
                  }
                  value={p1Input}
                  onChange={(e) => handleGameInputChange(e.target.value, setP1Input)}
                  placeholder="0"
                  autoFocus
                  min="0"
                  max="50"
                />
                <span className="edit-score-vs">×</span>
                <input
                  type="number"
                  className={
                    bothFilled && p2Val > p1Val
                      ? 'edit-score-games-input winner'
                      : 'edit-score-games-input'
                  }
                  value={p2Input}
                  onChange={(e) => handleGameInputChange(e.target.value, setP2Input)}
                  placeholder="0"
                  min="0"
                  max="50"
                />
                <span className="edit-score-player-label">{playerNames.p2}</span>
              </div>

              {bothFilled && (
                <p
                  className={
                    completed
                      ? 'edit-score-set-feedback complete'
                      : 'edit-score-set-feedback partial'
                  }
                >
                  {completed ? (
                    canAddNextSet ? (
                      <>
                        <strong>{p1Val > p2Val ? playerNames.p1 : playerNames.p2}</strong> venceu o
                        set — avançando para Set {totalEditedSets + 2}…
                      </>
                    ) : (
                      <>
                        <strong>{p1Val > p2Val ? playerNames.p1 : playerNames.p2}</strong> venceu o
                        set
                      </>
                    )
                  ) : (
                    <>📝 Set em andamento — informe os pontos do game abaixo</>
                  )}
                </p>
              )}

              {/* Pontos do game em andamento — visível apenas quando set é parcial */}
              {partial && (
                <div className="edit-score-points-section">
                  <p className="edit-score-points-label">🎾 Pontos do Game em Andamento</p>
                  {/* Bug 7: Quando tiebreak (6×6), usar inputs numéricos 0-99 */}
                  {bothFilled && p1Val === 6 && p2Val === 6 ? (
                    <div className="edit-score-dual-input-row">
                      <span className="edit-score-player-label">{playerNames.p1}</span>
                      <input
                        type="number"
                        className="edit-score-games-input edit-score-tiebreak-input"
                        value={p1Points}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (!isNaN(v) && v >= 0) setP1Points(String(v));
                          else if (e.target.value === '') setP1Points('0');
                        }}
                        min="0"
                        max="99"
                        placeholder="0"
                      />
                      <span className="edit-score-vs">×</span>
                      <input
                        type="number"
                        className="edit-score-games-input edit-score-tiebreak-input"
                        value={p2Points}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (!isNaN(v) && v >= 0) setP2Points(String(v));
                          else if (e.target.value === '') setP2Points('0');
                        }}
                        min="0"
                        max="99"
                        placeholder="0"
                      />
                      <span className="edit-score-player-label">{playerNames.p2}</span>
                    </div>
                  ) : (
                    <div className="edit-score-dual-input-row">
                      <span className="edit-score-player-label">{playerNames.p1}</span>
                      <select
                        className="edit-score-games-input edit-score-points-select"
                        value={p1Points}
                        onChange={(e) => handlePointsSelectChange(e.target.value, setP1Points)}
                      >
                        <option value="0">0</option>
                        <option value="15">15</option>
                        <option value="30">30</option>
                        <option value="40">40</option>
                        {/* Bug 8: Deuce e AD quando ambos estão em 40 */}
                        {p2Points === '40' && (
                          <>
                            <option value="DEUCE">Deuce</option>
                            <option value="AD">Adv.</option>
                          </>
                        )}
                      </select>
                      <span className="edit-score-vs">×</span>
                      <select
                        className="edit-score-games-input edit-score-points-select"
                        value={p2Points}
                        onChange={(e) => handlePointsSelectChange(e.target.value, setP2Points)}
                      >
                        <option value="0">0</option>
                        <option value="15">15</option>
                        <option value="30">30</option>
                        <option value="40">40</option>
                        {/* Bug 8: Deuce e AD quando ambos estão em 40 */}
                        {p1Points === '40' && (
                          <>
                            <option value="DEUCE">Deuce</option>
                            <option value="AD">Adv.</option>
                          </>
                        )}
                      </select>
                      <span className="edit-score-player-label">{playerNames.p2}</span>
                    </div>
                  )}
                </div>
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
