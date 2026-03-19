// frontend/src/pages/AdminDashboard.tsx
// Dashboard administrativo global — ADMIN only
// Visão geral: KPIs plataforma, lista de clubes, lista de usuários

import React, { useState, useEffect, useCallback } from "react";
import httpClient from "../config/httpClient";
import { useAuth } from "../contexts/AuthContext";
import { useNavigation } from "../contexts/NavigationContext";
import { useToast } from "../components/Toast";
import ClubMembersModal, {
  type ClubMember,
} from "../components/ClubMembersModal";
import "./AdminDashboard.css";

// === Tipos ===

interface ByPlanCount {
  plan: string;
  count: number;
}

interface ByRoleCount {
  role: string;
  count: number;
}

interface TopClub {
  id: string;
  name: string;
  slug: string;
  planType: string;
  createdAt: string;
  memberCount: number;
}

interface RecentClub {
  id: string;
  name: string;
  slug: string;
  planType: string;
  createdAt: string;
  memberCount: number;
}

interface AdminStats {
  totalUsers: number;
  totalClubs: number;
  newUsersThisMonth: number;
  newClubsThisMonth: number;
  activeUsersLastWeek: number;
  clubsByPlan: ByPlanCount[];
  membershipsByRole: ByRoleCount[];
  topClubsByMembers: TopClub[];
  recentClubs: RecentClub[];
}

interface AdminClub {
  id: string;
  name: string;
  slug: string;
  planType: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  matchCount: number;
  tournamentCount: number;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  clubCount: number;
  matchCount: number;
}

interface PaginatedClubs {
  clubs: AdminClub[];
  total: number;
  limit: number;
  offset: number;
}

interface PaginatedUsers {
  users: AdminUser[];
  total: number;
  limit: number;
  offset: number;
}

interface AdminMatch {
  id: string;
  playerP1: string;
  playerP2: string;
  status: string;
  score: string | null;
  winner: string | null;
  visibility: string;
  clubName: string | null;
  createdByName: string | null;
  createdAt: string;
}

interface PaginatedMatches {
  matches: AdminMatch[];
  total: number;
  limit: number;
  offset: number;
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

const PLAN_LABELS: Record<string, string> = {
  FREE: "Gratuito",
  PREMIUM: "Premium",
  ENTERPRISE: "Enterprise",
};

const PLAN_COLORS: Record<string, string> = {
  FREE: "plan-free",
  PREMIUM: "plan-premium",
  ENTERPRISE: "plan-enterprise",
};

const MATCH_STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Não iniciada",
  IN_PROGRESS: "Em andamento",
  FINISHED: "Finalizada",
};

const MATCH_STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: "ms-not-started",
  IN_PROGRESS: "ms-in-progress",
  FINISHED: "ms-finished",
};

// === Componente ===

type TabType = "overview" | "clubs" | "users" | "matches";

const PAGE_SIZE = 20;

interface CreateClubForm {
  name: string;
  slug: string;
  planType: string;
  gestorName: string;
  gestorEmail: string;
  gestorPassword: string;
  alsoCoach: boolean;
}

const INITIAL_CREATE_FORM: CreateClubForm = {
  name: "",
  slug: "",
  planType: "FREE",
  gestorName: "",
  gestorEmail: "",
  gestorPassword: "",
  alsoCoach: false,
};

const AdminDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const navigation = useNavigation();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Stats state
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Clubs state
  const [clubs, setClubs] = useState<AdminClub[]>([]);
  const [clubsTotal, setClubsTotal] = useState(0);
  const [clubsOffset, setClubsOffset] = useState(0);
  const [loadingClubs, setLoadingClubs] = useState(false);
  const [clubSearch, setClubSearch] = useState("");

  // Users state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersOffset, setUsersOffset] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  // Matches tab state
  const [allMatches, setAllMatches] = useState<AdminMatch[]>([]);
  const [matchesTotal, setMatchesTotal] = useState(0);
  const [matchesOffset, setMatchesOffset] = useState(0);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [matchStatusFilter, setMatchStatusFilter] = useState("");

  // Club members modal state
  const [selectedClub, setSelectedClub] = useState<AdminClub | null>(null);
  const [clubMembers, setClubMembers] = useState<ClubMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Create club modal state
  const [showCreateClub, setShowCreateClub] = useState(false);
  const [createClubForm, setCreateClubForm] =
    useState<CreateClubForm>(INITIAL_CREATE_FORM);
  const [creatingClub, setCreatingClub] = useState(false);

  // Sync passwords state
  const [syncingPasswords, setSyncingPasswords] = useState(false);

  const isAdmin = currentUser?.activeRole === "ADMIN";

  // === Fetch Stats ===
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    setError(null);
    try {
      const response = await httpClient.get<AdminStats>("/admin/stats");
      setStats(response.data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar estatísticas";
      setError(message);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // === Fetch Clubs ===
  const fetchClubs = useCallback(
    async (offset = 0, search = "") => {
      setLoadingClubs(true);
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(offset),
        });
        if (search) params.set("search", search);
        const response = await httpClient.get<PaginatedClubs>(
          `/admin/clubs?${params.toString()}`,
        );
        setClubs(response.data.clubs || []);
        setClubsTotal(response.data.total || 0);
        setClubsOffset(offset);
      } catch {
        toast.error("Erro ao carregar clubes.");
      } finally {
        setLoadingClubs(false);
      }
    },
    [toast],
  );

  // === Fetch Users ===
  const fetchUsers = useCallback(
    async (offset = 0, search = "") => {
      setLoadingUsers(true);
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(offset),
        });
        if (search) params.set("search", search);
        const response = await httpClient.get<PaginatedUsers>(
          `/admin/users?${params.toString()}`,
        );
        setUsers(response.data.users || []);
        setUsersTotal(response.data.total || 0);
        setUsersOffset(offset);
      } catch {
        toast.error("Erro ao carregar usuários.");
      } finally {
        setLoadingUsers(false);
      }
    },
    [toast],
  );

  // === Fetch All Matches ===
  const fetchAllMatches = useCallback(
    async (offset = 0, status = "") => {
      setLoadingMatches(true);
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(offset),
        });
        if (status) params.set("status", status);
        const response = await httpClient.get<PaginatedMatches>(
          `/admin/matches/all?${params.toString()}`,
        );
        setAllMatches(response.data.matches || []);
        setMatchesTotal(response.data.total || 0);
        setMatchesOffset(offset);
      } catch {
        toast.error("Erro ao carregar partidas.");
      } finally {
        setLoadingMatches(false);
      }
    },
    [toast],
  );

  // Load stats on mount
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Load tab data when switching
  useEffect(() => {
    if (activeTab === "clubs" && clubs.length === 0) {
      fetchClubs(0, clubSearch);
    }
    if (activeTab === "users" && users.length === 0) {
      fetchUsers(0, userSearch);
    }
    if (activeTab === "matches" && allMatches.length === 0) {
      fetchAllMatches(0, matchStatusFilter);
    }
  }, [
    activeTab,
    clubs.length,
    users.length,
    allMatches.length,
    fetchClubs,
    fetchUsers,
    fetchAllMatches,
    clubSearch,
    userSearch,
    matchStatusFilter,
  ]);

  // === Club Members ===
  const handleShowMembers = useCallback(
    async (club: AdminClub) => {
      setSelectedClub(club);
      setClubMembers([]);
      setLoadingMembers(true);
      try {
        const response = await httpClient.get<{ members: ClubMember[] }>(
          `/clubs/${club.id}/members`,
        );
        setClubMembers(response.data.members ?? []);
      } catch {
        toast.error("Erro ao carregar membros do clube.");
      } finally {
        setLoadingMembers(false);
      }
    },
    [toast],
  );

  const handleCloseMembers = useCallback(() => {
    setSelectedClub(null);
    setClubMembers([]);
  }, []);

  // === Search handlers ===
  const handleClubSearch = () => {
    setClubsOffset(0);
    fetchClubs(0, clubSearch);
  };

  const handleUserSearch = () => {
    setUsersOffset(0);
    fetchUsers(0, userSearch);
  };

  // === Create Club ===
  const handleCreateClub = async () => {
    if (
      !createClubForm.name.trim() ||
      !createClubForm.gestorName.trim() ||
      !createClubForm.gestorEmail.trim() ||
      !createClubForm.gestorPassword
    ) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    setCreatingClub(true);
    try {
      await httpClient.post("/admin/clubs", createClubForm);
      toast.success(`Clube "${createClubForm.name}" criado com sucesso!`);
      setShowCreateClub(false);
      setCreateClubForm(INITIAL_CREATE_FORM);
      fetchClubs(0, clubSearch);
      fetchStats();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao criar clube.";
      toast.error(msg);
    } finally {
      setCreatingClub(false);
    }
  };

  const handleCreateClubFieldChange = (
    field: keyof CreateClubForm,
    value: string | boolean,
  ) => {
    setCreateClubForm((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-derivar slug a partir do nome
      if (field === "name" && typeof value === "string") {
        updated.slug = value
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
      }
      return updated;
    });
  };

  // === Sync Passwords (atletas → senha = DDMMAAAA) ===
  const handleSyncPasswords = async () => {
    if (
      !window.confirm(
        "Isso irá recalcular a senha de TODOS os atletas com data de nascimento para o formato DDMMAAAA.\n\nContinuar?",
      )
    )
      return;
    setSyncingPasswords(true);
    try {
      const resp = await httpClient.post<{ updated: number; skipped: number }>(
        "/admin/athletes/sync-passwords",
        {},
      );
      toast.success(
        `Senhas sincronizadas: ${resp.data.updated} atletas atualizados, ${resp.data.skipped} ignorados.`,
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao sincronizar senhas.";
      toast.error(msg);
    } finally {
      setSyncingPasswords(false);
    }
  };

  // === Pagination handlers ===
  const clubsPage = Math.floor(clubsOffset / PAGE_SIZE) + 1;
  const clubsTotalPages = Math.ceil(clubsTotal / PAGE_SIZE);

  const usersPage = Math.floor(usersOffset / PAGE_SIZE) + 1;
  const usersTotalPages = Math.ceil(usersTotal / PAGE_SIZE);

  const matchesPage = Math.floor(matchesOffset / PAGE_SIZE) + 1;
  const matchesTotalPages = Math.ceil(matchesTotal / PAGE_SIZE);

  // === Guards ===
  if (!isAdmin) {
    return (
      <div className="admin-dashboard">
        <div className="admin-empty">
          <p>
            🔒 Acesso restrito. Apenas administradores da plataforma podem
            acessar este painel.
          </p>
          <button
            className="admin-btn-secondary"
            onClick={() => navigation.navigateToDashboard()}
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-left">
          <h2>
            Painel <span>Admin</span>
          </h2>
          <span className="admin-role-tag">🔑 Administrador</span>
        </div>
        <div className="admin-header-actions">
          <button
            className="admin-btn-secondary"
            onClick={handleSyncPasswords}
            disabled={syncingPasswords}
            title="Recalcula a senha de todos os atletas para DDMMAAAA (data de nascimento)"
          >
            {syncingPasswords ? "Sincronizando..." : "🔑 Sync Senhas Atletas"}
          </button>
          <button
            className="admin-btn-secondary"
            onClick={() => navigation.navigateToDashboard()}
          >
            ← Dashboard
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="admin-tabs">
        {(
          [
            { key: "overview", label: "Visão Geral", icon: "📊" },
            { key: "clubs", label: "Clubes", icon: "🏢" },
            { key: "users", label: "Usuários", icon: "👥" },
            { key: "matches", label: "Partidas", icon: "🎾" },
          ] as Array<{
            key: TabType;
            label: string;
            icon: string;
            badge?: number;
          }>
        ).map((tab) => (
          <button
            key={tab.key}
            className={`admin-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
            {tab.badge != null && tab.badge > 0 && (
              <span className="admin-tab-badge">{tab.badge}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="admin-content">
        {error && (
          <div className="admin-error">
            <p>{error}</p>
            <button className="admin-btn-secondary" onClick={fetchStats}>
              Tentar novamente
            </button>
          </div>
        )}

        {loadingStats && !stats && (
          <div className="admin-loading">
            <div className="admin-loading-spinner" />
            Carregando dados da plataforma...
          </div>
        )}

        {/* === TAB: Visão Geral === */}
        {activeTab === "overview" && stats && (
          <div className="admin-overview">
            {/* KPI Cards */}
            <div className="admin-kpi-grid">
              <div className="kpi-card kpi-admin">
                <div className="kpi-icon">👥</div>
                <div className="kpi-value">{stats.totalUsers}</div>
                <div className="kpi-label">Usuários Total</div>
              </div>
              <div className="kpi-card kpi-admin">
                <div className="kpi-icon">🏢</div>
                <div className="kpi-value">{stats.totalClubs}</div>
                <div className="kpi-label">Clubes Total</div>
              </div>
              <div className="kpi-card kpi-highlight">
                <div className="kpi-icon">🔥</div>
                <div className="kpi-value">{stats.activeUsersLastWeek}</div>
                <div className="kpi-label">Ativos (7d)</div>
              </div>
              <div className="kpi-card kpi-growth">
                <div className="kpi-icon">👤➕</div>
                <div className="kpi-value">{stats.newUsersThisMonth}</div>
                <div className="kpi-label">Novos usuários (mês)</div>
              </div>
              <div className="kpi-card kpi-growth">
                <div className="kpi-icon">🏠➕</div>
                <div className="kpi-value">{stats.newClubsThisMonth}</div>
                <div className="kpi-label">Novos clubes (mês)</div>
              </div>
            </div>

            {/* Clubs by Plan */}
            <div className="admin-section">
              <h3>Clubes por Plano</h3>
              <div className="plan-breakdown">
                {(stats.clubsByPlan ?? []).map((p) => (
                  <div
                    key={p.plan}
                    className={`plan-card ${PLAN_COLORS[p.plan] || ""}`}
                  >
                    <div className="plan-count">{p.count}</div>
                    <div className="plan-label">
                      {PLAN_LABELS[p.plan] || p.plan}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Memberships by Role */}
            <div className="admin-section">
              <h3>Memberships por Papel</h3>
              <div className="role-breakdown">
                {(stats.membershipsByRole ?? []).map((r) => {
                  const totalMemberships = stats.membershipsByRole.reduce(
                    (sum, item) => sum + item.count,
                    0,
                  );
                  return (
                    <div key={r.role} className="role-row">
                      <span className="role-icon">
                        {ROLE_ICONS[r.role] || "👤"}
                      </span>
                      <span className="role-name">
                        {ROLE_LABELS[r.role] || r.role}
                      </span>
                      <span className="role-count">{r.count}</span>
                      <div className="role-bar">
                        <div
                          className="role-bar-fill"
                          style={{
                            width: `${totalMemberships > 0 ? (r.count / totalMemberships) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Clubs */}
            <div className="admin-section">
              <div className="section-header">
                <h3>Top 10 Clubes por Membros</h3>
                <button
                  className="admin-link-btn"
                  onClick={() => setActiveTab("clubs")}
                >
                  Ver todos →
                </button>
              </div>
              {stats.topClubsByMembers.length === 0 ? (
                <p className="admin-muted">Nenhum clube cadastrado.</p>
              ) : (
                <div className="admin-top-clubs">
                  {(stats.topClubsByMembers ?? []).map((club, idx) => (
                    <div key={club.id} className="top-club-row">
                      <span className="top-club-rank">#{idx + 1}</span>
                      <div className="top-club-info">
                        <span className="top-club-name">{club.name}</span>
                        <span className="top-club-slug">/{club.slug}</span>
                      </div>
                      <span
                        className={`plan-badge ${PLAN_COLORS[club.planType] || ""}`}
                      >
                        {PLAN_LABELS[club.planType] || club.planType}
                      </span>
                      <div className="top-club-stats">
                        <span title="Membros">
                          👥 {club.memberCount} membros
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Clubs */}
            <div className="admin-section">
              <div className="section-header">
                <h3>Clubes Recentes</h3>
              </div>
              {stats.recentClubs.length === 0 ? (
                <p className="admin-muted">Nenhum clube recente.</p>
              ) : (
                <div className="admin-recent-clubs">
                  {(stats.recentClubs ?? []).map((club) => (
                    <div key={club.id} className="recent-club-card">
                      <div className="recent-club-header">
                        <span className="recent-club-name">{club.name}</span>
                        <span
                          className={`plan-badge ${PLAN_COLORS[club.planType] || ""}`}
                        >
                          {PLAN_LABELS[club.planType] || club.planType}
                        </span>
                      </div>
                      <div className="recent-club-meta">
                        <span>/{club.slug}</span>
                        <span>👥 {club.memberCount}</span>
                        <span>
                          {new Date(club.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* === TAB: Clubes === */}
        {activeTab === "clubs" && (
          <div className="admin-clubs-tab">
            <div className="section-header">
              <h3>
                Todos os Clubes{" "}
                {clubsTotal > 0 && (
                  <span className="count-badge">{clubsTotal}</span>
                )}
              </h3>
              <button
                className="admin-btn-primary"
                onClick={() => setShowCreateClub(true)}
              >
                + Criar Clube
              </button>
            </div>

            {/* Search */}
            <div className="admin-search-bar">
              <input
                type="text"
                placeholder="Buscar por nome ou slug..."
                value={clubSearch}
                onChange={(e) => setClubSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleClubSearch()}
                className="admin-search-input"
              />
              <button className="admin-btn-primary" onClick={handleClubSearch}>
                Buscar
              </button>
            </div>

            {/* Table */}
            {loadingClubs ? (
              <div className="admin-loading">
                <div className="admin-loading-spinner" />
                Carregando clubes...
              </div>
            ) : clubs.length === 0 ? (
              <p className="admin-muted">Nenhum clube encontrado.</p>
            ) : (
              <>
                <div className="admin-table">
                  <div className="admin-table-header clubs-grid">
                    <span>Nome</span>
                    <span>Slug</span>
                    <span>Plano</span>
                    <span>Membros</span>
                    <span>Criado em</span>
                  </div>
                  {clubs.map((club) => (
                    <div
                      key={club.id}
                      className="admin-table-row clubs-grid admin-table-row--clickable"
                      onClick={() => handleShowMembers(club)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) =>
                        (e.key === "Enter" || e.key === " ") &&
                        handleShowMembers(club)
                      }
                      aria-label={`Ver membros de ${club.name}`}
                    >
                      <span className="cell-name">{club.name}</span>
                      <span className="cell-slug">/{club.slug}</span>
                      <span>
                        <span
                          className={`plan-badge ${PLAN_COLORS[club.planType] || ""}`}
                        >
                          {PLAN_LABELS[club.planType] || club.planType}
                        </span>
                      </span>
                      <span className="cell-number">{club.memberCount}</span>
                      <span className="cell-date">
                        {new Date(club.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {clubsTotalPages > 1 && (
                  <div className="admin-pagination">
                    <button
                      className="admin-btn-secondary"
                      disabled={clubsPage <= 1}
                      onClick={() =>
                        fetchClubs(clubsOffset - PAGE_SIZE, clubSearch)
                      }
                    >
                      ← Anterior
                    </button>
                    <span className="pagination-info">
                      Página {clubsPage} de {clubsTotalPages}
                    </span>
                    <button
                      className="admin-btn-secondary"
                      disabled={clubsPage >= clubsTotalPages}
                      onClick={() =>
                        fetchClubs(clubsOffset + PAGE_SIZE, clubSearch)
                      }
                    >
                      Próxima →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* === TAB: Usuários === */}
        {activeTab === "users" && (
          <div className="admin-users-tab">
            <div className="section-header">
              <h3>
                Todos os Usuários{" "}
                {usersTotal > 0 && (
                  <span className="count-badge">{usersTotal}</span>
                )}
              </h3>
            </div>

            {/* Search */}
            <div className="admin-search-bar">
              <input
                type="text"
                placeholder="Buscar por nome ou e-mail..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUserSearch()}
                className="admin-search-input"
              />
              <button className="admin-btn-primary" onClick={handleUserSearch}>
                Buscar
              </button>
            </div>

            {/* Table */}
            {loadingUsers ? (
              <div className="admin-loading">
                <div className="admin-loading-spinner" />
                Carregando usuários...
              </div>
            ) : users.length === 0 ? (
              <p className="admin-muted">Nenhum usuário encontrado.</p>
            ) : (
              <>
                <div className="admin-table">
                  <div className="admin-table-header users-grid">
                    <span>Nome</span>
                    <span>E-mail</span>
                    <span>Status</span>
                    <span>Clubes</span>
                    <span>Criado em</span>
                  </div>
                  {users.map((user) => (
                    <div key={user.id} className="admin-table-row users-grid">
                      <span className="cell-name">
                        <span className="user-avatar">
                          {user.name?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                        {user.name}
                      </span>
                      <span className="cell-email">{user.email}</span>
                      <span className="cell-status">
                        <span
                          className={`status-dot ${user.isActive ? "active" : "inactive"}`}
                        />
                        {user.isActive ? "Ativo" : "Inativo"}
                      </span>
                      <span className="cell-number">{user.clubCount}</span>
                      <span className="cell-date">
                        {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {usersTotalPages > 1 && (
                  <div className="admin-pagination">
                    <button
                      className="admin-btn-secondary"
                      disabled={usersPage <= 1}
                      onClick={() =>
                        fetchUsers(usersOffset - PAGE_SIZE, userSearch)
                      }
                    >
                      ← Anterior
                    </button>
                    <span className="pagination-info">
                      Página {usersPage} de {usersTotalPages}
                    </span>
                    <button
                      className="admin-btn-secondary"
                      disabled={usersPage >= usersTotalPages}
                      onClick={() =>
                        fetchUsers(usersOffset + PAGE_SIZE, userSearch)
                      }
                    >
                      Próxima →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* === TAB: Partidas === */}
        {activeTab === "matches" && (
          <div className="admin-matches-tab">
            <div className="section-header">
              <h3>
                Todas as Partidas{" "}
                {matchesTotal > 0 && (
                  <span className="count-badge">{matchesTotal}</span>
                )}
              </h3>
            </div>

            {/* Filtro de Status */}
            <div className="admin-search-bar">
              <select
                className="admin-search-input"
                value={matchStatusFilter}
                onChange={(e) => setMatchStatusFilter(e.target.value)}
                aria-label="Filtrar por status"
              >
                <option value="">Todos os status</option>
                <option value="NOT_STARTED">Não iniciadas</option>
                <option value="IN_PROGRESS">Em andamento</option>
                <option value="FINISHED">Finalizadas</option>
              </select>
              <button
                className="admin-btn-primary"
                onClick={() => {
                  setMatchesOffset(0);
                  setAllMatches([]);
                  fetchAllMatches(0, matchStatusFilter);
                }}
              >
                Filtrar
              </button>
            </div>

            {/* Tabela */}
            {loadingMatches ? (
              <div className="admin-loading">
                <div className="admin-loading-spinner" />
                Carregando partidas...
              </div>
            ) : allMatches.length === 0 ? (
              <p className="admin-muted">Nenhuma partida encontrada.</p>
            ) : (
              <>
                <div className="admin-table">
                  <div className="admin-table-header matches-grid">
                    <span>Jogadores</span>
                    <span>Status</span>
                    <span>Placar</span>
                    <span>Clube</span>
                    <span>Criador</span>
                    <span>Data</span>
                  </div>
                  {allMatches.map((match) => (
                    <div
                      key={match.id}
                      className="admin-table-row matches-grid"
                    >
                      <span className="cell-name match-players">
                        <span>{match.playerP1}</span>
                        <span className="match-vs">vs</span>
                        <span>{match.playerP2}</span>
                      </span>
                      <span>
                        <span
                          className={`match-status-badge ${MATCH_STATUS_COLORS[match.status] || ""}`}
                        >
                          {MATCH_STATUS_LABELS[match.status] || match.status}
                        </span>
                      </span>
                      <span className="cell-score">
                        {match.score || <span className="cell-muted">—</span>}
                      </span>
                      <span className="cell-muted">
                        {match.clubName || "—"}
                      </span>
                      <span className="cell-muted">
                        {match.createdByName || "—"}
                      </span>
                      <span className="cell-date">
                        {new Date(match.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Paginação */}
                {matchesTotalPages > 1 && (
                  <div className="admin-pagination">
                    <button
                      className="admin-btn-secondary"
                      disabled={matchesPage <= 1}
                      onClick={() =>
                        fetchAllMatches(
                          matchesOffset - PAGE_SIZE,
                          matchStatusFilter,
                        )
                      }
                    >
                      ← Anterior
                    </button>
                    <span className="pagination-info">
                      Página {matchesPage} de {matchesTotalPages}
                    </span>
                    <button
                      className="admin-btn-secondary"
                      disabled={matchesPage >= matchesTotalPages}
                      onClick={() =>
                        fetchAllMatches(
                          matchesOffset + PAGE_SIZE,
                          matchStatusFilter,
                        )
                      }
                    >
                      Próxima →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* === Modal: Membros do Clube === */}
      {selectedClub && (
        <ClubMembersModal
          clubName={selectedClub.name}
          members={clubMembers}
          loading={loadingMembers}
          onClose={handleCloseMembers}
        />
      )}

      {/* === Modal: Criar Clube === */}
      {showCreateClub && (
        <div
          className="admin-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateClub(false);
          }}
        >
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h3>Criar Novo Clube</h3>
              <button
                className="admin-modal-close"
                onClick={() => setShowCreateClub(false)}
              >
                ✕
              </button>
            </div>
            <div className="admin-modal-body">
              <fieldset className="admin-modal-fieldset">
                <legend>Dados do Clube</legend>
                <label>
                  Nome do Clube *
                  <input
                    type="text"
                    value={createClubForm.name}
                    onChange={(e) =>
                      handleCreateClubFieldChange("name", e.target.value)
                    }
                    placeholder="Ex: Clube Harmonia"
                    className="admin-modal-input"
                  />
                </label>
                <label>
                  Slug (URL)
                  <input
                    type="text"
                    value={createClubForm.slug}
                    onChange={(e) =>
                      handleCreateClubFieldChange("slug", e.target.value)
                    }
                    placeholder="clube-harmonia"
                    className="admin-modal-input"
                  />
                </label>
                <label>
                  Plano
                  <select
                    value={createClubForm.planType}
                    onChange={(e) =>
                      handleCreateClubFieldChange("planType", e.target.value)
                    }
                    className="admin-modal-input"
                  >
                    <option value="FREE">Gratuito</option>
                    <option value="PREMIUM">Premium</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                </label>
              </fieldset>

              <fieldset className="admin-modal-fieldset">
                <legend>Dados do Gestor</legend>
                <label>
                  Nome Completo *
                  <input
                    type="text"
                    value={createClubForm.gestorName}
                    onChange={(e) =>
                      handleCreateClubFieldChange("gestorName", e.target.value)
                    }
                    placeholder="Nome do gestor"
                    className="admin-modal-input"
                  />
                </label>
                <label>
                  E-mail *
                  <input
                    type="email"
                    value={createClubForm.gestorEmail}
                    onChange={(e) =>
                      handleCreateClubFieldChange("gestorEmail", e.target.value)
                    }
                    placeholder="gestor@clube.com"
                    className="admin-modal-input"
                  />
                </label>
                <label>
                  Senha *
                  <input
                    type="password"
                    value={createClubForm.gestorPassword}
                    onChange={(e) =>
                      handleCreateClubFieldChange(
                        "gestorPassword",
                        e.target.value,
                      )
                    }
                    placeholder="Mínimo 6 caracteres"
                    className="admin-modal-input"
                  />
                </label>
                <label className="admin-modal-checkbox-label">
                  <input
                    type="checkbox"
                    checked={createClubForm.alsoCoach}
                    onChange={(e) =>
                      handleCreateClubFieldChange("alsoCoach", e.target.checked)
                    }
                  />
                  <span>Também exerce função de Técnico</span>
                </label>
              </fieldset>
            </div>
            <div className="admin-modal-footer">
              <button
                className="admin-btn-secondary"
                onClick={() => setShowCreateClub(false)}
                disabled={creatingClub}
              >
                Cancelar
              </button>
              <button
                className="admin-btn-primary"
                onClick={handleCreateClub}
                disabled={creatingClub}
              >
                {creatingClub ? "Criando..." : "Criar Clube"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
