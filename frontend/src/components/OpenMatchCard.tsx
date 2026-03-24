import React, { useState } from "react";

export interface OpenMatch {
  id: string;
  sportType: string;
  format: string;
  courtType?: string | null;
  nickname?: string | null;
  players: { p1: string; p2: string };
  status: string;
  clubName?: string | null;
  createdBy?: { id: string; name: string | null } | null;
  createdAt: string;
}

interface OpenMatchCardProps {
  match: OpenMatch;
  onAnnotate: (matchId: string) => Promise<void>;
}

const FORMAT_SHORT: Record<string, string> = {
  BEST_OF_3: "MD3",
  BEST_OF_3_MATCH_TB: "MD3 MTB",
  BEST_OF_5: "MD5",
  SINGLE_SET: "1 Set",
  PRO_SET: "Pro Set",
  MATCH_TIEBREAK: "MTB 10pts",
  SHORT_SET: "Set curto",
  NO_AD: "No-Ad",
  FAST4: "Fast4",
  SHORT_SET_NO_AD: "Curto No-Ad",
  NO_LET_TENNIS: "No-Let",
};

const COURT_ICON: Record<string, string> = {
  CLAY: "🟤",
  HARD: "🔵",
  GRASS: "🟢",
};

const OpenMatchCard: React.FC<OpenMatchCardProps> = ({ match, onAnnotate }) => {
  const [loading, setLoading] = useState(false);

  const handleAnnotate = async () => {
    setLoading(true);
    try {
      await onAnnotate(match.id);
    } finally {
      setLoading(false);
    }
  };

  const courtIcon = match.courtType ? COURT_ICON[match.courtType] : null;
  const formatLabel = FORMAT_SHORT[match.format] || match.format;

  return (
    <div className="open-match-card">
      <div className="open-match-card__header">
        <span className="open-match-card__sport">
          {courtIcon && <span className="open-match-card__court">{courtIcon}</span>}
          {match.sportType.replace("_", " ")}
          <span className="open-match-card__format">{formatLabel}</span>
        </span>
        {match.clubName && (
          <span className="open-match-card__club">🏢 {match.clubName}</span>
        )}
      </div>

      <div className="open-match-card__players">
        <span className="open-match-card__player">{match.players.p1}</span>
        <span className="open-match-card__vs">vs</span>
        <span className="open-match-card__player open-match-card__player--right">
          {match.players.p2}
        </span>
      </div>

      {match.nickname && (
        <div className="open-match-card__nickname">🏷 {match.nickname}</div>
      )}

      <button
        className="open-match-card__btn"
        onClick={handleAnnotate}
        disabled={loading}
      >
        {loading ? "⏳ Iniciando..." : "📋 Anotar agora"}
      </button>
    </div>
  );
};

export default OpenMatchCard;
