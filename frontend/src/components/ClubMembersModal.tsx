// frontend/src/components/ClubMembersModal.tsx
// Modal para exibir membros de um clube na visão Admin
// Ordem de exibição: Gestor → Técnicos → Atletas → Espectadores

import React from "react";
import "./ClubMembersModal.css";

// === Tipos ===

export interface ClubMemberUser {
  id: string | null;
  email: string | null;
  name: string;
  avatarUrl: string | null;
}

export interface ClubMember {
  id: string;
  userId: string | null;
  clubId: string;
  role: string;
  status: string;
  joinedAt: string;
  isGuest?: boolean;
  user: ClubMemberUser;
}

interface ClubMembersModalProps {
  clubName: string;
  members: ClubMember[];
  loading: boolean;
  onClose: () => void;
}

// === Constantes ===

const ROLE_ORDER: Record<string, number> = {
  GESTOR: 0,
  COACH: 1,
  ATHLETE: 2,
};

const ROLE_LABELS: Record<string, string> = {
  GESTOR: "Gestor",
  COACH: "Técnico",
  ATHLETE: "Atleta",
};

const ROLE_GROUP_LABELS: Record<string, string> = {
  GESTOR: "Gestores",
  COACH: "Técnicos",
  ATHLETE: "Atletas",
};

const ROLE_COLORS: Record<string, string> = {
  GESTOR: "role-gestor",
  COACH: "role-coach",
  ATHLETE: "role-athlete",
};

// === Helper: agrupa membros por papel ===

function groupMembersByRole(
  members: ClubMember[],
): Array<{ role: string; items: ClubMember[] }> {
  const groups: Record<string, ClubMember[]> = {};

  for (const member of members) {
    const role = member.role;
    if (!groups[role]) groups[role] = [];
    groups[role].push(member);
  }

  return Object.entries(groups)
    .sort(([a], [b]) => {
      const orderA = ROLE_ORDER[a] ?? 99;
      const orderB = ROLE_ORDER[b] ?? 99;
      return orderA - orderB;
    })
    .map(([role, items]) => ({ role, items }));
}

// === Componente ===

const ClubMembersModal: React.FC<ClubMembersModalProps> = ({
  clubName,
  members,
  loading,
  onClose,
}) => {
  const groups = groupMembersByRole(members);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="club-members-modal-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Membros do clube ${clubName}`}
    >
      <div className="club-members-modal">
        {/* Header */}
        <div className="club-members-modal__header">
          <div className="club-members-modal__title">
            <span className="club-members-modal__icon">🏢</span>
            <div>
              <h3>{clubName}</h3>
              {!loading && (
                <span className="club-members-modal__subtitle">
                  {members.length} {members.length === 1 ? "membro" : "membros"}
                </span>
              )}
            </div>
          </div>
          <button
            className="club-members-modal__close"
            onClick={onClose}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="club-members-modal__body">
          {loading ? (
            <div className="club-members-modal__loading">
              <div className="club-members-modal__spinner" />
              <span>Carregando membros...</span>
            </div>
          ) : members.length === 0 ? (
            <div className="club-members-modal__empty">
              <span className="club-members-modal__empty-icon">👥</span>
              <p>Nenhum membro encontrado neste clube.</p>
            </div>
          ) : (
            <div className="club-members-modal__groups">
              {groups.map(({ role, items }) => (
                <div key={role} className="club-members-modal__group">
                  <div className="club-members-modal__group-label">
                    <span
                      className={`club-members-modal__role-badge ${ROLE_COLORS[role] ?? ""}`}
                    >
                      {ROLE_LABELS[role] ?? role}
                    </span>
                    <span className="club-members-modal__group-title">
                      {ROLE_GROUP_LABELS[role] ?? role}
                    </span>
                    <span className="club-members-modal__group-count">
                      {items.length}
                    </span>
                  </div>

                  <div className="club-members-modal__list">
                    {items.map((member) => (
                      <div
                        key={member.id}
                        className="club-members-modal__member"
                      >
                        <div className="club-members-modal__avatar">
                          {member.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="club-members-modal__member-info">
                          <span className="club-members-modal__member-name">
                            {member.user.name}
                            {member.isGuest && (
                              <span className="club-members-modal__guest-tag">
                                Convidado
                              </span>
                            )}
                          </span>
                          <span className="club-members-modal__member-email">
                            {member.user.email ?? "Sem e-mail"}
                          </span>
                        </div>
                        <div className="club-members-modal__member-meta">
                          <span
                            className={`club-members-modal__status ${member.status === "ACTIVE" ? "status-active" : "status-pending"}`}
                          >
                            {member.status === "ACTIVE" ? "Ativo" : "Pendente"}
                          </span>
                          <span className="club-members-modal__joined">
                            {new Date(member.joinedAt).toLocaleDateString(
                              "pt-BR",
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClubMembersModal;
