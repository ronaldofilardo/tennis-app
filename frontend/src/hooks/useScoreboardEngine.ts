import { useState, useReducer, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { TennisScoring } from '../core/scoring/TennisScoring';
import type { MatchState, TennisFormat, Player } from '../core/scoring/types';
import type { MatchData } from '../types/scoreboard';
export type { MatchData } from '../types/scoreboard';
import { httpClient } from '../config/httpClient';
import { useToast } from '../components/Toast';
import { createLogger } from '../services/logger';
import { startSession } from '../services/annotationSessionService';
import { useAuth } from '../contexts/AuthContext';
import {
  type ScoreboardUIState,
  type ScoreboardUIAction,
  scoreboardUIReducer,
  createInitialUIState,
} from './scoreboardUIState';
import { useScoreboardHandlers } from './useScoreboardHandlers';

// Função utilitária para pegar o estado mais profundo
function getDeepMatchState(state: unknown): MatchState {
  let current: unknown = state;
  while (current !== null && typeof current === 'object' && 'matchState' in current) {
    current = (current as { matchState: unknown }).matchState;
  }
  return current as MatchState; // validated by API response contract
}

export function useScoreboardEngine(onEndMatch: () => void) {
  const toast = useToast();
  const scoreLog = createLogger('ScoreboardV2');
  const location = useLocation();
  const { currentUser } = useAuth();
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();

  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const scoringSystemRef = useRef<TennisScoring | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── UI state via reducer ───────────────────────────────────────────────────
  const [uiState, dispatch] = useReducer(scoreboardUIReducer, undefined, createInitialUIState);
  const {
    isSetupOpen,
    elapsed,
    isServerEffectOpen,
    playerInFocus,
    serveStep,
    renderKey,
    isStatsOpen,
    statsData,
    isPointDetailsOpen,
    pendingPointPlayer,
    isServeErrorModalOpen,
    pendingServeError,
    firstServeError,
    annotatorCount,
    editMatchOpen,
    fontScale,
  } = uiState;

  const courtRef = useRef<HTMLDivElement>(null);

  const syncTimeoutRef = useRef<number | null>(null);

  // Ref para armazenar matchId (pode ficar undefined em useParams durante cleanup)
  const matchIdRef = useRef<string | null>(null);

  // Ref para o ID da sessão de anotação auto-iniciada; encerrada no handleEndMatch
  const annotationSessionIdRef = useRef<string | null>(null);

  // Ref para evitar duplicate auto-finish PATCH calls
  const autoFinishRef = useRef(false);

  const getSystem = () => scoringSystemRef.current;

  const forceRerender = useCallback(() => {
    dispatch({ type: 'FORCE_RERENDER' });
  }, []);

  // setServeStepSafe: validation is now enforced in the reducer (SERVE_STEP_SET)
  const setServeStepSafe = useCallback((newStep: 'none' | 'second') => {
    dispatch({ type: 'SERVE_STEP_SET', step: newStep });
  }, []);

  // Tamanho do placar — persiste em localStorage
  const handleFontScaleInc = useCallback(() => {
    const next = Math.min(2.0, parseFloat((fontScale + 0.2).toFixed(1)));
    localStorage.setItem('sb-font-scale', String(next));
    dispatch({ type: 'FONT_SCALE_SET', scale: next });
  }, [fontScale]);

  const handleFontScaleDec = useCallback(() => {
    const next = Math.max(0.6, parseFloat((fontScale - 0.2).toFixed(1)));
    localStorage.setItem('sb-font-scale', String(next));
    dispatch({ type: 'FONT_SCALE_SET', scale: next });
  }, [fontScale]);

  const setIsStatsOpen = useCallback(
    (isOpen: boolean) => {
      dispatch(isOpen ? { type: 'STATS_OPEN', data: statsData } : { type: 'STATS_CLOSE' });
    },
    [statsData],
  );

  const setIsServerEffectOpen = useCallback((isOpen: boolean) => {
    dispatch(isOpen ? { type: 'SERVER_EFFECT_OPEN' } : { type: 'SERVER_EFFECT_CLOSE' });
  }, []);

  const setPlayerInFocus = useCallback((player: Player | null) => {
    dispatch({ type: 'PLAYER_IN_FOCUS_SET', player });
  }, []);

  const setEditMatchOpen = useCallback((isOpen: boolean) => {
    dispatch(isOpen ? { type: 'EDIT_MATCH_OPEN' } : { type: 'EDIT_MATCH_CLOSE' });
  }, []);

  // ── useEffect: fetch match data ──
  useEffect(() => {
    if (!matchId) {
      setError('ID da partida não encontrado na URL.');
      setIsLoading(false);
      return;
    }

    // Sincroniza matchId no ref para uso em callbacks (ex: handleEndMatch durante cleanup)
    matchIdRef.current = matchId;

    let cancelled = false;

    const fetchMatchData = async () => {
      try {
        let data: MatchData;
        const response = await httpClient.get(`/matches/${matchId}/state`);
        if (cancelled) return;
        if (!response.ok) {
          throw new Error(`Falha ao carregar dados da partida (status: ${response.status})`);
        }
        data = response.data as MatchData;
        if (cancelled) return;

        const format = (data.matchState?.config?.format || data.format) as TennisFormat;
        if (!format) {
          setError('Partida sem configuração de formato.');
          setIsLoading(false);
          return;
        }

        setMatchData(data);

        const system = new TennisScoring(data.matchState?.server || 'PLAYER_1', format);
        system.enableSync(matchId);
        system.setTokenProvider(() => httpClient.getAuthConfig().token);

        if (data.status === 'FINISHED') {
          navigate('/dashboard');
          return;
        } else if (data.status === 'IN_PROGRESS' && data.matchState) {
          const deepState = getDeepMatchState(data.matchState);
          system.loadState(deepState);
          dispatch({ type: 'SETUP_SET', isOpen: false });
        } else if (data.status === 'NOT_STARTED') {
          dispatch({ type: 'SETUP_SET', isOpen: true });
        }

        if (!cancelled) {
          scoringSystemRef.current = system;
          forceRerender();
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchMatchData();

    return () => {
      cancelled = true;
    };
  }, [matchId]);

  // ── useEffect: auto-start annotation session ──
  useEffect(() => {
    if (!matchId || !currentUser) return;
    let active = true;
    const tryAutoSession = async () => {
      try {
        // autoStarted=true: não reativa sessões suspensas — mantém partida em "anotações suspensas"
        const session = await startSession(matchId, true);
        if (active && session) {
          annotationSessionIdRef.current = session.id;
          dispatch({ type: 'ANNOTATOR_COUNT_SET', count: Math.max(annotatorCount, 1) });
        }
      } catch {
        // fire-and-forget: não crítico, anotação continua sem contagem
      }
      try {
        // Buscar TODAS as sessões para encontrar a suspensa (com matchStateSnapshot)
        const res = await httpClient.get<{ sessions?: unknown[] } | unknown[]>(
          `/matches/${matchId}/sessions`,
        );
        if (active && res.ok) {
          const data = res.data;
          const sessions = Array.isArray(data)
            ? data
            : ((data as { sessions?: unknown[] })?.sessions ?? []);

          // Contar apenas sessões ATIVAS (anotadores cobrindo AGORA)
          const activeSessions = (sessions as any[]).filter((s) => s.isActive === true);
          dispatch({ type: 'ANNOTATOR_COUNT_SET', count: activeSessions.length || 1 });

          // Detectar sessão suspensa COM matchStateSnapshot (retomável)
          // Ordena por: 1) createdAt DESC (mais recente), 2) isActive DESC (ativa primeiro), 3) ID
          const suspendedWithState = (sessions as any[])
            .filter(
              (s) =>
                s.matchStateSnapshot && (s.status === 'IN_PROGRESS' || s.status === 'ABANDONED'),
            )
            .sort((a, b) => {
              const timeCompare = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              if (timeCompare !== 0) return timeCompare; // Mais recente primeiro
              // Tiebreaker: sessões ativas primeiro
              if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
              // Final tiebreaker: por ID
              return b.id.localeCompare(a.id);
            })[0];

          // DEBUG: Log which session is selected
          if (suspendedWithState) {
            console.log(
              `🔍 DEBUG: Selected suspended session: ID=${suspendedWithState.id.substring(0, 15)}..., Active=${suspendedWithState.isActive}, Status=${suspendedWithState.status}`,
            );
          }

          if (suspendedWithState) {
            // Contar pontos a partir do matchStateSnapshot
            let pointsCount = 0;
            try {
              const state = JSON.parse(suspendedWithState.matchStateSnapshot);
              pointsCount = state.pointsHistory?.length ?? 0;
            } catch {
              // Se não conseguir parsear, usa 0
              pointsCount = 0;
            }
            dispatch({
              type: 'SUSPENDED_SESSION_SET',
              session: suspendedWithState,
              pointsCount,
            });
          }
        }
      } catch (err) {
        scoreLog.warn('Falha ao buscar sessões de anotação (não crítico)', { matchId });
      }
    };
    tryAutoSession();
    return () => {
      active = false;
    };
  }, [matchId, currentUser]);

  // ── useEffect: elapsed timer ──
  useEffect(() => {
    let timer: number | null = null;
    const sys = getSystem();
    const sysState = sys?.getState();
    if (sysState?.startedAt && !sysState?.isFinished) {
      const start = new Date(sysState.startedAt).getTime();
      const updateElapsed = () =>
        dispatch({ type: 'ELAPSED_SET', value: Math.floor((Date.now() - start) / 1000) });
      updateElapsed();
      timer = window.setInterval(updateElapsed, 1000);
    }
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [renderKey]);

  // ── useEffect: polling de Match.status para detectar encerramento pelo criador ──
  useEffect(() => {
    if (!matchId || !matchData) return;
    let pollInterval: number | null = null;
    let active = true;

    const pollMatchStatus = async () => {
      try {
        const response = await httpClient.get<MatchData>(`/matches/${matchId}/state`);
        if (!active) return;
        if (
          response.ok &&
          response.data?.status === 'FINISHED' &&
          matchData?.status !== 'FINISHED'
        ) {
          // Partida foi encerrada (por criador ou por vitória)
          if (matchData.status !== 'FINISHED') {
            toast.warning(
              'A partida foi encerrada e não aceita mais anotações.',
              '🛑 Partida Encerrada',
            );
            setMatchData((prev) => (prev ? { ...prev, status: 'FINISHED' } : null));
          }
        }
      } catch {
        // Falha silenciosa no polling — não é crítico
      }
    };

    // Iniciar polling a cada 10 segundos
    if (matchData.status !== 'FINISHED') {
      pollInterval = window.setInterval(pollMatchStatus, 10000);
    }

    return () => {
      active = false;
      if (pollInterval) window.clearInterval(pollInterval);
    };
  }, [matchId, matchData?.status]);

  // ── Handlers (extracted to useScoreboardHandlers) ──
  const {
    handleEndMatch,
    addPoint,
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
  } = useScoreboardHandlers({
    scoringSystemRef,
    matchData,
    setMatchData,
    setError,
    matchId,
    matchIdRef,
    currentUser,
    navigate,
    toast,
    scoreLog,
    dispatch,
    serveStep,
    firstServeError,
    pendingServeError,
    pendingPointPlayer,
    playerInFocus,
    autoFinishRef,
    syncTimeoutRef,
    annotationSessionIdRef,
    forceRerender,
    setServeStepSafe,
    onEndMatch,
  });

  return {
    // Router / Auth
    matchId,
    navigate,
    location,
    currentUser,

    // Match data
    matchData,
    setMatchData,
    isLoading,
    error,
    isSetupOpen,
    elapsed,
    renderKey,
    annotatorCount,

    // Scoring system
    scoringSystemRef,
    getSystem,

    // View state
    fontScale,
    handleFontScaleInc,
    handleFontScaleDec,
    courtRef,

    // Modals
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

    // Serve state
    serveStep,

    // Handlers
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

    // Suspended session resume
    suspendedSession: uiState.suspendedSession,
    previousAnnotationPoints: uiState.previousAnnotationPoints,
    clearSuspendedSession: () => dispatch({ type: 'SUSPENDED_SESSION_CLEAR' }),
    loadAnnotationSnapshot: (snapshotJson: string) => {
      const sys = scoringSystemRef.current;
      if (!sys) return;
      try {
        const parsed = JSON.parse(snapshotJson);
        sys.loadState(parsed as MatchState);
        forceRerender();
      } catch (e) {
        console.warn('[useScoreboardEngine] loadAnnotationSnapshot parse error', e);
      }
    },

    // Ball exchanges
    ballExchangeCount: uiState.ballExchangeCount,
    onBallExchangeIncrement: () => dispatch({ type: 'BALL_EXCHANGE_INCREMENT' }),
    onBallExchangeReset: () => dispatch({ type: 'BALL_EXCHANGE_RESET' }),
  };
}
