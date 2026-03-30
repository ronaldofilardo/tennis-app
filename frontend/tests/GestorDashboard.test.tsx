// tests/GestorDashboard.test.tsx
// Testes de acesso e conteúdo do GestorDashboard

import '../vitest.setup';

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { HttpError } from '../src/config/httpClient';

// ── Mocks de CSS ────────────────────────────────────────────
vi.mock('../src/pages/GestorDashboard.css', () => ({}));

// ── Mock do httpClient ───────────────────────────────────────
const mockHttpGet = vi.fn();
const mockHttpPost = vi.fn();
vi.mock('../src/config/httpClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/config/httpClient')>();
  return {
    ...actual,
    default: {
      get: (...args: unknown[]) => mockHttpGet(...args),
      post: (...args: unknown[]) => mockHttpPost(...args),
    },
    httpClient: {
      get: (...args: unknown[]) => mockHttpGet(...args),
      post: (...args: unknown[]) => mockHttpPost(...args),
    },
  };
});

// ── Mock do AthleteSearchInput ───────────────────────────────
vi.mock('../src/components/AthleteSearchInput', () => ({
  default: () => <div data-testid="athlete-search" />,
}));

// ── Mock do AddAthleteModal ───────────────────────────────────
vi.mock('../src/components/AddAthleteModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="add-athlete-modal">AddAthleteModal</div> : null,
}));

// ── Mock do ClubRankings ─────────────────────────────────────
vi.mock('../src/components/ClubRankings', () => ({
  ClubRankings: () => null,
}));

// ── Mock do BulkAthleteImport (usa xlsx) ─────────────────────
vi.mock('../src/components/BulkAthleteImport', () => ({
  default: () => null,
}));

// ── Mock do EditMemberModal ───────────────────────────────────
const mockEditMemberOnClose = vi.fn();
const mockEditMemberOnSuccess = vi.fn();
vi.mock('../src/components/EditMemberModal', () => ({
  default: ({
    isOpen,
    member,
    onClose,
    onSuccess,
  }: {
    isOpen: boolean;
    member: { user: { name: string } } | null;
    onClose: () => void;
    onSuccess: () => void;
  }) => {
    if (!isOpen || !member) return null;
    mockEditMemberOnClose.mockImplementation(onClose);
    mockEditMemberOnSuccess.mockImplementation(onSuccess);
    return <div data-testid="edit-member-modal">EditMemberModal:{member.user.name}</div>;
  },
}));

// ── Estado mutável para AuthContext ─────────────────────────
const mockActiveClub = {
  clubId: 'club-123',
  clubName: 'Clube Teste',
  clubSlug: 'clube-teste',
  role: 'GESTOR',
};

vi.mock('../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: {
      activeRole: mockActiveClub.role,
      name: 'Gestor',
      email: 'gestor@test.com',
    },
    activeClub: mockActiveClub,
  }),
}));

// ── Mock do NavigationContext ────────────────────────────────
const mockNavigation = {
  navigateToDashboard: vi.fn(),
  navigateToMatch: vi.fn(),
};
vi.mock('../src/contexts/NavigationContext', () => ({
  useNavigation: () => mockNavigation,
}));

// ── Mock do Toast ────────────────────────────────────────────
// Referência ESTÁVEL: se o objeto mudar a cada render, fetchMembers/fetchInvoices
// (que dependem de `toast` no useCallback) se recriam a cada render → loop infinito
const mockToastFns = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };
vi.mock('../src/components/Toast', () => ({
  useToast: () => mockToastFns,
}));

// ── Stats mockadas sem membersByRole ─────────────────────────
const mockClubStats = {
  totalMembers: 10,
  totalMatches: 5,
  matchesByStatus: [{ status: 'FINISHED', count: 5 }],
  totalTournaments: 1,
  tournamentsByStatus: [{ status: 'IN_PROGRESS', count: 1 }],
  recentMatches: [],
  recentMembers: [
    {
      id: 'm1',
      userId: 'u1',
      clubId: 'club-123',
      role: 'ATHLETE',
      status: 'ACTIVE',
      joinedAt: '2026-02-01',
      user: {
        id: 'u1',
        email: 'atleta@test.com',
        name: 'Atleta Souza',
        athleteProfile: {
          id: 'ap1',
          globalId: 'abc12345',
          cpf: '12345678901',
          birthDate: '1990-01-01',
        },
      },
    },
  ],
};

import GestorDashboard from '../src/pages/GestorDashboard';

describe('GestorDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveClub.role = 'GESTOR';
    mockHttpGet.mockResolvedValue({ data: mockClubStats });
  });

  describe('Controle de acesso', () => {
    it('bloqueia acesso para usuário ADMIN', async () => {
      mockActiveClub.role = 'ADMIN';
      render(<GestorDashboard />);
      expect(await screen.findByText(/gestores do clube/i)).toBeInTheDocument();
      expect(screen.queryByText(/Painel do/i)).not.toBeInTheDocument();
    });

    it('bloqueia acesso para usuário ATHLETE', async () => {
      mockActiveClub.role = 'ATHLETE';
      render(<GestorDashboard />);
      expect(await screen.findByText(/gestores do clube/i)).toBeInTheDocument();
    });

    it('bloqueia acesso para usuário COACH', async () => {
      mockActiveClub.role = 'COACH';
      render(<GestorDashboard />);
      expect(await screen.findByText(/gestores do clube/i)).toBeInTheDocument();
    });

    it('renderiza dashboard para usuário GESTOR', async () => {
      render(<GestorDashboard />);
      await waitFor(() => {
        expect(screen.queryByText(/gestores do clube/i)).not.toBeInTheDocument();
      });
      expect(screen.getByText('Gestor')).toBeInTheDocument();
    });
  });

  describe('Section "Overview Tabs"', () => {
    it('exibe as abas principais com ícones', async () => {
      render(<GestorDashboard />);
      expect(await screen.findByText('Visão Geral')).toBeInTheDocument();
      // Usar getAllByText pois "Membros" aparece na Aba e no KPI
      expect(screen.getAllByText('Membros').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Partidas').length).toBeGreaterThan(0);
    });
  });

  describe('Seção "Membros por Papel" REMOVIDA', () => {
    it('NÃO exibe seção "Membros por Papel"', async () => {
      render(<GestorDashboard />);
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      expect(screen.queryByText(/Membros por Papel/i)).not.toBeInTheDocument();
    });

    it('NÃO exibe barras de progresso por papel', async () => {
      render(<GestorDashboard />);
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      // Os papéis ATHLETE/COACH/GESTOR não devem aparecer como breakdown
      expect(screen.queryByText(/role-bar/i)).not.toBeInTheDocument();
    });
  });

  describe('Seção "Membros Recentes" MANTIDA', () => {
    it('exibe seção "Membros Recentes"', async () => {
      render(<GestorDashboard />);
      expect(await screen.findByText(/Membros Recentes/i)).toBeInTheDocument();
    });

    it('exibe membro recente pelo nome', async () => {
      render(<GestorDashboard />);
      expect(await screen.findByText('Atleta Souza')).toBeInTheDocument();
    });

    it('exibe CPF formatado do membro recente', async () => {
      render(<GestorDashboard />);
      expect(await screen.findByText('123.456.789-01')).toBeInTheDocument();
    });

    it('exibe botão "Ver todos" para membros recentes', async () => {
      render(<GestorDashboard />);
      expect(await screen.findByText(/Ver todos/i)).toBeInTheDocument();
    });
  });

  describe('KPIs do clube', () => {
    it('exibe total de membros', async () => {
      render(<GestorDashboard />);
      const membrosLabels = await screen.findAllByText(/MEMBROS/i);
      expect(membrosLabels.length).toBeGreaterThan(0);
    });

    it('exibe total de partidas', async () => {
      render(<GestorDashboard />);
      await screen.findAllByText(/MEMBROS/i);
      const partidasLabels = screen.getAllByText(/PARTIDAS/i);
      expect(partidasLabels.length).toBeGreaterThan(0);
    });

    it('exibe total de torneios', async () => {
      render(<GestorDashboard />);
      await screen.findAllByText(/MEMBROS/i);
      const torneiosLabels = screen.getAllByText(/TORNEIOS/i);
      expect(torneiosLabels.length).toBeGreaterThan(0);
    });
  });

  describe('Dados do endpoint de stats', () => {
    it('chama o endpoint correto do clube', async () => {
      render(<GestorDashboard />);
      await waitFor(() => {
        expect(mockHttpGet).toHaveBeenCalledWith('/clubs/club-123/stats');
      });
    });

    it('NÃO chama endpoint de admin/stats', async () => {
      render(<GestorDashboard />);
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      const calls = mockHttpGet.mock.calls.map((c) => c[0] as string);
      expect(calls.every((url) => !url.includes('/admin/'))).toBe(true);
    });
  });

  // ── Aba Membros — botões Cadastrar Atleta e Adicionar Técnico ───────────

  describe('Botões Cadastrar Atleta e Adicionar Técnico', () => {
    const navigateToMembers = async () => {
      render(<GestorDashboard />);
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      // Usar querySelector para pegar o botão da aba específico dentro do nav, evitando ambiguidade com o KPI
      const tabs = document.querySelectorAll('.gestor-tab');
      const membersTab = Array.from(tabs).find((t) => t.textContent?.includes('Membros'));
      if (membersTab) fireEvent.click(membersTab);
    };

    it('exibe botões Cadastrar Atleta e Adicionar Técnico na aba Membros', async () => {
      await navigateToMembers();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Cadastrar Atleta/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Adicionar Técnico/i })).toBeInTheDocument();
      });
    });

    it('abre AddAthleteModal ao clicar no botão Cadastrar Atleta', async () => {
      mockHttpGet.mockImplementation((url: string) => {
        if (url.includes('/members')) return Promise.resolve({ data: { members: [] } });
        return Promise.resolve({ data: mockClubStats });
      });

      await navigateToMembers();
      const btn = await screen.findByRole('button', {
        name: /Cadastrar Atleta/i,
      });
      fireEvent.click(btn);

      expect(screen.getByTestId('add-athlete-modal')).toBeInTheDocument();
    });
  });

  // ── Aba Membros — exibição de globalId ────────────────────

  describe('Exibição de globalId na lista de membros', () => {
    it('exibe globalId formatado [XXXXXXXX] para membro com athleteProfile', async () => {
      mockHttpGet.mockImplementation((url: string) => {
        if (url.includes('/members')) {
          return Promise.resolve({
            data: {
              members: [
                {
                  id: 'm-1',
                  userId: 'u-1',
                  clubId: 'club-123',
                  role: 'ATHLETE',
                  status: 'ACTIVE',
                  joinedAt: '2026-03-01T00:00:00.000Z',
                  user: {
                    id: 'u-1',
                    email: 'atleta@teste.com',
                    name: 'Carlos Atleta',
                    avatarUrl: null,
                    athleteProfile: {
                      id: 'ap-1',
                      globalId: 'abcdef1234567890',
                    },
                  },
                },
              ],
            },
          });
        }
        return Promise.resolve({ data: mockClubStats });
      });

      render(<GestorDashboard />);
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      fireEvent.click(screen.getByRole('button', { name: /Membros/i }));

      expect(await screen.findByText('[ABCDEF12]')).toBeInTheDocument();
    });

    it("exibe '—' para membro sem athleteProfile", async () => {
      mockHttpGet.mockImplementation((url: string) => {
        if (url.includes('/members')) {
          return Promise.resolve({
            data: {
              members: [
                {
                  id: 'm-2',
                  userId: 'u-2',
                  clubId: 'club-123',
                  role: 'COACH',
                  status: 'ACTIVE',
                  joinedAt: '2026-03-01T00:00:00.000Z',
                  user: {
                    id: 'u-2',
                    email: 'tecnico@teste.com',
                    name: 'Pedro Técnico',
                    avatarUrl: null,
                    athleteProfile: null,
                  },
                },
              ],
            },
          });
        }
        return Promise.resolve({ data: mockClubStats });
      });

      render(<GestorDashboard />);
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      fireEvent.click(screen.getByRole('button', { name: /Membros/i }));

      await screen.findByText('Pedro Técnico');
      expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    });

    it("exibe '—' para atleta convidado (isGuest=true, email=null)", async () => {
      mockHttpGet.mockImplementation((url: string) => {
        if (url.includes('/members')) {
          return Promise.resolve({
            data: {
              members: [
                {
                  id: 'guest-ap-99',
                  userId: null,
                  clubId: 'club-123',
                  role: 'ATHLETE',
                  status: 'ACTIVE',
                  joinedAt: '2026-03-07T00:00:00.000Z',
                  isGuest: true,
                  user: {
                    id: null,
                    email: null,
                    name: 'Atleta Convidado',
                    avatarUrl: null,
                    athleteProfile: {
                      id: 'ap-99',
                      globalId: 'xyz9876543210000',
                    },
                  },
                },
              ],
            },
          });
        }
        return Promise.resolve({ data: mockClubStats });
      });

      render(<GestorDashboard />);
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());

      const tabs = document.querySelectorAll('.gestor-tab');
      const membersTab = Array.from(tabs).find((t) => t.textContent?.includes('Membros'));
      if (membersTab) fireEvent.click(membersTab);

      await screen.findByText('Atleta Convidado');
      // O frontend usa — para e-mails nulos agora
      expect(screen.getAllByText('—').length).toBeGreaterThan(0);
      expect(screen.getByText('[XYZ98765]')).toBeInTheDocument();
    });
  });

  // ── Aba Partidas — refetch automático e botão Atualizar ────

  describe('Aba Partidas', () => {
    it('exibe botão Atualizar na aba Partidas', async () => {
      render(<GestorDashboard />);
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      fireEvent.click(screen.getByRole('button', { name: 'Partidas' }));
      expect(await screen.findByRole('button', { name: /Atualizar/i })).toBeInTheDocument();
    });

    it('recarrega stats ao navegar para aba Partidas', async () => {
      render(<GestorDashboard />);
      // Aguarda fetch inicial ao montar
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      const callsBefore = mockHttpGet.mock.calls.length;

      fireEvent.click(screen.getByRole('button', { name: 'Partidas' }));

      // Deve disparar novo fetch de stats ao entrar na aba
      await waitFor(() => {
        expect(mockHttpGet.mock.calls.length).toBeGreaterThan(callsBefore);
      });
      const statsCalls = mockHttpGet.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('/stats'),
      );
      expect(statsCalls.length).toBeGreaterThanOrEqual(2);
    });

    it('botão Atualizar chama endpoint de stats novamente', async () => {
      render(<GestorDashboard />);
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      fireEvent.click(screen.getByRole('button', { name: 'Partidas' }));

      const btnAtualizar = await screen.findByRole('button', {
        name: /Atualizar/i,
      });
      const callsBefore = mockHttpGet.mock.calls.length;
      fireEvent.click(btnAtualizar);

      await waitFor(() => {
        expect(mockHttpGet.mock.calls.length).toBeGreaterThan(callsBefore);
      });
      const lastCall = mockHttpGet.mock.calls.at(-1) as [string];
      expect(lastCall[0]).toContain('/stats');
    });

    it('exibe partidas quando recentMatches não está vazio', async () => {
      const statsComPartidas = {
        ...mockClubStats,
        recentMatches: [
          {
            id: 'm-abc',
            playerP1: 'Jogador Um',
            playerP2: 'Jogador Dois',
            status: 'FINISHED',
            score: '6-4 6-3',
            format: 'BEST_OF_3',
            createdAt: '2026-03-01T00:00:00.000Z',
            visibility: 'CLUB',
          },
        ],
      };
      mockHttpGet.mockResolvedValue({ data: statsComPartidas });

      render(<GestorDashboard />);
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      fireEvent.click(screen.getByRole('button', { name: 'Partidas' }));

      expect(await screen.findByText('Jogador Um')).toBeInTheDocument();
      expect(screen.getByText('Jogador Dois')).toBeInTheDocument();
    });

    it('exibe mensagem de vazio quando não há partidas', async () => {
      // mockClubStats já tem recentMatches: []
      render(<GestorDashboard />);
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      fireEvent.click(screen.getByRole('button', { name: 'Partidas' }));

      expect(await screen.findByText(/Nenhuma partida registrada/i)).toBeInTheDocument();
    });

    it('exibe botão Nova Partida na aba Partidas', async () => {
      render(<GestorDashboard />);
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      fireEvent.click(screen.getByRole('button', { name: 'Partidas' }));

      expect(await screen.findByRole('button', { name: /Nova Partida/i })).toBeInTheDocument();
    });
  });

  // ── Aba Membros — botão de edição (✏️) ────────────────────────────────────

  describe('Botão Editar membro (ContextSession: edição restrita ao GESTOR)', () => {
    function setupMembersWithRoles(
      members: {
        id: string;
        userId: string | null;
        role: string;
        name: string;
      }[],
    ) {
      mockHttpGet.mockImplementation((url: string) => {
        if (url.includes('/members')) {
          return Promise.resolve({
            data: {
              members: members.map((m, i) => ({
                id: m.id,
                userId: m.userId,
                clubId: 'club-123',
                role: m.role,
                status: 'ACTIVE',
                joinedAt: '2026-03-01T00:00:00.000Z',
                user: {
                  id: m.userId,
                  email: m.userId ? `${m.userId}@test.com` : null,
                  name: m.name,
                  avatarUrl: null,
                  athleteProfile:
                    m.role === 'ATHLETE' ? { id: `ap-${i}`, globalId: `globalid${i}` } : null,
                },
              })),
            },
          });
        }
        return Promise.resolve({ data: mockClubStats });
      });
    }

    it('exibe botão ✏️ para membro ATHLETE na aba Membros', async () => {
      setupMembersWithRoles([
        { id: 'ms-1', userId: 'u-1', role: 'ATHLETE', name: 'Carlos Atleta' },
      ]);

      render(<GestorDashboard />);
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      fireEvent.click(screen.getByRole('button', { name: /Membros/i }));

      await screen.findByText('Carlos Atleta');
      const editButtons = screen.getAllByTitle('Editar');
      expect(editButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('exibe botão ✏️ para membro COACH na aba Membros', async () => {
      setupMembersWithRoles([{ id: 'ms-2', userId: 'u-2', role: 'COACH', name: 'Pedro Técnico' }]);

      render(<GestorDashboard />);
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      fireEvent.click(screen.getByRole('button', { name: /Membros/i }));

      await screen.findByText('Pedro Técnico');
      const editButtons = screen.getAllByTitle('Editar');
      expect(editButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('NÃO exibe botão ✏️ para membro SPECTATOR', async () => {
      setupMembersWithRoles([
        {
          id: 'ms-3',
          userId: 'u-3',
          role: 'SPECTATOR',
          name: 'Joana Espectadora',
        },
      ]);

      render(<GestorDashboard />);
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      fireEvent.click(screen.getByRole('button', { name: /Membros/i }));

      await screen.findByText('Joana Espectadora');
      expect(screen.queryByTitle('Editar')).not.toBeInTheDocument();
    });

    it('clicar em ✏️ abre EditMemberModal com dados do membro', async () => {
      setupMembersWithRoles([
        { id: 'ms-1', userId: 'u-1', role: 'ATHLETE', name: 'Carlos Atleta' },
      ]);

      render(<GestorDashboard />);
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      fireEvent.click(screen.getByRole('button', { name: /Membros/i }));

      await screen.findByText('Carlos Atleta');
      fireEvent.click(screen.getByTitle('Editar'));

      expect(await screen.findByTestId('edit-member-modal')).toBeInTheDocument();
      expect(screen.getByText(/EditMemberModal:Carlos Atleta/i)).toBeInTheDocument();
    });

    it('EditMemberModal não está visível antes de clicar em ✏️', async () => {
      setupMembersWithRoles([
        { id: 'ms-1', userId: 'u-1', role: 'ATHLETE', name: 'Carlos Atleta' },
      ]);

      render(<GestorDashboard />);
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      fireEvent.click(screen.getByRole('button', { name: /Membros/i }));
      await screen.findByText('Carlos Atleta');

      expect(screen.queryByTestId('edit-member-modal')).not.toBeInTheDocument();
    });
  });

  // ── Tratamento de Erros HTTP (401 / 403 / 500) ──────────────

  describe('Tratamento de Erros HTTP', () => {
    it('deve exibir mensagem de erro ao receber 401 (não autenticado)', async () => {
      mockHttpGet.mockRejectedValue(new HttpError('Token inválido ou expirado', 'AUTH_ERROR', 401));

      render(<GestorDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Token inválido ou expirado')).toBeInTheDocument();
      });
    });

    it('deve exibir mensagem de erro ao receber 403 (sem permissão)', async () => {
      mockHttpGet.mockRejectedValue(
        new HttpError('Acesso não autorizado', 'PERMISSION_ERROR', 403),
      );

      render(<GestorDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Acesso não autorizado')).toBeInTheDocument();
      });
    });

    it('deve exibir mensagem de erro ao receber 500 (erro do servidor)', async () => {
      mockHttpGet.mockRejectedValue(new HttpError('Erro interno do servidor', 'SERVER_ERROR', 500));

      render(<GestorDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Erro interno do servidor')).toBeInTheDocument();
      });
    });

    it('deve chamar toast.error ao falhar fetch de membros com 401', async () => {
      mockHttpGet.mockImplementation((url: string) => {
        if (url.includes('/members')) {
          return Promise.reject(new HttpError('Token inválido ou expirado', 'AUTH_ERROR', 401));
        }
        return Promise.resolve({ data: mockClubStats });
      });

      render(<GestorDashboard />);
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      fireEvent.click(screen.getByRole('button', { name: /Membros/i }));

      await waitFor(() => {
        expect(mockToastFns.error).toHaveBeenCalledWith('Erro ao carregar membros.');
      });
    });
  });
});
