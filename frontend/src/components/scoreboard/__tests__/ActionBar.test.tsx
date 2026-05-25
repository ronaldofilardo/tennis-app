import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ActionBar from '../ActionBar';

vi.mock('../ActionBar.css', () => ({}));

const defaultProps = {
  canUndo: true,
  isFinished: false,
  serveStep: 'none' as const,
  server: 'PLAYER_1' as const,
  playerNames: { PLAYER_1: 'Alice', PLAYER_2: 'Bob' },
  onUndo: vi.fn(),
  onAce: vi.fn(),
  onOut: vi.fn(),
  onNet: vi.fn(),
  onFault: vi.fn(),
};

describe('ActionBar — Ball Exchange Counter Inline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não renderiza o botão +ball quando onBallExchangeIncrement não é fornecido', () => {
    render(<ActionBar {...defaultProps} />);
    expect(screen.queryByRole('button', { name: /adicionar troca de bola/i })).toBeNull();
  });

  it('renderiza o botão +ball quando onBallExchangeIncrement é fornecido', () => {
    const onBallExchangeIncrement = vi.fn();
    render(
      <ActionBar
        {...defaultProps}
        ballExchangeCount={0}
        onBallExchangeIncrement={onBallExchangeIncrement}
      />,
    );
    expect(screen.getByRole('button', { name: /adicionar troca de bola/i })).toBeInTheDocument();
    expect(screen.getByText('+ball')).toBeInTheDocument();
  });

  it('chama onBallExchangeIncrement ao clicar no botão +ball', () => {
    const onBallExchangeIncrement = vi.fn();
    render(
      <ActionBar
        {...defaultProps}
        ballExchangeCount={0}
        onBallExchangeIncrement={onBallExchangeIncrement}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /adicionar troca de bola/i }));
    expect(onBallExchangeIncrement).toHaveBeenCalledTimes(1);
  });

  it('não exibe label BOLAS quando count = 0', () => {
    const onBallExchangeIncrement = vi.fn();
    render(
      <ActionBar
        {...defaultProps}
        ballExchangeCount={0}
        onBallExchangeIncrement={onBallExchangeIncrement}
      />,
    );
    expect(screen.queryByText('BOLAS:')).toBeNull();
  });

  it('exibe label BOLAS e valor quando count > 0', () => {
    const onBallExchangeIncrement = vi.fn();
    render(
      <ActionBar
        {...defaultProps}
        ballExchangeCount={3}
        onBallExchangeIncrement={onBallExchangeIncrement}
      />,
    );
    expect(screen.getByText('BOLAS:')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('aplica classe active no container quando count > 0', () => {
    const onBallExchangeIncrement = vi.fn();
    const { container } = render(
      <ActionBar
        {...defaultProps}
        ballExchangeCount={2}
        onBallExchangeIncrement={onBallExchangeIncrement}
      />,
    );
    const wrapper = container.querySelector('.ball-exchange-inline');
    expect(wrapper).toHaveClass('active');
  });

  it('não aplica classe active quando count = 0', () => {
    const onBallExchangeIncrement = vi.fn();
    const { container } = render(
      <ActionBar
        {...defaultProps}
        ballExchangeCount={0}
        onBallExchangeIncrement={onBallExchangeIncrement}
      />,
    );
    const wrapper = container.querySelector('.ball-exchange-inline');
    expect(wrapper).not.toHaveClass('active');
  });
});
