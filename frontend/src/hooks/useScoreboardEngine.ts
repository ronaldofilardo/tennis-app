import { useState, useReducer, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { TennisScoring } from '../core/scoring/TennisScoring';
import type {
  MatchState,
  TennisFormat,
  Player,
  PointDetails,
  RallyDetails,
} from '../core/scoring/types';
import type { MatchData } from '../types/scoreboard';
export type { MatchData } from '../types/scoreboard';
import { httpClient } from '../config/httpClient';
import { resolvePlayerName } from '../data/players';
import { useToast } from '../components/Toast';
import { createLogger } from '../services/logger';
import { startSession, endSession } from '../services/annotationSessionService';
import { API_URL } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

// Função utilitária para pegar o estado mais profundo
function getDeepMatchState(state: unknown): MatchState {
  let current: unknown = state;
  while (current !== null && typeof current === 'object' && 'matchState' in current) {
    current = (current as { matchState: unknown }).matchState;
  }
  return current as MatchState; // validated by API response contract
}

// ── Scoreboard UI State Reducer ───────────────────────────────────────────────

type PendingServeError = { errorType: 'out' | 'net'; serveStep: 'first' | 'second' };
type FirstServeError = { errorType?: 'out' | 'net'; serveEffect?: string; direction?: string };

interface ScoreboardUIState {
  isSetupOpen: boolean;
  elapsed: number;
  isServerEffectOpen: boolean;
  playerInFocus: Player | null;
  serveStep: 'none' | 'second';
  renderKey: number;
  isStatsOpen: boolean;
  statsData: unknown;
  isPointDetailsOpen: boolean;
  pendingPointPlayer: Player | null;
  isServeErrorModalOpen: boolean;
  pendingServeError: PendingServeError | null;
  firstServeError: FirstServeError | null;
  annotatorCount: number;
  editMatchOpen: boolean;
  fontScale: number;
}

type ScoreboardUIAction =
  | { type: 'SETUP_SET'; isOpen: boolean }
  | { type: 'ELAPSED_SET'; value: number }
  | { type: 'SERVER_EFFECT_OPEN' }
  | { type: 'SERVER_EFFECT_CLOSE' }
  | { type: 'SERVER_EFFECT_CONFIRM' }
  | { type: 'PLAYER_IN_FOCUS_SET'; player: Player | null }
  | { type: 'SERVE_STEP_SET'; step: 'none' | 'second' }
  | { type: 'FORCE_RERENDER' }
  | { type: 'STATS_OPEN'; data: unknown }
  | { type: 'STATS_CLOSE' }
  | { type: 'POINT_DETAILS_OPEN'; player: Player }
  | { type: 'POINT_DETAILS_RESET' }
  | { type: 'SERVE_ERROR_OPEN'; error: PendingServeError }
  | { type: 'SERVE_ERROR_CLOSE' }
  | { type: 'FIRST_SERVE_ERROR_SET'; err: FirstServeError }
  | { type: 'FIRST_SERVE_ERROR_CLEAR' }
  | { type: 'EDIT_MATCH_OPEN' }
  | { type: 'EDIT_MATCH_CLOSE' }
  | { type: 'FONT_SCALE_SET'; scale: number }
  | { type: 'ANNOTATOR_COUNT_SET'; count: number };

function scoreboardUIReducer(
  state: ScoreboardUIState,
  action: ScoreboardUIAction,
): ScoreboardUIState {
  switch (action.type) {
    case 'SETUP_SET':
      return { ...state, isSetupOpen: action.isOpen };
    case 'ELAPSED_SET':
      return { ...state, elapsed: action.value };
    case 'SERVER_EFFECT_OPEN':
      return { ...state, isServerEffectOpen: true };
    case 'SERVER_EFFECT_CLOSE':
      return { ...state, isServerEffectOpen: false };
    case 'SERVER_EFFECT_CONFIRM':
      return { ...state, isServerEffectOpen: false, playerInFocus: null, firstServeError: null };
    case 'PLAYER_IN_FOCUS_SET':
      return { ...state, playerInFocus: action.player };
    case 'SERVE_STEP_SET':
      if (action.step === 'second' && state.serveStep !== 'none') return state;
      return { ...state, serveStep: action.step };
    case 'FORCE_RERENDER':
      return { ...state, renderKey: state.renderKey + 1 };
    case 'STATS_OPEN':
      return { ...state, isStatsOpen: true, statsData: action.data };
    case 'STATS_CLOSE':
      return { ...state, isStatsOpen: false, statsData: null };
    case 'POINT_DETAILS_OPEN':
      return { ...state, isPointDetailsOpen: true, pendingPointPlayer: action.player };
    case 'POINT_DETAILS_RESET':
      return {
        ...state,
        isPointDetailsOpen: false,
        pendingPointPlayer: null,
        firstServeError: null,
      };
    case 'SERVE_ERROR_OPEN':
      return { ...state, isServeErrorModalOpen: true, pendingServeError: action.error };
    case 'SERVE_ERROR_CLOSE':
      return { ...state, isServeErrorModalOpen: false, pendingServeError: null };
    case 'FIRST_SERVE_ERROR_SET':
      return { ...state, firstServeError: action.err };
    case 'FIRST_SERVE_ERROR_CLEAR':
      return { ...state, firstServeError: null };
    case 'EDIT_MATCH_OPEN':
      return { ...state, editMatchOpen: true };
    case 'EDIT_MATCH_CLOSE':
      return { ...state, editMatchOpen: false };
    case 'FONT_SCALE_SET':
      return { ...state, fontScale: action.scale };
    case 'ANNOTATOR_COUNT_SET':
      return { ...state, annotatorCount: action.count };
    default:
      return state;
  }
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
  const initialUIState: ScoreboardUIState = {
    isSetupOpen: false,
    elapsed: 0,
    isServerEffectOpen: false,
    playerInFocus: null,
    serveStep: 'none',
    renderKey: 0,
    isStatsOpen: false,
    statsData: null,
    isPointDetailsOpen: false,
    pendingPointPlayer: null,
    isServeErrorModalOpen: false,
    pendingServeError: null,
    firstServeError: null,
    annotatorCount: 0,
    editMatchOpen: false,
    fontScale: (() => {
      const saved = localStorage.getItem('sb-font-scale');
      const parsed = saved ? parseFloat(saved) : 1.0;
      return isNaN(parsed) ? 1.0 : Math.min(2.0, Math.max(0.6, parsed));
    })(),
  };
  const [uiState, dispatch] = useReducer(scoreboardUIReducer, initialUIState);
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

  // Função para persistir o estado antes de fechar
  const handleEndMatch = async () => {
    const sys = getSystem();
    let finalState: unknown = undefined;

    // Sempre tentar capturar o estado final, mesmo se a sincronização falhar
    if (sys) {
      try {
        // Tentar sincronizar com o backend (atualiza dados em tempo real)
        if (matchData?.status && matchData.status !== 'NOT_STARTED') {
          await sys.syncState();
        }
        // Capturar o estado final do sistema (com ou sem sync bem-sucedido)
        finalState = sys.getState();
        scoreLog.debug('Estado final capturado com sucesso', {
          matchId: matchIdRef.current,
          hasPointsHistory: !!finalState?.pointsHistory,
          pointsCount: finalState?.pointsHistory?.length ?? 0,
        });
      } catch (err) {
        // Sincronização falhou, mas tenta ainda assim capturar o estado local
        scoreLog.warn('Falha no syncState ao encerrar partida (tentando capturar estado local)', {
          matchId: matchIdRef.current,
          error: err instanceof Error ? err.message : String(err),
        });
        try {
          finalState = sys.getState();
          scoreLog.info('Estado local capturado após falha de sync', {
            matchId: matchIdRef.current,
          });
        } catch (getStateErr) {
          scoreLog.warn('Falha ao capturar estado local', { matchId: matchIdRef.current });
        }
      }
    }

    // Encerra a sessão de anotação auto-iniciada (salva finalStateSnapshot + status=COMPLETED)
    const sessionId = annotationSessionIdRef.current;
    const currentMatchId = matchIdRef.current;
    if (sessionId && currentMatchId) {
      try {
        await endSession(currentMatchId, sessionId, finalState);
        scoreLog.info('Sessão de anotação encerrada com sucesso', {
          matchId: currentMatchId,
          sessionId,
          hasFinalState: !!finalState,
        });
      } catch (err) {
        scoreLog.warn('Falha ao encerrar sessão de anotação', {
          matchId: currentMatchId,
          sessionId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      annotationSessionIdRef.current = null;
    }

    onEndMatch();
  };

  // Função para buscar estatísticas
  const fetchStats = async () => {
    dispatch({
      type: 'STATS_OPEN',
      data: {
        totalPoints: 10,
        player1: { pointsWon: 5 },
        player2: { pointsWon: 5 },
        match: {},
        pointsHistory: [],
      },
    });
  };

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
        const session = await startSession(matchId);
        if (active && session) {
          annotationSessionIdRef.current = session.id;
          dispatch({ type: 'ANNOTATOR_COUNT_SET', count: Math.max(annotatorCount, 1) });
        }
      } catch {
        // fire-and-forget: não crítico, anotação continua sem contagem
      }
      try {
        // SECURITY: usa httpClient que injeta o Authorization header automaticamente
        // via token mantido no AuthContext — sem ler localStorage diretamente.
        const res = await httpClient.get<{ sessions?: unknown[] } | unknown[]>(
          `/matches/${matchId}/sessions`,
        );
        if (active && res.ok) {
          const data = res.data;
          const sessions = Array.isArray(data)
            ? data
            : ((data as { sessions?: unknown[] })?.sessions ?? []);
          dispatch({ type: 'ANNOTATOR_COUNT_SET', count: sessions.length });
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
        if (response.ok && response.data?.status === 'FINISHED' && matchData?.status !== 'FINISHED') {
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

  // ── Handlers ──

  const handleSetupConfirm = async (firstServer: Player) => {
    if (!matchData || !matchId) {
      return;
    }

    try {
      const system = new TennisScoring(firstServer, matchData.format as TennisFormat);
      system.enableSync(matchId);
      system.setStartedAt(new Date().toISOString());
      const state = system.getState();
      if ('needsSetup' in state) delete state.needsSetup;
      if (!state.startedAt) state.startedAt = new Date().toISOString();
      scoringSystemRef.current = system;
      dispatch({ type: 'SETUP_SET', isOpen: false });

      try {
        const response = await httpClient.patch(`/matches/${matchId}/state`, {
          matchState: state,
        });
        if (!response.ok) {
          throw new Error(
            `Falha na sincronização: ${response.status} - ${JSON.stringify(response.data)}`,
          );
        }
      } catch (syncError) {
        throw new Error(`Erro ao sincronizar partida: ${syncError.message}`);
      }
    } catch (error) {
      setError('Erro ao iniciar partida. Tente novamente.');
    }
  };

  const handlePointDetailsOpen = (player: Player) => {
    dispatch({ type: 'POINT_DETAILS_OPEN', player });
  };

  const handlePointDetailsConfirm = (details: RallyDetails | undefined) => {
    dispatch({ type: 'POINT_DETAILS_RESET' }); // closes modal + clears pendingPointPlayer + firstServeError
    const isSecond = serveStep === 'second';
    const firstFaultPayload =
      isSecond && firstServeError
        ? {
            firstFault: {
              errorType: firstServeError.errorType,
              serveEffect: firstServeError.serveEffect as 'TopSpin' | 'Slice' | 'Flat' | undefined,
              direction: firstServeError.direction as 'Fechado' | 'Centro' | 'Aberto' | undefined,
            },
          }
        : {};
    if (pendingPointPlayer) {
      if (details) {
        addPoint(pendingPointPlayer, {
          rallyDetails: details,
          result: {
            winner: pendingPointPlayer,
            type: 'WINNER',
          },
          serve: { isFirstServe: !isSecond, ...firstFaultPayload },
          rally: { ballExchanges: 1 },
        } as Partial<PointDetails>);
      } else {
        addPoint(pendingPointPlayer, {
          serve: { isFirstServe: !isSecond, ...firstFaultPayload },
          result: { winner: pendingPointPlayer, type: 'WINNER' },
          rally: { ballExchanges: 1 },
        } as Partial<PointDetails>);
      }
    }
    // pendingPointPlayer + firstServeError already cleared by POINT_DETAILS_RESET above
  };

  const handlePointDetailsCancel = () => {
    dispatch({ type: 'POINT_DETAILS_RESET' }); // clears modal + pendingPointPlayer
  };

  const addPoint = async (player: Player, details?: Partial<PointDetails>) => {
    const scoringSystem = getSystem();
    if (!scoringSystem) {
      return;
    }

    const pointDetails: Partial<PointDetails> = details || {
      serve: { isFirstServe: serveStep !== 'second' },
      result: { winner: player, type: 'WINNER' },
      rally: { ballExchanges: 1 },
    };

    if (details && !details.serve) {
      pointDetails.serve = { isFirstServe: serveStep !== 'second' };
    }

    // Garante que shotPlayer sempre esteja preenchido — padrão: o vencedor do ponto
    if (!pointDetails.shotPlayer) {
      pointDetails.shotPlayer = player;
    }

    let newState: ReturnType<typeof scoringSystem.getState>;
    try {
      newState = scoringSystem.addPoint(player, pointDetails as PointDetails);
    } catch (err) {
      return;
    }
    setServeStepSafe('none');
    forceRerender();

    if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = window.setTimeout(() => {
      const sys = getSystem();
      sys?.syncState()?.catch((err: unknown) => {
        scoreLog.warn('Falha no syncState após ponto (retry automático na próxima sincronização)', {
          matchId,
        });
      });
    }, 250);

    if (newState.isFinished && newState.winner) {
      scoreLog.info(`Partida finalizada! Vencedor: ${newState.winner}`);
      const players = {
        p1: resolvePlayerName(matchData!.players.p1),
        p2: resolvePlayerName(matchData!.players.p2),
      };
      const winnerName = newState.winner === 'PLAYER_1' ? players.p1 : players.p2;

      setTimeout(() => {
        toast.success(
          `Vencedor: ${winnerName} | Placar: ${newState.sets.PLAYER_1} sets x ${newState.sets.PLAYER_2} sets`,
          '🏆 Partida Finalizada!',
        );
        // Encerra a sessão de anotação (salva finalState) antes de navegar
        handleEndMatch();
      }, 500);
    }
  };

  const handleFault = async () => {
    const scoringSystem = getSystem();
    if (!scoringSystem) {
      return;
    }

    const currentServer = scoringSystem.getState().server;
    const opponent = currentServer === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
    const pointDetails: Partial<PointDetails> = {
      serve: { type: 'DOUBLE_FAULT', isFirstServe: false },
      result: { winner: opponent, type: 'FORCED_ERROR' },
      rally: { ballExchanges: 1 },
    };
    addPoint(opponent, pointDetails);
  };

  const handleUndo = async () => {
    const scoringSystem = getSystem();
    if (!scoringSystem) {
      return;
    }

    try {
      const prevState = scoringSystem.undoLastPoint();
      if (prevState) {
        setServeStepSafe('none');
        forceRerender();
        if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = window.setTimeout(() => {
          const sys = getSystem();
          sys?.syncState()?.catch((err: unknown) => {
            scoreLog.warn(
              'Falha no syncState após undo (retry automático na próxima sincronização)',
              { matchId },
            );
          });
        }, 250);
      }
    } catch (err) {
      // Estado local já foi revertido pelo undoLastPoint — UI reflete corretamente
      scoreLog.warn('Erro ao desfazer ponto (UI já revertida)', { matchId });
    }
  };

  const getLastPointDetails = (): PointDetails | null => {
    return getSystem()?.getLastPointDetails() ?? null;
  };

  const handleEditScore = async (
    setWinners: Array<'p1' | 'p2'>,
    newServer: Player,
  ): Promise<void> => {
    const scoringSystem = getSystem();
    if (!scoringSystem) return;

    try {
      const currentState = scoringSystem.getState();

      const p1Sets = setWinners.filter((w) => w === 'p1').length;
      const p2Sets = setWinners.filter((w) => w === 'p2').length;

      const completedSets = setWinners.map((winner, idx) => ({
        setNumber: idx + 1,
        games: {
          PLAYER_1: winner === 'p1' ? 6 : 0,
          PLAYER_2: winner === 'p2' ? 6 : 0,
        } as Record<Player, number>,
        winner: (winner === 'p1' ? 'PLAYER_1' : 'PLAYER_2') as Player,
      }));

      const newState: MatchState = {
        ...currentState,
        sets: { PLAYER_1: p1Sets, PLAYER_2: p2Sets },
        currentSet: setWinners.length + 1,
        currentSetState: {
          games: { PLAYER_1: 0, PLAYER_2: 0 } as Record<Player, number>,
        },
        currentGame: {
          points: { PLAYER_1: '0', PLAYER_2: '0' } as Record<Player, string>,
          server: newServer,
          isTiebreak: false,
          isMatchTiebreak: false,
        },
        server: newServer,
        isFinished: false,
        winner: undefined,
        completedSets,
        config: currentState.config,
      };

      scoringSystem.loadState(newState);
      setServeStepSafe('none');
      forceRerender();

      if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = window.setTimeout(() => {
        const sys = getSystem();
        sys?.syncState()?.catch(() => {
          scoreLog.warn('Falha no syncState após edição de placar', { matchId });
        });
      }, 250);
    } catch (err) {
      scoreLog.warn('Erro ao editar placar', { matchId });
    }
  };

  const handleServerEffectConfirm = (effect?: string, direction?: string) => {
    if (!playerInFocus) return;
    const isSecond = serveStep === 'second';
    const pointDetails: Partial<PointDetails> = {
      serve: {
        type: 'ACE',
        isFirstServe: !isSecond,
        serveEffect: effect as 'TopSpin' | 'Slice' | 'Flat' | undefined,
        direction: direction as 'Fechado' | 'Centro' | 'Aberto' | undefined,
        ...(isSecond && firstServeError
          ? {
              firstFault: {
                errorType: firstServeError.errorType,
                serveEffect: firstServeError.serveEffect as
                  | 'TopSpin'
                  | 'Slice'
                  | 'Flat'
                  | undefined,
                direction: firstServeError.direction as 'Fechado' | 'Centro' | 'Aberto' | undefined,
              },
            }
          : {}),
      },
      result: {
        winner: playerInFocus,
        type: 'WINNER',
      },
      rally: { ballExchanges: 1 },
    };
    addPoint(playerInFocus, pointDetails);
    dispatch({ type: 'SERVER_EFFECT_CONFIRM' }); // isServerEffectOpen=false, playerInFocus=null, firstServeError=null
  };

  const handleServeErrorOpen = (errorType: 'out' | 'net', step: 'first' | 'second') => {
    dispatch({ type: 'SERVE_ERROR_OPEN', error: { errorType, serveStep: step } });
  };

  const handleServeErrorConfirm = (effect?: string, direction?: string) => {
    dispatch({ type: 'SERVE_ERROR_CLOSE' }); // sets isServeErrorModalOpen=false + pendingServeError=null
    // pendingServeError/firstServeError are read from current render's closure (dispatch defers until next render)
    if (!pendingServeError) return;

    if (pendingServeError.serveStep === 'first') {
      dispatch({
        type: 'FIRST_SERVE_ERROR_SET',
        err: { errorType: pendingServeError.errorType, serveEffect: effect, direction },
      });
      dispatch({ type: 'SERVE_STEP_SET', step: 'second' });
    } else {
      dispatch({ type: 'FIRST_SERVE_ERROR_CLEAR' });
      const scoringSystem = getSystem();
      if (!scoringSystem) return;
      const currentServer = scoringSystem.getState().server;
      const opponent = currentServer === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
      const pointDetails: Partial<PointDetails> = {
        serve: {
          type: 'DOUBLE_FAULT',
          isFirstServe: false,
          serveEffect: effect as 'TopSpin' | 'Slice' | 'Flat' | undefined,
          direction: direction as 'Fechado' | 'Centro' | 'Aberto' | undefined,
          errorType: pendingServeError.errorType,
          ...(firstServeError
            ? {
                firstFault: {
                  errorType: firstServeError.errorType,
                  serveEffect: firstServeError.serveEffect as
                    | 'TopSpin'
                    | 'Slice'
                    | 'Flat'
                    | undefined,
                  direction: firstServeError.direction as
                    | 'Fechado'
                    | 'Centro'
                    | 'Aberto'
                    | undefined,
                },
              }
            : {}),
        },
        result: { winner: opponent, type: 'FORCED_ERROR' },
        rally: { ballExchanges: 1 },
      };
      addPoint(opponent, pointDetails);
      // firstServeError already cleared by FIRST_SERVE_ERROR_CLEAR above
    }
    // pendingServeError already cleared by SERVE_ERROR_CLOSE above
  };

  const handleServeErrorCancel = () => {
    dispatch({ type: 'SERVE_ERROR_CLOSE' }); // sets isServeErrorModalOpen=false + pendingServeError=null
  };

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
  };
}
