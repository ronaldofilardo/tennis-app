import React from "react";
import "./VSIndicator.css";

interface VSIndicatorProps {
  isTiebreak: boolean;
  isMatchTiebreak: boolean;
  isDeuce: boolean;
  tiebreakChangeAt?: number; // total points at which side change happens
  tiebreakTotalPoints?: number;
}

const VSIndicator: React.FC<VSIndicatorProps> = ({
  isTiebreak,
  isMatchTiebreak,
  isDeuce,
  tiebreakChangeAt,
  tiebreakTotalPoints = 0,
}) => {
  const showSideChangeHint =
    isTiebreak &&
    typeof tiebreakChangeAt === "number" &&
    tiebreakTotalPoints > 0;
  const nextChange = showSideChangeHint
    ? tiebreakChangeAt! - (tiebreakTotalPoints % tiebreakChangeAt!)
    : null;

  return (
    <div className="vs-indicator">
      {isMatchTiebreak ? (
        <div className="vs-label vs-match-tb">
          <span className="vs-icon">🎾</span>
          <span>Super TB</span>
        </div>
      ) : isTiebreak ? (
        <div className="vs-label vs-tiebreak">
          <span className="vs-icon">🎾</span>
          <span>TIE-BREAK</span>
          {nextChange !== null && nextChange <= 2 && (
            <span className="vs-side-hint">Troca em {nextChange}pt</span>
          )}
        </div>
      ) : isDeuce ? (
        <div className="vs-label vs-deuce">
          <span className="vs-deuce-icon">⚡</span>
        </div>
      ) : (
        <div className="vs-label vs-default">VS</div>
      )}
    </div>
  );
};

export default VSIndicator;
