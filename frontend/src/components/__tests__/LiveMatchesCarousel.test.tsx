import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LiveMatchesCarousel from '../LiveMatchesCarousel';

vi.mock('../LiveMatchesCarousel.css', () => ({}));
vi.mock('../../data/players', () => ({
  resolvePlayerName: (id: string) => id,
}));

const mockOnMatchClick = vi.fn();

const matchBase = {
  id: '1',
  players: { p1: 'Jogador A', p2: 'Jogador B' },
  status: 'live',
};

describe('LiveMatchesCarousel', () => {
  it('retorna null quando não há partidas', () => {
    const { container } = render(
      <LiveMatchesCarousel matches={[]} onMatchClick={mockOnMatchClick} />,
    );

    // Sem partidas, nada deve ser renderizado
    expect(container.firstChild).toBeNull();
  });

  it('aplica classe live-carousel--single com espaço correto quando há 1 partida', () => {
    render(
      <LiveMatchesCarousel matches={[matchBase]} onMatchClick={mockOnMatchClick} />,
    );

    const carousel = screen.getByTestId('live-carousel');
    // A classe deve ter espaço separador — era o bug: 'live-carousellive-carousel--single'
    expect(carousel.className).toBe('live-carousel live-carousel--single');
  });

  it('não aplica live-carousel--single quando há mais de 1 partida', () => {
    const matches = [
      matchBase,
      { ...matchBase, id: '2' },
    ];
    render(
      <LiveMatchesCarousel matches={matches} onMatchClick={mockOnMatchClick} />,
    );

    const carousel = screen.getByTestId('live-carousel');
    expect(carousel.className).toBe('live-carousel');
    expect(carousel.className).not.toContain('live-carousel--single');
  });

  it('renderiza card para cada partida', () => {
    const matches = [
      matchBase,
      { ...matchBase, id: '2', players: { p1: 'Jogador C', p2: 'Jogador D' } },
    ];
    render(
      <LiveMatchesCarousel matches={matches} onMatchClick={mockOnMatchClick} />,
    );

    expect(screen.getByTestId('live-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('live-card-2')).toBeInTheDocument();
  });

  it('chama onMatchClick ao clicar em uma partida', async () => {
    const user = userEvent.setup();
    render(
      <LiveMatchesCarousel matches={[matchBase]} onMatchClick={mockOnMatchClick} />,
    );

    await user.click(screen.getByTestId('live-card-1'));
    expect(mockOnMatchClick).toHaveBeenCalledWith(matchBase);
  });

  it('exibe seção "Ao Vivo" com contagem de partidas', () => {
    const matches = [matchBase, { ...matchBase, id: '2' }];
    render(
      <LiveMatchesCarousel matches={matches} onMatchClick={mockOnMatchClick} />,
    );

    expect(screen.getByTestId('live-section')).toBeInTheDocument();
    expect(screen.getByText('Ao Vivo')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });
});
