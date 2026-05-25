/**
 * DetailsHeader — Badge + title component
 * Shows winner badge or role badge (e.g., "DEVOLVEDOR — ARTHUR")
 */

import React from 'react';
import './DetailsHeader.css';
import type { DetailsHeaderProps } from './types';

const variantStyles: Record<string, { bg: string; text: string; border: string; label: string }> = {
  winner: {
    bg: 'rgba(34, 197, 94, 0.18)',
    text: '#86efac',
    border: 'rgba(34, 197, 94, 0.4)',
    label: 'VENCEDOR',
  },
  server: {
    bg: 'rgba(59, 130, 246, 0.18)',
    text: '#93c5fd',
    border: 'rgba(59, 130, 246, 0.4)',
    label: 'SACADOR',
  },
  returner: {
    bg: 'rgba(249, 115, 22, 0.18)',
    text: '#fdba74',
    border: 'rgba(249, 115, 22, 0.4)',
    label: 'DEVOLVEDOR',
  },
  default: {
    bg: 'rgba(99, 179, 237, 0.12)',
    text: '#93c5fd',
    border: 'rgba(99, 179, 237, 0.3)',
    label: '',
  },
};

const DetailsHeader: React.FC<DetailsHeaderProps> = ({
  label,
  subtitle,
  variant = 'default',
  icon,
  className = '',
}) => {
  const variantStyle = variantStyles[variant] || variantStyles.default;

  return (
    <div className={`details-header ${className}`.trim()}>
      <div className="details-header__content">
        {icon && <div className="details-header__icon">{icon}</div>}
        <div className="details-header__text">
          <h3 className="details-header__label">{label}</h3>
          {subtitle && <p className="details-header__subtitle">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};

export default DetailsHeader;
