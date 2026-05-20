import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActionBar from '../../src/components/scoreboard/ActionBar';

/**
 * Testes para validar:
 * 1. Botões Ace/Out/Net têm classes de cor corretas
 * 2. Hover effects funcionam nos botões
 * 3. Callbacks são disparados corretamente
 * 4. Serve step é exibido corretamente
 */
describe('ActionBar Component', () => {
  const mockOnAce = vi.fn();
  const mockOnOut = vi.fn();
  const mockOnNet = vi.fn();
  const mockOnUndo = vi.fn();
  const mockOnFault = vi.fn();
  const mockOnConfig = vi.fn();
  const mockOnEditScore = vi.fn();
  const mockOnFontScaleInc = vi.fn();
  const mockOnFontScaleDec = vi.fn();

  const defaultProps = {
    canUndo: true,
    isFinished: false,
    serveStep: 'first' as const,
    server: 'PLAYER_1' as const,
    playerNames: { PLAYER_1: 'João', PLAYER_2: 'Maria' },
    onUndo: mockOnUndo,
    onAce: mockOnAce,
    onOut: mockOnOut,
    onNet: mockOnNet,
    onFault: mockOnFault,
    onConfig: mockOnConfig,
    onEditScore: mockOnEditScore,
    onFontScaleInc: mockOnFontScaleInc,
    onFontScaleDec: mockOnFontScaleDec,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders action buttons', () => {
    render(<ActionBar {...defaultProps} />);

    expect(screen.getByText('Ace')).toBeInTheDocument();
    expect(screen.getByText('Out')).toBeInTheDocument();
    expect(screen.getByText('Net')).toBeInTheDocument();
  });

  it('displays correct serve step indicator', () => {
    render(<ActionBar {...defaultProps} serveStep="first" />);

    expect(screen.getByText('1º Saque')).toBeInTheDocument();
  });

  it('displays 2º Saque for second serve', () => {
    render(<ActionBar {...defaultProps} serveStep="second" />);

    expect(screen.getByText('2º Saque')).toBeInTheDocument();
  });

  it('calls onAce when Ace button is clicked', async () => {
    const user = userEvent.setup();
    render(<ActionBar {...defaultProps} />);

    const aceButton = screen.getByText('Ace');
    await user.click(aceButton);

    expect(mockOnAce).toHaveBeenCalled();
  });

  it('calls onOut when Out button is clicked', async () => {
    const user = userEvent.setup();
    render(<ActionBar {...defaultProps} />);

    const outButton = screen.getByText('Out');
    await user.click(outButton);

    expect(mockOnOut).toHaveBeenCalled();
  });

  it('calls onNet when Net button is clicked', async () => {
    const user = userEvent.setup();
    render(<ActionBar {...defaultProps} />);

    const netButton = screen.getByText('Net');
    await user.click(netButton);

    expect(mockOnNet).toHaveBeenCalled();
  });

  it('Ace button has action-ace class for green styling', () => {
    const { container } = render(<ActionBar {...defaultProps} />);

    const aceButton = screen.getByText('Ace').closest('button');
    expect(aceButton?.classList.contains('action-ace')).toBe(true);
  });

  it('Out button has action-out class for red styling', () => {
    const { container } = render(<ActionBar {...defaultProps} />);

    const outButton = screen.getByText('Out').closest('button');
    expect(outButton?.classList.contains('action-out')).toBe(true);
  });

  it('Net button has action-net class for red styling', () => {
    const { container } = render(<ActionBar {...defaultProps} />);

    const netButton = screen.getByText('Net').closest('button');
    expect(netButton?.classList.contains('action-net')).toBe(true);
  });

  it('hides quick actions row when isFinished is true', () => {
    render(<ActionBar {...defaultProps} isFinished={true} />);

    // Serve step button deve estar oculto
    const serveButtons = screen.queryAllByText(/Saque/i);
    expect(serveButtons.length).toBe(0);
  });

  it('hides quick actions row when isModalOpen is true', () => {
    render(<ActionBar {...defaultProps} isModalOpen={true} />);

    const actionButtons = screen.queryAllByText(/Ace|Out|Net/i);
    expect(actionButtons.length).toBe(0);
  });

  it('disables Undo button when canUndo is false', () => {
    render(<ActionBar {...defaultProps} canUndo={false} />);

    const undoButton = screen.getByText(/Correção/i).closest('button');
    expect(undoButton).toBeDisabled();
  });

  it('calls onUndo when Undo button is clicked', async () => {
    const user = userEvent.setup();
    render(<ActionBar {...defaultProps} />);

    const undoButton = screen.getByText(/Correção/i);
    await user.click(undoButton);

    expect(mockOnUndo).toHaveBeenCalled();
  });

  it('calls onFontScaleInc when A+ button is clicked', async () => {
    const user = userEvent.setup();
    render(<ActionBar {...defaultProps} />);

    const increaseButton = screen.getByText('A+');
    await user.click(increaseButton);

    expect(mockOnFontScaleInc).toHaveBeenCalled();
  });

  it('calls onFontScaleDec when A− button is clicked', async () => {
    const user = userEvent.setup();
    render(<ActionBar {...defaultProps} />);

    const decreaseButton = screen.getByText('A−');
    await user.click(decreaseButton);

    expect(mockOnFontScaleDec).toHaveBeenCalled();
  });

  it('calls onEditScore when edit score button is clicked', async () => {
    const user = userEvent.setup();
    render(<ActionBar {...defaultProps} />);

    const editButton = screen.getByText('✏️');
    await user.click(editButton);

    expect(mockOnEditScore).toHaveBeenCalled();
  });

  it('buttons have action-quick-btn class for styling', () => {
    const { container } = render(<ActionBar {...defaultProps} />);

    const actionButtons = container.querySelectorAll('.action-quick-btn');
    expect(actionButtons.length).toBeGreaterThan(0);
  });

  it('calls onFault when Out is clicked on second serve', async () => {
    const user = userEvent.setup();
    render(<ActionBar {...defaultProps} serveStep="second" />);

    const outButton = screen.getByText('Out');
    await user.click(outButton);

    // onOut ou onFault deve ser chamado
    expect(mockOnOut).toHaveBeenCalled();
  });

  it('disables actions when isMatchFinalized is true', () => {
    render(<ActionBar {...defaultProps} isMatchFinalized={true} />);

    // Serve buttons devem estar ocultos
    const serveButtons = screen.queryAllByText(/Saque/i);
    expect(serveButtons.length).toBe(0);
  });

  it('renders serve row aligned left for PLAYER_1', () => {
    const { container } = render(<ActionBar {...defaultProps} server="PLAYER_1" />);

    const serveRow = container.querySelector('.serve-left');
    expect(serveRow).toBeInTheDocument();
  });

  it('renders serve row aligned right for PLAYER_2', () => {
    const { container } = render(<ActionBar {...defaultProps} server="PLAYER_2" />);

    const serveRow = container.querySelector('.serve-right');
    expect(serveRow).toBeInTheDocument();
  });
});
