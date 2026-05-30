/**
 * MatchSetupSectionFormat — Seção de Modo de Jogo (formato)
 */

import React from 'react';
import { useMatchSetup } from '../contexts/MatchSetup';
import MatchSetupSection from './MatchSetupSection';
import { TennisConfigFactory, supportedTennisFormats } from '../core/scoring/TennisConfigFactory';
import './MatchSetupSectionFormat.css';

const FORMAT_OPTIONS = supportedTennisFormats.map((format) => ({
  label: TennisConfigFactory.getFormatDisplayName(format),
  value: format,
}));

const MatchSetupSectionFormat: React.FC<{ index: number }> = ({ index }) => {
  const { state, setters, errors } = useMatchSetup();
  const isKids = state.format === 'KIDS_2V2';
  const hint = state.format ? TennisConfigFactory.getFormatDetailedName(state.format) : null;

  return (
    <MatchSetupSection index={index} hasError={!!errors.format}>
      <div>
        <label className="detail-label">
          MODO DE JOGO {errors.format && <span className="required-asterisk">*</span>}
        </label>
        <div className="format-select-wrapper">
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
          {isKids && <span className="format-badge format-badge--kids">KIDS</span>}
        </div>
        {hint && (
          <p className={`format-hint${isKids ? ' format-hint--kids' : ''}`} role="note">
            {hint}
          </p>
        )}
      </div>
    </MatchSetupSection>
  );
};

export default MatchSetupSectionFormat;
