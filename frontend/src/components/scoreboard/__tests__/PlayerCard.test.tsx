import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PlayerCard from '../PlayerCard';

const defaultProps = {
  player: 'PLAYER_1' as const,
  name: 'Jogador Um',
  score: '0' as const,
  games: 0,
  sets: 0,
  isServing: false,
  serveStep: 'none' as const,
  isTiebreak: false,
  isMatchPoint: false,
  isSetPoint: false,
  isBreakPoint: false,
  isAdvantage: false,
  isDeuce: false,
  viewMode: 'simple' as const,
  disabled: false,
  onPress: vi.fn(),
  onSwipeDown: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PlayerCard — interações de ponteiro', () => {
  it('chama onPress ao clicar', () => {
    render(<PlayerCard {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    expect(defaultProps.onPress).toHaveBeenCalledTimes(1);
  });

  it('NÃO chama onSwipeDown ao mover o mouse sem estar pressionado (hover)', () => {
    render(<PlayerCard {...defaultProps} />);
    const btn = screen.getByRole('button');

    // Simula hover sem pressionar — y começa em 0, move para 300
    fireEvent.pointerMove(btn, { clientY: 300, clientX: 50 });

    expect(defaultProps.onSwipeDown).not.toHaveBeenCalled();
  });

  it('chama onSwipeDown ao fazer swipe para baixo com ponteiro pressionado', () => {
    render(<PlayerCard {...defaultProps} />);
    const btn = screen.getByRole('button');

    // Press em y=100
    fireEvent.pointerDown(btn, { clientY: 100, clientX: 50 });
    // Move > 80px para baixo
    fireEvent.pointerMove(btn, { clientY: 200, clientX: 50 });

    expect(defaultProps.onSwipeDown).toHaveBeenCalledTimes(1);
  });

  it('NÃO chama onSwipeDown após soltar o ponteiro e mover o mouse', () => {
    render(<PlayerCard {...defaultProps} />);
    const btn = screen.getByRole('button');

    // Sequência: press → release → move (hover)
    fireEvent.pointerDown(btn, { clientY: 100, clientX: 50 });
    fireEvent.pointerUp(btn);
    // Depois de soltar, mover > 80px não deve disparar undo
    fireEvent.pointerMove(btn, { clientY: 300, clientX: 50 });

    expect(defaultProps.onSwipeDown).not.toHaveBeenCalled();
  });

  it('NÃO chama onSwipeDown após pointerCancel e mover o mouse', () => {
    render(<PlayerCard {...defaultProps} />);
    const btn = screen.getByRole('button');

    fireEvent.pointerDown(btn, { clientY: 100, clientX: 50 });
    fireEvent.pointerCancel(btn);
    fireEvent.pointerMove(btn, { clientY: 300, clientX: 50 });

    expect(defaultProps.onSwipeDown).not.toHaveBeenCalled();
  });

  it('NÃO chama onPress quando disabled', () => {
    render(<PlayerCard {...defaultProps} disabled={true} />);
    fireEvent.click(screen.getByRole('button'));
    expect(defaultProps.onPress).not.toHaveBeenCalled();
  });

  it('NÃO chama onSwipeDown quando disabled (pointerDown bloqueado)', () => {
    render(<PlayerCard {...defaultProps} disabled={true} />);
    const btn = screen.getByRole('button');

    // disabled=true no pointerDown impede isPointerDown de ser setado
    fireEvent.pointerDown(btn, { clientY: 100, clientX: 50 });
    fireEvent.pointerMove(btn, { clientY: 300, clientX: 50 });

    expect(defaultProps.onSwipeDown).not.toHaveBeenCalled();
  });

  it('exibe score fornecido', () => {
    render(<PlayerCard {...defaultProps} score="40" />);
    expect(screen.getByText('40')).toBeTruthy();
  });

  it('exibe ADV quando score é AD e isAdvantage=true', () => {
    render(<PlayerCard {...defaultProps} score="AD" isAdvantage={true} />);
    expect(screen.getByText('ADV')).toBeTruthy();
  });
});
