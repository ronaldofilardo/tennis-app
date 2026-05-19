import React from 'react';
import './ResumeAnnotationModal.css';

interface ResumeAnnotationModalProps {
  isOpen: boolean;
  onResume: () => void;
  onStartNew: () => void;
  onDiscard?: () => void;
  annotatorName: string;
  previousPointsCount?: number;
  matchScore?: { p1: number; p2: number; format?: string };
}

/**
 * Modal oferecendo ao anotador 3 opções:
 * 1. Editar Placar (retomar e permitir edição)
 * 2. Começar Nova Anotação (nova sessão zerada)
 * 3. Descartar (volta ao dashboard)
 */
export const ResumeAnnotationModal: React.FC<ResumeAnnotationModalProps> = ({
  isOpen,
  onResume,
  onStartNew,
  onDiscard,
  annotatorName,
  previousPointsCount = 0,
  matchScore,
}) => {
  if (!isOpen) return null;

  const handleDiscard = () => {
    if (onDiscard) {
      onDiscard();
    } else {
      onStartNew();
    }
  };

  return (
    <div className="resume-annotation-overlay" onClick={handleDiscard}>
      <div className="resume-annotation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="resume-modal-header">
          <h2>👉 Retomar Anotação?</h2>
          <button className="resume-modal-close" onClick={handleDiscard} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="resume-modal-body">
          <p className="resume-modal-message">
            Você saiu da partida <strong>{annotatorName}</strong>.
          </p>

          {matchScore && (
            <p className="resume-modal-score">
              Placar: <strong>{matchScore.p1} x {matchScore.p2}</strong>
              {matchScore.format && ` (${matchScore.format})`}
            </p>
          )}

          {previousPointsCount > 0 && (
            <p className="resume-modal-info">
              Você havia marcado <strong>{previousPointsCount} pontos</strong>.
            </p>
          )}

          <p className="resume-modal-hint">
            Você pode editar o placar clicando em "✏️ Editar Placar" ou começar do zero.
          </p>
        </div>

        <div className="resume-modal-actions">
          <button className="resume-btn resume-btn-primary" onClick={onResume}>
            ✏️ Editar Placar
          </button>
          <button className="resume-btn resume-btn-secondary" onClick={onStartNew}>
            🆕 Começar Nova Anotação
          </button>
          <button className="resume-btn resume-btn-discard" onClick={handleDiscard}>
            ❌ Descartar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeAnnotationModal;
