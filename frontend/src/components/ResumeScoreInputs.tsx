import React from 'react';
import type { TennisConfig } from '../core/scoring/types';

const GAME_POINTS = ['0', '15', '30', '40', 'deuce', 'vantagem'];

interface ResumeScoreInputsProps {
  players: { p1: string; p2: string };
  config: TennisConfig;
  p1G: string;
  p2G: string;
  setP1G: (val: string) => void;
  setP2G: (val: string) => void;
  tbP1: string;
  tbP2: string;
  setTbP1: (val: string) => void;
  setTbP2: (val: string) => void;
  mtbP1: string;
  mtbP2: string;
  setMtbP1: (val: string) => void;
  setMtbP2: (val: string) => void;
  p1Pts: string;
  p2Pts: string;
  setP1Pts: (val: string) => void;
  setP2Pts: (val: string) => void;
  isMatchTiebreakActive: boolean;
  isInTiebreak: boolean;
  isSetTiebreakWin: boolean;
  isSetInProgress: boolean;
  isSetComplete: boolean;
  currentSetNum: number;
  setHint: string | null;
}

export const ResumeScoreInputs: React.FC<ResumeScoreInputsProps> = ({
  players,
  config,
  p1G,
  p2G,
  setP1G,
  setP2G,
  tbP1,
  tbP2,
  setTbP1,
  setTbP2,
  mtbP1,
  mtbP2,
  setMtbP1,
  setMtbP2,
  p1Pts,
  p2Pts,
  setP1Pts,
  setP2Pts,
  isMatchTiebreakActive,
  isInTiebreak,
  isSetTiebreakWin,
  isSetInProgress,
  currentSetNum,
  setHint,
}) => {
  return (
    <>
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
              onChange={(e) => setP1G(e.target.value)}
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
              onChange={(e) => setP2G(e.target.value)}
              placeholder="0"
              aria-label={`Games de ${players.p2} no set ${currentSetNum}`}
              className="resume-games-input"
            />
            <span className="resume-player-name">{players.p2}</span>
          </div>
        </div>
      )}

      {/* Tiebreak in progress */}
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

      {/* Tiebreak score completed */}
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

      {/* Match tiebreak */}
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

      {/* Game points (optional) */}
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
    </>
  );
};
