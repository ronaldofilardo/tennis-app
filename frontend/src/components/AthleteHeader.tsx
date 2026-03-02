import React, { useState } from "react";
import "./AthleteHeader.css";

export interface AthleteStats {
  wins: number;
  losses: number;
  totalMatches: number;
  winRate: number;
  /** Optional KPIs */
  currentStreak?: number;
  streakType?: "win" | "loss";
  avgFirstServe?: number;
  avgWinners?: number;
}

interface AthleteHeaderProps {
  name: string;
  email?: string;
  clubName?: string;
  stats: AthleteStats;
}

const AthleteHeader: React.FC<AthleteHeaderProps> = ({
  name,
  clubName,
  stats,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Avatar: first letter of name
  const initial = name ? name.charAt(0).toUpperCase() : "?";

  const streakLabel =
    stats.currentStreak && stats.currentStreak > 0
      ? `${stats.currentStreak}${stats.streakType === "win" ? "V" : "D"} seguidas`
      : null;

  return (
    <div className="athlete-header" data-testid="athlete-header">
      {/* Main row — always visible */}
      <div
        className="athlete-header-main"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="athlete-header-toggle"
        role="button"
        aria-expanded={isExpanded}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setIsExpanded(!isExpanded);
        }}
      >
        <div className="athlete-avatar">{initial}</div>
        <div className="athlete-info">
          <p className="athlete-name">{name}</p>
          <p className="athlete-subtitle">
            {clubName || "Dashboard do Atleta"}
          </p>
        </div>

        {/* Quick V/D inline */}
        <div className="athlete-quick-stats">
          <div className="athlete-quick-stat">
            <span className="athlete-quick-stat-value athlete-quick-stat-value--win">
              {stats.wins}
            </span>
            <span className="athlete-quick-stat-label">V</span>
          </div>
          <div className="athlete-quick-stat">
            <span className="athlete-quick-stat-value athlete-quick-stat-value--loss">
              {stats.losses}
            </span>
            <span className="athlete-quick-stat-label">D</span>
          </div>
        </div>

        <span
          className={`athlete-expand-icon${isExpanded ? " athlete-expand-icon--open" : ""}`}
        >
          ▾
        </span>
      </div>

      {/* Expanded KPIs */}
      <div
        className={`athlete-details${isExpanded ? " athlete-details--open" : ""}`}
        data-testid="athlete-details"
      >
        <div className="athlete-kpis">
          <div className="athlete-kpi-card">
            <span className="athlete-kpi-value">{stats.totalMatches}</span>
            <span className="athlete-kpi-label">Partidas</span>
          </div>
          <div className="athlete-kpi-card">
            <span className="athlete-kpi-value">
              {stats.winRate > 0 ? `${stats.winRate}%` : "—"}
            </span>
            <span className="athlete-kpi-label">Aproveit.</span>
          </div>
          <div className="athlete-kpi-card">
            <span className="athlete-kpi-value">{streakLabel || "—"}</span>
            <span className="athlete-kpi-label">Sequência</span>
          </div>
          <div className="athlete-kpi-card">
            <span className="athlete-kpi-value">
              {stats.avgFirstServe != null ? `${stats.avgFirstServe}%` : "—"}
            </span>
            <span className="athlete-kpi-label">1º Saque</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AthleteHeader;
