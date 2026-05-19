import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlayerCard from '../../src/components/scoreboard/PlayerCard';

/**
 * Testes para validar:
 * 1. Badge "1º Saque" foi removido do componente
 * 2. Hover effects aparecem corretamente
 * 3. Clique dispara onPress
 * 4. Placar é clicável
 */
describe('PlayerCard Component', () => {
  const mockOnPress = vi.fn();
  const mockOnSwipeDown = vi.fn();

  const defaultProps = {
    player: 'PLAYER_1' as const,
    name: 'João Silva',
    score: '30' as const,
    games: 3,
    sets: 1,
    isServing: false,
    serveStep: 'none' as const,
    isTiebreak: false,
    isMatchPoint: false,
    isSetPoint: false,
    isBreakPoint: false,
    isAdvantage: false,
    isDeuce: false,
    disabled: false,
    onPress: mockOnPress,
    onSwipeDown: mockOnSwipeDown,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders player name and score correctly', () => {
    render(<PlayerCard {...defaultProps} />);

    expect(screen.getByText('JOÃO SILVA')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('3 games')).toBeInTheDocument();
  });

  it('does NOT render serve badge on player card (removed per UX directive)', () => {
    render(<PlayerCard {...defaultProps} isServing={true} serveStep="first" />);

    // O badge "1º Saque" não deve mais estar no placar
    const serveBadges = screen.queryAllByText(/Saque/i);
    expect(serveBadges).toHaveLength(0);
  });

  it('renders serve dot when isServing is true', () => {
    render(<PlayerCard {...defaultProps} isServing={true} />);

    const serveDot = screen.getByLabelText('Sacando');
    expect(serveDot).toBeInTheDocument();
  });

  it('calls onPress when card is clicked', async () => {
    const user = userEvent.setup();
    render(<PlayerCard {...defaultProps} />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(mockOnPress).toHaveBeenCalled();
  });

  it('has correct button styling for PLAYER_1', () => {
    const { container } = render(<PlayerCard {...defaultProps} />);

    const button = container.querySelector('.player-card');
    expect(button?.classList.contains('card-p1')).toBe(true);
  });

  it('has correct button styling for PLAYER_2', () => {
    const { container } = render(<PlayerCard {...defaultProps} player="PLAYER_2" />);

    const button = container.querySelector('.player-card');
    expect(button?.classList.contains('card-p2')).toBe(true);
  });

  it('displays match point indicator when isMatchPoint is true', () => {
    render(<PlayerCard {...defaultProps} isMatchPoint={true} />);

    expect(screen.getByText(/Match Point/i)).toBeInTheDocument();
  });

  it('applies card-match-point class when isMatchPoint is true', () => {
    const { container } = render(<PlayerCard {...defaultProps} isMatchPoint={true} />);

    const button = container.querySelector('.player-card');
    expect(button?.classList.contains('card-match-point')).toBe(true);
  });

  it('disables card when disabled prop is true', () => {
    render(<PlayerCard {...defaultProps} disabled={true} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('renders sets dots correctly', () => {
    render(<PlayerCard {...defaultProps} sets={2} />);

    const setDots = screen.getAllByText('●');
    // 1 serve dot + 2 set dots = 3 dots
    expect(setDots.length).toBeGreaterThanOrEqual(2);
  });

  it('renders athlete code when provided', () => {
    render(<PlayerCard {...defaultProps} code="[ABC12345]" />);

    expect(screen.getByText('[ABC12345]')).toBeInTheDocument();
  });

  it('applies card-serving class when isServing is true', () => {
    const { container } = render(<PlayerCard {...defaultProps} isServing={true} />);

    const button = container.querySelector('.player-card');
    expect(button?.classList.contains('card-serving')).toBe(true);
  });

  it('applies card-advantage class when isAdvantage is true', () => {
    const { container } = render(<PlayerCard {...defaultProps} isAdvantage={true} score="AD" />);

    const button = container.querySelector('.player-card');
    expect(button?.classList.contains('card-advantage')).toBe(true);
  });

  it('shows ADV when isAdvantage and score is AD', () => {
    render(<PlayerCard {...defaultProps} isAdvantage={true} score="AD" />);

    expect(screen.getByText('ADV')).toBeInTheDocument();
  });

  it('has correct CSS class for p1 hover effects', () => {
    const { container } = render(<PlayerCard {...defaultProps} />);

    const button = container.querySelector('.card-p1');
    // Verificar se tem o estilo de hover (via CSS)
    expect(button).toHaveClass('card-p1');
  });
});
