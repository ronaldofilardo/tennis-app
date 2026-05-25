/**
 * MatchSetupSectionConditions — Seção de Condições Climáticas (opcional)
 */

import React from 'react';
import { useMatchSetup } from '../contexts/MatchSetup';
import MatchSetupSection from './MatchSetupSection';

const MatchSetupSectionConditions: React.FC<{ index: number }> = ({ index }) => {
  const { state, setters } = useMatchSetup();

  return (
    <MatchSetupSection index={index}>
      <div className="conditions-row">
        <div className="condition-field">
          <label htmlFor="temperature" className="condition-label">
            Temperatura (°C)
          </label>
          <input
            id="temperature"
            type="number"
            min="-50"
            max="60"
            value={state.temperature}
            onChange={(e) => setters.setTemperature(e.target.value)}
            placeholder="25"
            className="match-setup-input"
          />
        </div>

        <div className="condition-field">
          <label htmlFor="humidity" className="condition-label">
            Umidade (%)
          </label>
          <input
            id="humidity"
            type="number"
            min="0"
            max="100"
            value={state.humidity}
            onChange={(e) => setters.setHumidity(e.target.value)}
            placeholder="60"
            className="match-setup-input"
          />
        </div>
      </div>
    </MatchSetupSection>
  );
};

export default MatchSetupSectionConditions;
