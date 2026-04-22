import React, { useState, useEffect } from 'react';
import { httpClient } from '../config/httpClient';
import { useToast } from './Toast';
import { useAuth } from '../contexts/AuthContext';
import VenueSelect from './VenueSelect';
import AnnotationSessionPanel from './AnnotationSessionPanel';
import type { VenueValue } from './VenueSelect';
import type { EditableMatch } from './EditMatchModal';
import './MatchManagerModal.css';

interface MatchManagerModalProps {
  matchId: string;
  matchData: EditableMatch;
  onClose: () => void;
  onDataUpdated?: (updatedMatch: EditableMatch) => void;
}

function isoToDateString(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function isoToTimeString(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * MatchManagerModal
 * Modal para gerenciar partida: editar dados + acompanhar anotadores
 * Exibido apenas para criadores (gestores de clube)
 */
export const MatchManagerModal: React.FC<MatchManagerModalProps> = ({
  matchId,
  matchData,
  onClose,
  onDataUpdated,
}) => {
  const toast = useToast();
  const { currentUser } = useAuth();
  const [nickname, setNickname] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [venueValue, setVenueValue] = useState<VenueValue>({ venueId: null, venueName: '' });
  const [visibility, setVisibility] = useState<'PUBLIC' | 'CLUB' | 'PLAYERS_ONLY'>('PLAYERS_ONLY');
  const [openForAnnotation, setOpenForAnnotation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'annotators'>('edit');

  useEffect(() => {
    if (matchData) {
      setNickname(matchData.nickname ?? '');
      setScheduledDate(isoToDateString(matchData.scheduledAt));
      setScheduledTime(isoToTimeString(matchData.scheduledAt));
      setVenueValue({
        venueId: matchData.venueId ?? null,
        venueName: matchData.venue?.name ?? '',
      });
      setVisibility((matchData.visibility as 'PUBLIC' | 'CLUB' | 'PLAYERS_ONLY') ?? 'PLAYERS_ONLY');
      setOpenForAnnotation(matchData.openForAnnotation ?? false);
    }
  }, [matchData]);

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

      const res = await httpClient.patch<EditableMatch>(`/matches/${matchId}/metadata`, payload);
      toast.success('Dados da partida atualizados.');
      onDataUpdated?.(res.data);
    } catch (err) {
      toast.error('Falha ao atualizar dados da partida.');
      console.error('Error updating match:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="match-manager-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-manager-title"
      onClick={handleOverlayClick}
    >
      <div className="match-manager-modal">
        {/* Header */}
        <div className="match-manager-header">
          <h2 id="match-manager-title">Gerenciar Partida</h2>
          <button
            type="button"
            className="match-manager-close"
            onClick={onClose}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Tabs (mobile + desktop) */}
        <div className="match-manager-tabs">
          <button
            className={`match-manager-tab ${activeTab === 'edit' ? 'active' : ''}`}
            onClick={() => setActiveTab('edit')}
            type="button"
            aria-selected={activeTab === 'edit'}
          >
            📋 Editar Dados
          </button>
          <button
            className={`match-manager-tab ${activeTab === 'annotators' ? 'active' : ''}`}
            onClick={() => setActiveTab('annotators')}
            type="button"
            aria-selected={activeTab === 'annotators'}
          >
            👥 Anotadores
          </button>
        </div>

        {/* Content */}
        <div className="match-manager-content">
          {/* Edit Tab */}
          {activeTab === 'edit' && (
            <form className="match-manager-form" onSubmit={handleSubmit}>
              <div className="match-manager-field">
                <label htmlFor="mm-date">
                  Data e horário <span className="required-mark">*</span>
                </label>
                <div className="match-manager-datetime">
                  <input
                    id="mm-date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    required
                  />
                  <input
                    id="mm-time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="match-manager-field">
                <label htmlFor="mm-venue">Local</label>
                <VenueSelect value={venueValue} onChange={setVenueValue} />
              </div>

              <div className="match-manager-field">
                <label htmlFor="mm-nickname">Apelido (opcional)</label>
                <input
                  id="mm-nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Ex: Desafio Amigos"
                />
              </div>

              <div className="match-manager-field">
                <label htmlFor="mm-visibility">Visibilidade</label>
                <select
                  id="mm-visibility"
                  value={visibility}
                  onChange={(e) =>
                    setVisibility(e.target.value as 'PUBLIC' | 'CLUB' | 'PLAYERS_ONLY')
                  }
                >
                  <option value="PUBLIC">Pública</option>
                  <option value="CLUB">Clube</option>
                  <option value="PLAYERS_ONLY">Apenas Jogadores</option>
                </select>
              </div>

              <div className="match-manager-field match-manager-check">
                <label className="match-manager-check-label">
                  <input
                    type="checkbox"
                    checked={openForAnnotation}
                    onChange={(e) => setOpenForAnnotation(e.target.checked)}
                  />
                  <span>Permitir anotação por qualquer usuário</span>
                </label>
              </div>

              <div className="match-manager-actions">
                <button type="submit" className="match-manager-save" disabled={saving}>
                  {saving ? '⏳ Salvando...' : '✓ Salvar Mudanças'}
                </button>
              </div>
            </form>
          )}

          {/* Annotators Tab */}
          {activeTab === 'annotators' && currentUser && (
            <div className="match-manager-annotators-section">
              <AnnotationSessionPanel
                matchId={matchId}
                matchStatus={matchData.status ?? 'NOT_STARTED'}
                currentUserId={currentUser.id}
                userRole={currentUser.activeRole}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="match-manager-footer">
          <button type="button" className="match-manager-back" onClick={onClose}>
            ↤ Voltar ao Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchManagerModal;
