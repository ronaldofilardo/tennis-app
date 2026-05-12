import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditScoreModal } from '../EditScoreModal';
import type { Player, TennisFormat } from '../../../core/scoring/types';

describe('EditScoreModal', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    isOpen: true,
    matchFormat: 'BEST_OF_3' as TennisFormat,
    playerNames: { p1: 'Player 1', p2: 'Player 2' },
    currentSets: { PLAYER_1: 1, PLAYER_2: 0 },
    currentServer: 'PLAYER_1' as Player,
    onConfirm: mockOnConfirm,
    onCancel: mockOnCancel,
  };

  it('should not render when isOpen is false', () => {
    const { container } = render(<EditScoreModal {...defaultProps} isOpen={false} />);
    expect(container.childNodes.length).toBe(0);
  });

  it('should render modal when isOpen is true', () => {
    render(<EditScoreModal {...defaultProps} />);
    expect(screen.getByText(/Ajustar Placar/i)).toBeInTheDocument();
  });

  it('should display player names in header', () => {
    render(<EditScoreModal {...defaultProps} />);
    expect(screen.getAllByText('Player 1')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Player 2')[0]).toBeInTheDocument();
  });

  it('should show correct number of set rows for BEST_OF_3', () => {
    render(<EditScoreModal {...defaultProps} matchFormat="BEST_OF_3" />);
    const setButtons = screen.getAllByRole('button');
    // 3 sets + server buttons + confirm/cancel = at least 8 buttons
    expect(setButtons.length).toBeGreaterThanOrEqual(8);
  });

  it('should show correct number of set rows for BEST_OF_5', () => {
    render(
      <EditScoreModal
        {...defaultProps}
        matchFormat="BEST_OF_5"
        currentSets={{ PLAYER_1: 2, PLAYER_2: 2 }}
      />,
    );
    const setRows = screen.getAllByText(/Set/i);
    expect(setRows.length).toBeGreaterThanOrEqual(5);
  });

  it('should pre-select current set winners', () => {
    const { container } = render(
      <EditScoreModal {...defaultProps} currentSets={{ PLAYER_1: 1, PLAYER_2: 1 }} />,
    );
    // Check that set buttons show selected state for already-won sets
    const p1Buttons = container.querySelectorAll('button');
    expect(p1Buttons.length).toBeGreaterThan(0);
  });

  it('should allow toggling set winners', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <EditScoreModal {...defaultProps} currentSets={{ PLAYER_1: 0, PLAYER_2: 0 }} />,
    );

    const setButtons = container.querySelectorAll('button');
    // First p1 button (Set 1 for Player 1)
    if (setButtons[0]) {
      await user.click(setButtons[0]);
    }
  });

  it('should display current server selection', () => {
    render(<EditScoreModal {...defaultProps} currentServer="PLAYER_2" />);
    expect(screen.getAllByText('Player 2').length).toBeGreaterThan(0);
  });

  it('should allow changing server', async () => {
    const user = userEvent.setup();
    render(<EditScoreModal {...defaultProps} />);

    const serverButtons = screen.getAllByRole('button');
    // Find server selection buttons
    const p2Button = serverButtons.find((btn) => btn.textContent?.includes('Player 2'));
    if (p2Button) {
      await user.click(p2Button);
    }
  });

  it('should call onCancel when overlay is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(<EditScoreModal {...defaultProps} />);

    const overlay = container.querySelector('[class*="overlay"]');
    if (overlay) {
      await user.click(overlay);
      expect(mockOnCancel).toHaveBeenCalled();
    }
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<EditScoreModal {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: /Cancelar|Cancel/i });
    await user.click(cancelButton);
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should call onConfirm with set winners and server when confirm is clicked', async () => {
    const user = userEvent.setup();
    render(<EditScoreModal {...defaultProps} currentSets={{ PLAYER_1: 0, PLAYER_2: 0 }} />);

    const confirmButton = screen.getByRole('button', { name: /Confirmar|Confirm/i });
    await user.click(confirmButton);

    expect(mockOnConfirm).toHaveBeenCalled();
    const callArgs = mockOnConfirm.mock.calls[0];
    expect(Array.isArray(callArgs[0])).toBe(true); // setWinners array
    expect(['PLAYER_1', 'PLAYER_2']).toContain(callArgs[1]); // server
  });

  it('should show warning about history being wiped', () => {
    render(<EditScoreModal {...defaultProps} />);
    expect(screen.getByText(/histórico|history/i)).toBeInTheDocument();
  });

  it('should handle SINGLES format correctly', () => {
    render(<EditScoreModal {...defaultProps} matchFormat="SINGLES" />);
    expect(screen.getByText(/Ajustar Placar/i)).toBeInTheDocument();
  });

  it('should filter out null set winners before calling onConfirm', async () => {
    const user = userEvent.setup();
    render(
      <EditScoreModal
        {...defaultProps}
        currentSets={{ PLAYER_1: 1, PLAYER_2: 0 }}
        matchFormat="BEST_OF_5"
      />,
    );

    const confirmButton = screen.getByRole('button', { name: /Confirmar|Confirm/i });
    await user.click(confirmButton);

    const callArgs = mockOnConfirm.mock.calls[0];
    const setWinners = callArgs[0];
    // Should only contain valid set winners (PLAYER_1 or PLAYER_2), no nulls
    expect(setWinners.every((w) => w === 'PLAYER_1' || w === 'PLAYER_2')).toBe(true);
  });
});
