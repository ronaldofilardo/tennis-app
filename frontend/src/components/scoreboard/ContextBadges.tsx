import React, { useMemo } from "react";
import "./ContextBadges.css";

interface PointDetails {
  result?: { winner?: string };
  serve?: { type?: string };
}

interface ContextBadgesProps {
  isTiebreak: boolean;
  isMatchTiebreak: boolean;
  isMatchPoint: boolean;
  isSetPoint: boolean;
  isBreakPoint: boolean;
  pointsHistory: PointDetails[];
  elapsed: number;
  playerNames: { PLAYER_1: string; PLAYER_2: string };
  serverName: string;
}

function formatElapsedShort(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m`;
}

const ContextBadges: React.FC<ContextBadgesProps> = ({
  isTiebreak,
  isMatchTiebreak,
  isMatchPoint,
  isSetPoint,
  isBreakPoint,
  pointsHistory,
  elapsed,
  playerNames,
  serverName,
}) => {
  const badges = useMemo(() => {
    const result: {
      key: string;
      icon: string;
      text: string;
      variant: string;
    }[] = [];

    if (isMatchTiebreak) {
      result.push({
        key: "supertb",
        icon: "🎾",
        text: "Super Tie-Break!",
        variant: "red",
      });
    } else if (isTiebreak) {
      result.push({
        key: "tb",
        icon: "🎾",
        text: "Tie-Break!",
        variant: "gold",
      });
    }

    if (isMatchPoint) {
      result.push({
        key: "mp",
        icon: "🏆",
        text: "Match Point!",
        variant: "red",
      });
    } else if (isSetPoint) {
      result.push({
        key: "sp",
        icon: "🎯",
        text: "Set Point!",
        variant: "gold",
      });
    } else if (isBreakPoint) {
      result.push({
        key: "bp",
        icon: "⚡",
        text: "Break Point!",
        variant: "blue",
      });
    }

    // Streak de winners nos últimos 3 pontos
    if (pointsHistory.length >= 3) {
      const last3 = pointsHistory.slice(-3);
      const allSameWinner =
        last3.every((p) => p.result?.winner === last3[0].result?.winner) &&
        last3[0].result?.winner;

      if (allSameWinner) {
        const winnerName =
          playerNames[allSameWinner as keyof typeof playerNames];
        result.push({
          key: "streak",
          icon: "📊",
          text: `3 pontos seguidos — ${winnerName}!`,
          variant: "info",
        });
      }
    }

    // Tempo de partida (somente se > 1min)
    if (elapsed >= 60) {
      result.push({
        key: "time",
        icon: "⏱",
        text: formatElapsedShort(elapsed),
        variant: "muted",
      });
    }

    return result;
  }, [
    isTiebreak,
    isMatchTiebreak,
    isMatchPoint,
    isSetPoint,
    isBreakPoint,
    pointsHistory,
    elapsed,
    playerNames,
  ]);

  if (badges.length === 0) return null;

  return (
    <div className="context-badges" aria-live="polite">
      {badges.map((b) => (
        <div key={b.key} className={`context-badge badge-${b.variant}`}>
          <span className="badge-icon">{b.icon}</span>
          <span className="badge-text">{b.text}</span>
        </div>
      ))}
    </div>
  );
};

export default ContextBadges;
