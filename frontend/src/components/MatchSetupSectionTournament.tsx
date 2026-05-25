/**
 * MatchSetupSectionTournament — Seção de Torneio (opcional)
 */

import React from 'react';
import { useMatchSetup } from '../contexts/MatchSetup';
import MatchSetupSection from './MatchSetupSection';

const MatchSetupSectionTournament: React.FC<{ index: number }> = ({ index }) => {
  const { state, setters } = useMatchSetup();

  return (
    <MatchSetupSection index={index}>
      <div className="tournament-fields">
        <div className="tournament-field">
          <label htmlFor="tournament-name" className="tournament-label">
            Torneio
          </label>
          <input
            id="tournament-name"
            type="text"
            value={state.tournamentName}
            onChange={(e) => setters.setTournamentName(e.target.value)}
            placeholder="Ex: Copa Clube 2026"
            className="match-setup-input"
          />
        </div>

        <div className="tournament-field">
          <label htmlFor="round-name" className="tournament-label">
            Rodada
          </label>
          <input
            id="round-name"
            type="text"
            value={state.roundName}
            onChange={(e) => setters.setRoundName(e.target.value)}
            placeholder="Ex: Oitavas, Semifinal, Final"
            className="match-setup-input"
          />
        </div>

        <div className="tournament-field">
          <label htmlFor="bracket-type" className="tournament-label">
            Tipo de Chave
          </label>
          <select
            id="bracket-type"
            value={state.bracketType}
            onChange={(e) =>
              setters.setBracketType(e.target.value as 'ELIMINATION' | 'GROUPS' | 'SWISS')
            }
            className="match-setup-select"
          >
            <option value="ELIMINATION">🏆 Eliminatória</option>
            <option value="GROUPS">👥 Grupos</option>
            <option value="SWISS">⚔️ Suíço</option>
          </select>
        </div>
      </div>
    </MatchSetupSection>
  );
};

export default MatchSetupSectionTournament;
