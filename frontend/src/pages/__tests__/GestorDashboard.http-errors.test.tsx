// GestorDashboard.http-errors.test.tsx
// Testes focados na cobertura de erros HTTP (401, 403, 500) do GestorDashboard
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import GestorDashboard from '../GestorDashboard';
import { HttpError } from '../../config/httpClient';

// ── Mocks ──────────────────────────────────────────────────────────────────

const { mockHttpClient } = vi.hoisted(() => ({
  mockHttpClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    setAuthConfig: vi.fn(),
    setTenantConfig: vi.fn(),
    onUnauthorized: vi.fn(),
  },
}));

vi.mock('../../config/httpClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../config/httpClient')>();
  return { ...actual, httpClient: mockHttpClient };
});

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { id: 'u1', name: 'Gestor Teste', email: 'gestor@teste.com' },
    activeClub: { clubId: 'club-1', role: 'GESTOR' },
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../contexts/NavigationContext', () => ({
  useNavigation: () => ({
    navigateToDashboard: vi.fn(),
    navigateToScoreboard: vi.fn(),
  }),
}));

const mockToastError = vi.fn();
vi.mock('../../components/Toast', () => ({
  useToast: () => ({
    error: mockToastError,
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    showToast: vi.fn(),
  }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock componentes pesados para isolar o GestorDashboard
vi.mock('../../hooks/useSubscription', () => ({
  useSubscription: () => ({ subscription: null, loading: false }),
}));
vi.mock('../../components/AddAthleteModal', () => ({ default: () => null }));
vi.mock('../../components/EditMemberModal', () => ({ default: () => null }));
vi.mock('../../components/ClubRankings', () => ({ ClubRankings: () => null }));
vi.mock('../../components/gestor/GestorOverviewTab', () => ({
  default: () => <div data-testid="overview-tab" />,
}));
vi.mock('../../components/gestor/GestorMembersTab', () => ({ default: () => null }));
vi.mock('../../components/gestor/GestorMatchesTab', () => ({ default: () => null }));
vi.mock('../../components/gestor/GestorBillingTab', () => ({ default: () => null }));

// ── Testes ─────────────────────────────────────────────────────────────────

describe('GestorDashboard — erros HTTP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe mensagem de erro quando fetchStats retorna HTTP 401', async () => {
    mockHttpClient.get.mockRejectedValueOnce(new HttpError('Não autorizado', 'AUTH_ERROR', 401));

    render(<GestorDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Não autorizado/i)).toBeInTheDocument();
    });
  });

  it('exibe mensagem de erro quando fetchStats retorna HTTP 403', async () => {
    mockHttpClient.get.mockRejectedValueOnce(
      new HttpError('Acesso negado', 'PERMISSION_ERROR', 403),
    );

    render(<GestorDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Acesso negado/i)).toBeInTheDocument();
    });
  });

  it('exibe mensagem de erro quando fetchStats retorna HTTP 500', async () => {
    mockHttpClient.get.mockRejectedValueOnce(
      new HttpError('Erro interno do servidor', 'SERVER_ERROR', 500),
    );

    render(<GestorDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Erro interno do servidor/i)).toBeInTheDocument();
    });
  });

  it('exibe botão "Tentar novamente" após erro no fetchStats', async () => {
    mockHttpClient.get.mockRejectedValueOnce(
      new HttpError('Erro interno do servidor', 'SERVER_ERROR', 500),
    );

    render(<GestorDashboard />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
    });
  });
});
