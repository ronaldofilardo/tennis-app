import React from 'react';
import type { FullMember } from '../../types/gestor';
import type { AthleteResult } from '../AthleteSearchInput';
import type { EditableMember } from '../EditMemberModal';
import { ROLE_LABELS, ROLE_ICONS, INVITE_ROLES } from '../../types/gestor';
import AthleteSearchInput from '../AthleteSearchInput';
import BulkAthleteImport from '../BulkAthleteImport';

interface GestorMembersTabProps {
  members: FullMember[];
  loadingMembers: boolean;
  clubId: string;
  showInviteForm: boolean;
  showBulkImport: boolean;
  inviteAthlete: AthleteResult | null;
  inviteRole: string;
  inviting: boolean;
  onToggleInviteForm: () => void;
  onToggleBulkImport: () => void;
  onShowAddAthlete: () => void;
  onShowAddCoach: () => void;
  onInviteAthleteChange: (athlete: AthleteResult | null) => void;
  onInviteRoleChange: (role: string) => void;
  onInviteMember: () => void;
  onBulkImportComplete: () => void;
  onBulkImportCancel: () => void;
  onEditMember: (member: EditableMember) => void;
}

const GestorMembersTab: React.FC<GestorMembersTabProps> = ({
  members,
  loadingMembers,
  clubId,
  showInviteForm,
  showBulkImport,
  inviteAthlete,
  inviteRole,
  inviting,
  onToggleInviteForm,
  onToggleBulkImport,
  onShowAddAthlete,
  onShowAddCoach,
  onInviteAthleteChange,
  onInviteRoleChange,
  onInviteMember,
  onBulkImportComplete,
  onBulkImportCancel,
  onEditMember,
}) => (
  <div className="gestor-members-tab">
    <div className="section-header">
      <h3>
        Membros do Clube{' '}
        {members.length > 0 && <span className="count-badge">{members.length}</span>}
      </h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="gestor-btn-primary" onClick={onToggleBulkImport}>
          {showBulkImport ? 'Cancelar' : '📤 Importar XLSX'}
        </button>
        <button className="gestor-btn-secondary" onClick={onShowAddAthlete}>
          ➕ Cadastrar Atleta
        </button>
        <button className="gestor-btn-secondary" onClick={onShowAddCoach}>
          🎯 Adicionar Técnico
        </button>
        <button className="gestor-btn-primary" onClick={onToggleInviteForm}>
          {showInviteForm ? 'Cancelar' : '+ Convidar Membro'}
        </button>
      </div>
    </div>

    {/* Invite Form */}
    {showInviteForm && (
      <div className="invite-form">
        <div className="invite-form-row">
          <AthleteSearchInput
            label="Buscar usuário"
            placeholder="Nome do usuário..."
            value={inviteAthlete}
            onSelect={onInviteAthleteChange}
            allowGuest={false}
          />
        </div>
        <div className="invite-form-row">
          <label htmlFor="invite-role">Papel no clube</label>
          <select
            id="invite-role"
            value={inviteRole}
            onChange={(e) => onInviteRoleChange(e.target.value)}
            className="invite-role-select"
          >
            {INVITE_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_ICONS[role]} {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </div>
        <button
          className="gestor-btn-primary"
          onClick={onInviteMember}
          disabled={!inviteAthlete || inviting}
        >
          {inviting ? 'Convidando...' : 'Enviar Convite'}
        </button>
      </div>
    )}

    {/* Bulk XLSX Import */}
    {showBulkImport && (
      <BulkAthleteImport
        clubId={clubId}
        onComplete={onBulkImportComplete}
        onCancel={onBulkImportCancel}
      />
    )}

    {/* Members List */}
    {loadingMembers ? (
      <div className="gestor-loading">
        <div className="gestor-loading-spinner" />
        Carregando membros...
      </div>
    ) : members.length === 0 ? (
      <p className="gestor-muted">Nenhum membro encontrado. Convide alguém!</p>
    ) : (
      <div className="gestor-members-table">
        <div className="members-table-header">
          <span>Código</span>
          <span>Nome</span>
          <span>E-mail</span>
          <span>CPF</span>
          <span>Nascimento</span>
          <span>Papel</span>
          <span>Status</span>
          <span>Entrada</span>
          <span></span>
        </div>
        {members.map((member) => (
          <div key={member.id} className="members-table-row">
            <span className="member-cell-code">
              <code>
                {member.user.athleteProfile?.globalId
                  ? `[${member.user.athleteProfile.globalId.slice(0, 8).toUpperCase()}]`
                  : '—'}
              </code>
            </span>
            <span className="member-cell-name">
              <span className="member-avatar">
                {member.user.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
              {member.user.name}
            </span>
            <span className="member-cell-email">
              {member.user.email?.includes('@') ? (
                member.user.email
              ) : (
                <span className="text-muted">—</span>
              )}
            </span>
            <span className="member-cell-cpf">
              {member.user.athleteProfile?.cpf ? (
                (() => {
                  const d = member.user.athleteProfile.cpf.replace(/\D/g, '');
                  return d.length === 11
                    ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`
                    : d;
                })()
              ) : (
                <span className="text-muted">—</span>
              )}
            </span>
            <span className="member-cell-birth">
              {member.user.athleteProfile?.birthDate ? (
                new Date(member.user.athleteProfile.birthDate).toLocaleDateString('pt-BR', {
                  timeZone: 'UTC',
                })
              ) : (
                <span className="text-muted">—</span>
              )}
            </span>
            <span className="member-cell-role">
              <span className="member-role-tag">
                {ROLE_ICONS[member.role] || '👤'} {ROLE_LABELS[member.role] || member.role}
              </span>
            </span>
            <span className="member-cell-status">
              <span
                className={`status-dot ${member.status === 'ACTIVE' ? 'active' : 'inactive'}`}
              />
              {member.status === 'ACTIVE'
                ? 'Ativo'
                : member.status === 'PENDING'
                  ? 'Pendente'
                  : member.status}
            </span>
            <span className="member-cell-date">
              {new Date(member.joinedAt).toLocaleDateString('pt-BR')}
            </span>
            <span className="member-cell-actions">
              {(member.role === 'ATHLETE' || member.role === 'COACH') &&
                member.clubId === clubId && (
                  <button
                    type="button"
                    className="gestor-btn-icon"
                    title="Editar"
                    onClick={() => onEditMember(member)}
                  >
                    ✏️
                  </button>
                )}
            </span>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default GestorMembersTab;
