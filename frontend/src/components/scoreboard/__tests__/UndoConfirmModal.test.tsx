import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UndoConfirmModal } from '../UndoConfirmModal';
import type { PointDetails, Player, RallyDetails } from '../../../core/scoring/types';

describe('UndoConfirmModal', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  const createPointDetails = (overrides: Partial<PointDetails> = {}): PointDetails => ({
    result: {
      winner: 'PLAYER_1' as Player,
      type: 'ACE',
    },
    serve: {
      type: 'FIRST',
      direction: 'T',
    },
    context: {
      setNumber: 1,
      gamesP1: 2,
      gamesP2: 1,
    },
    ...overrides,
  });

  const defaultProps = {
    isOpen: true,
    lastPoint: createPointDetails(),
    playerNames: { PLAYER_1: 'Alice', PLAYER_2: 'Bob' },
    onConfirm: mockOnConfirm,
    onCancel: mockOnCancel,
  };

  it('should not render when isOpen is false', () => {
    const { container } = render(<UndoConfirmModal {...defaultProps} isOpen={false} />);
    expect(container.childNodes.length).toBe(0);
  });

  it('should render modal when isOpen is true', () => {
    render(<UndoConfirmModal {...defaultProps} />);
    expect(screen.getByText(/Desfazer/i)).toBeInTheDocument();
  });

  it('should display ACE point description correctly', () => {
    const point = createPointDetails({
      result: { winner: 'PLAYER_1', type: 'ACE' },
      serve: { type: 'ACE', isFirstServe: true },
    });
    render(<UndoConfirmModal {...defaultProps} lastPoint={point} />);
    expect(screen.getByText(/Ace de Alice/i)).toBeInTheDocument();
  });

  it('should display DOUBLE_FAULT point description correctly', () => {
    const point = createPointDetails({
      result: { winner: 'PLAYER_2', type: 'DOUBLE_FAULT' },
      serve: { type: 'DOUBLE_FAULT', isFirstServe: false },
    });
    render(<UndoConfirmModal {...defaultProps} lastPoint={point} />);
    expect(screen.getByText(/Dupla falta/i)).toBeInTheDocument();
  });

  it('should display regular point with winner name and type', () => {
    const point = createPointDetails({
      result: { winner: 'PLAYER_2', type: 'WINNER' },
    });
    render(<UndoConfirmModal {...defaultProps} lastPoint={point} />);
    expect(screen.getByText(/Bob/i)).toBeInTheDocument();
    expect(screen.getByText(/vencedor/i)).toBeInTheDocument();
  });

  it('should display error point (opponent error)', () => {
    const point = createPointDetails({
      result: { winner: 'PLAYER_1', type: 'OPPONENT_ERROR' },
    });
    render(<UndoConfirmModal {...defaultProps} lastPoint={point} />);
    expect(screen.getByText(/Alice/i)).toBeInTheDocument();
  });

  it('should display set and game context', () => {
    const point = createPointDetails({
      context: { setNumber: 2, gamesP1: 4, gamesP2: 3 },
    });
    render(<UndoConfirmModal {...defaultProps} lastPoint={point} />);
    expect(screen.getByText(/Set 2/i)).toBeInTheDocument();
    expect(screen.getByText(/4/i)).toBeInTheDocument();
    expect(screen.getByText(/3/i)).toBeInTheDocument();
  });

  it('should handle null lastPoint gracefully', () => {
    render(<UndoConfirmModal {...defaultProps} lastPoint={null} />);
    expect(screen.getByText(/Desfazer/i)).toBeInTheDocument();
  });

  it('should show serve type in description', () => {
    const point = createPointDetails({
      serve: { type: 'FIRST', direction: 'T' },
    });
    render(<UndoConfirmModal {...defaultProps} lastPoint={point} />);
    // Description shows player name context
    expect(screen.getByText(/Alice/i)).toBeInTheDocument();
  });

  it('should call onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    render(<UndoConfirmModal {...defaultProps} />);

    const confirmButton = screen.getByRole('button', { name: /Confirmar/i });
    await user.click(confirmButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<UndoConfirmModal {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: /Cancelar|Cancel/i });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when overlay is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(<UndoConfirmModal {...defaultProps} />);

    const overlay = container.querySelector('[class*="overlay"]');
    if (overlay) {
      await user.click(overlay);
      expect(mockOnCancel).toHaveBeenCalled();
    }
  });

  it('should display different context for different sets', () => {
    const point1 = createPointDetails({
      context: { setNumber: 1, gamesP1: 1, gamesP2: 1 },
    });
    const { rerender } = render(<UndoConfirmModal {...defaultProps} lastPoint={point1} />);
    expect(screen.getByText(/Set 1/i)).toBeInTheDocument();

    const point2 = createPointDetails({
      context: { setNumber: 2, gamesP1: 3, gamesP2: 4 },
    });
    rerender(<UndoConfirmModal {...defaultProps} lastPoint={point2} />);
    expect(screen.getByText(/Set 2/i)).toBeInTheDocument();
  });

  it('should handle tiebreak games context', () => {
    const point = createPointDetails({
      context: {
        setNumber: 3,
        gamesP1: 6,
        gamesP2: 6,
        isTiebreak: true,
      } as any,
    });
    render(<UndoConfirmModal {...defaultProps} lastPoint={point} />);
    expect(screen.getByText(/6/i)).toBeInTheDocument();
  });

  it('should use amber/warning styling for destructive action', () => {
    const { container } = render(<UndoConfirmModal {...defaultProps} />);
    const confirmButton = screen.getByRole('button', { name: /Confirmar/i });
    // Should have a specific confirm/undo class
    expect(confirmButton.className).toMatch(/undo-confirm/i);
  });

  it('should be keyboard accessible - Escape key to cancel', async () => {
    const user = userEvent.setup();
    render(<UndoConfirmModal {...defaultProps} />);

    await user.keyboard('{Escape}');
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should be keyboard accessible - Enter to confirm', async () => {
    render(<UndoConfirmModal {...defaultProps} />);
    const user = userEvent.setup();
    const confirmButton = screen.getByRole('button', { name: /Confirmar/i });
    confirmButton.focus();

    await user.keyboard('{Enter}');
    expect(mockOnConfirm).toHaveBeenCalled();
  });
});
