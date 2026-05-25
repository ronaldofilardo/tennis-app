/**
 * MatchSetupActions — Seção final com botões (Localizar, Iniciar)
 */

import React from 'react';
import './MatchSetupActions.css';

interface MatchSetupActionsProps {
  index: number;
  onLocateClick: () => void;
  onSubmitClick: () => void;
  isSubmitting: boolean;
  canSubmit?: boolean;
  missingFields?: string[];
}

const MatchSetupActions: React.FC<MatchSetupActionsProps> = ({
  index,
  onLocateClick,
  onSubmitClick,
  isSubmitting,
  canSubmit = true,
  missingFields = [],
}) => {
  const isDisabled = isSubmitting || !canSubmit;
  const tooltipText =
    missingFields.length > 0 ? `Complete: ${missingFields.join(', ')}` : undefined;

  const handleInitiarClick = () => {
    if (!canSubmit && missingFields.length > 0) {
      alert(`Preencha os campos obrigatórios:\n${missingFields.join('\n')}`);
      return;
    }
    onSubmitClick();
  };

  return (
    <div
      className="match-setup-actions"
      style={{ '--ms-animation-delay': `${index * 100}ms` } as React.CSSProperties}
    >
      <button
        type="button"
        onClick={onLocateClick}
        className="match-setup-button match-setup-button--secondary"
        disabled={isSubmitting}
      >
        🔍 Localizar Partida
      </button>
      <button
        type="submit"
        onClick={handleInitiarClick}
        className="match-setup-button match-setup-button--primary"
        disabled={isDisabled}
        title={tooltipText}
      >
        {isSubmitting ? '⏳ Iniciando...' : '▶️ Iniciar'}
      </button>
    </div>
  );
};

export default MatchSetupActions;
