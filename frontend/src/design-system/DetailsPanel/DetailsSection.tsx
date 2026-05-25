/**
 * DetailsSection — Repeatable section with title and content
 * Usage: Multiple sections inside DetailsPanel body
 */

import React from 'react';
import './DetailsSection.css';
import type { DetailsSectionProps } from './types';

const DetailsSection: React.FC<DetailsSectionProps> = ({
  title,
  children,
  variant = 'default',
  className = '',
  style,
}) => {
  return (
    <section
      className={`details-section details-section--${variant} ${className}`.trim()}
      style={style}
    >
      <h4 className="details-section__title">{title}</h4>
      <div className="details-section__content">{children}</div>
    </section>
  );
};

export default DetailsSection;
