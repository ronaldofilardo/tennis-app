/**
 * MatchSetupForm — Componente refatorado que renderiza todas as seções
 * Reutiliza os componentes de seção individual
 */

import React, { useCallback } from 'react';
import { useMatchSetup } from '../contexts/MatchSetup';
import MatchSetupSectionSport from './MatchSetupSectionSport';
import MatchSetupSectionCourt from './MatchSetupSectionCourt';
import MatchSetupSectionPlayers from './MatchSetupSectionPlayers';
import MatchSetupSectionFormat from './MatchSetupSectionFormat';
import MatchSetupSectionSchedule from './MatchSetupSectionSchedule';
import MatchSetupSectionDetails from './MatchSetupSectionDetails';
import MatchSetupSectionTournament from './MatchSetupSectionTournament';
import MatchSetupSectionConditions from './MatchSetupSectionConditions';
import MatchSetupActions from './MatchSetupActions';
import './MatchSetupForm.css';

interface MatchSetupFormProps {
  onCreateNewAthlete1: () => void;
  onCreateNewAthlete2: () => void;
  onLocateClick: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

/**
 * MatchSetupForm — Container que renderiza 8 seções + ações
 */
const MatchSetupForm: React.FC<MatchSetupFormProps> = ({
  onCreateNewAthlete1,
  onCreateNewAthlete2,
  onLocateClick,
  onSubmit,
  isSubmitting,
}) => {
  const { canSubmit, getMissingRequiredFields } = useMatchSetup();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit(e);
    },
    [onSubmit],
  );

  return (
    <form onSubmit={handleSubmit} className="match-setup-form">
      <MatchSetupSectionSport index={0} />
      <MatchSetupSectionCourt index={1} />
      <MatchSetupSectionPlayers
        index={2}
        onCreateNewAthlete1={onCreateNewAthlete1}
        onCreateNewAthlete2={onCreateNewAthlete2}
      />
      <MatchSetupSectionFormat index={3} />
      <MatchSetupSectionSchedule index={4} />
      <MatchSetupSectionDetails index={5} />
      <MatchSetupSectionTournament index={6} />
      <MatchSetupSectionConditions index={7} />
      <MatchSetupActions
        index={8}
        onLocateClick={onLocateClick}
        onSubmitClick={() => {}}
        isSubmitting={isSubmitting}
        canSubmit={canSubmit()}
        missingFields={getMissingRequiredFields()}
      />
    </form>
  );
};

export default MatchSetupForm;
