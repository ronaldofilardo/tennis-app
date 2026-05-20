import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';
import * as httpClient from '../../config/httpClient';

const { mockHttpClient } = vi.hoisted(() => ({
  mockHttpClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../config/httpClient', () => ({ default: mockHttpClient, httpClient: mockHttpClient }));

vi.mock('../../components/Toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    dismiss: vi.fn(),
    dismissAll: vi.fn(),
  }),
  ToastProvider: ({ children }: any) => children,
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { id: 'user-123', email: 'test@example.com' },
    logout: vi.fn(),
    switchClub: vi.fn(),
  }),
  AuthProvider: ({ children }: any) => children,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/' }),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  MemoryRouter: ({ children }: any) => children,
  BrowserRouter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../components/AthleteHeader', () => ({
  default: ({ isMenuOpen, onMenuToggle, onMenuClose, onSelectView }: any) => (
    <div data-testid="athlete-header">
      <button data-testid="hamburger-btn" onClick={onMenuToggle}>
        Menu
      </button>
      {isMenuOpen && (
        <div data-testid="hamburger-dropdown">
          <button
            data-testid="menu-history"
            onClick={() => {
              onMenuClose?.();
              onSelectView?.('history');
            }}
          >
            Histórico
          </button>
        </div>
      )}
    </div>
  ),
}));

vi.mock('../../components/FilterChips', () => ({
  default: () => <div data-testid="filter-chips" />,
}));
vi.mock('../../components/LiveMatchesCarousel', () => ({
  default: () => <div data-testid="live-carousel" />,
}));
vi.mock('../../components/MatchStatsModal', () => ({ default: () => null }));
vi.mock('../../components/PendingInvitesBanner', () => ({ default: () => null }));
vi.mock('../../components/NewMatchMenu', () => ({ default: () => null }));

vi.mock('../../components/AthleteHeader.css', () => ({}));
vi.mock('../../components/FilterChips.css', () => ({}));
vi.mock('../../components/LiveMatchesCarousel.css', () => ({}));
vi.mock('../../components/HamburgerMenuDropdown.css', () => ({}));
vi.mock('../../components/NewMatchMenu.css', () => ({}));
vi.mock('../../components/ConfirmDeleteMatchModal.css', () => ({}));

vi.mock('../../hooks/useDashboardData', () => ({
  useDashboardData: () => ({
    openMatches: [],
    openMatchesLoading: false,
    annotatedMatches: [],
    setAnnotatedMatches: vi.fn(),
    annotatedByMe: [],
    setAnnotatedByMe: vi.fn(),
    annotatedLoading: false,
    completedMatches: [],
    setCompletedMatches: vi.fn(),
    completedLoading: false,
    suspendedMatches: [],
    suspendedLoading: false,
    setOpenMatches: vi.fn(),
    refetchCompleted: vi.fn(),
  }),
}));

vi.mock('../../hooks/useDashboardMatchActions', () => ({
  useDashboardMatchActions: () => ({
    isStatsModalOpen: false,
    setIsStatsModalOpen: vi.fn(),
    selectedMatch: null,
    matchStats: null,
    loadingMatchId: null,
    openStatsForMatch: vi.fn(),
    fetchMatchStateForContinue: vi.fn(),
    modalPlayerNames: { p1: '', p2: '' },
  }),
}));

const MockDashboard = (props: any) => (
  <BrowserRouter>
    <Dashboard {...props} />
  </BrowserRouter>
);

describe('Dashboard - Delete Match Flow', () => {
  const mockMatch = {
    id: 'match-1',
    players: { p1: 'Alice', p2: 'Bob' },
    status: 'NOT_STARTED',
    createdByUserId: 'user-123',
    createdAt: new Date().toISOString(),
    format: 'BEST_OF_3',
    nickname: 'Test Match',
    venue: { id: 'venue-1', name: 'Court A' },
    visibility: 'PRIVATE',
    openForAnnotation: false,
    apontadorEmail: 'test@example.com',
    playersEmails: ['test@example.com'],
  };

  const defaultProps = {
    matches: [mockMatch],
    loading: false,
    error: null,
    currentUser: { email: 'test@example.com', role: 'ATHLETE', name: 'Test User' },
    onNewMatchClick: vi.fn(),
  };

  const navigateToHistory = () => {
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    fireEvent.click(screen.getByTestId('menu-history'));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (httpClient.default.delete as any).mockResolvedValue({ ok: true });
  });

  it('should show delete button for match created by current user with NOT_STARTED status', () => {
    render(<MockDashboard {...defaultProps} />);
    navigateToHistory();

    const deleteButton = screen.queryByRole('button', { name: /Excluir/i });
    expect(deleteButton).toBeInTheDocument();
  });

  it('should not show delete button for matches created by other users', () => {
    const otherMatch = { ...mockMatch, createdByUserId: 'other-user-456' };
    render(<MockDashboard {...defaultProps} matches={[otherMatch]} />);
    navigateToHistory();

    const deleteButton = screen.queryByRole('button', { name: /Excluir/i });
    expect(deleteButton).not.toBeInTheDocument();
  });

  it('should not show delete button for matches not in NOT_STARTED status', () => {
    const inProgressMatch = { ...mockMatch, status: 'IN_PROGRESS' };
    render(<MockDashboard {...defaultProps} matches={[inProgressMatch]} />);
    navigateToHistory();

    const deleteButton = screen.queryByRole('button', { name: /Excluir/i });
    expect(deleteButton).not.toBeInTheDocument();
  });

  it('should open confirmation modal when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<MockDashboard {...defaultProps} />);
    navigateToHistory();

    const deleteButton = screen.getByRole('button', { name: /Excluir/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Deletar Partida/i })).toBeInTheDocument();
    });
  });

  it('should call httpClient.delete with correct match ID when confirmed', async () => {
    const user = userEvent.setup();
    render(<MockDashboard {...defaultProps} />);
    navigateToHistory();

    const deleteButton = screen.getByRole('button', { name: /Excluir/i });
    await user.click(deleteButton);

    const confirmButton = await screen.findByRole('button', { name: /^Deletar Partida$/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(httpClient.default.delete).toHaveBeenCalledWith('/matches/match-1');
    });
  });

  it('should remove deleted match from UI after successful deletion', async () => {
    const user = userEvent.setup();
    render(<MockDashboard {...defaultProps} />);
    navigateToHistory();

    const deleteButton = screen.getByRole('button', { name: /Excluir/i });
    await user.click(deleteButton);

    const confirmButton = await screen.findByRole('button', { name: /^Deletar Partida$/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.queryByText(/Test Match/)).not.toBeInTheDocument();
    });
  });

  it('should update deletedMatchIds state after successful deletion', async () => {
    const user = userEvent.setup();
    const match2 = { ...mockMatch, id: 'match-2', nickname: 'Match 2' };
    render(<MockDashboard {...defaultProps} matches={[mockMatch, match2]} />);
    navigateToHistory();

    expect(screen.getByText(/Test Match/)).toBeInTheDocument();

    const deleteButtons = screen.getAllByRole('button', { name: /Excluir/i });
    await user.click(deleteButtons[0]);

    const confirmButton = await screen.findByRole('button', { name: /^Deletar Partida$/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.queryByText(/Test Match/)).not.toBeInTheDocument();
      expect(screen.getByText(/Match 2/)).toBeInTheDocument();
    });
  });

  it('should show error message on delete failure', async () => {
    const user = userEvent.setup();
    (httpClient.default.delete as any).mockRejectedValue(new Error('Erro ao deletar'));

    render(<MockDashboard {...defaultProps} />);
    navigateToHistory();

    const deleteButton = screen.getByRole('button', { name: /Excluir/i });
    await user.click(deleteButton);

    const confirmButton = await screen.findByRole('button', { name: /^Deletar Partida$/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.queryByText(/erro|error|falha|Erro ao deletar/i)).toBeTruthy();
    });
  });

  it('should close modal when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<MockDashboard {...defaultProps} />);
    navigateToHistory();

    const deleteButton = screen.getByRole('button', { name: /Excluir/i });
    await user.click(deleteButton);

    const cancelButton = await screen.findByRole('button', { name: /Cancelar/i });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText(/Deletar Partida/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Test Match/)).toBeInTheDocument();
  });

  it('should handle deletion of multiple matches in succession', async () => {
    const user = userEvent.setup();
    const match2 = { ...mockMatch, id: 'match-2', nickname: 'Match 2' };

    render(<MockDashboard {...defaultProps} matches={[mockMatch, match2]} />);
    navigateToHistory();

    let deleteButtons = screen.getAllByRole('button', { name: /Excluir/i });
    await user.click(deleteButtons[0]);

    let confirmButton = await screen.findByRole('button', { name: /^Deletar Partida$/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.queryByText(/Test Match/)).not.toBeInTheDocument();
    });

    deleteButtons = screen.getAllByRole('button', { name: /Excluir/i });
    await user.click(deleteButtons[0]);

    confirmButton = await screen.findByRole('button', { name: /^Deletar Partida$/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.queryByText(/Match 2/)).not.toBeInTheDocument();
    });
  });

  it('should preserve history view state after deletion', async () => {
    const user = userEvent.setup();
    render(<MockDashboard {...defaultProps} />);
    navigateToHistory();

    const deleteButton = screen.getByRole('button', { name: /Excluir/i });
    await user.click(deleteButton);

    const confirmButton = await screen.findByRole('button', { name: /^Deletar Partida$/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.queryByText(/Test Match/)).not.toBeInTheDocument();
    });

    // AthleteHeader should still be present (component still in history view)
    expect(screen.getByTestId('athlete-header')).toBeInTheDocument();
  });
});
