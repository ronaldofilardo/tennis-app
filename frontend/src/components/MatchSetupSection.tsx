/**
 * MatchSetupSection — Base component para seções do formulário MatchSetup
 * Reutiliza DetailsSection mas adiciona estilos específicos de form
 * Animações de entrada com stagger delay via CSS custom property
 */

import React from 'react';
import { DetailsSection } from '../design-system/DetailsPanel';
import './MatchSetupSection.css';

export interface MatchSetupSectionProps {
  /** Número da seção (para stagger animation) */
  index?: number;
  /** Título da seção (e.g., "ESPORTE") */
  title?: string;
  /** Texto descritivo/ajuda */
  description?: string;
  /** Conteúdo (inputs, selects, botões) */
  children: React.ReactNode;
  /** Se há erro nesta seção */
  hasError?: boolean;
  /** CSS customizado */
  className?: string;
  /** Variant da seção */
  variant?: 'default' | 'input' | 'display';
}

/**
 * MatchSetupSection — Wrapper reutilizável
 * Aplica tokens + animações + acessibilidade
 */
const MatchSetupSection: React.FC<MatchSetupSectionProps> = ({
  index = 0,
  title,
  description,
  children,
  hasError = false,
  className = '',
  variant = 'default',
}) => {
  // Stagger delay: 100ms entre cada seção
  const animationDelay = `${index * 100}ms`;

  return (
    <div
      className={`match-setup-section ${hasError ? 'match-setup-section--error' : ''} ${className}`.trim()}
      style={{ '--ms-animation-delay': animationDelay } as React.CSSProperties}
      aria-invalid={hasError}
    >
      {title ? (
        <DetailsSection title={title} variant={variant}>
          {description && <p className="match-setup-section__description">{description}</p>}
          <div className="match-setup-section__content" aria-invalid={hasError}>
            {children}
          </div>
          {/* Erro inline removido — usar required-asterisk (*) no label em vez disso */}
        </DetailsSection>
      ) : (
        <>
          {description && <p className="match-setup-section__description">{description}</p>}
          <div className="match-setup-section__content" aria-invalid={hasError}>
            {children}
          </div>
        </>
      )}
    </div>
  );
};

export default MatchSetupSection;
