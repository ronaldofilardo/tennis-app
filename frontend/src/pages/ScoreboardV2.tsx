// frontend/src/pages/ScoreboardV2.tsx (Fluxo de saque final e correto)

import React from 'react';
import MatchStatsModal from '../components/MatchStatsModal';
import LoadingIndicator from '../components/LoadingIndicator';
import ServerEffectModal from '../components/ServerEffectModal';
import PointDetailsModal from '../components/PointDetailsModal';
import type { PointDetails } from '../core/scoring/types';
import { resolvePlayerName } from '../data/players';
import CourtBackground from '../components/scoreboard/CourtBackground';
import MatchHeader from '../components/scoreboard/MatchHeader';
import PlayerCard from '../components/scoreboard/PlayerCard';
import { ErrorBoundary } from '../components/ErrorBoundary';
import VSIndicator from '../components/scoreboard/VSIndicator';
import ContextBadges from '../components/scoreboard/ContextBadges';
import ActionBar from '../components/scoreboard/ActionBar';
import AnnotationSessionPanel from '../components/AnnotationSessionPanel';
import EditMatchModal from '../components/EditMatchModal';
import type { EditableMatch } from '../components/EditMatchModal';
import SetupModal from '../components/scoreboard/SetupModal';
import { useScoreboardEngine } from '../hooks/useScoreboardEngine';
import { computeTechStats } from './scoreboardHelpers';
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
    viewMode,
    setViewMode,
    showFamilyExplainer,
    setShowFamilyExplainer,
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
    handleServerEffectConfirm,
    handleServeErrorOpen,
    handleServeErrorConfirm,
    handleServeErrorCancel,
    fetchStats,
  } = useScoreboardEngine(onEndMatch);

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
  // Derivar scoringSystem do ref para uso no render (read-only, imutável aqui)
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
        onCancel={handleEndMatch}
      />
    );
  }

  // Partidas finalizadas não devem chegar aqui - devem ser redirecionadas para stats
  if (matchData?.status === 'FINISHED') {
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

  // legenda de evento para modo família / assistir
  const familyCaption = (() => {
    if (state.isFinished && state.winner) {
      return `${state.winner === 'PLAYER_1' ? players.p1 : players.p2} venceu a partida!`;
    }
    if (p1MatchPt) return `Match Point para ${players.p1}!`;
    if (p2MatchPt) return `Match Point para ${players.p2}!`;
    if (isTiebreak) return `Tie-break! Quem chegar a 7 pontos vence.`;
    if (isDeuce) return `Deuce! Cada jogador precisa de 2 pontos seguidos para vencer.`;
    if (p1AtSetPt) return `Set Point para ${players.p1}!`;
    if (p2AtSetPt) return `Set Point para ${players.p2}!`;
    if (isBreakPoint) {
      const bpPlayer = returner === 'PLAYER_1' ? players.p1 : players.p2;
      return `Break Point para ${bpPlayer}!`;
    }
    return null;
  })();

  const courtAttr = matchData.courtType ?? 'GRASS';

  return (
    <>
      {/* Modais renderizados FORA do container overflow:hidden para evitar clip */}
      <MatchStatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        matchId={matchData.id}
        playerNames={players}
        stats={statsData}
      />
      <ServerEffectModal
        isOpen={isServerEffectOpen}
        playerInFocus={playerInFocus || 'PLAYER_1'}
        onConfirm={handleServerEffectConfirm}
        onCancel={() => {
          setIsServerEffectOpen(false);
          setPlayerInFocus(null);
        }}
        fontScale={fontScale}
      />
      {/* Modal de erro de saque (Out/Net) — 1º e 2º saque */}
      <ServerEffectModal
        isOpen={isServeErrorModalOpen}
        playerInFocus={state.server ?? 'PLAYER_1'}
        context="error"
        errorType={pendingServeError?.errorType}
        serveStep={pendingServeError?.serveStep ?? 'first'}
        onConfirm={handleServeErrorConfirm}
        onCancel={handleServeErrorCancel}
        fontScale={fontScale}
      />
      <PointDetailsModal
        isOpen={isPointDetailsOpen}
        playerWinner={pendingPointPlayer || 'PLAYER_1'}
        currentServer={state.server}
        playerNames={playersWithCode}
        onConfirm={handlePointDetailsConfirm}
        onCancel={handlePointDetailsCancel}
        fontScale={fontScale}
      />

      {/* Modal de edição da partida — só para o criador */}
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
          onClose={() => setEditMatchOpen(false)}
          onSaved={(updated) => {
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
        />
      )}

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
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onBack={handleEndMatch}
          onMenu={fetchStats}
          onEdit={
            currentUser?.id && matchData.createdByUserId === currentUser.id
              ? () => setEditMatchOpen(true)
              : undefined
          }
        />

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
              viewMode={viewMode}
              techStats={
                viewMode === 'technical' ? computeTechStats(pointsHistory, 'PLAYER_1') : undefined
              }
              disabled={state.isFinished}
              onPress={() => handlePointDetailsOpen('PLAYER_1')}
              onSwipeDown={() => {
                if (scoringSystem?.canUndo() && window.confirm('Desfazer último ponto?'))
                  handleUndo();
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
              viewMode={viewMode}
              techStats={
                viewMode === 'technical' ? computeTechStats(pointsHistory, 'PLAYER_2') : undefined
              }
              disabled={state.isFinished}
              onPress={() => handlePointDetailsOpen('PLAYER_2')}
              onSwipeDown={() => {
                if (scoringSystem?.canUndo() && window.confirm('Desfazer último ponto?'))
                  handleUndo();
              }}
            />
          </div>

          {/* Legenda modo família / assistir */}
          {viewMode === 'family' && familyCaption && (
            <div className="family-caption">{familyCaption}</div>
          )}

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

          {/* Modo Família: botão "O que está acontecendo?" */}
          {viewMode === 'family' && !state.isFinished && (
            <button className="family-help-btn" onClick={() => setShowFamilyExplainer(true)}>
              ❓ O que está acontecendo?
            </button>
          )}
        </div>

        {/* ActionBar (saque + undo + stats + quem venceu o ponto) */}
        <ActionBar
          canUndo={scoringSystem?.canUndo() ?? false}
          isFinished={state.isFinished ?? false}
          serveStep={serveStep}
          server={state.server ?? 'PLAYER_1'}
          playerNames={{ PLAYER_1: players.p1, PLAYER_2: players.p2 }}
          onUndo={handleUndo}
          onAce={() => {
            setIsServerEffectOpen(true);
            setPlayerInFocus(state.server);
          }}
          onOut={() => handleServeErrorOpen('out', 'first')}
          onNet={() => handleServeErrorOpen('net', 'first')}
          onFault={handleFault}
          onFaultOut={() => handleServeErrorOpen('out', 'second')}
          onFaultNet={() => handleServeErrorOpen('net', 'second')}
          onStats={fetchStats}
          fontScale={fontScale}
          onFontScaleInc={handleFontScaleInc}
          onFontScaleDec={handleFontScaleDec}
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

        {/* Explainer modo família */}
        {showFamilyExplainer && (
          <div className="context-menu-overlay" onClick={() => setShowFamilyExplainer(false)}>
            <div className="context-menu" onClick={(e) => e.stopPropagation()}>
              <p className="context-menu-title">📖 Como funciona?</p>
              <p className="family-explainer-text">
                {isTiebreak
                  ? 'Tie-break: quem chegar a 7 pontos primeiro (com 2 de vantagem) vence o set.'
                  : isDeuce
                    ? 'Deuce: ambos estão empatados em 40-40. Um jogador precisa de 2 pontos seguidos para vencer o game.'
                    : `Pontuação do game: 0, 15, 30, 40. Quem chegar a 40 e ganhar mais um ponto, vence o game. O primeiro jogador a vencer ${gamesPerSet} games vence o set.`}
              </p>
              <button className="context-menu-item" onClick={() => setShowFamilyExplainer(false)}>
                Entendi!
              </button>
            </div>
          </div>
        )}
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
