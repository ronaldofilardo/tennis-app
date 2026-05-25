/**
 * MatchSetupSectionDetails — Seção de Detalhes (Nickname, Visibility, Opções)
 */

import React from 'react';
import { useMatchSetup } from '../contexts/MatchSetup';
import MatchSetupSection from './MatchSetupSection';

const MatchSetupSectionDetails: React.FC<{ index: number }> = ({ index }) => {
  const { state, setters } = useMatchSetup();

  return (
    <MatchSetupSection index={index}>
      <div className="detail-fields">
        {/* Apelido */}
        <div className="detail-field">
          <label htmlFor="nickname" className="detail-label">
            Apelido (opcional)
          </label>
          <input
            id="nickname"
            type="text"
            value={state.nickname}
            onChange={(e) => setters.setNickname(e.target.value)}
            placeholder="Ex: Desafio Amigos"
            className="match-setup-input"
          />
        </div>

        {/* Visibilidade */}
        <div className="detail-field">
          <label htmlFor="visibility" className="detail-label">
            Visibilidade
          </label>
          <select
            id="visibility"
            value={state.visibility}
            onChange={(e) =>
              setters.setVisibility(e.target.value as 'PUBLIC' | 'CLUB' | 'PLAYERS_ONLY')
            }
            className="match-setup-select"
          >
            <option value="PLAYERS_ONLY">👥 Apenas os Jogadores</option>
            <option value="CLUB">🏛️ Clube</option>
            <option value="PUBLIC">🌐 Pública</option>
          </select>
        </div>

        {/* Opções com Checkboxes */}
        <div className="options-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={state.isResuming}
              onChange={(e) => setters.setIsResuming(e.target.checked)}
            />
            <span>Retomar jogo em andamento</span>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={state.openForAnnotation}
              onChange={(e) => setters.setOpenForAnnotation(e.target.checked)}
            />
            <span>Abrir para anotação por qualquer usuário</span>
          </label>
        </div>
      </div>
    </MatchSetupSection>
  );
};

export default MatchSetupSectionDetails;
