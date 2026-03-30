// tests/OpenMatchesCollapsible.test.tsx
// Testes: seção colapsável "Partidas aguardando anotador" no Dashboard

import '../vitest.setup';

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── Mock de react-router-dom ──────────────────────────────────
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/' }),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  MemoryRouter: ({ children }: any) => children,
}));

// ── Mocks de CSS ──────────────────────────────────────────────
vi.mock('../src/pages/Dashboard.css', () => ({}));
vi.mock('../src/components/FilterChips.css', () => ({}));
vi.mock('../src/components/AthleteHeader.css', () => ({}));
vi.mock('../src/components/LiveMatchesCarousel.css', () => ({}));
vi.mock('../src/components/MatchStatsModal.css', () => ({}));
vi.mock('../src/components/Toast.css', () => ({}));
vi.mock('../src/components/NewMatchMenu.css', () => ({}));
vi.mock('../src/components/HamburgerMenuDropdown.css', () => ({}));

// ── Mock do Toast ─────────────────────────────────────────────
vi.mock('../src/components/Toast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}));

// ── Mock do Logger ────────────────────────────────────────────
vi.mock('../src/services/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// ── Mock resolvePlayerName ────────────────────────────────────
vi.mock('../src/data/players', () => ({
  resolvePlayerName: (name: string) => name || 'Jogador',
}));

// ── Mock MatchStatsModal ──────────────────────────────────────
vi.mock('../src/components/MatchStatsModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="stats-modal">Stats Modal</div> : null,
}));

// ── Mock da config/api ────────────────────────────────────────
vi.mock('../src/config/api', () => ({
  API_URL: 'http://localhost:3000/api',
}));

// ── Mock do AuthContext com usuário para exibir open matches ──
const mockAuthUser = {
  id: 'user1',
  email: 'athlete@test.com',
  name: 'João Silva',
  role: 'ATHLETE',
  activeClubId: 'club1',
  clubs: [{ id: 'club1', name: 'Clube Teste', role: 'ATHLETE' }],
};
vi.mock('../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: mockAuthUser,
    logout: vi.fn(),
    switchClub: vi.fn(),
  }),
  AuthProvider: ({ children }: any) => children,
}));

import Dashboard from '../src/pages/Dashboard';

// ── Helper: navegar para a view 'pending' via hamburger menu ──
async function navigateToPending() {
  const user = userEvent.setup();
  const hamburgerBtn = screen.getByTestId('hamburger-btn');
  await user.click(hamburgerBtn);
  const pendingItem = screen.getByTestId('menu-pending');
  await user.click(pendingItem);
  return user;
}

// ── Helpers ───────────────────────────────────────────────────

const defaultUser = {
  email: 'athlete@test.com',
  name: 'João Silva',
  role: 'ATHLETE',
};

const defaultProps = {
  onNewMatchClick: vi.fn(),
  onContinueMatch: vi.fn(),
  onStartMatch: vi.fn(),
  matches: [] as any[],
  loading: false,
  error: null,
  currentUser: defaultUser,
};

const mockOpenMatches = [
  {
    id: 'open1',
    sportType: 'TENNIS',
    format: 'BEST_OF_3',
    playerP1: 'Player A',
    playerP2: 'Player B',
    players: { p1: 'Player A', p2: 'Player B' },
    status: 'NOT_STARTED',
    visibility: 'PUBLIC',
    club: { id: 'c1', name: 'Clube Teste', slug: 'clube-teste' },
    _count: { annotationSessions: 0 },
  },
  {
    id: 'open2',
    sportType: 'PADEL',
    format: 'BEST_OF_3',
    playerP1: 'Player C',
    playerP2: 'Player D',
    players: { p1: 'Player C', p2: 'Player D' },
    status: 'NOT_STARTED',
    visibility: 'PUBLIC',
    club: { id: 'c1', name: 'Clube Teste', slug: 'clube-teste' },
    _count: { annotationSessions: 1 },
  },
];

// ═══════════════════════════════════════════════════════════════
// TESTS — Seção Colapsável "Partidas aguardando anotador"
// ═══════════════════════════════════════════════════════════════

describe('Dashboard — Seção colapsável: Partidas aguardando anotador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Arrange: fetch retorna open matches no primeiro call (open-for-annotation)
    // e arrays vazios nos demais
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('open-for-annotation')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockOpenMatches),
        });
      }
      // Demais endpoints retornam vazio
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });
  });

  it('deve renderizar a seção quando há partidas abertas', async () => {
    // Arrange & Act
    render(<Dashboard {...defaultProps} />);
    await navigateToPending();

    // Assert
    const header = await screen.findByRole('button', { name: /partidas aguardando anotador/i });
    expect(header).toBeInTheDocument();
  });

  it('deve exibir badge com contagem de partidas', async () => {
    // Arrange & Act
    render(<Dashboard {...defaultProps} />);
    await navigateToPending();

    // Assert: badge com "2" partidas
    const badge = await screen.findByLabelText('2 partidas');
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toBe('2');
  });

  it('deve iniciar expandido (aria-expanded=true)', async () => {
    // Arrange & Act
    render(<Dashboard {...defaultProps} />);
    await navigateToPending();

    // Assert
    const header = await screen.findByRole('button', { name: /partidas aguardando anotador/i });
    expect(header).toHaveAttribute('aria-expanded', 'true');
  });

  it('deve colapsar ao clicar no cabeçalho', async () => {
    // Arrange
    render(<Dashboard {...defaultProps} />);
    const user = await navigateToPending();

    // Act
    const header = await screen.findByRole('button', { name: /partidas aguardando anotador/i });
    await user.click(header);

    // Assert
    expect(header).toHaveAttribute('aria-expanded', 'false');
    const body = document.getElementById('open-matches-list');
    expect(body?.className).toContain('open-matches-body--hidden');
  });

  it('deve expandir novamente ao clicar duas vezes', async () => {
    // Arrange
    render(<Dashboard {...defaultProps} />);
    const user = await navigateToPending();

    // Act — colapsa
    const header = await screen.findByRole('button', { name: /partidas aguardando anotador/i });
    await user.click(header);
    expect(header).toHaveAttribute('aria-expanded', 'false');

    // Act — expande
    await user.click(header);

    // Assert
    expect(header).toHaveAttribute('aria-expanded', 'true');
    const body = document.getElementById('open-matches-list');
    expect(body?.className).not.toContain('open-matches-body--hidden');
  });

  it('deve ter aria-controls apontando para o id da lista', async () => {
    // Arrange & Act
    render(<Dashboard {...defaultProps} />);
    await navigateToPending();

    // Assert
    const header = await screen.findByRole('button', { name: /partidas aguardando anotador/i });
    expect(header).toHaveAttribute('aria-controls', 'open-matches-list');
    expect(document.getElementById('open-matches-list')).toBeInTheDocument();
  });

  it('deve exibir cards de partida dentro do body quando expandido', async () => {
    // Arrange & Act
    render(<Dashboard {...defaultProps} />);
    await navigateToPending();

    // Assert: aguarda cards renderizarem
    const playerA = await screen.findByText('Player A');
    expect(playerA).toBeInTheDocument();
    const playerC = await screen.findByText('Player C');
    expect(playerC).toBeInTheDocument();
  });

  it('não deve renderizar seção quando não há partidas abertas', async () => {
    // Arrange: fetch retorna array vazio
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      }),
    );

    // Act
    render(<Dashboard {...defaultProps} />);
    await navigateToPending();

    // Assert: sem botão de header da seção
    // Aguarda o fetch resolver e confirma que a seção não aparece
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: /partidas aguardando anotador/i }),
      ).not.toBeInTheDocument(),
    );
  });

  it('deve esconder os cards quando colapsado (display:none via classe)', async () => {
    // Arrange
    render(<Dashboard {...defaultProps} />);
    const user = await navigateToPending();

    // Aguarda renderizar
    await screen.findByText('Player A');

    // Act — colapsa
    const header = screen.getByRole('button', { name: /partidas aguardando anotador/i });
    await user.click(header);

    // Assert: body tem classe hidden
    const body = document.getElementById('open-matches-list');
    expect(body?.className).toContain('open-matches-body--hidden');
  });

  it('o chevron deve ter classe --collapsed quando recolhido', async () => {
    // Arrange
    render(<Dashboard {...defaultProps} />);
    const user = await navigateToPending();

    // Aguarda renderizar
    await screen.findByText('Player A');

    // Act — colapsa
    const header = screen.getByRole('button', { name: /partidas aguardando anotador/i });
    await user.click(header);

    // Assert: SVG chevron com classe collapsed
    const chevronSvg = header.querySelector('.open-matches-chevron--collapsed');
    expect(chevronSvg).not.toBeNull();
  });
});
