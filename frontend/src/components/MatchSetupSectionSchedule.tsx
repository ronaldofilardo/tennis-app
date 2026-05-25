/**
 * MatchSetupSectionSchedule — Seção de Data/Hora
 */

import React from 'react';
import { useMatchSetup } from '../contexts/MatchSetup';
import MatchSetupSection from './MatchSetupSection';

const MatchSetupSectionSchedule: React.FC<{ index: number }> = ({ index }) => {
  const { state, setters, errors } = useMatchSetup();

  return (
    <MatchSetupSection index={index} hasError={!!errors.scheduledDate || !!errors.scheduledTime}>
      <div className="schedule-inputs">
        <div className="schedule-field">
          <label htmlFor="scheduled-date" className="schedule-label">
            DATA {errors.scheduledDate && <span className="required-asterisk">*</span>}
          </label>
          <input
            id="scheduled-date"
            type="date"
            value={state.scheduledDate}
            onChange={(e) => setters.setScheduledDate(e.target.value)}
            className="match-setup-input"
            required
          />
        </div>

        <div className="schedule-field">
          <label htmlFor="scheduled-time" className="schedule-label">
            HORÁRIO {errors.scheduledTime && <span className="required-asterisk">*</span>}
          </label>
          <input
            id="scheduled-time"
            type="time"
            value={state.scheduledTime}
            onChange={(e) => setters.setScheduledTime(e.target.value)}
            className="match-setup-input"
            required
          />
        </div>
      </div>
    </MatchSetupSection>
  );
};

export default MatchSetupSectionSchedule;
