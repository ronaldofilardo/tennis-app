import React, { useState } from "react";
import httpClient from "../config/httpClient";
import "./MatchSetup.css";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../components/Toast";
import { createLogger } from "../services/logger";
import AthleteSearchInput from "../components/AthleteSearchInput";
import type { AthleteResult } from "../components/AthleteSearchInput";

// Interface para as props, incluindo a função para voltar ao Dashboard
interface CreatedMatchData {
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
  const [selectedScorer, setSelectedScorer] = useState<AthleteResult | null>(
    null,
  );
  const [visibleTo, setVisibleTo] = useState<"both" | string>("both"); // Legado
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); // Impede o recarregamento da página

    // Garantir que os jogadores estão definidos
    const finalP1 = player1 || selectedAthlete1?.name;
    const finalP2 = player2 || selectedAthlete2?.name;

    if (!finalP1 || !finalP2) {
      setError("Os nomes dos jogadores são obrigatórios.");
      return;
    }

    try {
      // visibleTo já é o email do jogador (valor do select)
      const visibleToValue = visibleTo;

      setError(null);

      const response = await httpClient.post<CreatedMatchData>("/matches", {
        sportType: sport,
        format: format,
        courtType: sport === "TENNIS" ? courtType : undefined,
        players: { p1: finalP1, p2: finalP2 },
        nickname: nickname || null,
        visibility: visibility || "PLAYERS_ONLY",
        scorerId: selectedScorer?.id || null,
        visibleTo: visibleToValue || "both", // Legado
        apontadorEmail: currentUser?.email || "",
        // Novos campos multi-tenancy
        player1Id: selectedAthlete1?.id?.startsWith("guest_")
          ? undefined
          : selectedAthlete1?.id,
        player2Id: selectedAthlete2?.id?.startsWith("guest_")
          ? undefined
          : selectedAthlete2?.id,
      });

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
                // Se o user apagou tudo ou está digitando algo novo que não é o atleta selecionado, resetamos o objeto
                if (selectedAthlete1 && q !== selectedAthlete1.name) {
                  setSelectedAthlete1(null);
                }
              }}
              allowGuest
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

        <div className="form-group">
          <label>Marcador Comunitário (opcional)</label>
          <p style={{ fontSize: "0.85rem", color: "#666", margin: "4px 0" }}>
            Selecione uma pessoa para marcar os pontos da partida
          </p>
          <AthleteSearchInput
            id="scorer-search"
            label="Procurar Marcador"
            placeholder="Buscar atleta ou usuário..."
            value={selectedScorer}
            onSelect={(a) => {
              // Validar que o scorer não é um dos jogadores
              if (
                a?.id === selectedAthlete1?.id ||
                a?.id === selectedAthlete2?.id
              ) {
                toast.warning(
                  "O marcador não pode ser um dos jogadores da partida.",
                  "Seleção inválida",
                );
                return;
              }
              setSelectedScorer(a);
            }}
            allowGuest
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="start-match-button">
            Iniciar Partida
          </button>
        </div>
      </form>
    </div>
  );
};

export default MatchSetup;
