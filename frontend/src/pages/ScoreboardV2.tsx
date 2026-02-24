// Função utilitária para pegar o estado mais profundo
function getDeepMatchState(state: any) {
  let current = state;
  while (current && current.matchState) {
    current = current.matchState;
  }
  return current;
}
// frontend/src/pages/ScoreboardV2.tsx (Fluxo de saque final e correto)

import React, { useState, useEffect, useCallback, useRef } from "react";
import MatchStatsModal from "../components/MatchStatsModal";
import { useParams, useNavigate } from "react-router-dom";
import LoadingIndicator from "../components/LoadingIndicator";
import ServerEffectModal from "../components/ServerEffectModal";
import PointDetailsModal from "../components/PointDetailsModal";
import { TennisScoring } from "../core/scoring/TennisScoring";
import { TennisConfigFactory } from "../core/scoring/TennisConfigFactory";
import type {
  MatchState,
  TennisFormat,
  Player,
  PointDetails,
  RallyDetails,
} from "../core/scoring/types";
import { API_URL } from "../config/api";
import { useMatchSync } from "../hooks/useMatchSync";
import { useShakeDetection } from "../hooks/useGestures";
import CourtBackground from "../components/scoreboard/CourtBackground";
import MatchHeader, {
  type ViewMode,
} from "../components/scoreboard/MatchHeader";
import PlayerCard from "../components/scoreboard/PlayerCard";
import VSIndicator from "../components/scoreboard/VSIndicator";
import ContextBadges from "../components/scoreboard/ContextBadges";
import ActionBar from "../components/scoreboard/ActionBar";
import "../styles/scoreboard-tokens.css";
import "./ScoreboardV2.css";

interface MatchData {
  id: string;
  sportType: string;
  format: TennisFormat | string;
  courtType?: "GRASS" | "CLAY" | "HARD";
  players: { p1: string; p2: string };
  status?: "NOT_STARTED" | "IN_PROGRESS" | "FINISHED";
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
        <p>
          <strong>Modo de jogo:</strong>{" "}
          {TennisConfigFactory.getFormatDisplayName(format as TennisFormat)}
        </p>
        <div className="server-selection">
          <h4>Quem saca primeiro?</h4>
          <div className="server-buttons">
            <button
              className="server-button"
              onClick={() => onConfirm("PLAYER_1")}
            >
              🎾 {players.p1}
            </button>
            <button
              className="server-button"
              onClick={() => onConfirm("PLAYER_2")}
            >
              🎾 {players.p2}
            </button>
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={onCancel} className="cancel-button">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

const ScoreboardV2: React.FC<{ onEndMatch: () => void }> = ({ onEndMatch }) => {
  // Função para persistir o estado antes de fechar
  const handleEndMatch = async () => {
    console.log("[ScoreboardV2] Finalizando partida e persistindo estado");

    // Só persiste se a partida já foi iniciada
    const sys = getSystem();
    if (sys && matchData?.status !== "NOT_STARTED") {
      try {
        console.log("[ScoreboardV2] Sincronizando estado atual");
        await sys.syncState();
      } catch (e) {
        // Pode exibir um alerta ou logar o erro, mas não impede o fechamento
        console.error("[ScoreboardV2] Erro ao persistir estado ao fechar:", e);
      }
    }

    onEndMatch();
  };
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();

  const [matchData, setMatchData] = useState<MatchData | null>(null);
  // useRef em vez de useState: o objeto TennisScoring é mutável — usar useState
  // faz o React potencialmente sobrescrever a referência em re-renders/StrictMode,
  // apagando pontos marcados em memória antes do sync.
  const scoringSystemRef = useRef<TennisScoring | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [elapsed, setElapsed] = useState<number>(0);
  const [isServerEffectOpen, setIsServerEffectOpen] = useState(false);
  const [playerInFocus, setPlayerInFocus] = useState<Player | null>(null);
  const [serveStep, setServeStep] = useState<"none" | "second">("none");
  const [renderKey, setRenderKey] = useState(0);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [statsData, setStatsData] = useState(null);
  const [isPointDetailsOpen, setIsPointDetailsOpen] = useState(false);
  const [pendingPointPlayer, setPendingPointPlayer] = useState<Player | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<ViewMode>("simple");
  const [showFamilyExplainer, setShowFamilyExplainer] = useState(false);
  const [contextMenuPlayer, setContextMenuPlayer] = useState<Player | null>(
    null,
  );
  const courtRef = useRef<HTMLDivElement>(null);
  // Ref para cancelar syncState pendente e evitar race condition de OOO writes
  const syncTimeoutRef = useRef<number | null>(null);

  // Atalho local para o sistema de pontuação (derivado do ref)
  const getSystem = () => scoringSystemRef.current;
  // Shake → undo
  useShakeDetection({
    onShake: useCallback(() => {
      if (window.confirm("Desfazer último ponto?")) {
        handleUndo();
      }
    }, []),
  });

  // Validação para mudanças seguras de serveStep
  const setServeStepSafe = useCallback(
    (newStep: "none" | "second") => {
      if (newStep === "second" && serveStep !== "none") {
        console.warn(
          "[ScoreboardV2] Tentativa inválida de mudar para segundo saque do estado atual",
          { current: serveStep, requested: newStep },
        );
        return;
      }
      if (newStep === "none" && serveStep === "none") {
        // Reset redundante, mas permitido
        console.debug(
          "[ScoreboardV2] Reset de serveStep para none (já estava none)",
        );
      }
      setServeStep(newStep);
    },
    [serveStep],
  );

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
      console.error("[ScoreboardV2] ID da partida não encontrado na URL");
      setError("ID da partida não encontrado na URL.");
      setIsLoading(false);
      return;
    }

    console.log(`[ScoreboardV2] Iniciando carregamento da partida ${matchId}`);

    // Flag para cancelar atualização de estado caso o efeito seja limpo
    // (React StrictMode dispara o efeito duas vezes em dev — sem isso, a
    // segunda chamada sobrescreve o scoringSystem com estado antigo do banco
    // DEPOIS do usuário já ter marcado pontos, apagando-os.)
    let cancelled = false;

    const fetchMatchData = async () => {
      try {
        let data: MatchData;

        // Sempre busca o estado mais recente do banco
        console.log(
          `[ScoreboardV2] Buscando estado atualizado do backend para ${matchId}`,
        );
        const response = await fetch(`${API_URL}/matches/${matchId}/state`);

        // Se este efeito já foi cancelado (StrictMode ou matchId mudou), aborta
        if (cancelled) return;

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `[ScoreboardV2] Falha ao carregar dados da partida ${matchId}:`,
            response.status,
            errorText,
          );
          throw new Error(
            `Falha ao carregar dados da partida (status: ${response.status})`,
          );
        }
        data = await response.json();

        // Verificar novamente após await
        if (cancelled) return;

        // Fallback para garantir que o formato sempre existe
        const format = (data.matchState?.config?.format ||
          data.format) as TennisFormat;
        if (!format) {
          setError("Partida sem configuração de formato.");
          setIsLoading(false);
          return;
        }

        console.log(`[ScoreboardV2] Dados da partida carregados:`, data);
        setMatchData(data);

        const system = new TennisScoring(
          data.matchState?.server || "PLAYER_1",
          format,
        );
        system.enableSync(matchId);

        if (data.status === "FINISHED") {
          console.warn(
            `[ScoreboardV2] Tentativa de carregar partida finalizada ${matchId} - redirecionando para dashboard`,
          );
          navigate("/dashboard");
          return;
        } else if (data.status === "IN_PROGRESS" && data.matchState) {
          const deepState = getDeepMatchState(data.matchState);
          console.log(
            `[ScoreboardV2] Retomando partida com estado:`,
            deepState,
          );
          system.loadState(deepState);
          setIsSetupOpen(false);
        } else if (data.status === "NOT_STARTED") {
          console.log(`[ScoreboardV2] Partida não iniciada, abrindo setup`);
          setIsSetupOpen(true);
        }

        // Só instala o sistema se este efeito ainda for o mais recente
        if (!cancelled) {
          scoringSystemRef.current = system;
          forceRerender();
        }
      } catch (err) {
        if (cancelled) return; // ignora erros de efeitos cancelados
        console.error(
          `[ScoreboardV2] Erro ao carregar partida ${matchId}:`,
          err,
        );
        setError(
          err instanceof Error ? err.message : "Ocorreu um erro desconhecido.",
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchMatchData();

    // Cleanup: marca este efeito como cancelado quando o componente desmonta
    // ou quando matchId muda — impede setScoringSystem stale.
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  useEffect(() => {
    let timer: number | null = null;
    const sys = getSystem();
    const sysState = sys?.getState();
    if (sysState?.startedAt && !sysState?.isFinished) {
      const start = new Date(sysState.startedAt).getTime();
      const updateElapsed = () =>
        setElapsed(Math.floor((Date.now() - start) / 1000));
      updateElapsed();
      timer = window.setInterval(updateElapsed, 1000);
    }
    return () => {
      if (timer) window.clearInterval(timer);
    };
    // renderKey garante que este efeito re-avalia após cada ponto
  }, [renderKey]);

  const handleSetupConfirm = async (firstServer: Player) => {
    if (!matchData || !matchId) {
      console.error("[ScoreboardV2] Dados insuficientes para confirmar setup");
      return;
    }

    console.log(
      `[ScoreboardV2] Confirmando setup da partida ${matchId} com primeiro servidor: ${firstServer}`,
    );

    try {
      const system = new TennisScoring(
        firstServer,
        matchData.format as TennisFormat,
      );
      system.enableSync(matchId);
      system.setStartedAt(new Date().toISOString());
      // Remover needsSetup do estado antes de sincronizar e garantir startedAt
      const state = system.getState();
      if ("needsSetup" in state) delete state.needsSetup;
      if (!state.startedAt) state.startedAt = new Date().toISOString();
      scoringSystemRef.current = system;
      setIsSetupOpen(false);

      // Sincronizar estado inicial - o backend inferirá o status automaticamente
      console.log(`[ScoreboardV2] Iniciando sincronização inicial`);
      try {
        const response = await fetch(`${API_URL}/matches/${matchId}/state`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchState: state }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Falha na sincronização: ${response.status} - ${errorText}`,
          );
        }

        const result = await response.json();
        console.log(`[ScoreboardV2] Setup confirmado com sucesso:`, result);
      } catch (syncError) {
        console.error(
          `[ScoreboardV2] Erro crítico na sincronização inicial:`,
          syncError,
        );
        throw new Error(`Erro ao sincronizar partida: ${syncError.message}`);
      }
    } catch (error) {
      console.error(
        `[ScoreboardV2] Erro ao confirmar setup da partida ${matchId}:`,
        error,
      );
      setError("Erro ao iniciar partida. Tente novamente.");
    }
  };

  const forceRerender = () => {
    setRenderKey((prev) => prev + 1);
  };

  // Registra ponto diretamente (sem modal) — toque rápido no card do jogador
  const handlePointButtonClick = (player: Player) => {
    addPoint(player, {
      serve: { isFirstServe: serveStep !== "second", type: "SERVICE_WINNER" },
      result: { winner: player, type: "WINNER" },
      rally: { ballExchanges: 1 },
    } as Partial<PointDetails>);
  };

  // Abre o modal de detalhes do ponto
  const handlePointDetailsOpen = (player: Player) => {
    setPendingPointPlayer(player);
    setIsPointDetailsOpen(true);
  };

  // Chamado pelo PointDetailsModal ao confirmar ou pular
  const handlePointDetailsConfirm = (details: RallyDetails | undefined) => {
    setIsPointDetailsOpen(false);
    if (pendingPointPlayer) {
      if (details) {
        addPoint(pendingPointPlayer, {
          rallyDetails: details,
          result: {
            winner: pendingPointPlayer,
            type: "WINNER",
          },
          serve: { isFirstServe: serveStep !== "second" },
          rally: { ballExchanges: 1 },
        } as Partial<PointDetails>);
      } else {
        addPoint(pendingPointPlayer);
      }
    }
    setPendingPointPlayer(null);
  };

  const handlePointDetailsCancel = () => {
    setIsPointDetailsOpen(false);
    setPendingPointPlayer(null);
  };

  const addPoint = async (player: Player, details?: Partial<PointDetails>) => {
    const scoringSystem = getSystem();
    if (!scoringSystem) {
      console.warn(
        "[ScoreboardV2] Tentativa de adicionar ponto sem sistema de pontuação",
      );
      return;
    }

    // Garantir que isFirstServe seja sempre incluído para persistência
    const pointDetails: Partial<PointDetails> = details || {
      serve: { isFirstServe: serveStep !== "second" },
      result: { winner: player, type: "WINNER" },
      rally: { ballExchanges: 1 },
    };

    // Se details foi fornecido mas não tem serve, adicionar
    if (details && !details.serve) {
      pointDetails.serve = { isFirstServe: serveStep !== "second" };
    }

    console.log(
      `[ScoreboardV2] Adicionando ponto para ${player}`,
      pointDetails,
    );

    // 1. Atualizar estado em memória IMEDIATAMENTE (síncrono) — UI nunca trava
    let newState: ReturnType<typeof scoringSystem.getState>;
    try {
      newState = scoringSystem.addPoint(player, pointDetails as PointDetails);
    } catch (err) {
      console.error(
        `[ScoreboardV2] Erro ao computar ponto para ${player}:`,
        err,
      );
      return;
    }
    setServeStepSafe("none");
    forceRerender(); // UI atualiza independente do resultado do sync

    // 2. Sincronizar com backend — debounced para evitar race condition de
    // requisições out-of-order que sobrescrevem o estado mais novo com o mais antigo.
    if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = window.setTimeout(() => {
      const sys = getSystem();
      sys?.syncState()?.catch((syncErr) => {
        console.error(
          `[ScoreboardV2] Falha ao sincronizar ponto — dado pode ser perdido ao recarregar:`,
          syncErr,
        );
      });
    }, 250);

    // 3. Verificar se a partida foi finalizada
    if (newState.isFinished && newState.winner) {
      console.log(
        `[ScoreboardV2] Partida finalizada! Vencedor: ${newState.winner}`,
      );
      const winnerName =
        newState.winner === "PLAYER_1" ? players.p1 : players.p2;
      setTimeout(() => {
        alert(
          `🏆 PARTIDA FINALIZADA!\n\nVencedor: ${winnerName}\n\nPlacar Final: ${newState.sets.PLAYER_1} sets x ${newState.sets.PLAYER_2} sets`,
        );
        navigate("/dashboard");
      }, 500);
    }

    console.log(`[ScoreboardV2] Ponto registrado em memória para ${player}`);
  };

  const handleFault = async () => {
    const scoringSystem = getSystem();
    if (!scoringSystem) {
      console.warn(
        "[ScoreboardV2] Tentativa de registrar falta sem sistema de pontuação",
      );
      return;
    }

    console.log("[ScoreboardV2] Registrando falta dupla");
    const currentServer = scoringSystem.getState().server;
    const opponent = currentServer === "PLAYER_1" ? "PLAYER_2" : "PLAYER_1";
    const pointDetails: Partial<PointDetails> = {
      serve: { type: "DOUBLE_FAULT", isFirstServe: false },
      result: { winner: opponent, type: "FORCED_ERROR" },
      rally: { ballExchanges: 1 },
    };
    addPoint(opponent, pointDetails);
  };

  const handleUndo = async () => {
    const scoringSystem = getSystem();
    if (!scoringSystem) {
      console.warn(
        "[ScoreboardV2] Tentativa de desfazer ponto sem sistema de pontuação",
      );
      return;
    }

    console.log("[ScoreboardV2] Desfazendo último ponto");
    try {
      const prevState = scoringSystem.undoLastPoint();
      if (prevState) {
        setServeStepSafe("none");
        forceRerender();
        // Sincronizar de forma assíncrona
        if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = window.setTimeout(() => {
          const sys = getSystem();
          sys?.syncState()?.catch((e) =>
            console.error("[ScoreboardV2] Erro ao sincronizar undo:", e),
          );
        }, 250);
        console.log("[ScoreboardV2] Ponto desfeito com sucesso");
      }
    } catch (error) {
      console.error("[ScoreboardV2] Erro ao desfazer ponto:", error);
    }
  };

  const handleServerEffectConfirm = (effect?: string, direction?: string) => {
    if (!playerInFocus) return;
    // ServerEffectModal é usado apenas para Ace, nunca para dupla falta
    // Dupla falta é tratada por handleFault()
    const pointDetails: Partial<PointDetails> = {
      serve: {
        type: "ACE",
        isFirstServe: serveStep !== "second",
        serveEffect: effect as "Chapado" | "Cortado" | "TopSpin" | undefined,
        direction: direction as "Fechado" | "Aberto" | undefined,
      },
      result: {
        winner: playerInFocus,
        type: "WINNER",
      },
      rally: { ballExchanges: 1 },
    };
    addPoint(playerInFocus, pointDetails);
    setIsServerEffectOpen(false);
    setPlayerInFocus(null);
  };

  if (isLoading) return <LoadingIndicator />;
  if (error) {
    console.error("[ScoreboardV2] Renderizando erro:", error);
    return (
      <div className="scoreboard-error">
        Erro: {error}{" "}
        <button onClick={() => navigate("/dashboard")}>Voltar</button>
      </div>
    );
  }
  if (!matchData) {
    console.error("[ScoreboardV2] matchData está undefined");
    return (
      <div className="scoreboard-error">
        Partida não encontrada ou dados incompletos.{" "}
        <button onClick={() => navigate("/dashboard")}>Voltar</button>
      </div>
    );
  }
  if (!("format" in matchData) || !matchData.format) {
    console.error("[ScoreboardV2] matchData.format está undefined", matchData);
    return (
      <div className="scoreboard-error">
        Partida sem configuração de formato.{" "}
        <button onClick={() => navigate("/dashboard")}>Voltar</button>
      </div>
    );
  }
  // Derivar scoringSystem do ref para uso no render (read-only, imutável aqui)
  const scoringSystem = scoringSystemRef.current;

  if (!scoringSystem) {
    console.error("[ScoreboardV2] scoringSystem está undefined", { matchData });
    return (
      <div className="scoreboard-error">
        Dados da partida não puderam ser inicializados.
      </div>
    );
  }

  const state = scoringSystem.getState();
  const players = matchData.players;
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
  if (matchData?.status === "FINISHED") {
    console.warn(
      `[ScoreboardV2] Partida ${matchId} está finalizada mas chegou ao ScoreboardV2 - redirecionando`,
    );
    navigate("/dashboard");
    return null;
  }

  // ── Contexto e estados especiais do ponto ──────────────────────────────────
  const p1Score = state.currentGame?.points?.PLAYER_1 ?? "0";
  const p2Score = state.currentGame?.points?.PLAYER_2 ?? "0";
  const p1Games = state.currentSetState?.games?.PLAYER_1 ?? 0;
  const p2Games = state.currentSetState?.games?.PLAYER_2 ?? 0;
  const p1Sets = state.sets?.PLAYER_1 ?? 0;
  const p2Sets = state.sets?.PLAYER_2 ?? 0;
  const config = (state as any).config;
  const setsToWin = config?.setsToWin ?? 2;
  const gamesPerSet = config?.gamesPerSet ?? 6;

  const isDeuce = !isTiebreak && p1Score === "40" && p2Score === "40";
  const p1HasAdv = p1Score === "AD";
  const p2HasAdv = p2Score === "AD";

  // game-level "would-win-point" por jogador
  const p1AtGamePt = isTiebreak
    ? typeof p1Score === "number" &&
      p1Score >= 6 &&
      (p1Score as number) - (p2Score as number) >= 1
    : (p1Score === "40" && p2Score !== "40") || p1HasAdv;
  const p2AtGamePt = isTiebreak
    ? typeof p2Score === "number" &&
      p2Score >= 6 &&
      (p2Score as number) - (p1Score as number) >= 1
    : (p2Score === "40" && p1Score !== "40") || p2HasAdv;

  // set-level: ganhar o game daria o set?
  const p1AtSetPt = p1AtGamePt && (p1Games + 1 > gamesPerSet || isTiebreak);
  const p2AtSetPt = p2AtGamePt && (p2Games + 1 > gamesPerSet || isTiebreak);

  // match-level
  const p1MatchPt = p1AtSetPt && p1Sets + 1 >= setsToWin;
  const p2MatchPt = p2AtSetPt && p2Sets + 1 >= setsToWin;

  // break point: quem está devolvendo é quem pode ganhar o game
  const returner = state.server === "PLAYER_1" ? "PLAYER_2" : "PLAYER_1";
  const isBreakPoint =
    !isTiebreak && (returner === "PLAYER_1" ? p1AtGamePt : p2AtGamePt);

  // tech stats aproximados (usa pointsHistory se disponível)
  const pointsHistory: any[] = (scoringSystem as any).pointsHistory ?? [];
  const computeTechStats = (playerKey: "PLAYER_1" | "PLAYER_2") => {
    if (!pointsHistory.length)
      return { firstServePercent: 0, winners: 0, unforced: 0 };
    const won = pointsHistory.filter((p) => p.result?.winner === playerKey);
    const served = pointsHistory.filter((p) => p.serve);
    const first = served.filter((p) => p.serve?.isFirstServe);
    return {
      firstServePercent: served.length
        ? Math.round((first.length / served.length) * 100)
        : 0,
      winners: won.filter((p) => p.result?.type === "WINNER").length,
      unforced: pointsHistory.filter(
        (p) =>
          p.result?.winner !== playerKey && p.result?.type === "UNFORCED_ERROR",
      ).length,
    };
  };

  // legenda de evento para modo família / assistir
  const familyCaption = (() => {
    if (state.isFinished && state.winner) {
      return `🏆 ${state.winner === "PLAYER_1" ? players.p1 : players.p2} venceu a partida!`;
    }
    if (p1MatchPt) return `🏆 Match Point para ${players.p1}!`;
    if (p2MatchPt) return `🏆 Match Point para ${players.p2}!`;
    if (isTiebreak) return `🎾 Tie-break! Quem chegar a 7 pontos vence.`;
    if (isDeuce)
      return `⚡ Deuce! Cada jogador precisa de 2 pontos seguidos para vencer.`;
    if (p1AtSetPt) return `🎯 Set Point para ${players.p1}!`;
    if (p2AtSetPt) return `🎯 Set Point para ${players.p2}!`;
    if (isBreakPoint) {
      const bpPlayer = returner === "PLAYER_1" ? players.p1 : players.p2;
      return `⚡ Break Point para ${bpPlayer}!`;
    }
    return null;
  })();

  const courtAttr = matchData.courtType ?? "GRASS";

  return (
    <div
      className="scoreboard-v2-court"
      data-render={renderKey}
      data-court={courtAttr}
    >
      {/* Modais que não mudam */}
      <MatchStatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        matchId={matchData.id}
        playerNames={players}
        stats={statsData}
      />
      <ServerEffectModal
        isOpen={isServerEffectOpen}
        playerInFocus={playerInFocus || "PLAYER_1"}
        onConfirm={handleServerEffectConfirm}
        onCancel={() => {
          setIsServerEffectOpen(false);
          setPlayerInFocus(null);
        }}
      />
      <PointDetailsModal
        isOpen={isPointDetailsOpen}
        playerWinner={pendingPointPlayer || "PLAYER_1"}
        currentServer={state.server}
        playerNames={{
          PLAYER_1: players.p1,
          PLAYER_2: players.p2,
        }}
        onConfirm={handlePointDetailsConfirm}
        onCancel={handlePointDetailsCancel}
      />

      {/* Header */}
      <MatchHeader
        sportType={matchData.sportType}
        completedSets={state.completedSets ?? []}
        elapsed={elapsed}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onBack={handleEndMatch}
        onMenu={fetchStats}
      />

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
          serverName={state.server === "PLAYER_1" ? players.p1 : players.p2}
        />

        <div className="players-row">
          <PlayerCard
            player="PLAYER_1"
            name={players.p1}
            score={p1Score}
            games={p1Games}
            sets={p1Sets}
            isServing={state.server === "PLAYER_1"}
            serveStep={serveStep}
            isTiebreak={isTiebreak}
            isMatchPoint={p1MatchPt}
            isSetPoint={p1AtSetPt && !p1MatchPt}
            isBreakPoint={isBreakPoint && returner === "PLAYER_1"}
            isAdvantage={p1HasAdv}
            isDeuce={isDeuce}
            viewMode={viewMode}
            techStats={
              viewMode === "technical"
                ? computeTechStats("PLAYER_1")
                : undefined
            }
            disabled={state.isFinished}
            onPress={() => handlePointButtonClick("PLAYER_1")}
            onLongPress={() => setContextMenuPlayer("PLAYER_1")}
            onSwipeUp={() => handlePointButtonClick("PLAYER_1")}
            onSwipeDown={() => {
              if (scoringSystem?.canUndo()) handleUndo();
            }}
          />

          <VSIndicator
            isTiebreak={isTiebreak}
            isMatchTiebreak={state.currentGame?.isMatchTiebreak ?? false}
            isDeuce={isDeuce}
            tiebreakChangeAt={6}
            tiebreakTotalPoints={
              isTiebreak
                ? (typeof p1Score === "number" ? p1Score : 0) +
                  (typeof p2Score === "number" ? p2Score : 0)
                : 0
            }
          />

          <PlayerCard
            player="PLAYER_2"
            name={players.p2}
            score={p2Score}
            games={p2Games}
            sets={p2Sets}
            isServing={state.server === "PLAYER_2"}
            serveStep={serveStep}
            isTiebreak={isTiebreak}
            isMatchPoint={p2MatchPt}
            isSetPoint={p2AtSetPt && !p2MatchPt}
            isBreakPoint={isBreakPoint && returner === "PLAYER_2"}
            isAdvantage={p2HasAdv}
            isDeuce={isDeuce}
            viewMode={viewMode}
            techStats={
              viewMode === "technical"
                ? computeTechStats("PLAYER_2")
                : undefined
            }
            disabled={state.isFinished}
            onPress={() => handlePointButtonClick("PLAYER_2")}
            onLongPress={() => setContextMenuPlayer("PLAYER_2")}
            onSwipeUp={() => handlePointButtonClick("PLAYER_2")}
            onSwipeDown={() => {
              if (scoringSystem?.canUndo()) handleUndo();
            }}
          />
        </div>

        {/* Legenda modo família / assistir */}
        {viewMode === "family" && familyCaption && (
          <div className="family-caption">{familyCaption}</div>
        )}

        {/* Banner de partida finalizada */}
        {state.isFinished && state.winner && (
          <div className="match-finished-banner">
            <h2>🏆 PARTIDA FINALIZADA!</h2>
            <p className="winner-label-banner">VENCEDOR:</p>
            <p className="winner-name">
              {state.winner === "PLAYER_1" ? players.p1 : players.p2}
            </p>
            <p className="final-score">
              Placar Final: {state.sets.PLAYER_1} sets x {state.sets.PLAYER_2}{" "}
              sets
            </p>
            <div className="finished-actions">
              <button
                className="finished-action-btn"
                onClick={() => navigate("/dashboard")}
              >
                📊 Ver Estatísticas
              </button>
              <button
                className="finished-action-btn"
                onClick={() => navigate("/matches/new")}
              >
                🎾 Nova Partida
              </button>
            </div>
          </div>
        )}

        {/* Modo Família: botão "O que está acontecendo?" */}
        {viewMode === "family" && !state.isFinished && (
          <button
            className="family-help-btn"
            onClick={() => setShowFamilyExplainer(true)}
          >
            ❓ O que está acontecendo?
          </button>
        )}
      </div>

      {/* ActionBar (saque + undo + stats + quem venceu o ponto) */}
      <ActionBar
        canUndo={scoringSystem?.canUndo() ?? false}
        isFinished={state.isFinished ?? false}
        serveStep={serveStep}
        server={state.server ?? "PLAYER_1"}
        playerNames={{ PLAYER_1: players.p1, PLAYER_2: players.p2 }}
        onUndo={handleUndo}
        onAce={() => {
          setIsServerEffectOpen(true);
          setPlayerInFocus(state.server);
        }}
        onOut={() => setServeStepSafe("second")}
        onNet={() => setServeStepSafe("second")}
        onFault={handleFault}
        onStats={fetchStats}
        onServerWon={() => handlePointDetailsOpen(state.server ?? "PLAYER_1")}
        onReturnerWon={() =>
          handlePointDetailsOpen(
            (state.server ?? "PLAYER_1") === "PLAYER_1"
              ? "PLAYER_2"
              : "PLAYER_1",
          )
        }
      />

      {/* Menu contextual (long-press no card) */}
      {contextMenuPlayer && (
        <div
          className="context-menu-overlay"
          onClick={() => setContextMenuPlayer(null)}
        >
          <div className="context-menu" onClick={(e) => e.stopPropagation()}>
            <p className="context-menu-title">
              {contextMenuPlayer === "PLAYER_1" ? players.p1 : players.p2}
            </p>
            <button
              className="context-menu-item"
              onClick={() => {
                handlePointButtonClick(contextMenuPlayer);
                setContextMenuPlayer(null);
              }}
            >
              🎾 Marcar ponto
            </button>
            <button
              className="context-menu-item"
              onClick={() => {
                handleUndo();
                setContextMenuPlayer(null);
              }}
              disabled={!scoringSystem?.canUndo()}
            >
              ↩ Desfazer ponto
            </button>
            <button
              className="context-menu-item"
              onClick={() => setContextMenuPlayer(null)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Explainer modo família */}
      {showFamilyExplainer && (
        <div
          className="context-menu-overlay"
          onClick={() => setShowFamilyExplainer(false)}
        >
          <div className="context-menu" onClick={(e) => e.stopPropagation()}>
            <p className="context-menu-title">📖 Como funciona?</p>
            <p className="family-explainer-text">
              {isTiebreak
                ? "Tie-break: quem chegar a 7 pontos primeiro (com 2 de vantagem) vence o set."
                : isDeuce
                  ? "Deuce: ambos estão empatados em 40-40. Um jogador precisa de 2 pontos seguidos para vencer o game."
                  : `Pontuação do game: 0, 15, 30, 40. Quem chegar a 40 e ganhar mais um ponto, vence o game. O primeiro jogador a vencer ${gamesPerSet} games vence o set.`}
            </p>
            <button
              className="context-menu-item"
              onClick={() => setShowFamilyExplainer(false)}
            >
              Entendi!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoreboardV2;
