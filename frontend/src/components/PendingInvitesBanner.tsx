// frontend/src/components/PendingInvitesBanner.tsx
// Exibe convites de clube pendentes para o atleta confirmar.
// Consumido no Dashboard → aba "home".

import React, { useState, useEffect, useCallback } from "react";
import httpClient from "../config/httpClient";
import { useToast } from "./Toast";

interface PendingInvite {
  id: string;
  clubId: string;
  role: string;
  joinedAt: string;
  club: {
    id: string;
    name: string;
    slug: string;
  };
}

const PendingInvitesBanner: React.FC = () => {
  const toast = useToast();
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);

  const fetchInvites = useCallback(async () => {
    try {
      const res = await httpClient.get<PendingInvite[]>("/clubs/my-invites");
      setInvites(res.data);
    } catch {
      // silencioso — não atrapalhar o flow principal
    }
  }, []);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const handleConfirm = async (invite: PendingInvite) => {
    setConfirming(invite.id);
    try {
      await httpClient.patch(
        `/clubs/${invite.clubId}/members/${invite.id}/confirm`,
        {},
      );
      toast.success(`Você confirmou sua entrada no clube ${invite.club.name}!`);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    } catch {
      toast.error("Não foi possível confirmar. Tente novamente.");
    } finally {
      setConfirming(null);
    }
  };

  if (invites.length === 0) return null;

  return (
    <div
      className="pending-invites-banner"
      role="region"
      aria-label="Convites de clube pendentes"
    >
      <div className="pending-invites-title">
        <span className="pending-invites-icon">📬</span>
        <strong>
          {invites.length === 1
            ? "1 convite de clube aguardando"
            : `${invites.length} convites de clube aguardando`}
        </strong>
      </div>
      <div className="pending-invites-list">
        {invites.map((invite) => (
          <div key={invite.id} className="pending-invite-item">
            <div className="pending-invite-club">
              <span className="pending-invite-logo-placeholder">🏟️</span>
              <div className="pending-invite-info">
                <span className="pending-invite-club-name">
                  {invite.club.name}
                </span>
                <span className="pending-invite-date">
                  Adicionado em{" "}
                  {new Date(invite.joinedAt).toLocaleDateString("pt-BR")}
                </span>
              </div>
            </div>
            <button
              className="pending-invite-confirm-btn"
              onClick={() => handleConfirm(invite)}
              disabled={confirming === invite.id}
              aria-label={`Confirmar entrada no clube ${invite.club.name}`}
            >
              {confirming === invite.id ? "Confirmando…" : "Confirmar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PendingInvitesBanner;
