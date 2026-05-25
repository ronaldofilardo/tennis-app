/**
 * MatchSetupSectionSport — Seção de Esporte (Tênis)
 */

import React from 'react';
import { useMatchSetup } from '../contexts/MatchSetup';
import MatchSetupSection from './MatchSetupSection';

const MatchSetupSectionSport: React.FC<{ index: number }> = ({ index }) => {
  const { state, setters, errors } = useMatchSetup();

  return (
    <MatchSetupSection index={index} title="ESPORTE" hasError={!!errors.sport}>
      <select
        value={state.sport}
        onChange={(e) => setters.setSport(e.target.value)}
        className="match-setup-select"
      >
        <option value="TENNIS">🎾 Tênis</option>
      </select>
    </MatchSetupSection>
  );
};

export default MatchSetupSectionSport;
