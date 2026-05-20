// frontend/src/pages/ScoreboardV2.tsx (Fluxo de saque final e correto)

import React, { useState, useCallback, useEffect } from 'react';
import { httpClient } from '../config/httpClient';
import LoadingIndicator from '../components/LoadingIndicator';
import type { PointDetails } from '../core/scoring/types';
import type { EditableMatch } from '../components/EditMatchModal';
import { resolvePlayerName } from '../data/players';
import CourtBackground from '../components/scoreboard/CourtBackground';
import MatchHeader from '../components/scoreboard/MatchHeader';
import PlayerCard from '../components/scoreboard/PlayerCard';
import { ErrorBoundary } from '../components/ErrorBoundary';
import VSIndicator from '../components/scoreboard/VSIndicator';
import ContextBadges from '../components/scoreboard/ContextBadges';
import ActionBar from '../components/scoreboard/ActionBar';
import AnnotationSessionPanel from '../components/AnnotationSessionPanel';
import CreatorEndMatchPanel from '../components/CreatorEndMatchPanel';
import ReopenMatchPanel from '../components/ReopenMatchPanel';
import SetupModal from '../components/scoreboard/SetupModal';
import ScoreboardModals from '../components/ScoreboardModals';
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

  // Detectar sessão suspensa e abrir modal
  useEffect(() => {
    if (suspendedSession) {
      setShowResumeModal(true);
    }
  }, [suspendedSession]);

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
              console.log('[ScoreboardV2] Estado anterior restaurado da sessão suspensa', {
                matchId,
                pointsCount: restoredState.pointsHistory?.length ?? 0,
              });
            }
          } catch (parseErr) {
            console.warn('[ScoreboardV2] Falha ao restaurar estado anterior:', parseErr);
          }
        }

        setShowResumeModal(false);
        clearSuspendedSession();
      }
    } catch (err) {
      console.error('Erro ao retomar anotação:', err);
    }
  }, [suspendedSession, matchId, clearSuspendedSession, getSystem]);

  // Handler para começar nova anotação
  const handleStartNewAnnotation = useCallback(() => {
    setShowResumeModal(false);
    clearSuspendedSession();
    // A sessão será criada automaticamente pelo próximo POST /sessions
  }, [clearSuspendedSession]);

  // Handler para descartar anotação suspensa
  const handleDiscardAnnotation = useCallback(() => {
    setShowResumeModal(false);
    clearSuspendedSession();
    navigate('/dashboard');
  }, [clearSuspendedSession, navigate]);

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
        onEditScoreConfirm={(setWinners, server) => {
          setEditScoreModalOpen(false);
          handleEditScore(setWinners, server);
        }}
        currentSets={state.sets ?? { PLAYER_1: 0, PLAYER_2: 0 }}
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
          onBack={() => navigate('/dashboard')}
          onMenu={fetchStats}
          onEdit={
            currentUser?.id && matchData.createdByUserId === currentUser.id
              ? () => setEditMatchOpen(true)
              : undefined
          }
        />

        {/* Botão excluir partida — só para criador em NOT_STARTED */}
        {currentUser?.id &&
          matchData.createdByUserId === currentUser.id &&
          matchData.status === 'NOT_STARTED' && (
            <button
              className="sb-delete-match-btn"
              onClick={() => setDeleteModalOpen(true)}
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
              onPress={() => handlePointDetailsOpen('PLAYER_1')}
              onSwipeDown={() => {
                if (scoringSystem?.canUndo()) setUndoModalOpen(true);
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
              onPress={() => handlePointDetailsOpen('PLAYER_2')}
              onSwipeDown={() => {
                if (scoringSystem?.canUndo()) setUndoModalOpen(true);
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
                <button className="finished-action-btn" onClick={() => navigate('/dashboard')}>
                  <span aria-hidden="true">📊</span> Ver Estatísticas
                </button>
                <button className="finished-action-btn" onClick={() => navigate('/matches/new')}>
                  <span aria-hidden="true">🎾</span> Nova Partida
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ActionBar (saque + undo + quem venceu o ponto) */}
        <ActionBar
          canUndo={scoringSystem?.canUndo() ?? false}
          isFinished={state.isFinished ?? false}
          serveStep={serveStep}
          server={state.server ?? 'PLAYER_1'}
          playerNames={{ PLAYER_1: players.p1, PLAYER_2: players.p2 }}
          onUndo={() => setUndoModalOpen(true)}
          onAce={() => {
            setIsServerEffectOpen(true);
            setPlayerInFocus(state.server);
          }}
          onOut={() => handleServeErrorOpen('out', 'first')}
          onNet={() => handleServeErrorOpen('net', 'first')}
          onFault={handleFault}
          onFaultOut={() => handleServeErrorOpen('out', 'second')}
          onFaultNet={() => handleServeErrorOpen('net', 'second')}
          fontScale={fontScale}
          onFontScaleInc={handleFontScaleInc}
          onFontScaleDec={handleFontScaleDec}
          onEditScore={() => setEditScoreModalOpen(true)}
          isModalOpen={isServeErrorModalOpen}
          isMatchFinalized={matchData?.status === 'FINISHED'}
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
            onMatchEnded={() => {
              // Após encerrar, atualizar status local
              if (matchData) {
                setMatchData({ ...matchData, status: 'FINISHED' });
              }
            }}
          />
        )}

        {/* Explainer modo família removido */}
      </div>
    </>
  );
};

const ScoreboardV2WithBoundary: React.FC<{ onEndMatch: () => void }> = (props) => (
  <ErrorBoundary>
    <ScoreboardV2 {...props} />
  </ErrorBoundary>
);

export default ScoreboardV2WithBoundary;
