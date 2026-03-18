// frontend/src/pages/GestorDashboard.tsx
// Dashboard administrativo para GESTOR do clube
// Visão geral: estatísticas, membros, partidas e torneios do clube

import React, { useState, useEffect, useCallback } from "react";
import httpClient from "../config/httpClient";
import { useAuth } from "../contexts/AuthContext";
import { useNavigation } from "../contexts/NavigationContext";
import { useToast } from "../components/Toast";
import AthleteSearchInput from "../components/AthleteSearchInput";
import type { AthleteResult } from "../components/AthleteSearchInput";
import {
  useSubscription,
  PLAN_LIMITS,
  type PlanType,
} from "../hooks/useSubscription";
import PlanGate from "../components/PlanGate";
import BulkAthleteImport from "../components/BulkAthleteImport";
import AddAthleteModal from "../components/AddAthleteModal";
import EditMemberModal, {
  type EditableMember,
} from "../components/EditMemberModal";
import { ClubRankings } from "../components/ClubRankings";
import "./GestorDashboard.css";

// === Tipos ===

interface MatchesByStatus {
  status: string;
  count: number;
}

interface TournamentsByStatus {
  status: string;
  count: number;
}

interface RecentMatch {
  id: string;
  playerP1: string;
  playerP2: string;
  status: string;
  score: string | null;
  format: string;
  createdAt: string;
  visibility: string;
}

interface ClubMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  joinedAt: string;
}

interface ClubStats {
  totalMembers: number;
  totalMatches: number;
  matchesByStatus: MatchesByStatus[];
  totalTournaments: number;
  tournamentsByStatus: TournamentsByStatus[];
  recentMatches: RecentMatch[];
  recentMembers: FullMember[];
}

interface FullMember {
  id: string;
  userId: string | null;
  clubId: string;
  role: string;
  status: string;
  joinedAt: string;
  isGuest?: boolean;
  user: {
    id: string | null;
    email: string | null;
    name: string;
    avatarUrl?: string | null;
    athleteProfile?: {
      id: string;
      globalId: string;
      cpf?: string | null;
      birthDate?: string | null;
    } | null;
  };
}

// === Labels ===

const ROLE_LABELS: Record<string, string> = {
  GESTOR: "Gestor",
  COACH: "Treinador",
  ATHLETE: "Atleta",
  SPECTATOR: "Espectador",
  ADMIN: "Administrador",
};

const ROLE_ICONS: Record<string, string> = {
  GESTOR: "👔",
  COACH: "🎯",
  ATHLETE: "🎾",
  SPECTATOR: "👁️",
  ADMIN: "🔑",
};

const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Não Iniciada",
  IN_PROGRESS: "Em Andamento",
  FINISHED: "Finalizada",
  PAUSED: "Pausada",
};

const MATCH_STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: "badge-neutral",
  IN_PROGRESS: "badge-live",
  FINISHED: "badge-finished",
  PAUSED: "badge-paused",
};

const TOURNAMENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  REGISTRATION: "Inscrições",
  IN_PROGRESS: "Em Andamento",
  FINISHED: "Finalizado",
  CANCELLED: "Cancelado",
};

const VISIBILITY_ICONS: Record<string, string> = {
  PUBLIC: "🌐",
  CLUB: "🏢",
  PLAYERS_ONLY: "🔒",
};

const INVITE_ROLES = ["COACH", "ATHLETE", "SPECTATOR"];

// === Componente ===

type TabType =
  | "overview"
  | "members"
  | "matches"
  | "tournaments"
  | "rankings"
  | "billing"
  | "settings";

interface InvoiceRow {
  id: string;
  amount: number;
  status: string;
  dueDate: string;
  paidAt?: string | null;
  description?: string;
}

const INVOICE_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  OVERDUE: "Vencida",
  CANCELED: "Cancelada",
  REFUNDED: "Reembolsada",
};

const INVOICE_STATUS_COLORS: Record<string, string> = {
  PENDING: "badge-neutral",
  PAID: "badge-finished",
  OVERDUE: "badge-live",
  CANCELED: "badge-paused",
  REFUNDED: "badge-neutral",
};

const GestorDashboard: React.FC = () => {
  const { currentUser, activeClub } = useAuth();
  const navigation = useNavigation();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [stats, setStats] = useState<ClubStats | null>(null);
  const [members, setMembers] = useState<FullMember[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscription / Billing
  const subscription = useSubscription();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Invite member state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showAddAthlete, setShowAddAthlete] = useState(false);
  const [showAddCoach, setShowAddCoach] = useState(false);
  const [inviteAthlete, setInviteAthlete] = useState<AthleteResult | null>(
    null,
  );
  const [inviteRole, setInviteRole] = useState("ATHLETE");
  const [inviting, setInviting] = useState(false);

  // Pending invites state
  const [pendingCount, setPendingCount] = useState(0);

  // Edit member state
  const [editingMember, setEditingMember] = useState<EditableMember | null>(
    null,
  );

  const clubId = activeClub?.clubId;
  const isGestor = activeClub?.role === "GESTOR";

  // === Fetch Stats ===
  const fetchStats = useCallback(async () => {
    if (!clubId) return;
    setLoadingStats(true);
    setError(null);
    try {
      const response = await httpClient.get<ClubStats>(
        `/clubs/${clubId}/stats`,
      );
      setStats(response.data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar estatísticas";
      setError(message);
    } finally {
      setLoadingStats(false);
    }
  }, [clubId]);

  // === Fetch Members ===
  const fetchMembers = useCallback(async () => {
    if (!clubId) return;
    setLoadingMembers(true);
    try {
      const response = await httpClient.get<{ members: FullMember[] }>(
        `/clubs/${clubId}/members`,
      );
      const allMembers = response.data.members || [];
      setMembers(allMembers);
      setPendingCount(allMembers.filter((m) => m.status === "PENDING").length);
    } catch {
      toast.error("Erro ao carregar membros.");
    } finally {
      setLoadingMembers(false);
    }
  }, [clubId, toast]);

  // === Fetch Invoices ===
  const fetchInvoices = useCallback(async () => {
    if (!clubId) return;
    setLoadingInvoices(true);
    try {
      const response = await httpClient.get<{ invoices: InvoiceRow[] }>(
        `/clubs/${clubId}/invoices`,
      );
      setInvoices(response.data.invoices || []);
    } catch {
      toast.error("Erro ao carregar faturas.");
    } finally {
      setLoadingInvoices(false);
    }
  }, [clubId, toast]);

  // Load data on mount and when club changes
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === "members" && members.length === 0) {
      fetchMembers();
    }
  }, [activeTab, members.length, fetchMembers]);

  useEffect(() => {
    if (activeTab === "matches") {
      fetchStats();
    }
  }, [activeTab, fetchStats]);

  useEffect(() => {
    if (activeTab === "billing" && invoices.length === 0) {
      fetchInvoices();
    }
  }, [activeTab, invoices.length, fetchInvoices]);

  // === Invite Member ===
  const handleInviteMember = async () => {
    if (!clubId || !inviteAthlete) return;

    setInviting(true);
    try {
      await httpClient.post(`/clubs/${clubId}/members`, {
        userId: inviteAthlete.id,
        role: inviteRole,
      });
      toast.success(
        `${inviteAthlete.name} convidado como ${ROLE_LABELS[inviteRole]}.`,
      );
      setInviteAthlete(null);
      setInviteRole("ATHLETE");
      setShowInviteForm(false);
      // Refresh data
      fetchMembers();
      fetchStats();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao convidar membro";
      toast.error(message);
    } finally {
      setInviting(false);
    }
  };

  // === Guards ===
  if (!activeClub) {
    return (
      <div className="gestor-dashboard">
        <div className="gestor-empty">
          <p>Selecione um clube para acessar o painel de gestão.</p>
        </div>
      </div>
    );
  }

  if (!isGestor) {
    return (
      <div className="gestor-dashboard">
        <div className="gestor-empty">
          <p>
            Acesso restrito. Apenas gestores do clube podem acessar este painel.
          </p>
          <button
            className="gestor-btn-secondary"
            onClick={() => navigation.navigateToDashboard()}
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="gestor-dashboard">
        {/* Header */}
        <header className="gestor-header">
          <div className="gestor-header-left">
            <h2>
              Painel do <span>Gestor</span>
            </h2>
            {activeClub && (
              <span className="gestor-club-tag">{activeClub.clubName}</span>
            )}
          </div>
          <div className="gestor-header-actions">
            <button
              className="gestor-btn-secondary"
              onClick={() => navigation.navigateToDashboard()}
            >
              ← Partidas
            </button>
          </div>
        </header>

        {/* Tabs */}
        <nav className="gestor-tabs">
          {(
            [
              { key: "overview", label: "Visão Geral", icon: "📊" },
              { key: "members", label: "Membros", icon: "👥" },
              { key: "matches", label: "Partidas", icon: "🎾" },
              { key: "tournaments", label: "Torneios", icon: "🏆" },
              { key: "rankings", label: "Ranking", icon: "📈" },
              { key: "billing", label: "Assinatura", icon: "💳" },
              { key: "settings", label: "Config", icon: "⚙️" },
            ] as Array<{ key: TabType; label: string; icon: string }>
          ).map((tab) => (
            <button
              key={tab.key}
              className={`gestor-tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
              {tab.key === "members" && pendingCount > 0 && (
                <span
                  className="tab-pending-badge"
                  aria-label={`${pendingCount} pendentes`}
                >
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="gestor-content">
          {error && (
            <div className="gestor-error">
              <p>{error}</p>
              <button className="gestor-btn-secondary" onClick={fetchStats}>
                Tentar novamente
              </button>
            </div>
          )}

          {loadingStats && !stats && (
            <div className="gestor-loading">
              <div className="gestor-loading-spinner" />
              Carregando dados do clube...
            </div>
          )}

          {/* === TAB: Visão Geral === */}
          {activeTab === "overview" && stats && (
            <div className="gestor-overview">
              {/* KPI Cards */}
              <div className="gestor-kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-icon">👥</div>
                  <div className="kpi-value">{stats.totalMembers}</div>
                  <div className="kpi-label">Membros</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-icon">🎾</div>
                  <div className="kpi-value">{stats.totalMatches}</div>
                  <div className="kpi-label">Partidas</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-icon">🏆</div>
                  <div className="kpi-value">{stats.totalTournaments}</div>
                  <div className="kpi-label">Torneios</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-icon">🟢</div>
                  <div className="kpi-value">
                    {stats.matchesByStatus.find(
                      (m) => m.status === "IN_PROGRESS",
                    )?.count || 0}
                  </div>
                  <div className="kpi-label">Ao Vivo</div>
                </div>
              </div>

              {/* Recent Matches */}
              <div className="gestor-section">
                <div className="section-header">
                  <h3>Partidas Recentes</h3>
                  <button
                    className="gestor-link-btn"
                    onClick={() => setActiveTab("matches")}
                  >
                    Ver todas →
                  </button>
                </div>
                {stats.recentMatches.length === 0 ? (
                  <p className="gestor-muted">Nenhuma partida registrada.</p>
                ) : (
                  <div className="gestor-match-list">
                    {stats.recentMatches.map((match) => (
                      <div
                        key={match.id}
                        className="gestor-match-row"
                        onClick={() => navigation.navigateToMatch(match.id)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="match-players">
                          {match.playerP1} vs {match.playerP2}
                        </div>
                        <div className="match-meta">
                          <span
                            className={`match-status-badge ${MATCH_STATUS_COLORS[match.status] || "badge-neutral"}`}
                          >
                            {STATUS_LABELS[match.status] || match.status}
                          </span>
                          {match.score && (
                            <span className="match-score">{match.score}</span>
                          )}
                          <span className="match-vis">
                            {VISIBILITY_ICONS[match.visibility] || "🔒"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Members */}
              <div className="gestor-section">
                <div className="section-header">
                  <h3>Membros Recentes</h3>
                  <button
                    className="gestor-link-btn"
                    onClick={() => setActiveTab("members")}
                  >
                    Ver todos →
                  </button>
                </div>
                {stats.recentMembers.length === 0 ? (
                  <p className="gestor-muted">Nenhum membro no clube.</p>
                ) : (
                  <div className="gestor-list">
                    {stats.recentMembers.map((member) => (
                      <div key={member.id} className="gestor-member-row">
                        <div className="members-table-row small-row">
                          <span className="member-cell-code">
                            <code>
                              {member.user.athleteProfile?.globalId
                                ? `[${member.user.athleteProfile.globalId.slice(0, 8).toUpperCase()}]`
                                : "—"}
                            </code>
                          </span>
                          <span className="member-cell-name">
                            <span className="member-avatar">
                              {member.user.name?.charAt(0)?.toUpperCase() ||
                                "?"}
                            </span>
                            {member.user.name}
                          </span>
                          <span className="member-cell-email">
                            {member.user.email || (
                              <span
                                style={{ color: "var(--clr-text-muted, #888)" }}
                              >
                                —
                              </span>
                            )}
                          </span>
                          <span className="member-cell-cpf">
                            {member.user.athleteProfile?.cpf ? (
                              (() => {
                                const d =
                                  member.user.athleteProfile.cpf.replace(
                                    /\D/g,
                                    "",
                                  );
                                return d.length === 11
                                  ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`
                                  : d;
                              })()
                            ) : (
                              <span
                                style={{ color: "var(--clr-text-muted, #888)" }}
                              >
                                —
                              </span>
                            )}
                          </span>
                          <span className="member-role-tag">
                            {ROLE_ICONS[member.role] || "👤"}{" "}
                            {ROLE_LABELS[member.role] || member.role}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* === TAB: Membros === */}
          {activeTab === "members" && (
            <div className="gestor-members-tab">
              <div className="section-header">
                <h3>
                  Membros do Clube{" "}
                  {members.length > 0 && (
                    <span className="count-badge">{members.length}</span>
                  )}
                </h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    className="gestor-btn-primary"
                    onClick={() => {
                      setShowBulkImport(!showBulkImport);
                      if (showInviteForm) setShowInviteForm(false);
                    }}
                  >
                    {showBulkImport ? "Cancelar" : "📤 Importar XLSX"}
                  </button>
                  <button
                    className="gestor-btn-secondary"
                    onClick={() => setShowAddAthlete(true)}
                  >
                    ➕ Cadastrar Atleta
                  </button>
                  <button
                    className="gestor-btn-secondary"
                    onClick={() => setShowAddCoach(true)}
                  >
                    🎯 Adicionar Técnico
                  </button>
                  <button
                    className="gestor-btn-primary"
                    onClick={() => {
                      setShowInviteForm(!showInviteForm);
                      if (showBulkImport) setShowBulkImport(false);
                    }}
                  >
                    {showInviteForm ? "Cancelar" : "+ Convidar Membro"}
                  </button>
                </div>
              </div>

              {/* Invite Form */}
              {showInviteForm && (
                <div className="invite-form">
                  <div className="invite-form-row">
                    <AthleteSearchInput
                      label="Buscar usuário"
                      placeholder="Nome do usuário..."
                      value={inviteAthlete}
                      onSelect={setInviteAthlete}
                      allowGuest={false}
                    />
                  </div>
                  <div className="invite-form-row">
                    <label htmlFor="invite-role">Papel no clube</label>
                    <select
                      id="invite-role"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="invite-role-select"
                    >
                      {INVITE_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_ICONS[role]} {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    className="gestor-btn-primary"
                    onClick={handleInviteMember}
                    disabled={!inviteAthlete || inviting}
                  >
                    {inviting ? "Convidando..." : "Enviar Convite"}
                  </button>
                </div>
              )}

              {/* Bulk XLSX Import */}
              {showBulkImport && clubId && (
                <BulkAthleteImport
                  clubId={clubId}
                  onComplete={() => {
                    setShowBulkImport(false);
                    fetchMembers();
                    fetchStats();
                  }}
                  onCancel={() => setShowBulkImport(false)}
                />
              )}

              {/* Members List */}
              {loadingMembers ? (
                <div className="gestor-loading">
                  <div className="gestor-loading-spinner" />
                  Carregando membros...
                </div>
              ) : members.length === 0 ? (
                <p className="gestor-muted">
                  Nenhum membro encontrado. Convide alguém!
                </p>
              ) : (
                <div className="gestor-members-table">
                  <div className="members-table-header">
                    <span>Código</span>
                    <span>Nome</span>
                    <span>E-mail</span>
                    <span>CPF</span>
                    <span>Nascimento</span>
                    <span>Papel</span>
                    <span>Status</span>
                    <span>Entrada</span>
                    <span></span>
                  </div>
                  {members.map((member) => (
                    <div key={member.id} className="members-table-row">
                      <span className="member-cell-code">
                        <code>
                          {member.user.athleteProfile?.globalId
                            ? `[${member.user.athleteProfile.globalId.slice(0, 8).toUpperCase()}]`
                            : "—"}
                        </code>
                      </span>
                      <span className="member-cell-name">
                        <span className="member-avatar">
                          {member.user.name?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                        {member.user.name}
                      </span>
                      <span className="member-cell-email">
                        {member.user.email ? (
                          member.user.email
                        ) : (
                          <span
                            style={{ color: "var(--clr-text-muted, #888)" }}
                          >
                            —
                          </span>
                        )}
                      </span>
                      <span className="member-cell-cpf">
                        {member.user.athleteProfile?.cpf ? (
                          (() => {
                            const d = member.user.athleteProfile.cpf.replace(
                              /\D/g,
                              "",
                            );
                            return d.length === 11
                              ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`
                              : d;
                          })()
                        ) : (
                          <span
                            style={{ color: "var(--clr-text-muted, #888)" }}
                          >
                            —
                          </span>
                        )}
                      </span>
                      <span className="member-cell-birth">
                        {member.user.athleteProfile?.birthDate ? (
                          new Date(
                            member.user.athleteProfile.birthDate,
                          ).toLocaleDateString("pt-BR", { timeZone: "UTC" })
                        ) : (
                          <span
                            style={{ color: "var(--clr-text-muted, #888)" }}
                          >
                            —
                          </span>
                        )}
                      </span>
                      <span className="member-cell-role">
                        <span className="member-role-tag">
                          {ROLE_ICONS[member.role] || "👤"}{" "}
                          {ROLE_LABELS[member.role] || member.role}
                        </span>
                      </span>
                      <span className="member-cell-status">
                        <span
                          className={`status-dot ${member.status === "ACTIVE" ? "active" : "inactive"}`}
                        />
                        {member.status === "ACTIVE"
                          ? "Ativo"
                          : member.status === "PENDING"
                            ? "Pendente"
                            : member.status}
                      </span>
                      <span className="member-cell-date">
                        {new Date(member.joinedAt).toLocaleDateString("pt-BR")}
                      </span>
                      <span className="member-cell-actions">
                        {(member.role === "ATHLETE" ||
                          member.role === "COACH") && (
                          <button
                            type="button"
                            className="gestor-btn-icon"
                            title="Editar"
                            onClick={() => setEditingMember(member)}
                          >
                            ✏️
                          </button>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* === TAB: Partidas === */}
          {activeTab === "matches" && stats && (
            <div className="gestor-matches-tab">
              <div className="section-header">
                <h3>Partidas do Clube</h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    className="gestor-btn-primary"
                    onClick={() => navigation.navigateToNewMatch()}
                  >
                    + Nova Partida
                  </button>
                  <button
                    className="gestor-btn-secondary"
                    onClick={fetchStats}
                    title="Recarregar partidas"
                  >
                    🔄 Atualizar
                  </button>
                </div>
              </div>

              {/* Status Summary */}
              <div className="status-summary">
                {stats.matchesByStatus.map((m) => (
                  <div key={m.status} className="status-pill">
                    <span className="status-pill-label">
                      {STATUS_LABELS[m.status] || m.status}
                    </span>
                    <span className="status-pill-count">{m.count}</span>
                  </div>
                ))}
              </div>

              {/* Full Match List */}
              {stats.recentMatches.length === 0 ? (
                <p className="gestor-muted">Nenhuma partida registrada.</p>
              ) : (
                <div className="gestor-match-list full-list">
                  {stats.recentMatches.map((match) => (
                    <div
                      key={match.id}
                      className="gestor-match-card"
                      onClick={() => navigation.navigateToMatch(match.id)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="match-card-header">
                        <span
                          className={`match-status-badge ${MATCH_STATUS_COLORS[match.status] || "badge-neutral"}`}
                        >
                          {STATUS_LABELS[match.status] || match.status}
                        </span>
                        <span className="match-vis">
                          {VISIBILITY_ICONS[match.visibility] || "🔒"}
                        </span>
                      </div>
                      <div className="match-card-players">
                        <span className="player-name">{match.playerP1}</span>
                        <span className="match-vs">vs</span>
                        <span className="player-name">{match.playerP2}</span>
                      </div>
                      {match.score && (
                        <div className="match-card-score">{match.score}</div>
                      )}
                      <div className="match-card-footer">
                        <span className="match-format">{match.format}</span>
                        <span className="match-date">
                          {new Date(match.createdAt).toLocaleDateString(
                            "pt-BR",
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* === TAB: Torneios === */}
          {activeTab === "tournaments" && stats && (
            <div className="gestor-tournaments-tab">
              <div className="section-header">
                <h3>Torneios do Clube</h3>
                <button
                  className="gestor-btn-primary"
                  onClick={() => navigation.replace("/tournaments")}
                >
                  Gerenciar Torneios →
                </button>
              </div>

              {/* Tournament Status Summary */}
              {stats.tournamentsByStatus.length === 0 ? (
                <p className="gestor-muted">
                  Nenhum torneio criado. Acesse a página de torneios para criar
                  um.
                </p>
              ) : (
                <div className="tournament-status-grid">
                  {stats.tournamentsByStatus.map((t) => (
                    <div key={t.status} className="tournament-status-card">
                      <div className="tournament-status-count">{t.count}</div>
                      <div className="tournament-status-label">
                        {TOURNAMENT_STATUS_LABELS[t.status] || t.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* === TAB: Ranking === */}
          {activeTab === "rankings" && clubId && (
            <ClubRankings clubId={clubId} />
          )}

          {/* === TAB: Assinatura / Billing === */}
          {activeTab === "billing" && (
            <div className="gestor-billing-tab">
              <div className="section-header">
                <h3>Assinatura do Clube</h3>
              </div>

              {subscription.loading ? (
                <div className="gestor-loading">
                  <div className="gestor-loading-spinner" />
                  Carregando dados da assinatura...
                </div>
              ) : subscription.error ? (
                <div className="gestor-error">
                  <p>{subscription.error}</p>
                  <button
                    className="gestor-btn-secondary"
                    onClick={subscription.refresh}
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : (
                <>
                  {/* Plan Card */}
                  <div className="gestor-kpi-grid">
                    <div className="kpi-card">
                      <div className="kpi-icon">📋</div>
                      <div className="kpi-value">{subscription.planLabel}</div>
                      <div className="kpi-label">Plano Atual</div>
                    </div>
                    <div className="kpi-card">
                      <div className="kpi-icon">
                        {subscription.isActive
                          ? "✅"
                          : subscription.isPastDue
                            ? "⚠️"
                            : "❌"}
                      </div>
                      <div className="kpi-value">
                        {subscription.isActive
                          ? "Ativo"
                          : subscription.isPastDue
                            ? "Pendente"
                            : "Inativo"}
                      </div>
                      <div className="kpi-label">Status</div>
                    </div>
                    <div className="kpi-card">
                      <div className="kpi-icon">👥</div>
                      <div className="kpi-value">
                        {subscription.athleteUsage
                          ? `${subscription.athleteUsage.current}/${subscription.athleteUsage.max}`
                          : "—"}
                      </div>
                      <div className="kpi-label">Atletas</div>
                    </div>
                    <div className="kpi-card">
                      <div className="kpi-icon">📅</div>
                      <div className="kpi-value">
                        {subscription.daysRemaining !== null
                          ? `${subscription.daysRemaining}d`
                          : "∞"}
                      </div>
                      <div className="kpi-label">Dias Restantes</div>
                    </div>
                  </div>

                  {/* Athlete Quota Bar */}
                  {subscription.athleteUsage && (
                    <div className="gestor-section">
                      <h4>Uso de Atletas</h4>
                      <div className="quota-bar-container">
                        <div className="quota-bar">
                          <div
                            className={`quota-bar-fill ${subscription.athleteUsage.percentage > 90 ? "quota-danger" : subscription.athleteUsage.percentage > 70 ? "quota-warning" : ""}`}
                            style={{
                              width: `${Math.min(subscription.athleteUsage.percentage, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="quota-text">
                          {subscription.athleteUsage.current} de{" "}
                          {subscription.athleteUsage.max} atletas (
                          {Math.round(subscription.athleteUsage.percentage)}%)
                        </span>
                      </div>
                      {!subscription.canAddAthlete && (
                        <p className="gestor-warning">
                          Limite de atletas atingido. Faça upgrade para
                          adicionar mais.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Plan Comparison */}
                  <div className="gestor-section">
                    <h4>Planos Disponíveis</h4>
                    <div className="plan-comparison-grid">
                      {(["FREE", "PREMIUM", "ENTERPRISE"] as PlanType[]).map(
                        (plan) => {
                          const config = PLAN_LIMITS[plan];
                          const isCurrent = plan === subscription.planType;
                          return (
                            <div
                              key={plan}
                              className={`plan-card ${isCurrent ? "plan-current" : ""}`}
                            >
                              <div className="plan-card-name">
                                {config.label}
                              </div>
                              <div className="plan-card-athletes">
                                Até{" "}
                                {config.maxAthletes === 999999
                                  ? "Ilimitados"
                                  : config.maxAthletes}{" "}
                                atletas
                              </div>
                              <ul className="plan-card-features">
                                {config.features.map((f) => (
                                  <li key={f}>✓ {f.replace(/_/g, " ")}</li>
                                ))}
                              </ul>
                              {isCurrent ? (
                                <span className="plan-card-badge">
                                  Plano Atual
                                </span>
                              ) : (
                                <button className="gestor-btn-secondary plan-upgrade-btn">
                                  {PLAN_LIMITS[subscription.planType] &&
                                  (
                                    [
                                      "FREE",
                                      "PREMIUM",
                                      "ENTERPRISE",
                                    ] as PlanType[]
                                  ).indexOf(plan) >
                                    (
                                      [
                                        "FREE",
                                        "PREMIUM",
                                        "ENTERPRISE",
                                      ] as PlanType[]
                                    ).indexOf(subscription.planType)
                                    ? "Upgrade"
                                    : "Mudar"}
                                </button>
                              )}
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>

                  {/* Invoices */}
                  <div className="gestor-section">
                    <div className="section-header">
                      <h4>Faturas</h4>
                      <button
                        className="gestor-link-btn"
                        onClick={fetchInvoices}
                      >
                        Atualizar
                      </button>
                    </div>
                    {loadingInvoices ? (
                      <div className="gestor-loading">
                        <div className="gestor-loading-spinner" />
                        Carregando faturas...
                      </div>
                    ) : invoices.length === 0 ? (
                      <p className="gestor-muted">Nenhuma fatura encontrada.</p>
                    ) : (
                      <div className="gestor-members-table">
                        <div className="members-table-header">
                          <span>Descrição</span>
                          <span>Valor</span>
                          <span>Status</span>
                          <span>Vencimento</span>
                          <span>Pago em</span>
                        </div>
                        {invoices.map((inv) => (
                          <div key={inv.id} className="members-table-row">
                            <span>{inv.description || "Assinatura"}</span>
                            <span>R$ {(inv.amount / 100).toFixed(2)}</span>
                            <span>
                              <span
                                className={`match-status-badge ${INVOICE_STATUS_COLORS[inv.status] || "badge-neutral"}`}
                              >
                                {INVOICE_STATUS_LABELS[inv.status] ||
                                  inv.status}
                              </span>
                            </span>
                            <span>
                              {new Date(inv.dueDate).toLocaleDateString(
                                "pt-BR",
                              )}
                            </span>
                            <span>
                              {inv.paidAt
                                ? new Date(inv.paidAt).toLocaleDateString(
                                    "pt-BR",
                                  )
                                : "—"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* === TAB: Config === */}
          {activeTab === "settings" && (
            <div className="gestor-settings-tab">
              <div className="section-header">
                <h3>Configurações do Clube</h3>
              </div>

              <div className="gestor-section">
                <h4>Código de Convite</h4>
                <p className="gestor-muted">
                  Compartilhe este código para que atletas se juntem ao seu
                  clube.
                </p>
                {activeClub && (
                  <div className="invite-code-display">
                    <code className="invite-code-value">
                      {/* invite code is fetched from club data */}
                      {(activeClub as unknown as Record<string, string>)
                        .inviteCode || "Gerando..."}
                    </code>
                    <button
                      className="gestor-btn-secondary"
                      onClick={() => {
                        const code = (
                          activeClub as unknown as Record<string, string>
                        ).inviteCode;
                        if (code) {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/join/${code}`,
                          );
                          toast.success("Link copiado!");
                        }
                      }}
                    >
                      Copiar Link
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de cadastro manual de atleta */}
      {clubId && (
        <AddAthleteModal
          isOpen={showAddAthlete}
          clubId={clubId}
          defaultRole="ATHLETE"
          onClose={() => setShowAddAthlete(false)}
          onSuccess={() => {
            fetchMembers();
            fetchStats();
          }}
        />
      )}

      {/* Modal de cadastro de técnico */}
      {clubId && (
        <AddAthleteModal
          isOpen={showAddCoach}
          clubId={clubId}
          defaultRole="COACH"
          onClose={() => setShowAddCoach(false)}
          onSuccess={() => {
            fetchMembers();
            fetchStats();
          }}
        />
      )}

      {/* Modal de edição de atleta / técnico (apenas gestor) */}
      {clubId && (
        <EditMemberModal
          isOpen={editingMember !== null}
          member={editingMember}
          clubId={clubId}
          onClose={() => setEditingMember(null)}
          onSuccess={() => {
            fetchMembers();
          }}
        />
      )}
    </>
  );
};

export default GestorDashboard;
