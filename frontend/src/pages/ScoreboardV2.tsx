// Função utilitária para pegar o estado mais profundo
function getDeepMatchState(state: any) {
  let current = state;
  while (current && current.matchState) {
    current = current.matchState;
  }
  return current;
}
// frontend/src/pages/ScoreboardV2.tsx (Fluxo de saque final e correto)

import React, { useState, useEffect, useCallback } from 'react';
import MatchStatsModal from '../components/MatchStatsModal';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import LoadingIndicator from '../components/LoadingIndicator';
import PointDetailsModal from '../components/PointDetailsModal';
import ServerEffectModal from '../components/ServerEffectModal';
import { TennisScoring } from '../core/scoring/TennisScoring';
import { TennisConfigFactory } from '../core/scoring/TennisConfigFactory';
import type { MatchState, TennisFormat, Player, PointDetails } from '../core/scoring/types';
import type { MatrizItem } from '../data/matrizData';
import { API_URL } from '../config/api';
import { useMatchSync } from '../hooks/useMatchSync';
import './ScoreboardV2.css';

interface MatchData {
  id: string;
  sportType: string;
  format: TennisFormat | string;
  players: { p1: string; p2: string };
  status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'FINISHED';
  matchState?: MatchState;
}

const SetupModal: React.FC<{
  isOpen: boolean;
  players: { p1: string; p2: string };
  format: string;
  onConfirm: (firstServer: Player) => void;
  onCancel: () => void;
}> = ({ isOpen, players, format, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="setup-modal-overlay">
      <div className="setup-modal">
        <h3>Configuração da Partida</h3>
        <p><strong>Modo de jogo:</strong> {TennisConfigFactory.getFormatDisplayName(format as TennisFormat)}</p>
        <div className="server-selection">
          <h4>Quem saca primeiro?</h4>
          <div className="server-buttons">
            <button className="server-button" onClick={() => onConfirm('PLAYER_1')}>🎾 {players.p1}</button>
            <button className="server-button" onClick={() => onConfirm('PLAYER_2')}>🎾 {players.p2}</button>
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={onCancel} className="cancel-button">Cancelar</button>
        </div>
      </div>
    </div>
  );
};

const ScoreboardV2: React.FC<{ onEndMatch: () => void; }> = ({ onEndMatch }) => {
  // Função para persistir o estado antes de fechar
  const handleEndMatch = async () => {
    console.log('[ScoreboardV2] Finalizando partida e persistindo estado');

    // Só persiste se a partida já foi iniciada
    if (scoringSystem && matchData?.status !== 'NOT_STARTED') {
      try {
        console.log('[ScoreboardV2] Sincronizando estado atual');
        await scoringSystem.syncState();
      } catch (e) {
        // Pode exibir um alerta ou logar o erro, mas não impede o fechamento
        console.error('[ScoreboardV2] Erro ao persistir estado ao fechar:', e);
      }
    }

    onEndMatch();
  };
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [scoringSystem, setScoringSystem] = useState<TennisScoring | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [elapsed, setElapsed] = useState<number>(0);
  const [isPointDetailsOpen, setIsPointDetailsOpen] = useState(false);
  const [isServerEffectOpen, setIsServerEffectOpen] = useState(false);
  const [playerInFocus, setPlayerInFocus] = useState<Player | null>(null);
  const [serveStep, setServeStep] = useState<'none' | 'second'>('none');
  const [preselectedResult, setPreselectedResult] = useState<string | undefined>();
  const [renderKey, setRenderKey] = useState(0);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [statsData, setStatsData] = useState(null);
  // Validação para mudanças seguras de serveStep
  const setServeStepSafe = useCallback((newStep: 'none' | 'second') => {
    if (newStep === 'second' && serveStep !== 'none') {
      console.warn('[ScoreboardV2] Tentativa inválida de mudar para segundo saque do estado atual', { current: serveStep, requested: newStep });
      return;
    }
    if (newStep === 'none' && serveStep === 'none') {
      // Reset redundante, mas permitido
      console.debug('[ScoreboardV2] Reset de serveStep para none (já estava none)');
    }
    setServeStep(newStep);
  }, [serveStep]);

  // Função para buscar estatísticas (mock para testes)
  const fetchStats = async () => {
    // Aqui você pode buscar do backend real, mas para testes retorna mock
    setStatsData({
      totalPoints: 10,
      player1: { pointsWon: 5 },
      player2: { pointsWon: 5 },
      match: {},
      pointsHistory: [],
    });
    setIsStatsOpen(true);
  };

  useEffect(() => {
    if (!matchId) {
      console.error('[ScoreboardV2] ID da partida não encontrado na URL');
      setError('ID da partida não encontrado na URL.');
      setIsLoading(false);
      return;
    }

    console.log(`[ScoreboardV2] Iniciando carregamento da partida ${matchId}`);

    const fetchMatchData = async () => {
      try {
        let data: MatchData;
        const initialState = (location.state as any)?.initialState;

        // Se temos estado inicial da navegação, use-o
        if (initialState) {
          console.log(`[ScoreboardV2] Usando estado inicial fornecido pela navegação para a partida ${matchId}`);
          // Garante que o formato estará presente no objeto principal
          data = {
            ...initialState,
            format: initialState?.matchState?.config?.format || initialState?.format,
            matchState: initialState.matchState || initialState.matchState,
          };
        } else {
          console.log(`[ScoreboardV2] Buscando estado do backend para a partida ${matchId}`);
          const response = await fetch(`${API_URL}/matches/${matchId}/state`);
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[ScoreboardV2] Falha ao carregar dados da partida ${matchId}:`, response.status, errorText);
            throw new Error(`Falha ao carregar dados da partida (status: ${response.status})`);
          }
          data = await response.json();
        }

        // Fallback para garantir que o formato sempre existe
        const format = (data.matchState?.config?.format || data.format) as TennisFormat;
        if (!format) {
          setError('Partida sem configuração de formato.');
          setIsLoading(false);
          return;
        }

        console.log(`[ScoreboardV2] Dados da partida carregados:`, data);
        setMatchData(data);

        const system = new TennisScoring(data.matchState?.server || 'PLAYER_1', format);
        system.enableSync(matchId);

        if (data.status === 'FINISHED') {
          console.warn(`[ScoreboardV2] Tentativa de carregar partida finalizada ${matchId} - redirecionando para dashboard`);
          navigate('/dashboard');
          return;
        } else if (data.status === 'IN_PROGRESS' && data.matchState) {
          const deepState = getDeepMatchState(data.matchState);
          console.log(`[ScoreboardV2] Retomando partida com estado:`, deepState);
          system.loadState(deepState);
          setIsSetupOpen(false);
        } else if (data.status === 'NOT_STARTED') {
          console.log(`[ScoreboardV2] Partida não iniciada, abrindo setup`);
          setIsSetupOpen(true);
        }

        setScoringSystem(system);
      } catch (err) {
        console.error(`[ScoreboardV2] Erro ao carregar partida ${matchId}:`, err);
        setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchMatchData();
  }, [matchId, location.state]);

  useEffect(() => {
    let timer: number | null = null;
    const state = scoringSystem?.getState();
    if (state?.startedAt && !state?.isFinished) {
      const start = new Date(state.startedAt).getTime();
      const updateElapsed = () => setElapsed(Math.floor((Date.now() - start) / 1000));
      updateElapsed();
      timer = window.setInterval(updateElapsed, 1000);
    }
    return () => { if (timer) window.clearInterval(timer); };
  }, [scoringSystem, scoringSystem?.getState()?.startedAt, scoringSystem?.getState()?.isFinished]);

  const handleSetupConfirm = async (firstServer: Player) => {
    if (!matchData || !matchId) {
      console.error('[ScoreboardV2] Dados insuficientes para confirmar setup');
      return;
    }

    console.log(`[ScoreboardV2] Confirmando setup da partida ${matchId} com primeiro servidor: ${firstServer}`);

    try {
      const system = new TennisScoring(firstServer, matchData.format as TennisFormat);
      system.enableSync(matchId);
      system.setStartedAt(new Date().toISOString());
      // Remover needsSetup do estado antes de sincronizar e garantir startedAt
      const state = system.getState();
      if ('needsSetup' in state) delete state.needsSetup;
      if (!state.startedAt) state.startedAt = new Date().toISOString();
      setScoringSystem(system);
      setIsSetupOpen(false);

      // Sincronizar estado inicial - o backend inferirá o status automaticamente
      console.log(`[ScoreboardV2] Iniciando sincronização inicial`);
      try {
        const response = await fetch(`${API_URL}/matches/${matchId}/state`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchState: state }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Falha na sincronização: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log(`[ScoreboardV2] Setup confirmado com sucesso:`, result);
      } catch (syncError) {
        console.error(`[ScoreboardV2] Erro crítico na sincronização inicial:`, syncError);
        throw new Error(`Erro ao sincronizar partida: ${syncError.message}`);
      }
    } catch (error) {
      console.error(`[ScoreboardV2] Erro ao confirmar setup da partida ${matchId}:`, error);
      setError('Erro ao iniciar partida. Tente novamente.');
    }
  };

  const forceRerender = () => {
    setRenderKey(prev => prev + 1);
  };

  const addPoint = async (player: Player, details?: Partial<PointDetails>) => {
    if (!scoringSystem) {
      console.warn('[ScoreboardV2] Tentativa de adicionar ponto sem sistema de pontuação');
      return;
    }

    // Validação: Verificar consistência entre serveStep e isFirstServe
    if (details?.serve?.isFirstServe !== undefined && details.serve.isFirstServe !== (serveStep !== 'second')) {
      console.warn('[ScoreboardV2] Inconsistência detectada: isFirstServe não corresponde ao serveStep atual', {
        serveStep,
        isFirstServe: details.serve.isFirstServe
      });
    }

    // Garantir que isFirstServe seja sempre incluído para persistência
    const pointDetails = details || {
      serve: { isFirstServe: serveStep !== 'second' },
      result: { winner: player, type: 'WINNER' },
      rally: { ballExchanges: 1 }
    };

    // Se details foi fornecido mas não tem serve, adicionar
    if (details && !details.serve) {
      pointDetails.serve = { isFirstServe: serveStep !== 'second' };
    }

    console.log(`[ScoreboardV2] Adicionando ponto para ${player}`, pointDetails);
    try {
      const newState = await scoringSystem.addPointWithSync(player, pointDetails as PointDetails);
      setServeStepSafe('none');
      forceRerender();

      // O TennisScoring já sincroniza o estado automaticamente via syncState()
      // Não precisamos forçar atualização manual aqui

      // Verificar se a partida foi finalizada pelas regras do jogo
      if (newState.isFinished && newState.winner) {
        console.log(`[ScoreboardV2] Partida finalizada! Vencedor: ${newState.winner}`);
        // Exibir mensagem de vitória
        const winnerName = newState.winner === 'PLAYER_1' ? players.p1 : players.p2;
        setTimeout(() => {
          alert(`🏆 PARTIDA FINALIZADA!\n\nVencedor: ${winnerName}\n\nPlacar Final: ${newState.sets.PLAYER_1} sets x ${newState.sets.PLAYER_2} sets`);
          // Redirecionar para dashboard após confirmação
          navigate('/dashboard');
        }, 500);
      }

      console.log(`[ScoreboardV2] Ponto adicionado com sucesso para ${player}`);
    } catch (error) {
      console.error(`[ScoreboardV2] Erro ao adicionar ponto para ${player}:`, error);
    }
  };

  const handleFault = async () => {
    if (!scoringSystem) {
      console.warn('[ScoreboardV2] Tentativa de registrar falta sem sistema de pontuação');
      return;
    }

    console.log('[ScoreboardV2] Registrando falta dupla');
    try {
      const opponent = state.server === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
      const pointDetails: Partial<PointDetails> = {
        serve: { type: 'DOUBLE_FAULT', isFirstServe: false },
        result: {
          winner: opponent,
          type: 'FORCED_ERROR',
        },
        rally: { ballExchanges: 1 },
      };
      await scoringSystem.addPointWithSync(opponent, pointDetails as PointDetails);
      setServeStepSafe('none');
      forceRerender();
      console.log(`[ScoreboardV2] Falta dupla registrada, ponto para ${opponent}`);
    } catch (error) {
      console.error('[ScoreboardV2] Erro ao registrar falta dupla:', error);
    }
  };

  const handleUndo = async () => {
    if (!scoringSystem) {
      console.warn('[ScoreboardV2] Tentativa de desfazer ponto sem sistema de pontuação');
      return;
    }

    console.log('[ScoreboardV2] Desfazendo último ponto');
    try {
      await scoringSystem.undoLastPointWithSync();
      setServeStepSafe('none');
      forceRerender();
      console.log('[ScoreboardV2] Ponto desfeito com sucesso');
    } catch (error) {
      console.error('[ScoreboardV2] Erro ao desfazer ponto:', error);
    }
  };

  const handlePointDetailsConfirm = (matrizItem: Partial<MatrizItem>, winner: Player) => {
    if (!matrizItem.Resultado) return;
    const isAce = matrizItem.Resultado === 'Ace';
    const pointDetails: Partial<PointDetails> = {
        serve: { type: isAce ? 'ACE' : 'SERVICE_WINNER', isFirstServe: serveStep !== 'second' },
        result: {
            winner: winner,
            type: matrizItem.Resultado.includes('Winner') ? 'WINNER' : (matrizItem.Resultado.includes('não Forçado') ? 'UNFORCED_ERROR' : 'FORCED_ERROR'),
        },
        rally: { ballExchanges: 1 },
    };
    addPoint(winner, pointDetails);
    setIsPointDetailsOpen(false);
    setPlayerInFocus(null);
  };

  const handleServerEffectConfirm = (effect?: string, direction?: string) => {
    if (!playerInFocus) return;
    // ServerEffectModal é usado apenas para Ace, nunca para dupla falta
    // Dupla falta é tratada por handleFault()
    const pointDetails: Partial<PointDetails> = {
      serve: {
        type: 'ACE',
        isFirstServe: serveStep !== 'second',
        serveEffect: effect as 'Chapado' | 'Cortado' | 'TopSpin' | undefined,
        direction: direction as 'Fechado' | 'Aberto' | undefined,
      },
      result: {
        winner: playerInFocus,
        type: 'WINNER',
      },
      rally: { ballExchanges: 1 },
    };
    addPoint(playerInFocus, pointDetails);
    setIsServerEffectOpen(false);
    setPlayerInFocus(null);
  };

  if (isLoading) return <LoadingIndicator />;
  if (error) {
    console.error('[ScoreboardV2] Renderizando erro:', error);
    return <div className="scoreboard-error">Erro: {error} <button onClick={() => navigate('/dashboard')}>Voltar</button></div>;
  }
  if (!matchData) {
    console.error('[ScoreboardV2] matchData está undefined');
    return <div className="scoreboard-error">Partida não encontrada ou dados incompletos. <button onClick={() => navigate('/dashboard')}>Voltar</button></div>;
  }
  if (!('format' in matchData) || !matchData.format) {
    console.error('[ScoreboardV2] matchData.format está undefined', matchData);
    return <div className="scoreboard-error">Partida sem configuração de formato. <button onClick={() => navigate('/dashboard')}>Voltar</button></div>;
  }
  if (!scoringSystem) {
    console.error('[ScoreboardV2] scoringSystem está undefined', { matchData });
    return <div className="scoreboard-error">Dados da partida não puderam ser inicializados.</div>;
  }

  const state = scoringSystem.getState();
  const players = matchData.players;
  const isTiebreak = state.currentGame?.isTiebreak || false;

  if (isSetupOpen) {
    return <SetupModal isOpen={isSetupOpen} players={players} format={matchData.format} onConfirm={handleSetupConfirm} onCancel={handleEndMatch} />;
  }

  // Partidas finalizadas não devem chegar aqui - devem ser redirecionadas para stats
  if (matchData?.status === 'FINISHED') {
    console.warn(`[ScoreboardV2] Partida ${matchId} está finalizada mas chegou ao ScoreboardV2 - redirecionando`);
    navigate('/dashboard');
    return null;
  }

  return (
    <div key={renderKey} className="scoreboard-v2">
      <div className="scoreboard-header">
        <h3>{matchData.sportType}</h3>
        <button onClick={handleEndMatch} className="end-match-button">✕</button>
        <button onClick={fetchStats} className="stats-btn">Estatísticas</button>
      </div>
      <MatchStatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        matchId={matchData.id}
        playerNames={players}
        stats={statsData}
      />
      <div className="match-timestamps">
        {state.startedAt && <span>Início: {new Date(state.startedAt).toLocaleTimeString()}</span>}
        {state.startedAt && !state.isFinished && <span>Tempo: {new Date(elapsed * 1000).toISOString().substr(11, 8)}</span>}
      </div>
      <div className="score-main">
        <div className="player-section">
          <div className="player-header"><span className="player-name">{players.p1}</span>{state.server === 'PLAYER_1' && <span className="serve-indicator">🎾 {serveStep === 'second' ? '2º' : '1º'}</span>}</div>
          <div className="player-scores">
            <span className="current-score">{state.currentGame?.points?.PLAYER_1 || '0'}</span>
            <span className="sets-count">Sets: {state.sets?.PLAYER_1 || 0}</span>
            <span className="games-count">Games: {state.currentSetState?.games?.PLAYER_1 || 0}</span>
          </div>
        </div>
        <div className="vs-separator">{isTiebreak ? 'TIEBREAK' : 'VS'}</div>
        <div className="player-section">
          <div className="player-header"><span className="player-name">{players.p2}</span>{state.server === 'PLAYER_2' && <span className="serve-indicator">🎾 {serveStep === 'second' ? '2º' : '1º'}</span>}</div>
          <div className="player-scores">
            <span className="current-score">{state.currentGame?.points?.PLAYER_2 || '0'}</span>
            <span className="sets-count">Sets: {state.sets?.PLAYER_2 || 0}</span>
            <span className="games-count">Games: {state.currentSetState?.games?.PLAYER_2 || 0}</span>
          </div>
        </div>
      </div>

      {/* Parciais dos sets finalizados */}
      {state.completedSets && state.completedSets.length > 0 && (
        <div className="sets-partials">
          Parciais: {state.completedSets.map((set, index) => {
            const games = set.games;
            const g1 = games.PLAYER_1;
            const g2 = games.PLAYER_2;
            if (set.tiebreakScore) {
              const tb1 = set.tiebreakScore.PLAYER_1;
              const tb2 = set.tiebreakScore.PLAYER_2;
              if (set.winner === 'PLAYER_1') {
                return `${g1}/${g2}(${tb1})`;
              } else {
                return `${g2}/${g1}(${tb2})`;
              }
            } else {
              return `${g1}/${g2}`;
            }
          }).join(' • ')}
        </div>
      )}

      {state.isFinished && state.winner && (
        <div className="match-finished-banner">
          <div className="finished-content">
            <h2>🏆 PARTIDA FINALIZADA!</h2>
            <div className="winner-announcement">
              <span className="winner-label">VENCEDOR:</span>
              <span className="winner-name">{state.winner === 'PLAYER_1' ? players.p1 : players.p2}</span>
            </div>
            <div className="final-score">
              <span>Placar Final: {state.sets.PLAYER_1} sets x {state.sets.PLAYER_2} sets</span>
            </div>
          </div>
        </div>
      )}

      <div className={`quick-actions-row serve-${state.server === 'PLAYER_1' ? 'left' : 'right'}`}>
        {!state.isFinished && state.server && serveStep === 'none' && (
          <>
            <button className="quick-action-btn serve-info first-serve">1º Saque</button>
            <button className="quick-action-btn" onClick={() => { setIsServerEffectOpen(true); setPlayerInFocus(state.server); }}>Ace</button>
            <button className="quick-action-btn" onClick={() => setServeStepSafe('second')}>Out</button>
             <button className="quick-action-btn" onClick={() => setServeStepSafe('second')}>Net</button>
          </>
        )}
        {!state.isFinished && state.server && serveStep === 'second' && (
          <>
            <button className="quick-action-btn serve-info second-serve">2º Saque</button>
            <button className="quick-action-btn" onClick={() => { setIsServerEffectOpen(true); setPlayerInFocus(state.server); }}>Ace</button>
            <button className="quick-action-btn" onClick={handleFault}>Out</button>
            <button className="quick-action-btn" onClick={handleFault}>Net</button>
          </>
        )}
      </div>

      <div className="point-buttons">
        <button className="point-button point-button-p1" onClick={() => { setIsPointDetailsOpen(true); setPlayerInFocus('PLAYER_1'); setPreselectedResult(undefined); }} disabled={state.isFinished || false}>+ Ponto {players.p1}</button>
        <button className="point-button point-button-p2" onClick={() => { setIsPointDetailsOpen(true); setPlayerInFocus('PLAYER_2'); setPreselectedResult(undefined); }} disabled={state.isFinished || false}>+ Ponto {players.p2}</button>
      </div>

      {state.isFinished && (
        <div className="finished-actions">
          <button className="finished-action-btn" onClick={() => navigate('/dashboard')}>
            📊 Ver Estatísticas
          </button>
          <button className="finished-action-btn" onClick={() => navigate('/matches/new')}>
            🎾 Nova Partida
          </button>
        </div>
      )}
      <div className="correction-section">
        <button className="undo-button" onClick={handleUndo} disabled={!scoringSystem?.canUndo() || state.isFinished || false}>↩️ Correção (Undo)</button>
      </div>
      <ServerEffectModal isOpen={isServerEffectOpen} playerInFocus={playerInFocus || 'PLAYER_1'} onConfirm={handleServerEffectConfirm} onCancel={() => { setIsServerEffectOpen(false); setPlayerInFocus(null); }} />
      <PointDetailsModal isOpen={isPointDetailsOpen} playerInFocus={playerInFocus || 'PLAYER_1'} onConfirm={handlePointDetailsConfirm} onCancel={() => { setIsPointDetailsOpen(false); setPreselectedResult(undefined); }} preselectedResult={preselectedResult} />
    </div>
  );
};

export default ScoreboardV2;
