// frontend/src/pages/ScoreboardCourtView.tsx
// Extraído de ScoreboardV2.tsx — contém apenas o JSX da quadra.
// ScoreboardV2 permanece como orquestrador (estado, modais, guards).

import React from 'react';
import CourtBackground from '../components/scoreboard/CourtBackground';
import MatchHeader from '../components/scoreboard/MatchHeader';
import PlayerCard from '../components/scoreboard/PlayerCard';
import VSIndicator from '../components/scoreboard/VSIndicator';
import ContextBadges from '../components/scoreboard/ContextBadges';
import ActionBar from '../components/scoreboard/ActionBar';
import AnnotationSessionPanel from '../components/AnnotationSessionPanel';
import CreatorEndMatchPanel from '../components/CreatorEndMatchPanel';
import type { Player, PointDetails, EnhancedMatchState, GamePoint } from '../core/scoring/types';
import type { MatchData } from '../types/scoreboard';

interface ScoreboardCourtViewProps {
  // Layout
  renderKey: number;
  courtAttr: string;
  fontScale: number;
  courtRef: React.RefObject<HTMLDivElement>;
  // Match context
  matchId: string;
  matchData: MatchData;
  currentUser: { id: string; activeRole?: string } | null;
  players: { p1: string; p2: string };
  elapsed: number;
  annotatorCount: number;
  // Scoring state
  state: EnhancedMatchState;
  serveStep: 'none' | 'second';
  canUndo: boolean;
  pointsHistory: PointDetails[];
  // Computed point status
  isTiebreak: boolean;
  isDeuce: boolean;
  p1HasAdv: boolean;
  p2HasAdv: boolean;
  p1Score: GamePoint | number;
  p2Score: GamePoint | number;
  p1Games: number;
  p2Games: number;
  p1Sets: number;
  p2Sets: number;
  p1MatchPt: boolean;
  p2MatchPt: boolean;
  p1AtSetPt: boolean;
  p2AtSetPt: boolean;
  isBreakPoint: boolean;
  returner: Player;
  // Navigation & global actions
  onBack: () => void;
  onMenu: () => void;
  onEditMatch?: () => void;
  onDeleteMatch: () => void;
  // Point handlers
  onPointDetailsOpen: (player: Player) => void;
  onServeErrorOpen: (type: 'out' | 'net', step: 'first' | 'second') => void;
  onFault: () => void;
  onUndoOpen: () => void;
  onAce: () => void;
  onFontScaleInc: () => void;
  onFontScaleDec: () => void;
  onEditScore: () => void;
  // ActionBar misc
  isServeErrorModalOpen: boolean;
  isMatchFinalized: boolean;
  // Ball exchanges
  ballExchangeCount: number;
  onBallExchangeIncrement: () => void;
  onBallExchangeReset: () => void;
  // Session handlers
  onMatchEnded: () => void;
}

export const ScoreboardCourtView: React.FC<ScoreboardCourtViewProps> = ({
  renderKey,
  courtAttr,
  fontScale,
  courtRef,
  matchId,
  matchData,
  currentUser,
  players,
  elapsed,
  annotatorCount,
  state,
  serveStep,
  canUndo,
  pointsHistory,
  isTiebreak,
  isDeuce,
  p1HasAdv,
  p2HasAdv,
  p1Score,
  p2Score,
  p1Games,
  p2Games,
  p1Sets,
  p2Sets,
  p1MatchPt,
  p2MatchPt,
  p1AtSetPt,
  p2AtSetPt,
  isBreakPoint,
  returner,
  onBack,
  onMenu,
  onEditMatch,
  onDeleteMatch,
  onPointDetailsOpen,
  onServeErrorOpen,
  onFault,
  onUndoOpen,
  onAce,
  onFontScaleInc,
  onFontScaleDec,
  onEditScore,
  isServeErrorModalOpen,
  isMatchFinalized,
  ballExchangeCount,
  onBallExchangeIncrement,
  onBallExchangeReset,
  onMatchEnded,
}) => {
  return (
    <div
      className="scoreboard-v2-court"
      data-render={renderKey}
      data-court={courtAttr}
      style={
        {
          '--sb-scale': String(fontScale),
          '--score-size-user': `calc(var(--score-size) * ${fontScale})`,
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <MatchHeader
        sportType={matchData.sportType}
        completedSets={state.completedSets ?? []}
        elapsed={elapsed}
        onBack={onBack}
        onMenu={onMenu}
        onEdit={onEditMatch}
      />

      {/* Botão excluir partida — só para criador em NOT_STARTED */}
      {currentUser?.id &&
        matchData.createdByUserId === currentUser.id &&
        matchData.status === 'NOT_STARTED' && (
          <button
            className="sb-delete-match-btn"
            onClick={onDeleteMatch}
            title="Excluir esta partida"
          >
            🗑 Excluir Partida
          </button>
        )}

      {/* Annotators badge */}
      {annotatorCount > 0 && (
        <div
          className="annotator-badge"
          aria-label={`${annotatorCount} anotador${annotatorCount !== 1 ? 'es' : ''} cobrindo esta partida`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          {annotatorCount} anotador{annotatorCount !== 1 ? 'es' : ''}
        </div>
      )}

      {/* Quadra */}
      <div className="court-container" ref={courtRef}>
        <CourtBackground />

        <ContextBadges
          isTiebreak={isTiebreak}
          isMatchTiebreak={state.currentGame?.isMatchTiebreak ?? false}
          isMatchPoint={p1MatchPt || p2MatchPt}
          isSetPoint={(p1AtSetPt || p2AtSetPt) && !(p1MatchPt || p2MatchPt)}
          isBreakPoint={isBreakPoint && !(p1AtSetPt || p2AtSetPt)}
          pointsHistory={pointsHistory}
          elapsed={elapsed}
          playerNames={{ PLAYER_1: players.p1, PLAYER_2: players.p2 }}
          serverName={state.server === 'PLAYER_1' ? players.p1 : players.p2}
        />

        <div className="players-row">
          <PlayerCard
            player="PLAYER_1"
            name={players.p1}
            code={
              matchData.player1GlobalId
                ? `[${matchData.player1GlobalId.slice(0, 8).toUpperCase()}]`
                : undefined
            }
            score={p1Score}
            games={p1Games}
            sets={p1Sets}
            isServing={state.server === 'PLAYER_1'}
            serveStep={serveStep}
            isTiebreak={isTiebreak}
            isMatchPoint={p1MatchPt}
            isSetPoint={p1AtSetPt && !p1MatchPt}
            isBreakPoint={isBreakPoint && returner === 'PLAYER_1'}
            isAdvantage={p1HasAdv}
            isDeuce={isDeuce}
            disabled={state.isFinished}
            onPress={() => onPointDetailsOpen('PLAYER_1')}
            onSwipeDown={() => {
              if (canUndo) onUndoOpen();
            }}
          />

          <VSIndicator
            isTiebreak={isTiebreak}
            isMatchTiebreak={state.currentGame?.isMatchTiebreak ?? false}
            isDeuce={isDeuce}
            tiebreakChangeAt={6}
            tiebreakTotalPoints={
              isTiebreak
                ? (typeof p1Score === 'number' ? p1Score : 0) +
                  (typeof p2Score === 'number' ? p2Score : 0)
                : 0
            }
          />

          <PlayerCard
            player="PLAYER_2"
            name={players.p2}
            code={
              matchData.player2GlobalId
                ? `[${matchData.player2GlobalId.slice(0, 8).toUpperCase()}]`
                : undefined
            }
            score={p2Score}
            games={p2Games}
            sets={p2Sets}
            isServing={state.server === 'PLAYER_2'}
            serveStep={serveStep}
            isTiebreak={isTiebreak}
            isMatchPoint={p2MatchPt}
            isSetPoint={p2AtSetPt && !p2MatchPt}
            isBreakPoint={isBreakPoint && returner === 'PLAYER_2'}
            isAdvantage={p2HasAdv}
            isDeuce={isDeuce}
            disabled={state.isFinished}
            onPress={() => onPointDetailsOpen('PLAYER_2')}
            onSwipeDown={() => {
              if (canUndo) onUndoOpen();
            }}
          />
        </div>

        {/* Banner de partida finalizada */}
        {state.isFinished && state.winner && (
          <div className="match-finished-banner">
            <h2>🏆 PARTIDA FINALIZADA!</h2>
            <p className="winner-label-banner">VENCEDOR:</p>
            <p className="winner-name">{state.winner === 'PLAYER_1' ? players.p1 : players.p2}</p>
            <p className="final-score">
              Placar Final: {state.sets.PLAYER_1} sets x {state.sets.PLAYER_2} sets
            </p>
            <div className="finished-actions">
              <button className="finished-action-btn" onClick={onBack}>
                <span aria-hidden="true">📊</span> Ver Estatísticas
              </button>
              <button
                className="finished-action-btn"
                onClick={() => window.location.assign('/matches/new')}
              >
                <span aria-hidden="true">🎾</span> Nova Partida
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ActionBar (saque + undo + quem venceu o ponto) */}
      <ActionBar
        canUndo={canUndo}
        isFinished={state.isFinished ?? false}
        serveStep={serveStep}
        server={state.server ?? 'PLAYER_1'}
        playerNames={{ PLAYER_1: players.p1, PLAYER_2: players.p2 }}
        onUndo={onUndoOpen}
        onAce={onAce}
        onOut={() => onServeErrorOpen('out', 'first')}
        onNet={() => onServeErrorOpen('net', 'first')}
        onFault={onFault}
        onFaultOut={() => onServeErrorOpen('out', 'second')}
        onFaultNet={() => onServeErrorOpen('net', 'second')}
        fontScale={fontScale}
        onFontScaleInc={onFontScaleInc}
        onFontScaleDec={onFontScaleDec}
        onEditScore={onEditScore}
        isModalOpen={isServeErrorModalOpen}
        isMatchFinalized={isMatchFinalized}
        ballExchangeCount={ballExchangeCount}
        onBallExchangeIncrement={onBallExchangeIncrement}
      />

      {/* Painel de sessões de anotação */}
      {matchId && currentUser && (
        <AnnotationSessionPanel
          matchId={matchId}
          matchStatus={matchData?.status ?? 'NOT_STARTED'}
          currentUserId={currentUser.id}
          userRole={currentUser.activeRole}
        />
      )}

      {/* Painel para criador encerrar partida manualmente */}
      {matchId && currentUser && matchData && (
        <CreatorEndMatchPanel
          matchId={matchId}
          isCreator={matchData.createdByUserId === currentUser.id}
          matchStatus={matchData.status}
          onMatchEnded={onMatchEnded}
        />
      )}
    </div>
  );
};
