// frontend/src/components/EditMatchModal.tsx
// Modal para o criador da partida editar: data, hora, local, nickname, visibilidade e anotação.

import React, { useState, useEffect } from 'react';
import { httpClient } from '../config/httpClient';
import { useToast } from './Toast';
import VenueSelect from './VenueSelect';
import type { VenueValue } from './VenueSelect';
import './EditMatchModal.css';

export interface EditableMatch {
  id: string;
  nickname?: string | null;
  scheduledAt?: string | null;
  venueId?: string | null;
  venue?: { id: string; name: string; city?: string | null } | null;
  visibility?: string;
  openForAnnotation?: boolean;
  createdByUserId?: string | null;
}

interface EditMatchModalProps {
  match: EditableMatch;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedMatch: EditableMatch) => void;
}

function isoToDateString(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10); // YYYY-MM-DD
}

function isoToTimeString(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

const EditMatchModal: React.FC<EditMatchModalProps> = ({ match, isOpen, onClose, onSaved }) => {
  const toast = useToast();
  const [nickname, setNickname] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [venueValue, setVenueValue] = useState<VenueValue>({ venueId: null, venueName: '' });
  const [visibility, setVisibility] = useState<'PUBLIC' | 'CLUB' | 'PLAYERS_ONLY'>('PLAYERS_ONLY');
  const [openForAnnotation, setOpenForAnnotation] = useState(false);
  const [saving, setSaving] = useState(false);

  // Inicializar formulário com dados atuais da partida
  useEffect(() => {
    if (isOpen) {
      setNickname(match.nickname ?? '');
      setScheduledDate(isoToDateString(match.scheduledAt));
      setScheduledTime(isoToTimeString(match.scheduledAt));
      setVenueValue({
        venueId: match.venueId ?? null,
        venueName: match.venue?.name ?? '',
      });
      setVisibility((match.visibility as 'PUBLIC' | 'CLUB' | 'PLAYERS_ONLY') ?? 'PLAYERS_ONLY');
      setOpenForAnnotation(match.openForAnnotation ?? false);
    }
  }, [isOpen, match]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const scheduledAt =
        scheduledDate && scheduledTime
          ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
          : null;

      const payload = {
        nickname: nickname.trim() || null,
        scheduledAt,
        venueId: venueValue.venueId || null,
        visibility,
        openForAnnotation,
      };

      const res = await httpClient.patch<EditableMatch>(`/matches/${match.id}/metadata`, payload);
      toast.success('Dados da partida atualizados.');
      onSaved(res.data);
      onClose();
    } catch {
      toast.error('Falha ao atualizar dados da partida.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="edit-match-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-match-title"
      onClick={handleOverlayClick}
    >
      <div className="edit-match-modal">
        <div className="edit-match-header">
          <h2 id="edit-match-title">Editar partida</h2>
          <button
            type="button"
            className="edit-match-close"
            onClick={onClose}
            aria-label="Fechar modal"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form className="edit-match-form" onSubmit={handleSubmit}>
          <div className="edit-match-field">
            <label htmlFor="em-date">
              Data e horário <span className="required-mark">*</span>
            </label>
            <div className="edit-match-datetime">
              <input
                id="em-date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
              />
              <input
                id="em-time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="edit-match-field">
            <label htmlFor="em-venue">Local</label>
            <VenueSelect value={venueValue} onChange={setVenueValue} />
          </div>

          <div className="edit-match-field">
            <label htmlFor="em-nickname">Apelido (opcional)</label>
            <input
              id="em-nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ex: Desafio Amigos"
            />
          </div>

          <div className="edit-match-field">
            <label htmlFor="em-visibility">Visibilidade</label>
            <select
              id="em-visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'CLUB' | 'PLAYERS_ONLY')}
            >
              <option value="PUBLIC">Pública</option>
              <option value="CLUB">Clube</option>
              <option value="PLAYERS_ONLY">Apenas Jogadores</option>
            </select>
          </div>

          <div className="edit-match-field edit-match-check">
            <label className="edit-match-check-label">
              <input
                type="checkbox"
                checked={openForAnnotation}
                onChange={(e) => setOpenForAnnotation(e.target.checked)}
              />
              <span>Permitir anotação por qualquer usuário</span>
            </label>
          </div>

          <div className="edit-match-actions">
            <button type="button" className="edit-match-cancel" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="edit-match-save" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMatchModal;
