import React, { useState, useMemo, useCallback } from "react";
import MatchStatsModal from "../components/MatchStatsModal";
import type { MatchStatsData as MatchStatsModalData } from "../components/MatchStatsModal";
import AthleteHeader from "../components/AthleteHeader";
import type { AthleteStats } from "../components/AthleteHeader";
import BottomTabBar from "../components/BottomTabBar";
import type { TabId } from "../components/BottomTabBar";
import FloatingActionButton from "../components/FloatingActionButton";
import FilterChips from "../components/FilterChips";
import type { MatchFilter } from "../components/FilterChips";
import LiveMatchesCarousel from "../components/LiveMatchesCarousel";
import PendingInvitesBanner from "../components/PendingInvitesBanner";
import { ClubRankings } from "../components/ClubRankings";
import { useAuth } from "../contexts/AuthContext";
import { API_URL } from "../config/api";
import { resolvePlayerName } from "../data/players";
import { useToast } from "../components/Toast";
import { createLogger } from "../services/logger";
import "./Dashboard.css";

type DashboardMatchPlayers = { p1: string; p2: string };
type DashboardMatch = {
  id: string | number;
  players?: DashboardMatchPlayers | string;
  sportType?: string;
  sport?: string;
  format?: string;
  courtType?: "GRASS" | "CLAY" | "HARD";
  nickname?: string | null;
  status?: string;
  score?: string;
  completedSets?: Array<{
    setNumber: number;
    games: { PLAYER_1: number; PLAYER_2: number };
    winner: string;
  }>;
  visibleTo?: string;
};

interface DashboardProps {
  onNewMatchClick: () => void;
  onContinueMatch?: (match: DashboardMatch, initialState?: any) => void;
  onStartMatch?: (match: DashboardMatch) => void;
  matches: DashboardMatch[];
  loading: boolean;
  error: string | null;
  currentUser?: { email: string; name?: string; role?: string } | null;
  players?: Array<{ id: string; email?: string; name: string }>;
}

const Dashboard: React.FC<DashboardProps> = ({
  onNewMatchClick,
  onContinueMatch,
  onStartMatch,
  matches,
  loading,
  error,
  currentUser,
}) => {
  // AREA 4 & 7: Toast e Logger
  const toast = useToast();
  const dashLog = createLogger("Dashboard");
  const { currentUser: authUser } = useAuth();
  const activeClubId = authUser?.activeClubId ?? null;
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<DashboardMatch | null>(
    null,
  );
  const [matchStats, setMatchStats] = useState<MatchStatsModalData | null>(
    null,
  );
  const [loadingMatchId, setLoadingMatchId] = useState<string | number | null>(
    null,
  );
  const [matchStates, setMatchStates] = useState<Record<string, any>>({});

  // ── New mobile-first state ──────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [activeFilter, setActiveFilter] = useState<MatchFilter>("all");

  const fetchMatchState = async (matchId: string | number) => {
    const res = await fetch(`${API_URL}/matches/${matchId}/state`);
    if (!res.ok) throw new Error("Falha ao buscar state");
    let data = null;
    try {
      const text = await res.text();
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      throw new Error("Resposta inválida do servidor (state)");
    }
    if (!data) throw new Error("Dados de state não encontrados");
    setSelectedMatch({
      id: data.id,
      players: data.players,
      sportType: data.sportType,
      sport: data.sport,
      format: data.format,
      courtType: data.courtType,
      nickname: data.nickname || null,
      status: data.status,
      score: data.score,
      completedSets: data.completedSets,
      visibleTo: data.visibleTo,
    });
  };

  const fetchMatchStats = async (matchId: string | number) => {
    const res = await fetch(`${API_URL}/matches/${matchId}/stats`);
    if (!res.ok) throw new Error("Falha ao buscar stats");
    let stats = null;
    try {
      const text = await res.text();
      stats = text ? JSON.parse(text) : null;
    } catch (e) {
      throw new Error("Resposta inválida do servidor (stats)");
    }
    if (!stats) throw new Error("Estatísticas não encontradas");
    setMatchStats(stats);
  };

  // Só mostra partidas em que o usuário é apontador ou está em playersEmails
  const canViewMatch = (match: any) => {
    if (!currentUser) return false;
    const email = currentUser.email;
    if (!email) return false;
    // Se for apontador
    if (match.apontadorEmail === email) return true;
    // Se estiver em playersEmails
    if (
      Array.isArray(match.playersEmails) &&
      match.playersEmails.includes(email)
    )
      return true;
    return false;
  };

  const openStatsForMatch = async (matchId: string | number) => {
    setLoadingMatchId(matchId);
    try {
      await fetchMatchState(matchId);
      setIsStatsModalOpen(true);
      await fetchMatchStats(matchId);
    } catch (err) {
      dashLog.error("Erro ao carregar estatísticas", err);
      // AREA 4: Toast substitui alert() nativo
      toast.error("Não foi possível carregar as estatísticas.", "Erro");
    } finally {
      setLoadingMatchId(null);
    }
  };

  const fetchMatchStateForContinue = async (matchId: string | number) => {
    const matchIdStr = matchId.toString();
    if (matchStates[matchIdStr]) return matchStates[matchIdStr];

    try {
      const res = await fetch(`${API_URL}/matches/${matchId}/state`);
      if (!res.ok) throw new Error("Falha ao buscar state");
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (data) {
        setMatchStates((prev) => ({ ...prev, [matchIdStr]: data }));
        return data;
      }
    } catch (error) {
      console.error("Erro ao buscar estado da partida:", error);
    }
    return null;
  };

  const modalPlayerNames =
    selectedMatch && typeof selectedMatch.players === "object"
      ? {
          p1: resolvePlayerName(
            (selectedMatch.players as DashboardMatchPlayers).p1,
          ),
          p2: resolvePlayerName(
            (selectedMatch.players as DashboardMatchPlayers).p2,
          ),
        }
      : { p1: "Jogador 1", p2: "Jogador 2" };

  const FORMAT_LABELS: Record<string, string> = {
    BEST_OF_3: "Melhor de 3 · Tie-break todos os sets",
    BEST_OF_3_MATCH_TB: "Melhor de 3 · Match tie-break no 3º set",
    BEST_OF_5: "Melhor de 5 · Tie-break todos os sets",
    SINGLE_SET: "Set único · Tie-break em 6-6",
    PRO_SET: "Pro Set (8 games) · Tie-break em 8-8",
    MATCH_TIEBREAK: "Match Tiebreak (10 pts)",
    SHORT_SET: "Set curto (4 games) · Tie-break em 4-4",
    NO_AD: "Melhor de 3 · No-Ad",
    FAST4: "Fast4 · No-Ad · Tie-break em 3-3",
    SHORT_SET_NO_AD: "Set curto (4 games) · No-Ad",
    NO_LET_TENNIS: "Melhor de 3 · No-Let",
  };

  const visibleMatches = (Array.isArray(matches) ? matches : []).filter(
    (match) => canViewMatch(match),
  );

  // ── Computed: match counts by status ────────────────────
  const matchCounts = useMemo(() => {
    const counts = { all: 0, live: 0, finished: 0, pending: 0 };
    visibleMatches.forEach((m) => {
      counts.all++;
      if (m.status === "IN_PROGRESS") counts.live++;
      else if (m.status === "FINISHED") counts.finished++;
      else counts.pending++;
    });
    return counts;
  }, [visibleMatches]);

  // ── Computed: live matches for carousel ─────────────────
  const liveMatches = useMemo(
    () => visibleMatches.filter((m) => m.status === "IN_PROGRESS"),
    [visibleMatches],
  );

  // ── Computed: filtered matches (excludes live when shown in carousel) ──
  const filteredMatches = useMemo(() => {
    let filtered = visibleMatches;

    if (activeFilter === "live") {
      filtered = filtered.filter((m) => m.status === "IN_PROGRESS");
    } else if (activeFilter === "finished") {
      filtered = filtered.filter((m) => m.status === "FINISHED");
    } else if (activeFilter === "pending") {
      filtered = filtered.filter(
        (m) => m.status !== "IN_PROGRESS" && m.status !== "FINISHED",
      );
    } else {
      // "all" — exclude live from main list if they're in the carousel
      if (liveMatches.length > 0) {
        filtered = filtered.filter((m) => m.status !== "IN_PROGRESS");
      }
    }

    return filtered;
  }, [visibleMatches, activeFilter, liveMatches.length]);

  // ── Computed: athlete quick stats ───────────────────────
  const athleteStats = useMemo((): AthleteStats => {
    const finished = visibleMatches.filter((m) => m.status === "FINISHED");
    const email = currentUser?.email || "";

    let wins = 0;
    let losses = 0;

    finished.forEach((match) => {
      const ms = (match as any).matchState;
      if (!ms || typeof ms !== "object") return;
      const winner = ms.winner || ms.matchWinner;
      const players =
        match.players && typeof match.players === "object"
          ? match.players
          : null;
      if (!winner || !players) return;

      const isP1 =
        resolvePlayerName(players.p1) === resolvePlayerName(email) ||
        players.p1 === email;
      if ((winner === "PLAYER_1" && isP1) || (winner === "PLAYER_2" && !isP1)) {
        wins++;
      } else {
        losses++;
      }
    });

    const totalMatches = finished.length;
    const winRate =
      totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

    // Calculate streak
    let currentStreak = 0;
    let streakType: "win" | "loss" = "win";

    // Sort by date descending for streak calculation
    const sortedFinished = [...finished].sort((a, b) => {
      const aMs = (a as any).matchState;
      const bMs = (b as any).matchState;
      const aDate = aMs?.endedAt || aMs?.startedAt || "";
      const bDate = bMs?.endedAt || bMs?.startedAt || "";
      return bDate.localeCompare(aDate);
    });

    for (const match of sortedFinished) {
      const ms = (match as any).matchState;
      if (!ms) break;
      const winner = ms.winner || ms.matchWinner;
      const players =
        match.players && typeof match.players === "object"
          ? match.players
          : null;
      if (!winner || !players) break;

      const isP1 = players.p1 === email;
      const isWin =
        (winner === "PLAYER_1" && isP1) || (winner === "PLAYER_2" && !isP1);

      if (currentStreak === 0) {
        streakType = isWin ? "win" : "loss";
        currentStreak = 1;
      } else if (
        (isWin && streakType === "win") ||
        (!isWin && streakType === "loss")
      ) {
        currentStreak++;
      } else {
        break;
      }
    }

    return {
      wins,
      losses,
      totalMatches,
      winRate,
      currentStreak,
      streakType,
    };
  }, [visibleMatches, currentUser?.email]);

  // ── Handle live match click (continue) ──────────────────
  const handleLiveMatchClick = useCallback(
    async (match: any) => {
      if (onContinueMatch) {
        const initialState = await fetchMatchStateForContinue(match.id);
        onContinueMatch(match, initialState);
      }
    },
    [onContinueMatch],
  );

  // ── Tab change handler ──────────────────────────────────
  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    // Future: navigate to different views/routes for stats, tournaments, profile
  }, []);

  return (
    <div className="dashboard" data-testid="dashboard">
      {/* ── Desktop header (hidden on mobile via CSS) ── */}
      <header className="dashboard-header">
        <h2>
          Minhas <span>Partidas</span>
        </h2>
        <div className="dashboard-actions">
          <button onClick={onNewMatchClick} className="new-match-button">
            + Nova Partida
          </button>
        </div>
      </header>

      {/* ── Mobile: Athlete Header with KPIs ── */}
      <AthleteHeader
        name={currentUser?.name || currentUser?.email || "Atleta"}
        email={currentUser?.email}
        clubName={undefined}
        stats={athleteStats}
      />

      {/* ── Convites de clube pendentes (atleta confirma) ── */}
      {currentUser?.role === "ATHLETE" && <PendingInvitesBanner />}

      {loading && (
        <div className="dashboard-loading">
          <div className="dashboard-loading-spinner" />
          Carregando partidas...
        </div>
      )}
      {error && <div className="dashboard-error">⚠ {error}</div>}

      {!loading && !error && visibleMatches.length === 0 && (
        <div className="dashboard-empty">
          <span className="dashboard-empty-icon">🎾</span>
          <h3>Nenhuma partida ainda</h3>
          <p>Crie uma nova partida para começar a jogar.</p>
        </div>
      )}

      {/* ── Live Matches Carousel (pinned at top) ── */}
      {!loading && activeTab === "home" && liveMatches.length > 0 && (
        <LiveMatchesCarousel
          matches={liveMatches}
          onMatchClick={handleLiveMatchClick}
        />
      )}

      {/* ── Filter Chips ── */}
      {!loading &&
        !error &&
        visibleMatches.length > 0 &&
        activeTab === "home" && (
          <FilterChips
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            counts={matchCounts}
          />
        )}

      {/* ── Match list section title ── */}
      {!loading && activeTab === "home" && filteredMatches.length > 0 && (
        <span className="dashboard-section-title">
          {activeFilter === "all"
            ? "Histórico"
            : activeFilter === "live"
              ? "Ao Vivo"
              : activeFilter === "finished"
                ? "Finalizadas"
                : "Aguardando"}
        </span>
      )}

      {/* ── Ranking tab ── */}
      {activeTab === "ranking" &&
        (activeClubId ? (
          <ClubRankings clubId={activeClubId} />
        ) : (
          <div className="dashboard-empty">
            <span className="dashboard-empty-icon">📈</span>
            <h3>Ranking</h3>
            <p>Faça parte de um clube para ver o ranking intraclubes.</p>
          </div>
        ))}

      {/* ── Stats tab placeholder ── */}
      {activeTab === "stats" && (
        <div className="dashboard-empty">
          <span className="dashboard-empty-icon">📊</span>
          <h3>Estatísticas</h3>
          <p>Em breve: suas estatísticas agregadas e evolução de desempenho.</p>
        </div>
      )}

      {/* ── Tournaments tab placeholder ── */}
      {activeTab === "tournaments" && (
        <div className="dashboard-empty">
          <span className="dashboard-empty-icon">🏆</span>
          <h3>Torneios</h3>
          <p>Em breve: seus torneios e inscrições.</p>
        </div>
      )}

      {/* ── Profile tab placeholder ── */}
      {activeTab === "profile" && (
        <div className="dashboard-empty">
          <span className="dashboard-empty-icon">👤</span>
          <h3>Meu Perfil</h3>
          <p>Em breve: editar perfil, preferências e conquistas.</p>
        </div>
      )}

      {/* ── Match Cards List ── */}
      {activeTab === "home" && (
        <div className="match-list">
          {filteredMatches.map((match) => {
            const p1Name = resolvePlayerName(
              match.players && typeof match.players === "object"
                ? match.players.p1
                : "",
            );
            const p2Name = resolvePlayerName(
              match.players && typeof match.players === "object"
                ? match.players.p2
                : "",
            );
            const canView = canViewMatch(match);

            // ── matchState helpers ─────────────────────────────
            const possibleState = match as unknown as { matchState?: unknown };
            const ms =
              possibleState.matchState &&
              typeof possibleState.matchState === "object"
                ? (possibleState.matchState as Record<string, unknown>)
                : null;

            // viewLog
            const viewLog = Array.isArray(ms?.["viewLog"])
              ? (ms!["viewLog"] as Array<Record<string, unknown>>)
              : null;
            const lastView = viewLog?.length
              ? viewLog[viewLog.length - 1]
              : null;
            const lastStartedAt =
              typeof lastView?.["startedAt"] === "string"
                ? String(lastView["startedAt"])
                : null;
            const lastEndedAt =
              typeof lastView?.["endedAt"] === "string"
                ? String(lastView["endedAt"])
                : null;

            // ── Live score data ────────────────────────────────
            const currentGame =
              ms?.currentGame && typeof ms.currentGame === "object"
                ? (ms.currentGame as Record<string, unknown>)
                : null;
            const isTiebreak = Boolean(currentGame?.["isTiebreak"]);
            const isMatchTiebreak = Boolean(currentGame?.["isMatchTiebreak"]);
            const currentSetState =
              ms?.currentSetState && typeof ms.currentSetState === "object"
                ? (ms.currentSetState as Record<string, unknown>)
                : null;
            const currentSetGames = currentSetState?.["games"] as
              | Record<string, number>
              | undefined;
            const setsObj =
              ms?.sets && typeof ms.sets === "object"
                ? (ms.sets as Record<string, number>)
                : undefined;
            const pointsObj = currentGame?.["points"] as
              | Record<string, string>
              | undefined;

            // ── Completed sets for partials ────────────────────
            const buildPartials = (source: unknown[]): string[] => {
              return source.flatMap((set) => {
                if (!set || typeof set !== "object") return [];
                const s = set as Record<string, unknown>;
                const games = s["games"] as Record<string, number> | undefined;
                const tbs = s["tiebreakScore"] as
                  | Record<string, number>
                  | undefined;
                const g1 = games?.PLAYER_1 ?? 0;
                const g2 = games?.PLAYER_2 ?? 0;
                if (tbs) {
                  const tb1 = tbs.PLAYER_1 ?? 0;
                  const tb2 = tbs.PLAYER_2 ?? 0;
                  return s["winner"] === "PLAYER_1"
                    ? [`${g1}/${g2}(${tb1})`]
                    : [`${g2}/${g1}(${tb2})`];
                }
                return [`${g1}/${g2}`];
              });
            };

            let completedSetsArr: unknown[] = [];
            const possibleState2 = match as unknown as {
              completedSets?: unknown;
            };
            if (Array.isArray(possibleState2.completedSets))
              completedSetsArr = possibleState2.completedSets;
            else if (Array.isArray(ms?.["completedSets"]))
              completedSetsArr = ms!["completedSets"] as unknown[];

            const setsPartials = buildPartials(completedSetsArr);

            // Live: add current set partial
            if (match.status === "IN_PROGRESS" && currentSetState) {
              const g1 = currentSetGames?.PLAYER_1 ?? 0;
              const g2 = currentSetGames?.PLAYER_2 ?? 0;
              const p1 = pointsObj?.PLAYER_1 ?? "0";
              const p2 = pointsObj?.PLAYER_2 ?? "0";
              setsPartials.push(
                isTiebreak
                  ? `${g1}(${p1})/${g2}(${p2}) TB`
                  : `${g1}(${p1})/${g2}(${p2})`,
              );
            }

            // ── Time helpers ───────────────────────────────────
            const started =
              typeof ms?.["startedAt"] === "string"
                ? String(ms["startedAt"])
                : lastStartedAt;
            const ended =
              typeof ms?.["endedAt"] === "string"
                ? String(ms["endedAt"])
                : lastEndedAt;
            let durationSec: number | null = null;
            if (typeof ms?.["durationSeconds"] === "number")
              durationSec = Number(ms["durationSeconds"]);
            if (durationSec == null && started && ended) {
              durationSec = Math.max(
                0,
                Math.floor(
                  (new Date(ended).getTime() - new Date(started).getTime()) /
                    1000,
                ),
              );
            }
            const timeLabel = started
              ? new Date(started).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : null;
            const durLabel =
              durationSec != null
                ? new Date(durationSec * 1000).toISOString().substr(11, 5)
                : null;

            // ── Card class ─────────────────────────────────────
            const cardClass = [
              "match-card",
              match.status === "IN_PROGRESS"
                ? "card--live"
                : match.status === "FINISHED"
                  ? "card--finished"
                  : "card--pending",
            ].join(" ");

            // ── Court badge ────────────────────────────────────
            const courtMap: Record<string, { label: string; icon: string }> = {
              CLAY: { label: "Saibro", icon: "🟤" },
              HARD: { label: "Dura", icon: "🔵" },
              GRASS: { label: "Grama", icon: "🟢" },
            };
            const ct = match.courtType ? courtMap[match.courtType] : null;

            // ── Status badge ───────────────────────────────────
            const statusInfo =
              match.status === "IN_PROGRESS"
                ? { cls: "badge--live", label: "Ao Vivo" }
                : match.status === "FINISHED"
                  ? { cls: "badge--finished", label: "Finalizada" }
                  : { cls: "badge--pending", label: "Aguardando" };

            return (
              <div
                key={match.id}
                className={cardClass}
                onClick={async () => {
                  if (match.status === "NOT_STARTED" && onStartMatch) {
                    onStartMatch(match);
                  } else if (
                    match.status === "IN_PROGRESS" &&
                    onContinueMatch
                  ) {
                    const initialState = await fetchMatchStateForContinue(
                      match.id,
                    );
                    onContinueMatch(match, initialState);
                  }
                }}
              >
                {/* ── Top row: sport + court | status ── */}
                <div className="card-top">
                  <div className="card-top-left">
                    <span className="card-sport-label">
                      {(
                        match.sportType ||
                        match.sport ||
                        "Sport"
                      ).toUpperCase()}
                    </span>
                    {ct && (
                      <span
                        className={`court-type-badge court-type-badge--${match.courtType!.toLowerCase()}`}
                      >
                        {ct.icon} {ct.label}
                      </span>
                    )}
                  </div>
                  <div className="card-top-right">
                    <span className={`status-badge ${statusInfo.cls}`}>
                      {match.status === "IN_PROGRESS" && (
                        <span className="live-dot" />
                      )}
                      {statusInfo.label}
                    </span>
                    {match.visibility && (
                      <span
                        className="visibility-badge"
                        title={
                          match.visibility === "PUBLIC"
                            ? "Pública"
                            : match.visibility === "CLUB"
                              ? "Clube"
                              : "Apenas Jogadores"
                        }
                        style={{
                          marginLeft: "8px",
                          fontSize: "0.9rem",
                          display: "inline-block",
                        }}
                      >
                        {match.visibility === "PUBLIC"
                          ? "🌐"
                          : match.visibility === "CLUB"
                            ? "🏢"
                            : "🔒"}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Players ── */}
                <div className="card-players">
                  <div className="card-player">
                    <span className="player-name">{p1Name}</span>
                  </div>
                  <span className="card-vs">vs</span>
                  <div className="card-player player--right">
                    <span className="player-name">{p2Name}</span>
                  </div>
                </div>

                {/* ── Live score (IN_PROGRESS only) ── */}
                {match.status === "IN_PROGRESS" && ms && (
                  <div
                    className="card-live-score"
                    data-testid={`live-status-${match.id}`}
                  >
                    <div className="live-score-header">
                      <span className="live-score-label">Ao Vivo</span>
                      {isTiebreak && (
                        <span className="live-score-tiebreak">
                          {isMatchTiebreak ? "Match Tiebreak" : "Tiebreak"}
                        </span>
                      )}
                    </div>
                    <div className="live-score-row">
                      <div className="live-stat">
                        <span className="live-stat-label">Sets</span>
                        <span
                          className="live-stat-value"
                          data-testid={`live-status-sets-${match.id}`}
                        >
                          {setsObj?.PLAYER_1 ?? 0}
                          <span
                            className="live-stat-sep"
                            style={{
                              fontSize: ".7rem",
                              color: "var(--clr-text-muted)",
                              margin: "0 3px",
                            }}
                          >
                            -
                          </span>
                          {setsObj?.PLAYER_2 ?? 0}
                        </span>
                      </div>
                      <div className="live-stat">
                        <span className="live-stat-label">Games</span>
                        <span
                          className="live-stat-value"
                          data-testid={`live-status-games-${match.id}`}
                        >
                          {currentSetGames?.PLAYER_1 ?? 0}
                          <span
                            style={{
                              fontSize: ".7rem",
                              color: "var(--clr-text-muted)",
                              margin: "0 3px",
                            }}
                          >
                            -
                          </span>
                          {currentSetGames?.PLAYER_2 ?? 0}
                        </span>
                      </div>
                      <div className="live-stat">
                        <span className="live-stat-label">Pontos</span>
                        <span
                          className="live-stat-value"
                          data-testid={`live-status-points-${match.id}`}
                        >
                          {pointsObj?.PLAYER_1 ?? "0"}
                          <span
                            style={{
                              fontSize: ".7rem",
                              color: "var(--clr-text-muted)",
                              margin: "0 3px",
                            }}
                          >
                            -
                          </span>
                          {pointsObj?.PLAYER_2 ?? "0"}
                        </span>
                      </div>
                    </div>
                    {setsPartials.length > 0 && (
                      <div
                        className="live-partials"
                        data-testid={`live-status-partials-${match.id}`}
                      >
                        {setsPartials.join("  ·  ")}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Finished: parciais ── */}
                {match.status === "FINISHED" && setsPartials.length > 0 && (
                  <div
                    className="card-finished-score"
                    data-testid={`match-card-partials-${match.id}`}
                  >
                    <span className="card-partials">
                      {setsPartials.join("  ·  ")}
                    </span>
                  </div>
                )}

                {/* ── Footer: format + time | stats button ── */}
                <div className="card-footer">
                  <div className="card-footer-meta">
                    {match.nickname && (
                      <span className="card-nickname">🏷 {match.nickname}</span>
                    )}
                    <span className="card-format">
                      {match.format
                        ? FORMAT_LABELS[match.format] || match.format
                        : ""}
                    </span>
                    {timeLabel && (
                      <span className="card-time">
                        🕐 {timeLabel}
                        {durLabel ? ` · ${durLabel}` : ""}
                      </span>
                    )}
                  </div>
                  <button
                    className="stats-button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!canView) {
                        // AREA 4: Toast substitui alert() nativo
                        toast.warning(
                          "Você não tem permissão para ver o resultado desta partida.",
                          "Acesso Restrito",
                        );
                        return;
                      }
                      await openStatsForMatch(match.id);
                    }}
                    title={canView ? "Abrir relatório" : "Acesso restrito"}
                    disabled={
                      !canView ||
                      (loadingMatchId !== null && loadingMatchId !== match.id)
                    }
                  >
                    {loadingMatchId === match.id ? "⏳" : "📊 Relatório"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MatchStatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        matchId={selectedMatch?.id?.toString() || ""}
        playerNames={modalPlayerNames}
        stats={matchStats}
        nickname={selectedMatch?.nickname || null}
      />

      {/* ── FAB: New Match (mobile only, via CSS) ── */}
      <FloatingActionButton onClick={onNewMatchClick} />

      {/* ── Bottom Tab Bar (mobile only, via CSS) ── */}
      <BottomTabBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        badges={
          liveMatches.length > 0
            ? [{ tabId: "home" as TabId, count: liveMatches.length }]
            : []
        }
      />
    </div>
  );
};

export default Dashboard;
