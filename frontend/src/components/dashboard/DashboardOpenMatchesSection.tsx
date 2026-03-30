import React, { useState } from 'react';
import OpenMatchCard from '../OpenMatchCard';
import type { OpenMatch } from '../OpenMatchCard';

interface DashboardOpenMatchesSectionProps {
  openMatches: OpenMatch[];
  openMatchesLoading: boolean;
  onAnnotate: (matchId: string) => void;
}

const DashboardOpenMatchesSection: React.FC<DashboardOpenMatchesSectionProps> = ({
  openMatches,
  openMatchesLoading,
  onAnnotate,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <section className="open-matches-section">
      <button
        className="open-matches-header"
        onClick={() => setIsExpanded((v) => !v)}
        aria-expanded={isExpanded}
        aria-controls="open-matches-list"
      >
        <span className="open-matches-header__left">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            width={15}
            height={15}
            className="open-matches-header__icon"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Partidas aguardando anotador
        </span>
        <span className="open-matches-header__right">
          {!openMatchesLoading && openMatches.length > 0 && (
            <span className="open-matches-badge" aria-label={`${openMatches.length} partidas`}>
              {openMatches.length}
            </span>
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            width={15}
            height={15}
            className={`open-matches-chevron${isExpanded ? '' : 'open-matches-chevron--collapsed'}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      <div
        id="open-matches-list"
        className={`open-matches-body${isExpanded ? '' : 'open-matches-body--hidden'}`}
      >
        {openMatchesLoading ? (
          <p className="open-matches-loading">Carregando...</p>
        ) : (
          <div className="open-matches-list">
            {openMatches.map((m) => (
              <OpenMatchCard key={m.id} match={m} onAnnotate={onAnnotate} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default DashboardOpenMatchesSection;
