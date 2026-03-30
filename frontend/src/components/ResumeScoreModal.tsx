import React, { useState, useCallback, useMemo } from 'react';
import { TennisConfigFactory } from '../core/scoring/TennisConfigFactory';
import type { TennisFormat, TennisConfig } from '../core/scoring/types';
import ConfirmCloseDialog from './ConfirmCloseDialog';
import './ResumeScoreModal.css';

type Player = 'PLAYER_1' | 'PLAYER_2';

interface SetEntry {
  setNumber: number;
  games: { PLAYER_1: number; PLAYER_2: number };
  winner: Player;
  tiebreakScore?: { PLAYER_1: number; PLAYER_2: number };
}

export interface OngoingMatchSetup {
  completedSets: SetEntry[];
  currentSetGames: { PLAYER_1: number; PLAYER_2: number };
  currentGamePoints: { PLAYER_1: string | number; PLAYER_2: string | number };
  currentGameIsTiebreak: boolean;
  currentGameIsMatchTiebreak: boolean;
  server: Player;
}

interface ResumeScoreModalProps {
  isOpen: boolean;
  players: { p1: string; p2: string };
  format: string;
  onConfirm: (setup: OngoingMatchSetup) => void;
  onCancel: () => void;
}

type SetValidationResult =
  | { complete: false; inTiebreak: boolean }
  | { complete: true; winner: Player; isTiebreak: boolean };

function validateSetScore(p1: number, p2: number, config: TennisConfig): SetValidationResult {
  // MATCH_TIEBREAK has no games (gamesPerSet=0)
  if (config.gamesPerSet === 0) return { complete: false, inTiebreak: false };
  if (!Number.isInteger(p1) || !Number.isInteger(p2) || p1 < 0 || p2 < 0) {
    return { complete: false, inTiebreak: false };
  }

  const max = Math.max(p1, p2);
  const min = Math.min(p1, p2);
  const winner: Player = p1 >= p2 ? 'PLAYER_1' : 'PLAYER_2';
  const g = config.gamesPerSet;
  const tb = config.tiebreakAt ?? 0;

  // Standard win: first to gamesPerSet with 2+ margin
  if (max >= g && max - min >= 2) {
    return { complete: true, winner, isTiebreak: false };
  }

  // Tiebreak win: tiebreakAt+1 vs tiebreakAt  (e.g., 7-6, 4-3 for FAST4, 5-4 for SHORT_SET)
  if (config.useTiebreak && tb > 0 && max === tb + 1 && min === tb) {
    return { complete: true, winner, isTiebreak: true };
  }

  // Currently in tiebreak (both at tiebreakAt)
  const inTiebreak = !!(config.useTiebreak && tb > 0 && p1 === tb && p2 === tb);
  return { complete: false, inTiebreak };
}

const GAME_POINTS = ['0', '15', '30', '40', 'AD'];

function formatHint(config: TennisConfig): string {
  if (config.gamesPerSet === 0) return '';
  return `Primeiro a ${config.gamesPerSet} games (tie-break em ${config.tiebreakAt}-${config.tiebreakAt})`;
}

export const ResumeScoreModal: React.FC<ResumeScoreModalProps> = ({
  isOpen,
  players,
  format,
  onConfirm,
  onCancel,
}) => {
  const [completedSets, setCompletedSets] = useState<SetEntry[]>([]);
  const [p1G, setP1G] = useState('');
  const [p2G, setP2G] = useState('');
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [tbP1, setTbP1] = useState('');
  const [tbP2, setTbP2] = useState('');
  const [mtbP1, setMtbP1] = useState('');
  const [mtbP2, setMtbP2] = useState('');
  const [p1Pts, setP1Pts] = useState('0');
  const [p2Pts, setP2Pts] = useState('0');
  const [server, setServer] = useState<Player>('PLAYER_1');
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const config = useMemo(() => {
    try {
      return TennisConfigFactory.getConfig(format as TennisFormat);
    } catch {
      return TennisConfigFactory.getConfig('BEST_OF_3');
    }
  }, [format]);

  const p1Sets = completedSets.filter((s) => s.winner === 'PLAYER_1').length;
  const p2Sets = completedSets.filter((s) => s.winner === 'PLAYER_2').length;
  const currentSetNum = completedSets.length + 1;
  const matchIsOver = p1Sets >= config.setsToWin || p2Sets >= config.setsToWin;

  const isMatchTiebrFormat = format === 'MATCH_TIEBREAK';
  const isSet3MatchTiebr =
    format === 'BEST_OF_3_MATCH_TB' && currentSetNum === 3 && p1Sets === 1 && p2Sets === 1;
  const isMatchTiebreakActive = isMatchTiebrFormat || isSet3MatchTiebr;

  const p1GNum = parseInt(p1G, 10);
  const p2GNum = parseInt(p2G, 10);
  const hasValidGames = !isNaN(p1GNum) && !isNaN(p2GNum) && p1GNum >= 0 && p2GNum >= 0;

  const setResult = useMemo<SetValidationResult | null>(
    () =>
      !isMatchTiebreakActive && hasValidGames ? validateSetScore(p1GNum, p2GNum, config) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isMatchTiebreakActive, hasValidGames, p1GNum, p2GNum, config.format],
  );

  const resetSetInputs = useCallback(() => {
    setP1G('');
    setP2G('');
    setTbP1('');
    setTbP2('');
    setConfirmError(null);
  }, []);

  const handleConfirmSet = useCallback(() => {
    setConfirmError(null);

    if (!setResult?.complete) {
      setConfirmError('O placar inserido não representa um set completo.');
      return;
    }

    const { winner, isTiebreak } = setResult;
    const newP1Sets = p1Sets + (winner === 'PLAYER_1' ? 1 : 0);
    const newP2Sets = p2Sets + (winner === 'PLAYER_2' ? 1 : 0);

    if (newP1Sets >= config.setsToWin || newP2Sets >= config.setsToWin) {
      setConfirmError(
        'Este placar finalizaria a partida — registre apenas sets de uma partida em andamento.',
      );
      return;
    }

    let tiebreakScoreEntry: { PLAYER_1: number; PLAYER_2: number } | undefined;
    if (isTiebreak) {
      const tbP1Num = parseInt(tbP1, 10);
      const tbP2Num = parseInt(tbP2, 10);
      if (!isNaN(tbP1Num) && !isNaN(tbP2Num) && tbP1Num >= 0 && tbP2Num >= 0) {
        tiebreakScoreEntry = { PLAYER_1: tbP1Num, PLAYER_2: tbP2Num };
      }
    }

    const entry: SetEntry = {
      setNumber: currentSetNum,
      games: { PLAYER_1: p1GNum, PLAYER_2: p2GNum },
      winner,
      ...(tiebreakScoreEntry ? { tiebreakScore: tiebreakScoreEntry } : {}),
    };

    setCompletedSets((prev) => [...prev, entry]);
    resetSetInputs();
    setP1Pts('0');
    setP2Pts('0');
  }, [
    setResult,
    p1Sets,
    p2Sets,
    config.setsToWin,
    currentSetNum,
    p1GNum,
    p2GNum,
    tbP1,
    tbP2,
    resetSetInputs,
  ]);

  const handleRemoveLastSet = useCallback(() => {
    setCompletedSets((prev) => prev.slice(0, -1));
    setConfirmError(null);
  }, []);

  const handleStart = useCallback(() => {
    setConfirmError(null);

    let currentSetGames: { PLAYER_1: number; PLAYER_2: number };
    let currentGamePoints: { PLAYER_1: string | number; PLAYER_2: string | number };
    let currentGameIsTiebreak: boolean;
    let currentGameIsMatchTiebreak: boolean;

    if (isMatchTiebreakActive) {
      currentSetGames = { PLAYER_1: 0, PLAYER_2: 0 };
      const m1 = parseInt(mtbP1, 10);
      const m2 = parseInt(mtbP2, 10);
      currentGamePoints = {
        PLAYER_1: !isNaN(m1) && m1 >= 0 ? m1 : 0,
        PLAYER_2: !isNaN(m2) && m2 >= 0 ? m2 : 0,
      };
      currentGameIsTiebreak = true;
      currentGameIsMatchTiebreak = true;
    } else {
      currentSetGames = {
        PLAYER_1: hasValidGames ? p1GNum : 0,
        PLAYER_2: hasValidGames ? p2GNum : 0,
      };

      if (setResult && !setResult.complete && setResult.inTiebreak) {
        // Set is at tiebreakAt-tiebreakAt, tiebreak in progress
        const tb1 = parseInt(tbP1, 10);
        const tb2 = parseInt(tbP2, 10);
        currentGamePoints = {
          PLAYER_1: !isNaN(tb1) && tb1 >= 0 ? tb1 : 0,
          PLAYER_2: !isNaN(tb2) && tb2 >= 0 ? tb2 : 0,
        };
        currentGameIsTiebreak = true;
        currentGameIsMatchTiebreak = false;
      } else {
        currentGamePoints = { PLAYER_1: p1Pts || '0', PLAYER_2: p2Pts || '0' };
        currentGameIsTiebreak = false;
        currentGameIsMatchTiebreak = false;
      }
    }

    onConfirm({
      completedSets,
      currentSetGames,
      currentGamePoints,
      currentGameIsTiebreak,
      currentGameIsMatchTiebreak,
      server,
    });
  }, [
    isMatchTiebreakActive,
    mtbP1,
    mtbP2,
    hasValidGames,
    p1GNum,
    p2GNum,
    setResult,
    tbP1,
    tbP2,
    p1Pts,
    p2Pts,
    completedSets,
    server,
    onConfirm,
  ]);

  if (!isOpen) return null;

  const formatLabel = TennisConfigFactory.getFormatDisplayName(format as TennisFormat);
  const setHint = formatHint(config);

  const isSetComplete = setResult?.complete === true;
  const isSetTiebreakWin =
    isSetComplete &&
    (setResult as { complete: true; winner: Player; isTiebreak: boolean }).isTiebreak;
  const isSetInProgress = setResult && !setResult.complete && !setResult.inTiebreak;
  const isInTiebreak = setResult && !setResult.complete && setResult.inTiebreak;

  return (
    <div
      className="resume-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Configurar placar de partida em andamento"
      style={{ position: 'relative' }}
    >
      <ConfirmCloseDialog
        isOpen={isCancelConfirmOpen}
        onConfirm={() => {
          setIsCancelConfirmOpen(false);
          onCancel();
        }}
        onCancel={() => setIsCancelConfirmOpen(false)}
      />
      <div className="resume-modal">
        {/* Header */}
        <div className="resume-modal-header">
          <h3>Partida em Andamento</h3>
          <p className="resume-modal-format">{formatLabel}</p>
        </div>

        {/* Completed sets list */}
        {completedSets.length > 0 && (
          <div className="resume-sets-list">
            <div className="resume-sets-list-header">
              <h4>Sets Concluídos</h4>
              <button
                type="button"
                className="resume-remove-set-btn"
                onClick={handleRemoveLastSet}
                aria-label="Remover último set confirmado"
              >
                ← Remover último
              </button>
            </div>
            {completedSets.map((s) => (
              <div key={s.setNumber} className="resume-set-badge">
                <span className="resume-set-label">Set {s.setNumber}</span>
                <span className="resume-set-score">
                  {s.games.PLAYER_1} × {s.games.PLAYER_2}
                </span>
                <span className={`resume-set-winner ${s.winner === 'PLAYER_1' ? 'p1' : 'p2'}`}>
                  {s.winner === 'PLAYER_1' ? players.p1 : players.p2}
                </span>
                {s.tiebreakScore && (
                  <span className="resume-set-tb">
                    TB {s.tiebreakScore.PLAYER_1}/{s.tiebreakScore.PLAYER_2}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Match over warning */}
        {matchIsOver && (
          <div className="resume-match-over-warning" role="alert">
            O placar inserido indica que a partida já foi encerrada. Remova sets para registrar uma
            partida em andamento.
          </div>
        )}

        {!matchIsOver && (
          <>
            {/* Current set input */}
            <div className="resume-current-set">
              <div className="resume-set-title-row">
                <h4 className="resume-set-title">
                  {isMatchTiebreakActive ? 'Match Tie-break' : `Set ${currentSetNum}`}
                </h4>
                {setHint && !isMatchTiebreakActive && (
                  <span className="resume-set-hint">{setHint}</span>
                )}
              </div>

              {/* Games score row */}
              {!isMatchTiebreakActive && (
                <div className="resume-score-row">
                  <div className="resume-player-score">
                    <span className="resume-player-name">{players.p1}</span>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={p1G}
                      onChange={(e) => {
                        setP1G(e.target.value);
                        setConfirmError(null);
                      }}
                      placeholder="0"
                      aria-label={`Games de ${players.p1} no set ${currentSetNum}`}
                      className="resume-games-input"
                    />
                  </div>

                  <span className="resume-score-sep">×</span>

                  <div className="resume-player-score reverse">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={p2G}
                      onChange={(e) => {
                        setP2G(e.target.value);
                        setConfirmError(null);
                      }}
                      placeholder="0"
                      aria-label={`Games de ${players.p2} no set ${currentSetNum}`}
                      className="resume-games-input"
                    />
                    <span className="resume-player-name">{players.p2}</span>
                  </div>
                </div>
              )}

              {/* Tiebreak in progress (both at tiebreakAt, e.g., 6-6) */}
              {isInTiebreak && (
                <div className="resume-tiebreak-section">
                  <h5>
                    Tie-break em andamento{' '}
                    <span className="resume-optional">(primeiro a {config.tiebreakPoints})</span>
                  </h5>
                  <div className="resume-score-row">
                    <div className="resume-player-score">
                      <span className="resume-player-name">{players.p1}</span>
                      <input
                        type="number"
                        min="0"
                        value={tbP1}
                        onChange={(e) => setTbP1(e.target.value)}
                        placeholder="0"
                        aria-label={`Pontos tie-break ${players.p1}`}
                        className="resume-tb-input"
                      />
                    </div>
                    <span className="resume-score-sep">×</span>
                    <div className="resume-player-score reverse">
                      <input
                        type="number"
                        min="0"
                        value={tbP2}
                        onChange={(e) => setTbP2(e.target.value)}
                        placeholder="0"
                        aria-label={`Pontos tie-break ${players.p2}`}
                        className="resume-tb-input"
                      />
                      <span className="resume-player-name">{players.p2}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tiebreak score when confirming a completed tiebreak set (e.g., 7-6) */}
              {isSetTiebreakWin && (
                <div className="resume-tiebreak-section">
                  <h5>
                    Placar do tie-break <span className="resume-optional">(opcional)</span>
                  </h5>
                  <div className="resume-score-row">
                    <div className="resume-player-score">
                      <span className="resume-player-name">{players.p1}</span>
                      <input
                        type="number"
                        min="0"
                        value={tbP1}
                        onChange={(e) => setTbP1(e.target.value)}
                        placeholder="7"
                        aria-label={`Pontos tie-break ${players.p1}`}
                        className="resume-tb-input"
                      />
                    </div>
                    <span className="resume-score-sep">×</span>
                    <div className="resume-player-score reverse">
                      <input
                        type="number"
                        min="0"
                        value={tbP2}
                        onChange={(e) => setTbP2(e.target.value)}
                        placeholder=""
                        aria-label={`Pontos tie-break ${players.p2}`}
                        className="resume-tb-input"
                      />
                      <span className="resume-player-name">{players.p2}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Match tiebreak score */}
              {isMatchTiebreakActive && (
                <div className="resume-match-tiebreak-section">
                  <p className="resume-mtb-hint">
                    Primeiro a {config.tiebreakPoints} pontos com 2+ de vantagem
                  </p>
                  <div className="resume-score-row">
                    <div className="resume-player-score">
                      <span className="resume-player-name">{players.p1}</span>
                      <input
                        type="number"
                        min="0"
                        value={mtbP1}
                        onChange={(e) => setMtbP1(e.target.value)}
                        placeholder="0"
                        aria-label={`Match tie-break pontos ${players.p1}`}
                        className="resume-tb-input large"
                      />
                    </div>
                    <span className="resume-score-sep">×</span>
                    <div className="resume-player-score reverse">
                      <input
                        type="number"
                        min="0"
                        value={mtbP2}
                        onChange={(e) => setMtbP2(e.target.value)}
                        placeholder="0"
                        aria-label={`Match tie-break pontos ${players.p2}`}
                        className="resume-tb-input large"
                      />
                      <span className="resume-player-name">{players.p2}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Set complete notice + confirm button */}
              {isSetComplete && (
                <div className="resume-set-complete">
                  <span className="resume-set-complete-text">
                    Set completo —{' '}
                    {(setResult as { complete: true; winner: Player }).winner === 'PLAYER_1'
                      ? players.p1
                      : players.p2}{' '}
                    vence {p1G}×{p2G}
                    {isSetTiebreakWin ? ' (tie-break)' : ''}
                  </span>
                  <button
                    type="button"
                    className="resume-confirm-set-btn"
                    onClick={handleConfirmSet}
                  >
                    Confirmar Set {currentSetNum}
                  </button>
                </div>
              )}

              {/* Game score (optional – when set is in progress, not in tiebreak) */}
              {isSetInProgress && !isMatchTiebreakActive && (
                <div className="resume-game-score">
                  <h5>
                    Pontuação do game atual <span className="resume-optional">(opcional)</span>
                  </h5>
                  <div className="resume-score-row">
                    <div className="resume-player-score">
                      <span className="resume-player-name">{players.p1}</span>
                      <select
                        value={p1Pts}
                        onChange={(e) => setP1Pts(e.target.value)}
                        aria-label={`Pontos no game ${players.p1}`}
                        className="resume-pts-select"
                      >
                        {GAME_POINTS.map((pt) => (
                          <option key={pt} value={pt}>
                            {pt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <span className="resume-score-sep">×</span>
                    <div className="resume-player-score reverse">
                      <select
                        value={p2Pts}
                        onChange={(e) => setP2Pts(e.target.value)}
                        aria-label={`Pontos no game ${players.p2}`}
                        className="resume-pts-select"
                      >
                        {GAME_POINTS.map((pt) => (
                          <option key={pt} value={pt}>
                            {pt}
                          </option>
                        ))}
                      </select>
                      <span className="resume-player-name">{players.p2}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Server selection */}
            <div className="resume-server-section">
              <h4>Quem está sacando?</h4>
              <div className="resume-server-btns">
                <button
                  type="button"
                  className={`resume-server-btn${server === 'PLAYER_1' ? 'active' : ''}`}
                  onClick={() => setServer('PLAYER_1')}
                  aria-pressed={server === 'PLAYER_1'}
                >
                  {players.p1}
                </button>
                <button
                  type="button"
                  className={`resume-server-btn${server === 'PLAYER_2' ? 'active' : ''}`}
                  onClick={() => setServer('PLAYER_2')}
                  aria-pressed={server === 'PLAYER_2'}
                >
                  {players.p2}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Error */}
        {confirmError && (
          <div className="resume-error" role="alert">
            {confirmError}
          </div>
        )}

        {/* Actions */}
        <div className="resume-modal-actions">
          <button
            type="button"
            className="resume-cancel-btn"
            onClick={() => {
              const isDirty = completedSets.length > 0 || p1G !== '' || p2G !== '';
              if (isDirty) setIsCancelConfirmOpen(true);
              else onCancel();
            }}
          >
            Cancelar
          </button>
          {!matchIsOver && (
            <button type="button" className="resume-start-btn" onClick={handleStart}>
              Iniciar Partida
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
