/**
 * MatchSetupSectionPlayers — Seção de Jogadores (P1 vs P2)
 */

import React from 'react';
import { useMatchSetup } from '../contexts/MatchSetup';
import MatchSetupSection from './MatchSetupSection';
import MyAthleteDropdown from './MyAthleteDropdown';

interface MatchSetupSectionPlayersProps {
  index: number;
  onCreateNewAthlete1: () => void;
  onCreateNewAthlete2: () => void;
}

const MatchSetupSectionPlayers: React.FC<MatchSetupSectionPlayersProps> = ({
  index,
  onCreateNewAthlete1,
  onCreateNewAthlete2,
}) => {
  const { state, setters, errors } = useMatchSetup();
  const isKids = state.format === 'KIDS_2V2';

  const label1 = isKids ? 'Dupla A' : 'Jogador 1';
  const label2 = isKids ? 'Dupla B' : 'Jogador 2';
  const placeholder = isKids ? 'ex: Pedro + João...' : 'Selecione um atleta...';

  return (
    <MatchSetupSection index={index} hasError={!!errors.player1 || !!errors.player2}>
      <div className="players-container">
        <div className="player-input">
          <label className="player-label">
            {label1} {errors.player1 && <span className="required-asterisk">*</span>}
          </label>
          <MyAthleteDropdown
            value={state.selectedAthlete1}
            onSelect={setters.setSelectedAthlete1}
            onCreateNew={onCreateNewAthlete1}
            placeholder={placeholder}
          />
        </div>

        <div className="players-vs">{isKids ? '🎾' : 'vs'}</div>

        <div className="player-input">
          <label className="player-label">
            {label2} {errors.player2 && <span className="required-asterisk">*</span>}
          </label>
          <MyAthleteDropdown
            value={state.selectedAthlete2}
            onSelect={setters.setSelectedAthlete2}
            onCreateNew={onCreateNewAthlete2}
            placeholder={placeholder}
          />
        </div>
      </div>
    </MatchSetupSection>
  );
};

export default MatchSetupSectionPlayers;
