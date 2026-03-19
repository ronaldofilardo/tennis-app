import React, { useState, useCallback } from "react";
import httpClient from "../config/httpClient";
import "./MatchSetup.css";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../components/Toast";
import { createLogger } from "../services/logger";
import AthleteSearchInput from "../components/AthleteSearchInput";
import type { AthleteResult } from "../components/AthleteSearchInput";
import { savePendingMatch } from "../services/offlineDb";
import { ResumeScoreModal } from "../components/ResumeScoreModal";
import type { OngoingMatchSetup } from "../components/ResumeScoreModal";
import { TennisConfigFactory } from "../core/scoring/TennisConfigFactory";
import type { TennisFormat, MatchState, Player } from "../core/scoring/types";

/**
 * Constrói um MatchState inicial a partir do placar inserido pelo usuário
 * para partidas que já estão em andamento.
 */
function buildInitialMatchState(
  setup: OngoingMatchSetup,
  format: string,
): MatchState {
  const config = TennisConfigFactory.getConfig(format as TennisFormat);

  let p1Sets = 0;
  let p2Sets = 0;
  for (const s of setup.completedSets) {
    if (s.winner === "PLAYER_1") p1Sets++;
    else p2Sets++;
  }

  const currentSet = setup.completedSets.length + 1;
  const useTiebreakPoints =
    setup.currentGameIsTiebreak || setup.currentGameIsMatchTiebreak;

  const gamePoints: Record<Player, string | number> = {
    PLAYER_1: useTiebreakPoints
      ? Number(setup.currentGamePoints.PLAYER_1) || 0
      : String(setup.currentGamePoints.PLAYER_1) || "0",
    PLAYER_2: useTiebreakPoints
      ? Number(setup.currentGamePoints.PLAYER_2) || 0
      : String(setup.currentGamePoints.PLAYER_2) || "0",
  };

  return {
    sets: { PLAYER_1: p1Sets, PLAYER_2: p2Sets },
    currentSet,
    currentSetState: {
      games: setup.currentSetGames,
    },
    currentGame: {
      points: gamePoints,
      server: setup.server,
      isTiebreak:
        setup.currentGameIsTiebreak || setup.currentGameIsMatchTiebreak,
      isMatchTiebreak: setup.currentGameIsMatchTiebreak,
    },
    server: setup.server,
    isFinished: false,
    config,
    completedSets: setup.completedSets.map((s) => ({
      setNumber: s.setNumber,
      games: s.games,
      winner: s.winner,
      ...(s.tiebreakScore ? { tiebreakScore: s.tiebreakScore } : {}),
    })),
    startedAt: new Date().toISOString(),
  };
}

// Interface para as props, incluindo a função para voltar ao Dashboard
export interface CreatedMatchData {
  id: string;
  sportType: string;
  format: string;
  courtType?: "GRASS" | "CLAY" | "HARD";
  players: { p1: string; p2: string };
  status?: string;
  createdAt?: string;
}

interface MatchSetupProps {
  onMatchCreated: (matchData: CreatedMatchData) => void;
  onBackToDashboard: () => void;
}

const log = createLogger("MatchSetup");

const MatchSetup: React.FC<MatchSetupProps> = ({
  onBackToDashboard,
  onMatchCreated,
}) => {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [sport, setSport] = useState("TENNIS");
  const [format, setFormat] = useState("BEST_OF_3");
  const [courtType, setCourtType] = useState<"GRASS" | "CLAY" | "HARD">("HARD");
  const [nickname, setNickname] = useState("");
  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");
  const [selectedAthlete1, setSelectedAthlete1] =
    useState<AthleteResult | null>(null);
  const [selectedAthlete2, setSelectedAthlete2] =
    useState<AthleteResult | null>(null);
  const [visibility, setVisibility] = useState<
    "PUBLIC" | "CLUB" | "PLAYERS_ONLY"
  >("PLAYERS_ONLY");
  const [visibleTo, setVisibleTo] = useState<"both" | string>("both"); // Legado
  const [error, setError] = useState<string | null>(null);
  const [isResuming, setIsResuming] = useState(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);

  // Monta o payload base da partida a partir do estado do formulário
  const buildMatchPayload = useCallback(
    (finalP1: string, finalP2: string) => ({
      sportType: sport,
      format: format,
      courtType: sport === "TENNIS" ? courtType : undefined,
      players: { p1: finalP1, p2: finalP2 },
      nickname: nickname || null,
      visibility: visibility || "PLAYERS_ONLY",
      visibleTo: visibleTo || "both",
      apontadorEmail: currentUser?.email || "",
      player1Id: selectedAthlete1?.id?.startsWith("guest_")
        ? undefined
        : selectedAthlete1?.id,
      player2Id: selectedAthlete2?.id?.startsWith("guest_")
        ? undefined
        : selectedAthlete2?.id,
    }),
    [
      sport,
      format,
      courtType,
      nickname,
      visibility,
      visibleTo,
      currentUser,
      selectedAthlete1,
      selectedAthlete2,
    ],
  );

  // Lida com confirmação do modal de retomada de partida
  const handleResumeConfirm = useCallback(
    async (setup: OngoingMatchSetup): Promise<void> => {
      setIsResumeModalOpen(false);

      const finalP1 = player1 || selectedAthlete1?.name;
      const finalP2 = player2 || selectedAthlete2?.name;
      if (!finalP1 || !finalP2) return;

      setError(null);

      try {
        const matchPayload = buildMatchPayload(finalP1, finalP2);
        const response = await httpClient.post<CreatedMatchData>(
          "/matches",
          matchPayload,
        );
        const createdMatch = response.data;

        // Constrói e envia o estado inicial da partida em andamento
        const initialState = buildInitialMatchState(setup, format);
        await httpClient.patch(`/matches/${createdMatch.id}/state`, {
          matchState: initialState,
        });

        log.info("Partida em andamento criada", { id: createdMatch.id });
        onMatchCreated({ ...createdMatch, status: "IN_PROGRESS" });
      } catch (err) {
        log.error("Erro ao criar partida em andamento", err);
        toast.error(
          "Falha ao criar partida em andamento. Verifique o console.",
          "Erro ao criar partida",
        );
      }
    },
    [
      player1,
      player2,
      selectedAthlete1,
      selectedAthlete2,
      buildMatchPayload,
      format,
      onMatchCreated,
      toast,
    ],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); // Impede o recarregamento da página

    // Garantir que os jogadores estão definidos
    const finalP1 = player1 || selectedAthlete1?.name;
    const finalP2 = player2 || selectedAthlete2?.name;

    if (!finalP1 || !finalP2) {
      setError("Os nomes dos jogadores são obrigatórios.");
      return;
    }

    // Partida em andamento: abre modal para inserir placar antes de criar
    if (isResuming) {
      if (!navigator.onLine) {
        toast.warning(
          "Retomada de partida não está disponível no modo offline.",
          "Modo offline",
        );
        return;
      }
      setIsResumeModalOpen(true);
      return;
    }

    try {
      // visibleTo já é o email do jogador (valor do select)
      const visibleToValue = visibleTo;

      setError(null);

      const matchPayload = {
        sportType: sport,
        format: format,
        courtType: sport === "TENNIS" ? courtType : undefined,
        players: { p1: finalP1, p2: finalP2 },
        nickname: nickname || null,
        visibility: visibility || "PLAYERS_ONLY",
        visibleTo: visibleToValue || "both", // Legado
        apontadorEmail: currentUser?.email || "",
        // Novos campos multi-tenancy
        player1Id: selectedAthlete1?.id?.startsWith("guest_")
          ? undefined
          : selectedAthlete1?.id,
        player2Id: selectedAthlete2?.id?.startsWith("guest_")
          ? undefined
          : selectedAthlete2?.id,
      };

      // ── Suporte offline ───────────────────────────────────────────────────
      if (!navigator.onLine) {
        const tempId = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await savePendingMatch({
          tempId,
          matchData: matchPayload,
          syncStatus: "PENDING",
          createdAt: Date.now(),
        });
        toast.success(
          "Partida salva localmente. Será enviada ao reconectar.",
          "Modo offline",
        );
        // Criar objeto local para navegar ao placar sem ID do servidor
        onMatchCreated({
          id: tempId,
          sportType: sport,
          format: format,
          courtType: sport === "TENNIS" ? courtType : undefined,
          players: { p1: finalP1, p2: finalP2 },
          status: "NOT_STARTED",
        });
        return;
      }

      const response = await httpClient.post<CreatedMatchData>(
        "/matches",
        matchPayload,
      );

      log.info("Partida criada com sucesso", {
        id: response.data.id,
      });
      onMatchCreated(response.data); // Navega para o placar com os dados da nova partida
    } catch (error) {
      log.error("Erro ao criar a partida", error);
      // AREA 4: Substituído alert() nativo por Toast (themeable para White Label)
      toast.error(
        "Falha ao criar a partida. Verifique o console do navegador e do backend.",
        "Erro ao criar partida",
      );
    }
  };
  return (
    <div className="match-setup">
      <header className="match-setup-header">
        <button onClick={onBackToDashboard} className="back-button">
          ← Voltar
        </button>
        <h2>Nova Partida</h2>
      </header>
      {error && (
        <div className="form-error" style={{ color: "red", margin: "8px 0" }}>
          {error}
        </div>
      )}
      <form className="setup-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="sport">Desporto</label>
          <select
            id="sport"
            name="sport"
            value={sport}
            onChange={(e) => setSport(e.target.value)}
          >
            <option value="TENNIS">Tênis</option>
            <option value="PADEL">Padel</option>
            <option value="BEACH_TENNIS">Beach Tennis</option>
          </select>
        </div>

        {sport === "TENNIS" && (
          <div className="form-group">
            <label>Tipo de Quadra</label>
            <div className="court-type-selector">
              <button
                type="button"
                className={`court-type-btn clay${courtType === "CLAY" ? " active" : ""}`}
                onClick={() => setCourtType("CLAY")}
              >
                <span className="court-type-icon">🟤</span>
                <span className="court-type-name">Saibro</span>
                <span className="court-type-note">Roland Garros</span>
              </button>
              <button
                type="button"
                className={`court-type-btn hard${courtType === "HARD" ? " active" : ""}`}
                onClick={() => setCourtType("HARD")}
              >
                <span className="court-type-icon">🔵</span>
                <span className="court-type-name">Dura</span>
                <span className="court-type-note">US Open</span>
              </button>
              <button
                type="button"
                className={`court-type-btn grass${courtType === "GRASS" ? " active" : ""}`}
                onClick={() => setCourtType("GRASS")}
              >
                <span className="court-type-icon">🟢</span>
                <span className="court-type-name">Grama</span>
                <span className="court-type-note">Wimbledon</span>
              </button>
            </div>
          </div>
        )}

        <div className="form-group">
          <label>Jogadores</label>
          <div className="player-inputs">
            <AthleteSearchInput
              id="player1-search"
              label="Jogador 1"
              placeholder="Buscar atleta..."
              value={selectedAthlete1}
              onSelect={(a) => {
                setSelectedAthlete1(a);
                if (a) setPlayer1(a.name);
              }}
              onQueryChange={(q) => {
                setPlayer1(q);
                if (selectedAthlete1 && q !== selectedAthlete1.name) {
                  setSelectedAthlete1(null);
                }
              }}
              allowGuest
              excludeUserId={currentUser?.id}
              excludeAthleteId={
                selectedAthlete2?.id?.startsWith("guest_")
                  ? undefined
                  : selectedAthlete2?.id
              }
            />
            <span>vs</span>
            <AthleteSearchInput
              id="player2-search"
              label="Jogador 2"
              placeholder="Buscar atleta..."
              value={selectedAthlete2}
              onSelect={(a) => {
                setSelectedAthlete2(a);
                if (a) setPlayer2(a.name);
              }}
              onQueryChange={(q) => {
                setPlayer2(q);
                if (selectedAthlete2 && q !== selectedAthlete2.name) {
                  setSelectedAthlete2(null);
                }
              }}
              allowGuest
              excludeUserId={currentUser?.id}
              excludeAthleteId={
                selectedAthlete1?.id?.startsWith("guest_")
                  ? undefined
                  : selectedAthlete1?.id
              }
            />
          </div>
        </div>

        <div className="form-group">
          <label>Modo de jogo</label>
          <select
            id="format"
            name="format"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            data-testid="format-select"
          >
            <option value="BEST_OF_3">
              Melhor de 3 sets com vantagem, Set tie-break em todos os sets
            </option>
            <option value="BEST_OF_3_MATCH_TB">
              Melhor de 3 sets com vantagem, Set tie-break em 6-6, Match
              tie-break no 3º set
            </option>
            <option value="BEST_OF_5">
              Melhor de 5 sets com vantagem, Set tie-break em todos os sets
            </option>
            <option value="SINGLE_SET">
              Set único com vantagem, Set tie-break em 6-6
            </option>
            <option value="PRO_SET">
              Pro Set (8 games) com vantagem, Set tie-break em 8-8
            </option>
            <option value="MATCH_TIEBREAK">
              Match Tiebreak (10 pontos) sem vantagem, Primeiro a 10
            </option>
            <option value="SHORT_SET">
              Set curto (4 games) com vantagem, Tie-break em 4-4
            </option>
            <option value="NO_AD">
              Melhor de 3 sets método No-Ad (ponto decisivo em 40-40), Set
              tie-break em 6-6
            </option>
            <option value="FAST4">
              Fast4 Tennis (4 games) método No-Ad, Tie-break em 3-3
            </option>
            <option value="SHORT_SET_NO_AD">
              Set curto (4 games) método No-Ad, Tie-break em 4-4
            </option>
            <option value="NO_LET_TENNIS">
              Melhor de 3 sets método No-Let (saque na rede está em jogo)
            </option>
          </select>
        </div>

        <div className="form-group">
          <label>Apelido da partida (opcional)</label>
          <input
            type="text"
            placeholder="Ex: Desafio Amigos"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Visibilidade da partida</label>
          <select
            value={visibility}
            onChange={(e) =>
              setVisibility(
                e.target.value as "PUBLIC" | "CLUB" | "PLAYERS_ONLY",
              )
            }
          >
            <option value="PUBLIC">🌐 Pública (todos podem ver)</option>
            <option value="CLUB">🏢 Clube (apenas membros do clube)</option>
            <option value="PLAYERS_ONLY">🔒 Apenas Jogadores</option>
          </select>
        </div>

        {/* Checkbox: Retomar jogo em andamento */}
        <div className="form-group resume-check-group">
          <label className="resume-check-label" htmlFor="resume-check">
            <input
              id="resume-check"
              type="checkbox"
              checked={isResuming}
              onChange={(e) => setIsResuming(e.target.checked)}
              className="resume-check-input"
            />
            <span>Retomar jogo em andamento</span>
          </label>
          {isResuming && (
            <p className="resume-check-hint">
              Após clicar em &ldquo;Iniciar Partida&rdquo;, você poderá inserir
              o placar atual antes de continuar.
            </p>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="start-match-button">
            {isResuming ? "Continuar →" : "Iniciar Partida"}
          </button>
        </div>
      </form>

      {/* Modal de placar para partida em andamento */}
      <ResumeScoreModal
        isOpen={isResumeModalOpen}
        players={{
          p1: player1 || selectedAthlete1?.name || "Jogador 1",
          p2: player2 || selectedAthlete2?.name || "Jogador 2",
        }}
        format={format}
        onConfirm={handleResumeConfirm}
        onCancel={() => setIsResumeModalOpen(false)}
      />
    </div>
  );
};

export default MatchSetup;
