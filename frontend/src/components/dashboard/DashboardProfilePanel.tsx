import React from 'react';
import type { AthleteStats } from '../AthleteHeader';
import { ROLE_LABELS } from '../../types/roles';

interface AuthUserClub {
  clubId: string;
  clubName: string;
  role: string;
}

interface DashboardProfilePanelProps {
  authUser: {
    name?: string;
    email?: string;
    activeRole?: string;
    activeClubId?: string | null;
    clubs?: AuthUserClub[];
  } | null;
  athleteStats: AthleteStats;
  annotatedByMeCount: number;
  completedMatchesCount: number;
  onSwitchClub: (clubId: string) => void;
  onLogout: () => void;
}

const roleLabel = (r?: string | null) => (r ? (ROLE_LABELS[r] ?? r) : '—');

const DashboardProfilePanel: React.FC<DashboardProfilePanelProps> = ({
  authUser,
  athleteStats,
  annotatedByMeCount,
  completedMatchesCount,
  onSwitchClub,
  onLogout,
}) => {
  return (
    <div className="profile-panel">
      <h3 className="profile-panel__title">Meu Perfil</h3>
      <div className="profile-panel__header">
        <div className="profile-panel__avatar">
          {(authUser?.name ?? authUser?.email ?? '?')[0].toUpperCase()}
        </div>
        <div className="profile-panel__info">
          <div className="profile-panel__name">
            {authUser?.name || authUser?.email || 'Usuário'}
          </div>
          <div className="profile-panel__email">{authUser?.email}</div>
          <span className="profile-panel__role-badge">{roleLabel(authUser?.activeRole)}</span>
        </div>
      </div>

      <div className="profile-panel__stats">
        <div className="profile-panel__stat">
          <span className="profile-panel__stat-value">{athleteStats.wins}</span>
          <span className="profile-panel__stat-label">Vitórias</span>
        </div>
        <div className="profile-panel__stat">
          <span className="profile-panel__stat-value">{athleteStats.losses}</span>
          <span className="profile-panel__stat-label">Derrotas</span>
        </div>
        <div className="profile-panel__stat">
          <span className="profile-panel__stat-value">{annotatedByMeCount}</span>
          <span className="profile-panel__stat-label">Anotações</span>
        </div>
        <div className="profile-panel__stat">
          <span className="profile-panel__stat-value">{completedMatchesCount}</span>
          <span className="profile-panel__stat-label">Histórico</span>
        </div>
      </div>

      {authUser?.clubs && authUser.clubs.length > 0 && (
        <div className="profile-panel__clubs">
          <h4 className="profile-panel__clubs-title">Meus Clubes</h4>
          {authUser.clubs.map((club) => (
            <button
              key={club.clubId}
              className={`profile-panel__club${authUser.activeClubId === club.clubId ? 'profile-panel__club--active' : ''}`}
              onClick={() => onSwitchClub(club.clubId)}
              disabled={authUser.activeClubId === club.clubId}
            >
              <span className="profile-panel__club-name">{club.clubName}</span>
              <span className="profile-panel__club-role">{roleLabel(club.role)}</span>
              {authUser.activeClubId === club.clubId && (
                <span className="profile-panel__club-active-badge">Ativo</span>
              )}
            </button>
          ))}
        </div>
      )}

      <button className="profile-panel__logout" onClick={onLogout}>
        Sair da conta
      </button>
    </div>
  );
};

export default DashboardProfilePanel;
