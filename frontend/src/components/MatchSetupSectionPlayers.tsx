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

  return (
    <MatchSetupSection index={index} hasError={!!errors.player1 || !!errors.player2}>
      <div className="players-container">
        <div className="player-input">
          <label className="player-label">
            Jogador 1 {errors.player1 && <span className="required-asterisk">*</span>}
          </label>
          <MyAthleteDropdown
            value={state.selectedAthlete1}
            onSelect={setters.setSelectedAthlete1}
            onCreateNew={onCreateNewAthlete1}
            placeholder="Selecione um atleta..."
          />
        </div>

        <div className="players-vs">vs</div>

        <div className="player-input">
          <label className="player-label">
            Jogador 2 {errors.player2 && <span className="required-asterisk">*</span>}
          </label>
          <MyAthleteDropdown
            value={state.selectedAthlete2}
            onSelect={setters.setSelectedAthlete2}
            onCreateNew={onCreateNewAthlete2}
            placeholder="Selecione um atleta..."
          />
        </div>
      </div>
    </MatchSetupSection>
  );
};

export default MatchSetupSectionPlayers;
