// frontend/src/components/ClubSelector.tsx
// Componente de seleção de clube para usuários com múltiplos clubes

import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import type { ClubMembership } from "../contexts/AuthContext";
import "./ClubSelector.css";

interface ClubSelectorProps {
  /** Mostra versão compacta (dropdown) ou cards */
  variant?: "dropdown" | "cards";
  /** Callback quando um clube é selecionado */
  onClubSelected?: (club: ClubMembership) => void;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  COACH: "Treinador",
  PLAYER: "Atleta",
  SPECTATOR: "Espectador",
};

const ClubSelector: React.FC<ClubSelectorProps> = ({
  variant = "dropdown",
  onClubSelected,
}) => {
  const { currentUser, activeClub, switchClub, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!currentUser || currentUser.clubs.length <= 1) {
    // Sem clubes ou apenas 1 — mostra badge simples
    if (activeClub) {
      return (
        <div className="club-badge">
          <span className="club-badge-name">{activeClub.clubName}</span>
          <span className="club-badge-role">
            {ROLE_LABELS[activeClub.role] || activeClub.role}
          </span>
        </div>
      );
    }
    return null;
  }

  const handleSelect = async (club: ClubMembership) => {
    if (club.clubId === currentUser.activeClubId) {
      setIsOpen(false);
      return;
    }
    await switchClub(club.clubId);
    setIsOpen(false);
    onClubSelected?.(club);
  };

  // === Modo Dropdown (header) ===
  if (variant === "dropdown") {
    return (
      <div className="club-selector-dropdown">
        <button
          className="club-selector-trigger"
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading}
        >
          <span className="club-trigger-name">
            {activeClub?.clubName || "Selecionar clube"}
          </span>
          <span className="club-trigger-role">
            {activeClub ? ROLE_LABELS[activeClub.role] || activeClub.role : ""}
          </span>
          <span className="club-trigger-arrow">{isOpen ? "▲" : "▼"}</span>
        </button>

        {isOpen && (
          <div className="club-selector-menu">
            {currentUser.clubs.map((club) => (
              <button
                key={club.clubId}
                className={`club-option ${club.clubId === currentUser.activeClubId ? "active" : ""}`}
                onClick={() => handleSelect(club)}
                disabled={loading}
              >
                <span className="club-option-name">{club.clubName}</span>
                <span className="club-option-role">
                  {ROLE_LABELS[club.role] || club.role}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // === Modo Cards (pós-login) ===
  return (
    <div className="club-selector-cards">
      <h3>Selecione o clube</h3>
      <div className="club-cards-grid">
        {currentUser.clubs.map((club) => (
          <button
            key={club.clubId}
            className={`club-card ${club.clubId === currentUser.activeClubId ? "active" : ""}`}
            onClick={() => handleSelect(club)}
            disabled={loading}
          >
            {club.logoUrl ? (
              <img
                src={club.logoUrl}
                alt={club.clubName}
                className="club-card-logo"
              />
            ) : (
              <div className="club-card-logo-placeholder">
                {club.clubName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="club-card-name">{club.clubName}</span>
            <span className="club-card-role">
              {ROLE_LABELS[club.role] || club.role}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ClubSelector;
