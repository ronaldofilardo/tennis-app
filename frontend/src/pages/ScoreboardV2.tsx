// frontend/src/pages/ScoreboardV2.tsx (Fluxo de saque final e correto)

import React, { useState, useCallback, useEffect } from 'react';
import { httpClient } from '../config/httpClient';
import LoadingIndicator from '../components/LoadingIndicator';
import type { PointDetails } from '../core/scoring/types';
import type { EditableMatch } from '../components/EditMatchModal';
import type { SetEditData } from '../components/scoreboard/EditScoreModal';
import { resolvePlayerName } from '../data/players';
import { ErrorBoundary } from '../components/ErrorBoundary';
import ReopenMatchPanel from '../components/ReopenMatchPanel';
import SetupModal from '../components/scoreboard/SetupModal';
import ScoreboardModals from '../components/ScoreboardModals';
import { ScoreboardCourtView } from './ScoreboardCourtView';
import { useScoreboardEngine } from '../hooks/useScoreboardEngine';
import { useCreatorManagerMode } from '../hooks/useCreatorManagerMode';
import { useShakeDetection } from '../hooks/useGestures';
import '../styles/scoreboard-tokens.css';
import './ScoreboardV2.css';

const ScoreboardV2: React.FC<{ onEndMatch: () => void }> = ({ onEndMatch }) => {
  const {
    matchId,
    navigate,
    currentUser,
    matchData,
    setMatchData,
    isLoading,
    error,
    isSetupOpen,
    elapsed,
    renderKey,
    annotatorCount,
    scoringSystemRef,
    getSystem,
    fontScale,
    handleFontScaleInc,
    handleFontScaleDec,
    courtRef,
    isStatsOpen,
    setIsStatsOpen,
    statsData,
    isServerEffectOpen,
    setIsServerEffectOpen,
    playerInFocus,
    setPlayerInFocus,
    isPointDetailsOpen,
    pendingPointPlayer,
    isServeErrorModalOpen,
    pendingServeError,
    editMatchOpen,
    setEditMatchOpen,
    serveStep,
    handleEndMatch,
    handleSetupConfirm,
    handlePointDetailsOpen,
    handlePointDetailsConfirm,
    handlePointDetailsCancel,
    handleFault,
    handleUndo,
    getLastPointDetails,
    handleEditScore,
    handleServerEffectConfirm,
    handleServeErrorOpen,
    handleServeErrorConfirm,
    handleServeErrorCancel,
    fetchStats,
    suspendedSession,
    previousAnnotationPoints,
    clearSuspendedSession,
  } = useScoreboardEngine(onEndMatch);

  // ── Hook: Verificar se é criador em modo manager (DEVE vir no topo) ──────────
  const isCreatorManager = useCreatorManagerMode(matchData);

  const [undoModalOpen, setUndoModalOpen] = useState(false);
  const [editScoreModalOpen, setEditScoreModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [openEditScoreAfterResume, setOpenEditScoreAfterResume] = useState(false);

  // Detectar sessão suspensa e abrir modal
  // IMPORTANTE: NÃO mostrar para partidas recém-criadas (NOT_STARTED) — elas devem configurar quem começa sacando primeiro
  useEffect(() => {
    if (suspendedSession && matchData?.status !== 'NOT_STARTED') {
      setShowResumeModal(true);
    }
  }, [suspendedSession, matchData?.status]);

  // Handler para retomar anotação suspensa
  const handleResumeAnnotation = useCallback(async () => {
    if (!suspendedSession) return;
    try {
      // Reativar sessão existente
      const res = await httpClient.patch(`/matches/${matchId}/sessions/${suspendedSession.id}`, {
        isActive: true,
        status: 'IN_PROGRESS',
      });
      if (res.ok) {
        // Se houver matchStateSnapshot, restaurar no TennisScoring
        if (suspendedSession.matchStateSnapshot) {
          try {
            const system = getSystem?.();
            if (system) {
              const restoredState = JSON.parse(suspendedSession.matchStateSnapshot);
              system.loadState(restoredState);
              // ✅ loadState() chama automaticamente setSnapshotFloor()
              // Mas podemos confirmar aqui se necessário
              console.log(
                '[ScoreboardV2] ✅ Snapshot floor definido automaticamente via loadState',
                {
                  matchId,
                  pointsCount: restoredState.pointsHistory?.length ?? 0,
                },
              );
            }
          } catch (parseErr) {
            console.warn('[ScoreboardV2] Falha ao restaurar estado anterior:', parseErr);
          }
        }

        setShowResumeModal(false);
        // Abrir EditScoreModal para permitir edição do placar
        setOpenEditScoreAfterResume(true);
        clearSuspendedSession();
      }
    } catch (err) {
      console.error('Erro ao retomar anotação:', err);
    }
  }, [suspendedSession, matchId, clearSuspendedSession, getSystem]);

  // Handler para começar nova anotação
  const handleStartNewAnnotation = useCallback(() => {
    setShowResumeModal(false);
    setOpenEditScoreAfterResume(false);
    clearSuspendedSession();
    // A sessão será criada automaticamente pelo próximo POST /sessions
  }, [clearSuspendedSession]);

  // Handler para descartar anotação suspensa
  const handleDiscardAnnotation = useCallback(() => {
    setShowResumeModal(false);
    setOpenEditScoreAfterResume(false);
    clearSuspendedSession();
    navigate('/dashboard');
  }, [clearSuspendedSession, navigate]);

  // Abrir EditScoreModal quando retomar anotação
  useEffect(() => {
    if (openEditScoreAfterResume) {
      setEditScoreModalOpen(true);
      setOpenEditScoreAfterResume(false);
    }
  }, [openEditScoreAfterResume]);

  useShakeDetection({
    onShake: useCallback(() => {
      const sys = getSystem?.();
      if (sys?.canUndo()) {
        setUndoModalOpen(true);
      }
    }, [getSystem]),
  });

  if (isLoading) return <LoadingIndicator />;
  if (error) {
    return (
      <div className="scoreboard-error">
        Erro: {error} <button onClick={() => navigate('/dashboard')}>Voltar</button>
      </div>
    );
  }
  if (!matchData) {
    return (
      <div className="scoreboard-error">
        Partida não encontrada ou dados incompletos.{' '}
        <button onClick={() => navigate('/dashboard')}>Voltar</button>
      </div>
    );
  }
  if (!('format' in matchData) || !matchData.format) {
    return (
      <div className="scoreboard-error">
        Partida sem configuração de formato.{' '}
        <button onClick={() => navigate('/dashboard')}>Voltar</button>
      </div>
    );
  }

  if (isCreatorManager) {
    // Creator/Admin mode: Show scoreboard normally, full functionality available
  }

  // ── Derivar scoringSystem do ref para uso no render (read-only, imutável aqui) ──
  const scoringSystem = scoringSystemRef.current;

  if (!scoringSystem) {
    return <div className="scoreboard-error">Dados da partida não puderam ser inicializados.</div>;
  }

  const state = scoringSystem.getState();
  // Resolve e-mails/ids para nomes amigáveis de exibição
  const players = {
    p1: resolvePlayerName(matchData.players.p1),
    p2: resolvePlayerName(matchData.players.p2),
  };

  // Nomes com código prefixado para uso no PointDetailsModal
  const codeP1 = matchData.player1GlobalId
    ? `[${matchData.player1GlobalId.slice(0, 8).toUpperCase()}]`
    : null;
  const codeP2 = matchData.player2GlobalId
    ? `[${matchData.player2GlobalId.slice(0, 8).toUpperCase()}]`
    : null;
  const playersWithCode = {
    PLAYER_1: codeP1 ? `${codeP1} ${players.p1}` : players.p1,
    PLAYER_2: codeP2 ? `${codeP2} ${players.p2}` : players.p2,
  };

  const isTiebreak = state.currentGame?.isTiebreak || false;

  if (isSetupOpen) {
    return (
      <SetupModal
        isOpen={isSetupOpen}
        players={players}
        format={matchData.format}
        onConfirm={handleSetupConfirm}
        onCancel={() => navigate('/dashboard')}
      />
    );
  }

  // Partidas finalizadas: verificar se há sessão ativa para continuar
  if (matchData?.status === 'FINISHED') {
    // Se houver anotação em andamento, permitir continuar
    const hasActiveSession = (matchData as any).annotationSessions?.some(
      (s: any) => s.status === 'IN_PROGRESS' && s.isActive,
    );

    const isCreator = matchData.createdByUserId === currentUser?.id;

    // Se há sessão ativa ou se é criador, mostrar opção de reabrir
    if (hasActiveSession || isCreator) {
      return (
        <ReopenMatchPanel
          matchId={matchId}
          isCreator={isCreator}
          hasActiveSession={hasActiveSession}
          onReopened={() => {
            // Recarregar dados da partida
            window.location.reload();
          }}
        />
      );
    }

    // Caso contrário, redirecionar para dashboard
    navigate('/dashboard');
    return null;
  }

  // ── Contexto e estados especiais do ponto ──────────────────────────────────
  const p1Score = state.currentGame?.points?.PLAYER_1 ?? '0';
  const p2Score = state.currentGame?.points?.PLAYER_2 ?? '0';
  const p1Games = state.currentSetState?.games?.PLAYER_1 ?? 0;
  const p2Games = state.currentSetState?.games?.PLAYER_2 ?? 0;
  const p1Sets = state.sets?.PLAYER_1 ?? 0;
  const p2Sets = state.sets?.PLAYER_2 ?? 0;
  const config = (state as any).config;
  const setsToWin = config?.setsToWin ?? 2;
  const gamesPerSet = config?.gamesPerSet ?? 6;

  const isDeuce = !isTiebreak && p1Score === '40' && p2Score === '40';
  const p1HasAdv = p1Score === 'AD';
  const p2HasAdv = p2Score === 'AD';

  // game-level "would-win-point" por jogador
  const p1AtGamePt = isTiebreak
    ? typeof p1Score === 'number' && p1Score >= 6 && (p1Score as number) - (p2Score as number) >= 1
    : (p1Score === '40' && p2Score !== '40') || p1HasAdv;
  const p2AtGamePt = isTiebreak
    ? typeof p2Score === 'number' && p2Score >= 6 && (p2Score as number) - (p1Score as number) >= 1
    : (p2Score === '40' && p1Score !== '40') || p2HasAdv;

  // set-level: ganhar o game daria o set?
  const p1AtSetPt = p1AtGamePt && (p1Games + 1 > gamesPerSet || isTiebreak);
  const p2AtSetPt = p2AtGamePt && (p2Games + 1 > gamesPerSet || isTiebreak);

  // match-level
  const p1MatchPt = p1AtSetPt && p1Sets + 1 >= setsToWin;
  const p2MatchPt = p2AtSetPt && p2Sets + 1 >= setsToWin;

  // break point: quem está devolvendo é quem pode ganhar o game
  const returner = state.server === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
  const isBreakPoint = !isTiebreak && (returner === 'PLAYER_1' ? p1AtGamePt : p2AtGamePt);

  // tech stats aproximados (usa pointsHistory se disponível)
  const pointsHistory: PointDetails[] = scoringSystem?.getPointsHistory() ?? [];

  const courtAttr = matchData.courtType ?? 'GRASS';

  return (
    <>
      {/* Modais centralizados */}
      <ScoreboardModals
        isStatsOpen={isStatsOpen}
        onStatsClose={() => setIsStatsOpen(false)}
        statsData={statsData}
        matchId={matchData.id}
        playerNames={players}
        isServerEffectOpen={isServerEffectOpen}
        onServerEffectClose={() => {
          setIsServerEffectOpen(false);
          setPlayerInFocus(null);
        }}
        playerInFocus={playerInFocus}
        onServerEffectConfirm={handleServerEffectConfirm}
        fontScale={fontScale}
        isServeErrorModalOpen={isServeErrorModalOpen}
        pendingServeError={pendingServeError}
        serverState={state.server}
        onServeErrorConfirm={handleServeErrorConfirm}
        onServeErrorCancel={handleServeErrorCancel}
        isPointDetailsOpen={isPointDetailsOpen}
        pendingPointPlayer={pendingPointPlayer}
        playersWithCode={playersWithCode}
        onPointDetailsConfirm={handlePointDetailsConfirm}
        onPointDetailsCancel={handlePointDetailsCancel}
        editMatchOpen={editMatchOpen}
        matchData={matchData}
        onEditMatchClose={() => setEditMatchOpen(false)}
        onEditMatchSaved={(updated) => {
          setMatchData((prev) =>
            prev
              ? {
                  ...prev,
                  nickname: (updated as EditableMatch).nickname ?? prev.nickname,
                  scheduledAt: (updated as EditableMatch).scheduledAt ?? prev.scheduledAt,
                  venueId: (updated as EditableMatch).venueId ?? prev.venueId,
                  venue: (updated as EditableMatch).venue ?? prev.venue,
                  visibility: (updated as EditableMatch).visibility ?? prev.visibility,
                  openForAnnotation:
                    (updated as EditableMatch).openForAnnotation ?? prev.openForAnnotation,
                }
              : null,
          );
          setEditMatchOpen(false);
        }}
        undoModalOpen={undoModalOpen}
        onUndoModalClose={() => setUndoModalOpen(false)}
        lastPoint={getLastPointDetails()}
        onUndoConfirm={() => {
          setUndoModalOpen(false);
          handleUndo();
        }}
        playerNamesForUndo={{ PLAYER_1: players.p1, PLAYER_2: players.p2 }}
        editScoreModalOpen={editScoreModalOpen}
        onEditScoreClose={() => setEditScoreModalOpen(false)}
        onEditScoreConfirm={(setResults, server) => {
          setEditScoreModalOpen(false);
          // Guard: não fazer nada se array vazio
          if (setResults.length === 0) return;

          // Preservar sets já finalizados do engine como SetEditData
          const existingSets = (state.completedSets ?? []).map((set) => ({
            p1Games: set.games.PLAYER_1,
            p2Games: set.games.PLAYER_2,
            isPartial: false,
          }));

          // Concatenar: existing + novo + potencial parcial
          const allSets = [...existingSets, ...(setResults as SetEditData[])];
          handleEditScore(allSets, server);
        }}
        currentSets={state.currentSetState?.games ?? { PLAYER_1: 0, PLAYER_2: 0 }}
        currentGamePoints={state.currentGame?.points}
        completedSets={state.completedSets ?? []}
        deleteModalOpen={deleteModalOpen}
        onDeleteModalClose={() => setDeleteModalOpen(false)}
        onDeleteConfirm={async (id) => {
          const { httpClient } = await import('../config/httpClient');
          await httpClient.delete(`/matches/${id}`);
          setDeleteModalOpen(false);
          navigate('/dashboard');
        }}
        showResumeModal={showResumeModal}
        suspendedSession={suspendedSession}
        currentUser={currentUser}
        previousAnnotationPoints={previousAnnotationPoints}
        onResumeAnnotation={handleResumeAnnotation}
        onStartNewAnnotation={handleStartNewAnnotation}
        onDiscardAnnotation={handleDiscardAnnotation}
      />

      <ScoreboardCourtView
        renderKey={renderKey}
        courtAttr={courtAttr}
        fontScale={fontScale}
        courtRef={courtRef}
        matchId={matchId!}
        matchData={matchData}
        currentUser={currentUser}
        players={players}
        elapsed={elapsed}
        annotatorCount={annotatorCount}
        state={state}
        serveStep={serveStep}
        canUndo={scoringSystem.canUndo()}
        pointsHistory={pointsHistory}
        isTiebreak={isTiebreak}
        isDeuce={isDeuce}
        p1HasAdv={p1HasAdv}
        p2HasAdv={p2HasAdv}
        p1Score={p1Score}
        p2Score={p2Score}
        p1Games={p1Games}
        p2Games={p2Games}
        p1Sets={p1Sets}
        p2Sets={p2Sets}
        p1MatchPt={p1MatchPt}
        p2MatchPt={p2MatchPt}
        p1AtSetPt={p1AtSetPt}
        p2AtSetPt={p2AtSetPt}
        isBreakPoint={isBreakPoint}
        returner={returner}
        onBack={() => navigate('/dashboard')}
        onMenu={fetchStats}
        onEditMatch={
          currentUser?.id && matchData.createdByUserId === currentUser.id
            ? () => setEditMatchOpen(true)
            : undefined
        }
        onDeleteMatch={() => setDeleteModalOpen(true)}
        onPointDetailsOpen={handlePointDetailsOpen}
        onServeErrorOpen={handleServeErrorOpen}
        onFault={handleFault}
        onUndoOpen={() => setUndoModalOpen(true)}
        onAce={() => {
          setIsServerEffectOpen(true);
          setPlayerInFocus(state.server);
        }}
        onFontScaleInc={handleFontScaleInc}
        onFontScaleDec={handleFontScaleDec}
        onEditScore={() => setEditScoreModalOpen(true)}
        isServeErrorModalOpen={isServeErrorModalOpen}
        isMatchFinalized={matchData?.status === 'FINISHED'}
        onMatchEnded={() => {
          if (matchData) setMatchData({ ...matchData, status: 'FINISHED' });
        }}
      />
    </>
  );
};

const ScoreboardV2WithBoundary: React.FC<{ onEndMatch: () => void }> = (props) => (
  <ErrorBoundary>
    <ScoreboardV2 {...props} />
  </ErrorBoundary>
);

export default ScoreboardV2WithBoundary;
