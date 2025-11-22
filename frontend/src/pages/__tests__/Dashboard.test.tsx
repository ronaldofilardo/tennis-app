import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Dashboard from '../Dashboard';

// Mock do MatchStatsModal
vi.mock('../../components/MatchStatsModal', () => ({
  default: ({ isOpen, onClose, matchId, playerNames, stats, nickname }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="match-stats-modal">
        <h2>Match Stats</h2>
        <p>Match ID: {matchId}</p>
        <p>Players: {playerNames.p1} vs {playerNames.p2}</p>
        <p>Nickname: {nickname}</p>
        <button onClick={onClose}>Close</button>
      </div>
    );
  }
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
      playersEmails: ['user@example.com']
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
          isTiebreak: false
        },
        completedSets: [
          { setNumber: 1, games: { PLAYER_1: 6, PLAYER_2: 4 }, winner: 'PLAYER_1' }
        ]
      }
    },
    {
      id: '3',
      players: { p1: 'Player X', p2: 'Player Y' },
      sportType: 'Tênis',
      status: 'FINISHED',
      nickname: 'Finished Match',
      format: 'BEST_OF_3',
      apontadorEmail: 'other@example.com',
      playersEmails: ['other@example.com']
    }
  ];

  const mockCurrentUser = {
    role: 'annotator' as const,
    email: 'user@example.com'
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
      />
    );

    expect(screen.getByText('Minhas Partidas')).toBeInTheDocument();
    expect(screen.getByText('Nova Partida')).toBeInTheDocument();
  });

  it('shows loading message when loading is true', () => {
    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[]}
        loading={true}
        error={null}
        currentUser={mockCurrentUser}
      />
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
      />
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('calls onNewMatchClick when new match button is clicked', () => {
    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />
    );

    fireEvent.click(screen.getByText('Nova Partida'));
    expect(mockOnNewMatchClick).toHaveBeenCalledTimes(1);
  });

  it('filters matches based on user permissions', () => {
    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={mockMatches}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />
    );

    // Should show matches 1 and 2 (user has access), but not 3 (different user)
    expect(screen.getByText('Player 1 vs. Player 2')).toBeInTheDocument();
    expect(screen.getByText('Player A vs. Player B')).toBeInTheDocument();
    expect(screen.queryByText('Player X vs. Player Y')).not.toBeInTheDocument();
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
      />
    );

    fireEvent.click(screen.getByText('Player 1 vs. Player 2'));
    expect(mockOnStartMatch).toHaveBeenCalledWith(mockMatches[0]);
  });

  it('calls onContinueMatch when clicking on IN_PROGRESS match', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ id: '2', players: { p1: 'Player A', p2: 'Player B' } }))
    });

    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        onContinueMatch={mockOnContinueMatch}
        matches={[mockMatches[1]]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />
    );

    fireEvent.click(screen.getByText('Player A vs. Player B'));

    await waitFor(() => {
      expect(mockOnContinueMatch).toHaveBeenCalledWith(mockMatches[1], { id: '2', players: { p1: 'Player A', p2: 'Player B' } });
    });
  });

  it('opens stats modal when stats button is clicked', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          id: '1',
          players: { p1: 'Player 1', p2: 'Player 2' },
          sportType: 'Tênis',
          status: 'FINISHED'
        }))
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ totalPoints: 100 }))
      });

    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[mockMatches[0]]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />
    );

    fireEvent.click(screen.getByText('📊 Abrir Resultado'));

    await waitFor(() => {
      expect(screen.getByTestId('match-stats-modal')).toBeInTheDocument();
    });
  });

  it('shows loading state on stats button when fetching', async () => {
    mockFetch
      .mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)))
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          id: '1',
          players: { p1: 'Player 1', p2: 'Player 2' }
        }))
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ totalPoints: 100 }))
      });

    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[mockMatches[0]]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />
    );

    fireEvent.click(screen.getByText('📊 Abrir Resultado'));

    expect(screen.getByText('Carregando...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();
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
      />
    );

    fireEvent.click(screen.getByText('📊 Abrir Resultado'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Não foi possível carregar as estatísticas.');
    });
  });

  it('renders live status for IN_PROGRESS matches', () => {
    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[mockMatches[1]]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />
    );

    expect(screen.getByTestId('live-status-2')).toBeInTheDocument();
    expect(screen.getByText('AO VIVO')).toBeInTheDocument();
    expect(screen.getByTestId('live-status-sets-2')).toBeInTheDocument();
    expect(screen.getByTestId('live-status-games-2')).toBeInTheDocument();
    expect(screen.getByTestId('live-status-points-2')).toBeInTheDocument();
  });

  it('renders match partials for completed sets', () => {
    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[mockMatches[1]]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />
    );

    expect(screen.getByTestId('match-card-partials-2')).toBeInTheDocument();
    expect(screen.getByText('Parciais: 6/4')).toBeInTheDocument();
  });

  it('renders match format labels correctly', () => {
    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[mockMatches[0]]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />
    );

    expect(screen.getByText('Melhor de 3 sets com vantagem, Set tie-break em todos os sets')).toBeInTheDocument();
  });

  it('handles matches without players object', () => {
    const matchWithoutPlayers = {
      id: '4',
      players: 'Player 1 vs Player 2',
      sportType: 'Tênis',
      status: 'NOT_STARTED',
      apontadorEmail: 'user@example.com',
      playersEmails: ['user@example.com']
    };

    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[matchWithoutPlayers]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />
    );

    expect(screen.getByText('Player 1 vs Player 2')).toBeInTheDocument();
  });

  it('handles empty matches array', () => {
    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />
    );

    expect(screen.getByText('Minhas Partidas')).toBeInTheDocument();
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
      />
    );

    // Should not show any matches when user is null
    expect(screen.queryByText('Player 1 vs. Player 2')).not.toBeInTheDocument();
  });

  it('closes stats modal when close button is clicked', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          id: '1',
          players: { p1: 'Player 1', p2: 'Player 2' }
        }))
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ totalPoints: 100 }))
      });

    render(
      <Dashboard
        onNewMatchClick={mockOnNewMatchClick}
        matches={[mockMatches[0]]}
        loading={false}
        error={null}
        currentUser={mockCurrentUser}
      />
    );

    fireEvent.click(screen.getByText('📊 Abrir Resultado'));

    await waitFor(() => {
      expect(screen.getByTestId('match-stats-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('match-stats-modal')).not.toBeInTheDocument();
    });
  });
});