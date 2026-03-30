import React, { useState } from 'react';
import AnnotatedMatchCard from '../AnnotatedMatchCard';
import type { AnnotatedMatch } from '../AnnotatedMatchCard';

interface DashboardAnnotatedSectionProps {
  annotatedMatches: AnnotatedMatch[];
  annotatedByMe: AnnotatedMatch[];
  annotatedLoading: boolean;
  onViewReport: (sessionId: string, matchId: string) => void;
  onViewComparison: (matchId: string) => void;
  onDismiss: (matchId: string) => void;
  onClaim: (matchId: string) => Promise<void>;
}

const DashboardAnnotatedSection: React.FC<DashboardAnnotatedSectionProps> = ({
  annotatedMatches,
  annotatedByMe,
  annotatedLoading,
  onViewReport,
  onViewComparison,
  onDismiss,
  onClaim,
}) => {
  const [annotatedTab, setAnnotatedTab] = useState<'player' | 'annotator'>('player');

  return (
    <section className="annotated-section">
      <div className="annotated-section__header">
        <h3 className="annotated-section__title">
          Partidas Anotadas
          {annotatedMatches.some((m) => m.isNew) && (
            <span className="annotated-section__badge" aria-label="Novas notificações">
              {annotatedMatches.filter((m) => m.isNew).length}
            </span>
          )}
        </h3>
        <div className="annotated-section__tabs" role="tablist">
          <button
            role="tab"
            aria-selected={annotatedTab === 'player'}
            className={`annotated-section__tab${annotatedTab === 'player' ? 'annotated-section__tab--active' : ''}`}
            onClick={() => setAnnotatedTab('player')}
          >
            Fui anotado
            {annotatedMatches.length > 0 && (
              <span className="annotated-section__tab-count">{annotatedMatches.length}</span>
            )}
          </button>
          <button
            role="tab"
            aria-selected={annotatedTab === 'annotator'}
            className={`annotated-section__tab${annotatedTab === 'annotator' ? 'annotated-section__tab--active' : ''}`}
            onClick={() => setAnnotatedTab('annotator')}
          >
            Minhas anotações
            {annotatedByMe.length > 0 && (
              <span className="annotated-section__tab-count">{annotatedByMe.length}</span>
            )}
          </button>
        </div>
      </div>

      {annotatedLoading ? (
        <p className="annotated-section__loading">Carregando...</p>
      ) : (
        <div className="annotated-section__list">
          {annotatedTab === 'player' ? (
            annotatedMatches.length === 0 ? (
              <p className="annotated-section__empty">Nenhuma partida sua foi anotada ainda.</p>
            ) : (
              annotatedMatches.map((m) => (
                <AnnotatedMatchCard
                  key={m.id}
                  match={m}
                  viewerRole="PLAYER"
                  onViewReport={onViewReport}
                  onViewComparison={onViewComparison}
                  onDismiss={onDismiss}
                  onClaim={onClaim}
                />
              ))
            )
          ) : annotatedByMe.length === 0 ? (
            <p className="annotated-section__empty">Você ainda não encerrou nenhuma anotação.</p>
          ) : (
            annotatedByMe.map((m) => (
              <AnnotatedMatchCard
                key={m.id}
                match={m}
                viewerRole="ANNOTATOR"
                onViewReport={onViewReport}
                onViewComparison={onViewComparison}
                onDismiss={onDismiss}
              />
            ))
          )}
        </div>
      )}
    </section>
  );
};

export default DashboardAnnotatedSection;
