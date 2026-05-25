/**
 * DetailsPanel — Container e Context Provider para padrão de detalhes
 * Tipografia, espaçamento e comportamento padronizado
 * Usage: Wrapper pai para DetailsHeader, DetailsSection, etc.
 */

import React, { createContext, useMemo } from 'react';
import '../tokens/typography.tokens.css';
import '../tokens/spacing.tokens.css';
import './DetailsPanel.css';
import type { DetailsPanelProps, DetailsPanelContextType } from './types';

export const DetailsPanelContext = createContext<DetailsPanelContextType>({
  accentColor: 'default',
});

/**
 * DetailsPanel — Main container
 * Provides context for accent color and shared styles
 */
const DetailsPanel: React.FC<DetailsPanelProps> = ({
  header,
  children,
  footer,
  className = '',
  style,
  accentColor = 'default',
}) => {
  const contextValue = useMemo<DetailsPanelContextType>(() => ({ accentColor }), [accentColor]);

  const accentClass = `details-panel--accent-${accentColor}`;

  return (
    <DetailsPanelContext.Provider value={contextValue}>
      <div className={`details-panel ${accentClass} ${className}`.trim()} style={style}>
        {header && <div className="details-panel__header">{header}</div>}
        <div className="details-panel__body">{children}</div>
        {footer && <div className="details-panel__footer">{footer}</div>}
      </div>
    </DetailsPanelContext.Provider>
  );
};

export default DetailsPanel;
