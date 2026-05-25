/**
 * MatchSetupSectionFormat — Seção de Modo de Jogo (formato)
 */

import React from 'react';
import { useMatchSetup } from '../contexts/MatchSetup';
import MatchSetupSection from './MatchSetupSection';
import { TennisConfigFactory, supportedTennisFormats } from '../core/scoring/TennisConfigFactory';

const FORMAT_OPTIONS = supportedTennisFormats.map((format) => ({
  label: TennisConfigFactory.getFormatDisplayName(format),
  value: format,
}));

const MatchSetupSectionFormat: React.FC<{ index: number }> = ({ index }) => {
  const { state, setters, errors } = useMatchSetup();

  return (
    <MatchSetupSection index={index} hasError={!!errors.format}>
      <div>
        <label className="detail-label">
          MODO DE JOGO {errors.format && <span className="required-asterisk">*</span>}
        </label>
        <select
          className="match-setup-select"
          value={state.format}
          onChange={(event) => setters.setFormat(event.target.value)}
          aria-label="Formato da partida"
        >
          <option value="" disabled>
            Melhor de 3 sets
          </option>
          {FORMAT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </MatchSetupSection>
  );
};

export default MatchSetupSectionFormat;
