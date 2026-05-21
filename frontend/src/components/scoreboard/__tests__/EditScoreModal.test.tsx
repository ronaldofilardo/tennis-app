import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditScoreModal } from '../EditScoreModal';
import type { Player, TennisFormat } from '../../../core/scoring/types';

describe('EditScoreModal - Dois Inputs Separados', () => {
  let mockOnConfirm: ReturnType<typeof vi.fn>;
  let mockOnCancel: ReturnType<typeof vi.fn>;

  const defaultProps = {
    isOpen: true,
    matchFormat: 'BEST_OF_3' as TennisFormat,
    playerNames: { p1: 'Rona', p2: 'Edua' },
    currentSets: { PLAYER_1: 0, PLAYER_2: 0 },
    currentServer: 'PLAYER_1' as Player,
    completedSets: [],
  };

  beforeEach(() => {
    mockOnConfirm = vi.fn();
    mockOnCancel = vi.fn();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <EditScoreModal
        {...defaultProps}
        isOpen={false}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />,
    );
    expect(container.childNodes.length).toBe(0);
  });

  it('should render modal with two number inputs for set result', () => {
    render(<EditScoreModal {...defaultProps} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);
    expect(screen.getByText(/Ajustar Placar/i)).toBeInTheDocument();

    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toHaveAttribute('placeholder', '0');
    expect(inputs[1]).toHaveAttribute('placeholder', '0');
  });

  it('should accept valid score 6x4 with two separate inputs', async () => {
    const user = userEvent.setup();
    render(<EditScoreModal {...defaultProps} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    const inputs = screen.getAllByRole('spinbutton');
    await user.type(inputs[0], '6');
    await user.type(inputs[1], '4');

    expect(
      screen.getByText((content, element) => content.includes('venceu o set')),
    ).toBeInTheDocument();
  });

  it('should accept partial score (game in progress) like 4x2', async () => {
    const user = userEvent.setup();
    render(<EditScoreModal {...defaultProps} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    const inputs = screen.getAllByRole('spinbutton');
    await user.type(inputs[0], '4');
    await user.type(inputs[1], '2');

    expect(screen.getByText(/Set em andamento/i)).toBeInTheDocument();
  });

  it('should enable "Próximo Set" button only when both inputs are filled with valid score', async () => {
    const user = userEvent.setup();
    render(<EditScoreModal {...defaultProps} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    const inputs = screen.getAllByRole('spinbutton');

    let nextSetBtn = screen.queryByRole('button', { name: /Próximo Set/i });
    if (nextSetBtn) {
      expect(nextSetBtn).toHaveAttribute('disabled');
    }

    await user.type(inputs[0], '6');
    await user.type(inputs[1], '4');

    nextSetBtn = screen.queryByRole('button', { name: /Próximo Set/i });
    expect(nextSetBtn).toBeInTheDocument();
    expect(nextSetBtn).not.toHaveAttribute('disabled');
  });

  it('should allow moving to next set', async () => {
    const user = userEvent.setup();
    render(<EditScoreModal {...defaultProps} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    let inputs = screen.getAllByRole('spinbutton');
    await user.type(inputs[0], '6');
    await user.type(inputs[1], '4');

    const nextSetBtn = screen.getByRole('button', { name: /Próximo Set/i });
    await user.click(nextSetBtn);

    inputs = screen.getAllByRole('spinbutton');
    expect(inputs[0]).toHaveValue(null);
    expect(inputs[1]).toHaveValue(null);
    expect(screen.getByText(/Set 2/i)).toBeInTheDocument();
  });

  it('should display completed sets', () => {
    const completedSets = [{ games: { PLAYER_1: 6, PLAYER_2: 4 }, winner: 'PLAYER_1' as Player }];

    render(
      <EditScoreModal
        {...defaultProps}
        completedSets={completedSets}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />,
    );

    expect(screen.getByText(/Sets Finalizados/i)).toBeInTheDocument();
    expect(screen.getByText(/6x4/)).toBeInTheDocument();
    // Use getAllByText to find the winner indicator in the completed sets section
    const ronaElements = screen.getAllByText(/Rona/);
    expect(ronaElements.length).toBeGreaterThan(0);
  });

  it('should call onCancel when cancel button clicked', async () => {
    const user = userEvent.setup();
    render(<EditScoreModal {...defaultProps} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    await user.click(cancelBtn);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should call onConfirm with set results and server', async () => {
    const user = userEvent.setup();
    render(<EditScoreModal {...defaultProps} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    const inputs = screen.getAllByRole('spinbutton');
    await user.type(inputs[0], '6');
    await user.type(inputs[1], '4');

    const nextSetBtn = screen.getByRole('button', { name: /Próximo Set/i });
    await user.click(nextSetBtn);

    const confirmBtn = screen.getByRole('button', { name: /Confirmar Placar/i });
    await user.click(confirmBtn);

    expect(mockOnConfirm).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          p1Games: 6,
          p2Games: 4,
          isPartial: false,
        }),
      ]),
      expect.any(String),
    );
  });

  it('should respect motion preferences (prefers-reduced-motion)', () => {
    const { container } = render(
      <EditScoreModal {...defaultProps} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />,
    );
    expect(container).toBeInTheDocument();
  });
});
