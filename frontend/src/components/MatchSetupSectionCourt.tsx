/**
 * MatchSetupSectionCourt — Seção de Tipo de Quadra
 */

import React from 'react';
import { useMatchSetup } from '../contexts/MatchSetup';
import MatchSetupSection from './MatchSetupSection';

const MatchSetupSectionCourt: React.FC<{ index: number }> = ({ index }) => {
  const { state, setters, errors } = useMatchSetup();

  return (
    <MatchSetupSection index={index} title="TIPO DE QUADRA" hasError={!!errors.courtType}>
      <div className="court-type-buttons">
        {[
          { value: 'CLAY', label: '⬤ Saibro', color: '#c4623a' },
          { value: 'HARD', label: '⬤ Dura', color: '#3b82f6' },
          { value: 'GRASS', label: '⬤ Grama', color: '#16a34a' },
        ].map((court) => (
          <button
            key={court.value}
            type="button"
            className={`court-type-btn ${state.courtType === court.value ? 'court-type-btn--active' : ''}`}
            onClick={() => setters.setCourtType(court.value as 'CLAY' | 'HARD' | 'GRASS')}
            style={
              {
                '--court-color': court.color,
              } as React.CSSProperties
            }
          >
            {court.label}
          </button>
        ))}
      </div>
    </MatchSetupSection>
  );
};

export default MatchSetupSectionCourt;
