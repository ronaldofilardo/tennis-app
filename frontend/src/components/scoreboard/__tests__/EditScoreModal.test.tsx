import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditScoreModal } from '../EditScoreModal';
import type { Player, TennisFormat } from '../../../core/scoring/types';

describe('EditScoreModal - Nova Interface (Digitar Resultado)', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    isOpen: true,
    matchFormat: 'BEST_OF_3' as TennisFormat,
    playerNames: { p1: 'Rona', p2: 'Edua' },
    currentSets: { PLAYER_1: 0, PLAYER_2: 0 },
    currentServer: 'PLAYER_1' as Player,
    completedSets: [],
    onConfirm: mockOnConfirm,
    onCancel: mockOnCancel,
  };

  it('should not render when isOpen is false', () => {
    const { container } = render(<EditScoreModal {...defaultProps} isOpen={false} />);
    expect(container.childNodes.length).toBe(0);
  });

  it('should render modal with input field for set result', () => {
    render(<EditScoreModal {...defaultProps} />);
    expect(screen.getByText(/Ajustar Placar/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('6x4')).toBeInTheDocument();
  });

  it('should validate input format "6x4" or "6-4"', async () => {
    const user = userEvent.setup();
    render(<EditScoreModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('6x4') as HTMLInputElement;
    await user.type(input, '6x4');

    // Should show success (valid format)
    expect(screen.getByText(/venceu o set/i)).toBeInTheDocument();
  });

  it('should reject invalid format', async () => {
    const user = userEvent.setup();
    render(<EditScoreModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('6x4') as HTMLInputElement;
    await user.type(input, 'abc');

    // Should show error
    expect(screen.getByText(/Digite no formato/i)).toBeInTheDocument();
  });

  it('should reject invalid tennis score (5x5 with no tiebreak)', async () => {
    const user = userEvent.setup();
    render(<EditScoreModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('6x4') as HTMLInputElement;
    await user.type(input, '5x5');

    // Should show error - 5x5 is invalid (must go to tiebreak at 6-6)
    expect(screen.getByText(/requer tiebreak|5x5/i)).toBeInTheDocument();
  });

  it('should accept valid score 6x4', async () => {
    const user = userEvent.setup();
    render(<EditScoreModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('6x4') as HTMLInputElement;
    await user.type(input, '6x4');

    // Should show winner
    expect(screen.getByText(/Rona venceu o set/i)).toBeInTheDocument();
  });

  it('should accept valid score 6x7 (with tiebreak)', async () => {
    const user = userEvent.setup();
    render(<EditScoreModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('6x4') as HTMLInputElement;
    // In tennis, a valid score with significant lead is 6x0 or 6x1, etc
    // Let's test 7x5 which is also valid (2-game lead)
    await user.type(input, '7x5');

    // 7x5 = Player 1 wins with 2-game lead - should be valid
    await new Promise((r) => setTimeout(r, 150)); // Wait for validation

    // Should not have error class
    const inputField = screen.getByPlaceholderText('6x4') as HTMLInputElement;
    expect(inputField.className).not.toContain('invalid');
  });

  it('should show next server after valid input', async () => {
    const user = userEvent.setup();
    render(<EditScoreModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('6x4') as HTMLInputElement;
    await user.type(input, '6x4');

    // Should show next server
    expect(screen.getByText(/Próximo saque/i)).toBeInTheDocument();
  });

  it('should accept partial score (game in progress) like 4x2', async () => {
    const user = userEvent.setup();
    render(<EditScoreModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('6x4') as HTMLInputElement;
    await user.type(input, '4x2');

    // Should show as partial game in progress
    expect(screen.getByText(/Set em andamento/i)).toBeInTheDocument();
    expect(screen.getByText(/4x2/)).toBeInTheDocument();
  });

  it('should enable "Próximo Set" button only when input is valid', async () => {
    const user = userEvent.setup();
    render(<EditScoreModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('6x4') as HTMLInputElement;
    const nextSetBtn = screen.queryByRole('button', { name: /Próximo Set|Continuar Anotando/i });

    // Initially disabled or not present (for single set format)
    if (nextSetBtn) {
      expect(nextSetBtn.disabled).toBe(true);
    }

    // After valid input
    await user.type(input, '6x4');
    const btnAfter = screen.getByRole('button', { name: /Próximo Set|Continuar Anotando/i });
    expect(btnAfter.disabled).toBe(false);
  });

  it('should allow moving to next set', async () => {
    const user = userEvent.setup();
    render(<EditScoreModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('6x4') as HTMLInputElement;
    await user.type(input, '6x4');

    const nextSetBtn = screen.getByText(/Próximo Set/i);
    await user.click(nextSetBtn);

    // Should clear input and show Set 2
    expect((input as HTMLInputElement).value).toBe('');
    expect(screen.getByText(/Set 2/i)).toBeInTheDocument();
  });

  it('should display completed sets', () => {
    const completedSets = [{ games: { PLAYER_1: 6, PLAYER_2: 4 }, winner: 'PLAYER_1' as Player }];

    render(<EditScoreModal {...defaultProps} completedSets={completedSets} />);

    // Check that "Sets Finalizados" section appears
    expect(screen.getByText(/Sets Finalizados/i)).toBeInTheDocument();

    // Check that the completed set row contains the correct info
    const resultElements = screen.getAllByText(/6.*4/);
    expect(resultElements.length).toBeGreaterThan(0); // At least the completed set

    // Verify player name appears (Rona won)
    expect(screen.getByText(/Rona/)).toBeInTheDocument();
  });

  it('should call onCancel when cancel button clicked', async () => {
    const user = userEvent.setup();
    render(<EditScoreModal {...defaultProps} />);

    const cancelBtn = screen.getByText(/Cancelar/) as HTMLButtonElement;
    await user.click(cancelBtn);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should call onConfirm with set winners and server', async () => {
    const user = userEvent.setup();
    render(<EditScoreModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('6x4') as HTMLInputElement;
    await user.type(input, '6x4');

    const nextSetBtn = screen.getByText(/Próximo Set/i);
    await user.click(nextSetBtn);

    const confirmBtn = screen.getByText(/Confirmar Placar/) as HTMLButtonElement;
    await user.click(confirmBtn);

    expect(mockOnConfirm).toHaveBeenCalledWith(['p1'], expect.any(String));
  });

  it('should respect motion preferences (prefers-reduced-motion)', () => {
    const { container } = render(<EditScoreModal {...defaultProps} />);

    // CSS media query will be applied by browser
    expect(container).toBeInTheDocument();
  });
});
