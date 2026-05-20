import React from 'react';
import { resolvePlayerName } from '../data/players';
import './LiveMatchesCarousel.css';

interface LiveMatch {
  id: string | number;
  players?: { p1: string; p2: string } | string;
  matchState?: Record<string, unknown> | null;
  status?: string;
}

interface LiveMatchesCarouselProps {
  matches: LiveMatch[];
  onMatchClick: (match: LiveMatch) => void;
}

const LiveMatchesCarousel: React.FC<LiveMatchesCarouselProps> = ({ matches, onMatchClick }) => {
  if (matches.length === 0) return null;

  return (
    <div className="live-section" data-testid="live-section">
      <div className="live-section-header">
        <span className="live-section-dot" />
        <span className="live-section-title">Ao Vivo</span>
        <span className="live-section-count">({matches.length})</span>
      </div>

      <div
        className={`live-carousel${matches.length === 1 ? 'live-carousel--single' : ''}`}
        data-testid="live-carousel"
      >
        {matches.map((match) => {
          const p1Name =
            match.players && typeof match.players === 'object'
              ? resolvePlayerName(match.players.p1)
              : 'Jogador 1';
          const p2Name =
            match.players && typeof match.players === 'object'
              ? resolvePlayerName(match.players.p2)
              : 'Jogador 2';

          const ms =
            match.matchState && typeof match.matchState === 'object' ? match.matchState : null;
          const setsObj =
            ms?.sets && typeof ms.sets === 'object' ? (ms.sets as Record<string, number>) : null;
          const currentGame =
            ms?.currentGame && typeof ms.currentGame === 'object'
              ? (ms.currentGame as Record<string, unknown>)
              : null;
          const currentSetState =
            ms?.currentSetState && typeof ms.currentSetState === 'object'
              ? (ms.currentSetState as Record<string, unknown>)
              : null;
          const currentSetGames = currentSetState?.games as Record<string, number> | undefined;
          const pointsObj = currentGame?.points as Record<string, string> | undefined;
          const isTiebreak = Boolean(currentGame?.isTiebreak);
          const isMatchTiebreak = Boolean(currentGame?.isMatchTiebreak);

          // Build partials
          const completedSets = Array.isArray(ms?.completedSets)
            ? (ms!.completedSets as Array<Record<string, unknown>>)
            : [];
          const partials = completedSets
            .map((set) => {
              const games = set.games as Record<string, number> | undefined;
              const tbs = set.tiebreakScore as Record<string, number> | undefined;
              const g1 = games?.PLAYER_1 ?? 0;
              const g2 = games?.PLAYER_2 ?? 0;
              if (tbs) {
                const tb1 = tbs.PLAYER_1 ?? 0;
                const tb2 = tbs.PLAYER_2 ?? 0;
                return set.winner === 'PLAYER_1' ? `${g1}/${g2}(${tb1})` : `${g2}/${g1}(${tb2})`;
              }
              return `${g1}/${g2}`;
            })
            .filter(Boolean);

          return (
            <div
              key={match.id}
              className="live-card"
              onClick={() => onMatchClick(match)}
              data-testid={`live-card-${match.id}`}
            >
              <div className="live-card-players">
                <span className="live-card-player-name">{p1Name}</span>
                <span className="live-card-vs">vs</span>
                <span className="live-card-player-name">{p2Name}</span>
              </div>

              <div className="live-card-score">
                <span className="live-card-score-set">
                  {setsObj?.PLAYER_1 ?? 0}
                  <span className="live-card-score-sep"> - </span>
                  {setsObj?.PLAYER_2 ?? 0}
                </span>
                <span className="live-card-score-game">
                  {currentSetGames?.PLAYER_1 ?? 0}-{currentSetGames?.PLAYER_2 ?? 0}
                </span>
                <span className="live-card-score-game">
                  ({pointsObj?.PLAYER_1 ?? '0'}-{pointsObj?.PLAYER_2 ?? '0'})
                </span>
                {(isTiebreak || isMatchTiebreak) && (
                  <span className="live-card-tiebreak">{isMatchTiebreak ? 'MTB' : 'TB'}</span>
                )}
              </div>

              {partials.length > 0 && (
                <div className="live-card-partials">{partials.join('  ·  ')}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(LiveMatchesCarousel);
