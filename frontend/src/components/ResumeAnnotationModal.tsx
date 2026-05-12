import React from 'react';
import './ResumeAnnotationModal.css';

interface ResumeAnnotationModalProps {
  isOpen: boolean;
  onResume: () => void;
  onStartNew: () => void;
  annotatorName: string;
  previousPointsCount?: number;
}

/**
 * Modal oferecendo ao anotador a opção de retomar a sessão anterior
 * ou começar uma nova anotação quando retorna a uma partida que deixou.
 */
export const ResumeAnnotationModal: React.FC<ResumeAnnotationModalProps> = ({
  isOpen,
  onResume,
  onStartNew,
  annotatorName,
  previousPointsCount = 0,
}) => {
  if (!isOpen) return null;

  return (
    <div className="resume-annotation-overlay" onClick={onStartNew}>
      <div className="resume-annotation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="resume-modal-header">
          <h2>👉 Retomar Anotação?</h2>
          <button className="resume-modal-close" onClick={onStartNew} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="resume-modal-body">
          <p className="resume-modal-message">
            Você saiu da partida <strong>{annotatorName}</strong>.
          </p>

          {previousPointsCount > 0 && (
            <p className="resume-modal-info">
              Você havia marcado <strong>{previousPointsCount} pontos</strong>.
            </p>
          )}

          <p className="resume-modal-hint">
            Deseja continuar de onde parou ou começar uma nova anotação?
          </p>
        </div>

        <div className="resume-modal-actions">
          <button className="resume-btn resume-btn-primary" onClick={onResume}>
            ↩️ Retomar de Onde Parou
          </button>
          <button className="resume-btn resume-btn-secondary" onClick={onStartNew}>
            🆕 Começar Nova Anotação
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeAnnotationModal;
