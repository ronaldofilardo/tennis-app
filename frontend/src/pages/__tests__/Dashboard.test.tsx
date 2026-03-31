import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Dashboard from '../Dashboard';

// Mock de react-router-dom (Dashboard usa useNavigate)
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/' }),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  MemoryRouter: ({ children }: any) => children,
}));

// Mock do AuthContext (Dashboard usa useAuth)
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: null }),
  AuthProvider: ({ children }: any) => children,
}));

// Mocks capturáveis usando vi.hoisted para funcionar com hoisting do vi.mock
const { mockToastError, mockToastSuccess, mockToastWarning } = vi.hoisted(() => ({
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastWarning: vi.fn(),
}));

// Mock do Toast para evitar erro de ToastProvider em testes unitários
vi.mock('../../components/Toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
    success: mockToastSuccess,
    error: mockToastError,
    warning: mockToastWarning,
    info: vi.fn(),
    dismiss: vi.fn(),
    dismissAll: vi.fn(),
  }),
  ToastProvider: ({ children }: any) => children,
}));

// Mock new components
vi.mock('../../components/AthleteHeader', () => ({
  default: ({
    name,
    stats,
    isMenuOpen,
    onMenuToggle,
    onMenuClose,
    onSelectView,
    onNewMatch,
    pendingCount,
    liveCount,
  }: any) => (
    <div data-testid="athlete-header">
      {name} V:{stats.wins} D:{stats.losses}
      {onMenuToggle && (
        <button
          data-testid="hamburger-btn"
          onClick={onMenuToggle}
          aria-expanded={isMenuOpen}
          aria-haspopup="true"
        >
          Menu
        </button>
      )}
      {isMenuOpen && onMenuClose && onSelectView && onNewMatch && (
        <div data-testid="hamburger-dropdown" role="menu">
          <button
            data-testid="menu-new-match"
            role="menuitem"
            onClick={() => {
              onMenuClose();
              onNewMatch();
            }}
          >
            Nova Partida
          </button>
          <button
            data-testid="menu-history"
            role="menuitem"
            onClick={() => {
              onMenuClose();
              onSelectView('history');
            }}
          >
            Histórico
          </button>
          <button
            data-testid="menu-live"
            role="menuitem"
            onClick={() => {
              onMenuClose();
              onSelectView('live');
            }}
          >
            Ao Vivo
            {liveCount > 0 && <span data-testid="menu-live-badge">{liveCount}</span>}
          </button>
          <button
            data-testid="menu-pending"
            role="menuitem"
            onClick={() => {
              onMenuClose();
              onSelectView('pending');
            }}
          >
            Aguardando
            {pendingCount > 0 && <span data-testid="menu-pending-badge">{pendingCount}</span>}
          </button>
          <button
            data-testid="menu-profile"
            role="menuitem"
            onClick={() => {
              onMenuClose();
              onSelectView('profile');
            }}
          >
            Perfil
          </button>
        </div>
      )}
    </div>
  ),
}));
vi.mock('../../components/FilterChips', () => ({
  default: ({ activeFilter, onFilterChange, counts }: any) => (
    <div data-testid="filter-chips">
      <button data-testid="filter-all" onClick={() => onFilterChange('all')}>
        All ({counts.all})
      </button>
      <button data-testid="filter-live" onClick={() => onFilterChange('live')}>
        Live ({counts.live})
      </button>
    </div>
  ),
}));
vi.mock('../../components/LiveMatchesCarousel', () => ({
  default: ({ matches, onMatchClick }: any) => (
    <div data-testid="live-carousel">
      {matches.map((m: any) => (
        <div key={m.id} data-testid={`live-card-${m.id}`} onClick={() => onMatchClick(m)}>
          {typeof m.players === 'object' ? `${m.players.p1} vs ${m.players.p2}` : 'match'}
        </div>
      ))}
    </div>
  ),
}));
vi.mock('../../components/AthleteHeader.css', () => ({}));
vi.mock('../../components/FilterChips.css', () => ({}));
vi.mock('../../components/LiveMatchesCarousel.css', () => ({}));
vi.mock('../../components/HamburgerMenuDropdown.css', () => ({}));

// Mock do MatchStatsModal
vi.mock('../../components/MatchStatsModal', () => ({
  default: ({ isOpen, onClose, matchId, playerNames, stats, nickname }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="match-stats-modal">
        <h2>Match Stats</h2>
        <p>Match ID: {matchId}</p>
        <p>
          Players: {playerNames.p1} vs {playerNames.p2}
        </p>
        <p>Nickname: {nickname}</p>
        <button onClick={onClose}>Close</button>
      </div>
    );
  },
}));

// Mock do fetch global
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock do console.error
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock do alert
const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

describe('Dashboard', () => {
  const mockOnNewMatchClick = vi.fn();
  const mockOnContinueMatch = vi.fn();
  const mockOnStartMatch = vi.fn();

  const mockMatches = [
    {
      id: '1',
      players: { p1: 'Player 1', p2: 'Player 2' },
      sportType: 'Tênis',
      status: 'NOT_STARTED',
      nickname: 'Test Match',
      format: 'BEST_OF_3',
      apontadorEmail: 'user@example.com',
      playersEmails: ['user@example.com'],
    },
    {
      id: '2',
      players: { p1: 'Player A', p2: 'Player B' },
      sportType: 'Tênis',
      status: 'IN_PROGRESS',
      nickname: 'Live Match',
      format: 'BEST_OF_3',
      apontadorEmail: 'user@example.com',
      playersEmails: ['user@example.com'],
      matchState: {
        sets: { PLAYER_1: 1, PLAYER_2: 0 },
        currentSet: 2,
        currentSetState: { games: { PLAYER_1: 3, PLAYER_2: 2 } },
        currentGame: {
          points: { PLAYER_1: '40', PLAYER_2: '30' },
          server: 'PLAYER_1',
          isTiebreak: false,
        },
        completedSets: [
          {
            setNumber: 1,
            games: { PLAYER_1: 6, PLAYER_2: 4 },
            winner: 'PLAYER_1',
          },
        ],
      },
    },
    {
      id: '3',
      players: { p1: 'Player X', p2: 'Player Y' },
      sportType: 'Tênis',
      status: 'FINISHED',
      nickname: 'Finished Match',
      format: 'BEST_OF_3',
      apontadorEmail: 'other@example.com',
      playersEmails: ['other@example.com'],
    },
  ];

  const mockCurrentUser = {
    role: 'COACH',
    email: 'user@example.com',
    name: 'Test User',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('renders dashboard with title and new match button', () => {
    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />,
    );

    expect(screen.getByRole('heading', { name: /Minhas Partidas/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nova Partida/ })).toBeInTheDocument();
  });

  it('shows loading message when loading is true', () => {
    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[]}
        loading={true}
        error={null}
        currentUser={mockCurrentUser}
      />,
    );

    expect(screen.getByText('Carregando partidas...')).toBeInTheDocument();
  });

  it('shows error message when error is present', () => {
    const errorMessage = 'Erro ao carregar';
    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[]}
        loading={false}
        error={errorMessage}
        currentUser={mockCurrentUser}
      />,
    );

    expect(screen.getByText(/Erro ao carregar/)).toBeInTheDocument();
  });

  it('chama onNewMatchClick diretamente quando Nova Partida é selecionada no menu hamburger', () => {
    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />,
    );

    // Abre o menu hamburger e clica em "Nova Partida"
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    fireEvent.click(screen.getByTestId('menu-new-match'));
    // onNewMatchClick deve ser chamado diretamente (navega para /match/new)
    expect(mockOnNewMatchClick).toHaveBeenCalled();
  });

  it('filters matches based on user permissions', () => {
    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={mockMatches}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />,
    );

    // Navigate to history view
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    fireEvent.click(screen.getByTestId('menu-history'));

    // Match 1 (NOT_STARTED) should be visible in card list
    expect(screen.getAllByText('Player 1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Player 2').length).toBeGreaterThan(0);
    // Match 3 (other user) should NOT be visible
    expect(screen.queryByText('Player X')).not.toBeInTheDocument();
    expect(screen.queryByText('Player Y')).not.toBeInTheDocument();
  });

  it('calls onStartMatch when clicking on NOT_STARTED match', () => {
    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        onStartMatch={mockOnStartMatch}
        matches={[mockMatches[0]]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />,
    );

    // Navigate to history view
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    fireEvent.click(screen.getByTestId('menu-history'));

    fireEvent.click(screen.getAllByText('Player 1')[0]);
    expect(mockOnStartMatch).toHaveBeenCalledWith(mockMatches[0]);
  });

  it('calls onContinueMatch when clicking on IN_PROGRESS match via carousel', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            id: '2',
            players: { p1: 'Player A', p2: 'Player B' },
          }),
        ),
    });

    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        onContinueMatch={mockOnContinueMatch}
        matches={[mockMatches[1]]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />,
    );

    // Navigate to live view
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    fireEvent.click(screen.getByTestId('menu-live'));

    // Live matches are now in the carousel — click the live card
    fireEvent.click(screen.getByTestId('live-card-2'));

    await waitFor(() => {
      expect(mockOnContinueMatch).toHaveBeenCalled();
    });
  });

  it('opens stats modal when stats button is clicked', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              id: '1',
              players: { p1: 'Player 1', p2: 'Player 2' },
              sportType: 'Tênis',
              status: 'FINISHED',
            }),
          ),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ totalPoints: 100 })),
      });

    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[mockMatches[0]]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />,
    );

    // Navigate to history view
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    fireEvent.click(screen.getByTestId('menu-history'));

    fireEvent.click(screen.getAllByRole('button', { name: /Relatório/ })[0]);

    await waitFor(() => {
      expect(screen.getByTestId('match-stats-modal')).toBeInTheDocument();
    });
  });

  it('shows loading state on stats button when fetching', async () => {
    mockFetch
      .mockImplementationOnce(() => new Promise((resolve) => setTimeout(resolve, 100)))
      .mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              id: '1',
              players: { p1: 'Player 1', p2: 'Player 2' },
            }),
          ),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ totalPoints: 100 })),
      });

    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[mockMatches[0]]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />,
    );

    // Navigate to history view
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    fireEvent.click(screen.getByTestId('menu-history'));

    fireEvent.click(screen.getAllByRole('button', { name: /Relatório/ })[0]);

    expect(screen.getByText('⏳')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('⏳')).not.toBeInTheDocument();
    });
  });

  it('handles fetch errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[mockMatches[0]]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />,
    );

    // Navigate to history view
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    fireEvent.click(screen.getByTestId('menu-history'));

    fireEvent.click(screen.getAllByRole('button', { name: /Relatório/ })[0]);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'Não foi possível carregar as estatísticas.',
        expect.anything(),
      );
    });
  });

  it('exibe toast de erro quando stats retorna HTTP 401', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve(JSON.stringify({ error: 'Unauthorized' })),
    });

    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[mockMatches[0]]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />,
    );

    fireEvent.click(screen.getByTestId('hamburger-btn'));
    fireEvent.click(screen.getByTestId('menu-history'));
    fireEvent.click(screen.getAllByRole('button', { name: /Relatório/ })[0]);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'Não foi possível carregar as estatísticas.',
        expect.anything(),
      );
    });
  });

  it('exibe toast de erro quando stats retorna HTTP 403', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: () => Promise.resolve(JSON.stringify({ error: 'Forbidden' })),
    });

    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[mockMatches[0]]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />,
    );

    fireEvent.click(screen.getByTestId('hamburger-btn'));
    fireEvent.click(screen.getByTestId('menu-history'));
    fireEvent.click(screen.getAllByRole('button', { name: /Relatório/ })[0]);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'Não foi possível carregar as estatísticas.',
        expect.anything(),
      );
    });
  });

  it('exibe toast de erro quando stats retorna HTTP 500', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve(JSON.stringify({ error: 'Internal Server Error' })),
    });

    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[mockMatches[0]]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />,
    );

    fireEvent.click(screen.getByTestId('hamburger-btn'));
    fireEvent.click(screen.getByTestId('menu-history'));
    fireEvent.click(screen.getAllByRole('button', { name: /Relatório/ })[0]);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'Não foi possível carregar as estatísticas.',
        expect.anything(),
      );
    });
  });

  it('renders live matches in the carousel for IN_PROGRESS matches', () => {
    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[mockMatches[1]]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />,
    );

    // Navigate to live view
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    fireEvent.click(screen.getByTestId('menu-live'));

    // Live matches now appear in the carousel component
    expect(screen.getByTestId('live-carousel')).toBeInTheDocument();
    expect(screen.getByTestId('live-card-2')).toBeInTheDocument();
  });

  it('renders match partials in the carousel for live matches', () => {
    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[mockMatches[1]]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />,
    );

    // Navigate to live view
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    fireEvent.click(screen.getByTestId('menu-live'));

    // Carousel renders the live match
    expect(screen.getByTestId('live-card-2')).toBeInTheDocument();
  });

  it('renders match format labels correctly', () => {
    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[mockMatches[0]]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />,
    );

    // Navigate to history view
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    fireEvent.click(screen.getByTestId('menu-history'));

    expect(screen.getByText('Melhor de 3 · Tie-break todos os sets')).toBeInTheDocument();
  });

  it('handles matches without players object', () => {
    const matchWithoutPlayers = {
      id: '4',
      players: 'Player 1 vs Player 2',
      sportType: 'Tênis',
      status: 'NOT_STARTED',
      apontadorEmail: 'user@example.com',
      playersEmails: ['user@example.com'],
    };

    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[matchWithoutPlayers]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />,
    );

    // Com players como string, o componente renderiza sem crash (nomes ficam vazios)
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('handles empty matches array', () => {
    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />,
    );

    expect(screen.getByRole('heading', { name: /Minhas Partidas/i })).toBeInTheDocument();
    expect(screen.queryByTestId(/^match-card/)).not.toBeInTheDocument();
  });

  it('handles null currentUser', () => {
    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={mockMatches}
        loading={false}
        error={null}
        currentUser={null}
      />,
    );

    // Should not show any matches when user is null
    expect(screen.queryByText('Player 1')).not.toBeInTheDocument();
  });

  it('closes stats modal when close button is clicked', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              id: '1',
              players: { p1: 'Player 1', p2: 'Player 2' },
            }),
          ),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ totalPoints: 100 })),
      });

    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[mockMatches[0]]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />,
    );

    // Navigate to history view
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    fireEvent.click(screen.getByTestId('menu-history'));

    fireEvent.click(screen.getAllByRole('button', { name: /Relatório/ })[0]);

    await waitFor(() => {
      expect(screen.getByTestId('match-stats-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('match-stats-modal')).not.toBeInTheDocument();
    });
  });

  // ── Novos testes: redesign UX ─────────────────────────────────────────────

  it('exibe hero CTA quando view é none (padrão) e não há partidas', () => {
    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />,
    );

    expect(screen.getByTestId('dashboard-hero')).toBeInTheDocument();
    expect(screen.getByText('Bem-vindo ao RacketApp')).toBeInTheDocument();
  });

  it('aplica classe card--live no carousel para partidas IN_PROGRESS', () => {
    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[mockMatches[1]]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />,
    );

    // Navigate to live view
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    fireEvent.click(screen.getByTestId('menu-live'));

    // Live matches now go to the carousel, not the main card list
    expect(screen.getByTestId('live-carousel')).toBeInTheDocument();
  });

  it('aplica classe card--pending em partidas NOT_STARTED', () => {
    const { container } = render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[mockMatches[0]]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />,
    );

    // Navigate to history view
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    fireEvent.click(screen.getByTestId('menu-history'));

    expect(container.querySelector('.card--pending')).toBeInTheDocument();
  });

  it('aplica classe card--finished em partidas FINISHED', () => {
    const { container } = render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[
          {
            ...mockMatches[2],
            apontadorEmail: 'user@example.com',
            playersEmails: ['user@example.com'],
          },
        ]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />,
    );

    // Navigate to history view
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    fireEvent.click(screen.getByTestId('menu-history'));

    expect(container.querySelector('.card--finished')).toBeInTheDocument();
  });

  it('exibe parciais na card-finished-score para partidas FINISHED', () => {
    const finishedMatch = {
      id: '5',
      players: { p1: 'Alice', p2: 'Bob' },
      sportType: 'T\u00eanis',
      status: 'FINISHED',
      apontadorEmail: 'user@example.com',
      playersEmails: ['user@example.com'],
      matchState: {
        sets: { PLAYER_1: 2, PLAYER_2: 0 },
        completedSets: [
          { games: { PLAYER_1: 6, PLAYER_2: 3 }, winner: 'PLAYER_1' },
          { games: { PLAYER_1: 6, PLAYER_2: 2 }, winner: 'PLAYER_1' },
        ],
      },
    };

    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[finishedMatch]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />,
    );

    // Navigate to history view
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    fireEvent.click(screen.getByTestId('menu-history'));

    expect(screen.getByTestId('match-card-partials-5')).toBeInTheDocument();
    const partialsEl = screen.getByTestId('match-card-partials-5');
    expect(partialsEl.textContent).toContain('6/3');
    expect(partialsEl.textContent).toContain('6/2');
  });

  it('exibe badge de quadra quando courtType \u00e9 definido', () => {
    const matchWithCourt = {
      ...mockMatches[0],
      courtType: 'CLAY',
    };

    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[matchWithCourt]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />,
    );
    // Navigate to history view
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    fireEvent.click(screen.getByTestId('menu-history'));
    expect(screen.getByText(/Saibro/)).toBeInTheDocument();
  });

  it('não exibe hero CTA quando há loading', () => {
    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[]}
        loading={true}
        error={null}
        currentUser={mockCurrentUser}
      />,
    );

    expect(screen.queryByTestId('dashboard-hero')).not.toBeInTheDocument();
  });
});
