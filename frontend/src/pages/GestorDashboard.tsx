// frontend/src/pages/GestorDashboard.tsx
// Dashboard administrativo para GESTOR do clube
// Visão geral: estatísticas, membros, partidas e torneios do clube

import React, { useState, useEffect, useCallback } from 'react';
import { httpClient } from '../config/httpClient';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useToast } from '../components/Toast';
import type { AthleteResult } from '../components/AthleteSearchInput';
import { useSubscription } from '../hooks/useSubscription';
import AddAthleteModal from '../components/AddAthleteModal';
import EditMemberModal, { type EditableMember } from '../components/EditMemberModal';
import { ClubRankings } from '../components/ClubRankings';
import type { ClubStats, FullMember, InvoiceRow, GestorTabType } from '../types/gestor';
import { ROLE_LABELS, TOURNAMENT_STATUS_LABELS } from '../types/gestor';
import GestorOverviewTab from '../components/gestor/GestorOverviewTab';
import GestorMembersTab from '../components/gestor/GestorMembersTab';
import GestorMatchesTab from '../components/gestor/GestorMatchesTab';
import GestorBillingTab from '../components/gestor/GestorBillingTab';
import './GestorDashboard.css';

const GestorDashboard: React.FC = () => {
  const { activeClub } = useAuth();
  const navigation = useNavigation();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<GestorTabType>('overview');
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
  const [inviteAthlete, setInviteAthlete] = useState<AthleteResult | null>(null);
  const [inviteRole, setInviteRole] = useState('ATHLETE');
  const [inviting, setInviting] = useState(false);

  // Pending invites state
  const [pendingCount, setPendingCount] = useState(0);

  // Edit member state
  const [editingMember, setEditingMember] = useState<EditableMember | null>(null);

  const clubId = activeClub?.clubId;
  const isGestor = activeClub?.role === 'GESTOR';

  // === Fetch Stats ===
  const fetchStats = useCallback(async () => {
    if (!clubId) return;
    setLoadingStats(true);
    setError(null);
    try {
      const response = await httpClient.get<ClubStats>(`/clubs/${clubId}/stats`);
      setStats(response.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar estatísticas';
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
      const response = await httpClient.get<{ members: FullMember[] }>(`/clubs/${clubId}/members`);
      const allMembers = response.data.members || [];
      setMembers(allMembers);
      setPendingCount(allMembers.filter((m) => m.status === 'PENDING').length);
    } catch {
      toast.error('Erro ao carregar membros.');
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
      toast.error('Erro ao carregar faturas.');
    } finally {
      setLoadingInvoices(false);
    }
  }, [clubId, toast]);

  // Load data on mount and when club changes
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'members' && members.length === 0) {
      fetchMembers();
    }
  }, [activeTab, members.length, fetchMembers]);

  useEffect(() => {
    if (activeTab === 'matches') {
      fetchStats();
    }
  }, [activeTab, fetchStats]);

  useEffect(() => {
    if (activeTab === 'billing' && invoices.length === 0) {
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
      toast.success(`${inviteAthlete.name} convidado como ${ROLE_LABELS[inviteRole]}.`);
      setInviteAthlete(null);
      setInviteRole('ATHLETE');
      setShowInviteForm(false);
      // Refresh data
      fetchMembers();
      fetchStats();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao convidar membro';
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
          <p>Acesso restrito. Apenas gestores do clube podem acessar este painel.</p>
          <button className="gestor-btn-secondary" onClick={() => navigation.navigateToDashboard()}>
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
            {activeClub && <span className="gestor-club-tag">{activeClub.clubName}</span>}
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
              { key: 'overview', label: 'Visão Geral', icon: '📊' },
              { key: 'members', label: 'Membros', icon: '👥' },
              { key: 'matches', label: 'Partidas', icon: '🎾' },
              { key: 'tournaments', label: 'Torneios', icon: '🏆' },
              { key: 'rankings', label: 'Ranking', icon: '📈' },
              { key: 'billing', label: 'Assinatura', icon: '💳' },
              { key: 'settings', label: 'Config', icon: '⚙️' },
            ] as Array<{ key: GestorTabType; label: string; icon: string }>
          ).map((tab) => (
            <button
              key={tab.key}
              className={`gestor-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="tab-icon" aria-hidden="true">
                {tab.icon}
              </span>
              <span className="tab-label">{tab.label}</span>
              {tab.key === 'members' && pendingCount > 0 && (
                <span className="tab-pending-badge" aria-label={`${pendingCount} pendentes`}>
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

          {activeTab === 'overview' && stats && (
            <GestorOverviewTab
              stats={stats}
              onSwitchToMatches={() => setActiveTab('matches')}
              onSwitchToMembers={() => setActiveTab('members')}
              onNavigateToMatch={(id) => navigation.navigateToMatch(id)}
            />
          )}

          {activeTab === 'members' && (
            <GestorMembersTab
              members={members}
              loadingMembers={loadingMembers}
              clubId={clubId!}
              showInviteForm={showInviteForm}
              showBulkImport={showBulkImport}
              inviteAthlete={inviteAthlete}
              inviteRole={inviteRole}
              inviting={inviting}
              onToggleInviteForm={() => {
                setShowInviteForm(!showInviteForm);
                if (showBulkImport) setShowBulkImport(false);
              }}
              onToggleBulkImport={() => {
                setShowBulkImport(!showBulkImport);
                if (showInviteForm) setShowInviteForm(false);
              }}
              onShowAddAthlete={() => setShowAddAthlete(true)}
              onShowAddCoach={() => setShowAddCoach(true)}
              onInviteAthleteChange={setInviteAthlete}
              onInviteRoleChange={setInviteRole}
              onInviteMember={handleInviteMember}
              onBulkImportComplete={() => {
                setShowBulkImport(false);
                fetchMembers();
                fetchStats();
              }}
              onBulkImportCancel={() => setShowBulkImport(false)}
              onEditMember={setEditingMember}
            />
          )}

          {activeTab === 'matches' && stats && (
            <GestorMatchesTab
              stats={stats}
              onNavigateToMatch={(id) => navigation.navigateToMatch(id)}
              onNavigateToNewMatch={() => navigation.navigateToNewMatch()}
              onRefresh={fetchStats}
            />
          )}

          {/* === TAB: Torneios === */}
          {activeTab === 'tournaments' && stats && (
            <div className="gestor-tournaments-tab">
              <div className="section-header">
                <h3>Torneios do Clube</h3>
                <button
                  className="gestor-btn-primary"
                  onClick={() => navigation.replace('/tournaments')}
                >
                  Gerenciar Torneios →
                </button>
              </div>

              {/* Tournament Status Summary */}
              {stats.tournamentsByStatus.length === 0 ? (
                <p className="gestor-muted">
                  Nenhum torneio criado. Acesse a página de torneios para criar um.
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
          {activeTab === 'rankings' && clubId && <ClubRankings clubId={clubId} />}

          {/* === TAB: Assinatura / Billing === */}
          {activeTab === 'billing' && (
            <GestorBillingTab
              subscription={subscription}
              invoices={invoices}
              loadingInvoices={loadingInvoices}
              onRefreshInvoices={fetchInvoices}
            />
          )}

          {/* === TAB: Config === */}
          {activeTab === 'settings' && (
            <div className="gestor-settings-tab">
              <div className="section-header">
                <h3>Configurações do Clube</h3>
              </div>

              <div className="gestor-section">
                <h4>Código de Convite</h4>
                <p className="gestor-muted">
                  Compartilhe este código para que atletas se juntem ao seu clube.
                </p>
                {activeClub && (
                  <div className="invite-code-display">
                    <code className="invite-code-value">
                      {/* NOTE: inviteCode não consta no tipo ClubMembership (típo do AuthContext)
                          pois é retornado pelo endpoint /clubs/:id/settings mas não pela sessão.
                          TODO: adicionar inviteCode?: string a ClubMembership e buscar do endpoint. */}
                      {(activeClub as unknown as Record<string, string>).inviteCode || 'Gerando...'}
                    </code>
                    <button
                      className="gestor-btn-secondary"
                      onClick={() => {
                        const code = (activeClub as unknown as Record<string, string>).inviteCode; // see NOTE above
                        if (code) {
                          navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
                          toast.success('Link copiado!');
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
