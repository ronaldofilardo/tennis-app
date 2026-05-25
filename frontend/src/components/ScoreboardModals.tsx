import React from 'react';
import MatchStatsModal from './MatchStatsModal';
import ServerEffectModal from './ServerEffectModal';
import PointDetailsModal from './PointDetailsModal';
import EditMatchModal from './EditMatchModal';
import type { EditableMatch } from './EditMatchModal';
import { UndoConfirmModal } from './scoreboard/UndoConfirmModal';
import { EditScoreModal } from './scoreboard/EditScoreModal';
import { ConfirmDeleteMatchModal } from './ConfirmDeleteMatchModal';
import ResumeAnnotationModal from './ResumeAnnotationModal';
import type { MatchData } from '../types/match';
import type { FirstServeError } from '../state/scoreboardUIState';
import type { RallyDetails } from '../core/scoring/types';

interface ScoreboardModalsProps {
  // Stats
  isStatsOpen: boolean;
  onStatsClose: () => void;
  statsData: object;
  matchId: string;
  playerNames: { p1: string; p2: string };

  // Server Effect
  isServerEffectOpen: boolean;
  onServerEffectClose: () => void;
  playerInFocus: string | null;
  onServerEffectConfirm: () => void;
  fontScale: number;

  // Serve Error
  isServeErrorModalOpen: boolean;
  pendingServeError: FirstServeError | null;
  serverState: string;
  onServeErrorConfirm: () => void;
  onServeErrorCancel: () => void;

  // Point Details
  isPointDetailsOpen: boolean;
  pendingPointPlayer: string | null;
  serverState: string;
  playersWithCode: { PLAYER_1: string; PLAYER_2: string };
  onPointDetailsConfirm: (details: RallyDetails | undefined, ballExchangeCount?: number) => void;
  onPointDetailsCancel: () => void;
  ballExchangeCount?: number;

  // Edit Match
  editMatchOpen: boolean;
  matchData: MatchData | null;
  onEditMatchClose: () => void;
  onEditMatchSaved: (updated: EditableMatch) => void;

  // Undo Confirm
  undoModalOpen: boolean;
  onUndoModalClose: () => void;
  lastPoint: object | null;
  onUndoConfirm: () => void;
  playerNamesForUndo: { PLAYER_1: string; PLAYER_2: string };

  // Edit Score
  editScoreModalOpen: boolean;
  onEditScoreClose: () => void;
  onEditScoreConfirm: (setWinners: string[], server: string) => void;
  currentSets: { PLAYER_1: number; PLAYER_2: number };
  completedSets: object[];

  // Delete Match
  deleteModalOpen: boolean;
  onDeleteModalClose: () => void;
  onDeleteConfirm: (matchId: string) => void;

  // Resume Annotation
  showResumeModal: boolean;
  suspendedSession: object | null;
  currentUser: { name: string } | null;
  previousAnnotationPoints: number;
  onResumeAnnotation: () => void;
  onStartNewAnnotation: () => void;
  onDiscardAnnotation: () => void;
}

const ScoreboardModals: React.FC<ScoreboardModalsProps> = ({
  isStatsOpen,
  onStatsClose,
  statsData,
  matchId,
  playerNames,
  isServerEffectOpen,
  onServerEffectClose,
  playerInFocus,
  onServerEffectConfirm,
  fontScale,
  isServeErrorModalOpen,
  pendingServeError,
  serverState,
  onServeErrorConfirm,
  onServeErrorCancel,
  isPointDetailsOpen,
  pendingPointPlayer,
  playersWithCode,
  onPointDetailsConfirm,
  onPointDetailsCancel,
  ballExchangeCount,
  editMatchOpen,
  matchData,
  onEditMatchClose,
  onEditMatchSaved,
  undoModalOpen,
  onUndoModalClose,
  lastPoint,
  onUndoConfirm,
  playerNamesForUndo,
  editScoreModalOpen,
  onEditScoreClose,
  onEditScoreConfirm,
  currentSets,
  completedSets,
  deleteModalOpen,
  onDeleteModalClose,
  onDeleteConfirm,
  showResumeModal,
  suspendedSession,
  currentUser,
  previousAnnotationPoints,
  onResumeAnnotation,
  onStartNewAnnotation,
  onDiscardAnnotation,
}) => {
  return (
    <>
      <MatchStatsModal
        isOpen={isStatsOpen}
        onClose={onStatsClose}
        matchId={matchId}
        playerNames={playerNames}
        stats={statsData}
      />
      <ServerEffectModal
        isOpen={isServerEffectOpen}
        playerInFocus={playerInFocus || 'PLAYER_1'}
        onConfirm={onServerEffectConfirm}
        onCancel={onServerEffectClose}
        fontScale={fontScale}
      />
      <ServerEffectModal
        isOpen={isServeErrorModalOpen}
        playerInFocus={serverState ?? 'PLAYER_1'}
        context="error"
        errorType={pendingServeError?.errorType}
        serveStep={pendingServeError?.serveStep ?? 'first'}
        onConfirm={onServeErrorConfirm}
        onCancel={onServeErrorCancel}
        fontScale={fontScale}
      />
      <PointDetailsModal
        isOpen={isPointDetailsOpen}
        playerWinner={pendingPointPlayer || 'PLAYER_1'}
        currentServer={serverState}
        playerNames={playersWithCode}
        onConfirm={onPointDetailsConfirm}
        onCancel={onPointDetailsCancel}
        fontScale={fontScale}
        ballExchangeCount={ballExchangeCount}
      />
      {editMatchOpen && matchData && (
        <EditMatchModal
          match={{
            id: matchData.id,
            nickname: matchData.nickname,
            scheduledAt: matchData.scheduledAt,
            venueId: matchData.venueId,
            venue: matchData.venue,
            visibility: matchData.visibility,
            openForAnnotation: matchData.openForAnnotation,
            createdByUserId: matchData.createdByUserId,
          }}
          isOpen={editMatchOpen}
          onClose={onEditMatchClose}
          onSaved={onEditMatchSaved}
        />
      )}
      <UndoConfirmModal
        isOpen={undoModalOpen}
        lastPoint={lastPoint}
        playerNames={playerNamesForUndo}
        onConfirm={onUndoConfirm}
        onCancel={onUndoModalClose}
      />
      <EditScoreModal
        isOpen={editScoreModalOpen}
        matchFormat={matchData?.format || 'BEST_OF_3'}
        playerNames={playerNames}
        currentSets={currentSets}
        currentServer={serverState ?? 'PLAYER_1'}
        completedSets={completedSets}
        onConfirm={onEditScoreConfirm}
        onCancel={onEditScoreClose}
      />
      {matchData && (
        <ConfirmDeleteMatchModal
          isOpen={deleteModalOpen}
          matchId={matchData.id}
          players={playerNames}
          onConfirm={onDeleteConfirm}
          onCancel={onDeleteModalClose}
        />
      )}
      {suspendedSession && matchData && (
        <ResumeAnnotationModal
          isOpen={showResumeModal}
          onResume={onResumeAnnotation}
          onStartNew={onStartNewAnnotation}
          onDiscard={onDiscardAnnotation}
          annotatorName={currentUser?.name || 'Anotador'}
          previousPointsCount={previousAnnotationPoints || 0}
          matchScore={{
            p1: matchData.sets?.PLAYER_1 ?? 0,
            p2: matchData.sets?.PLAYER_2 ?? 0,
            format: matchData.format,
          }}
        />
      )}
    </>
  );
};

export default ScoreboardModals;
