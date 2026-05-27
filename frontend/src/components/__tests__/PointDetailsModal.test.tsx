import '../../../vitest.setup';

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PointDetailsModalExport from '../PointDetailsModal';

// Mocks de CSS
vi.mock('../PointDetailsModal.css', () => ({}));
vi.mock('../PointDetailsModalAdvanced.css', () => ({}));

// Mock ConfirmCloseDialog para simplificar testes
vi.mock('../ConfirmCloseDialog', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="confirm-close-dialog" /> : null,
}));

// Mock ErrorBoundary
vi.mock('../ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const defaultProps = {
  isOpen: true,
  playerWinner: 'PLAYER_1' as const,
  currentServer: 'PLAYER_1' as const,
  playerNames: { PLAYER_1: 'Alice', PLAYER_2: 'Bob' },
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
  fontScale: 1,
};

describe('PointDetailsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não renderiza quando isOpen é false', () => {
    render(<PointDetailsModalExport {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renderiza o modal quando isOpen é true', () => {
    render(<PointDetailsModalExport {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Detalhes do Ponto')).toBeInTheDocument();
  });

  it('exibe o vencedor no badge do header', () => {
    render(<PointDetailsModalExport {...defaultProps} />);
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
  });

  it('botão Confirmar está desabilitado antes de selecionar golpe', () => {
    render(<PointDetailsModalExport {...defaultProps} />);
    const confirmBtn = screen.getByRole('button', { name: /Confirmar Ponto/i });
    expect(confirmBtn).toBeDisabled();
  });

  it('campo Cliques de Bola inicializa com 0 quando ballExchangeCount não é fornecido', () => {
    render(<PointDetailsModalExport {...defaultProps} />);
    const input = screen.getByLabelText(/cliques de bola/i) as HTMLInputElement;
    expect(input.value).toBe('0');
  });

  it('campo Cliques de Bola inicializa com 0 quando ballExchangeCount é 0', () => {
    render(<PointDetailsModalExport {...defaultProps} ballExchangeCount={0} />);
    const input = screen.getByLabelText(/cliques de bola/i) as HTMLInputElement;
    expect(input.value).toBe('0');
  });

  it('campo Cliques de Bola inicializa com ballExchangeCount quando > 0', () => {
    render(<PointDetailsModalExport {...defaultProps} ballExchangeCount={4} />);
    const input = screen.getByLabelText(/cliques de bola/i) as HTMLInputElement;
    expect(input.value).toBe('4');
  });

  it('campo Cliques de Bola aceita edição manual', () => {
    render(<PointDetailsModalExport {...defaultProps} ballExchangeCount={2} />);
    const input = screen.getByLabelText(/cliques de bola/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '6' } });
    expect(input.value).toBe('6');
  });

  it('clicar dentro do modal não dispara onCancel (stopPropagation)', () => {
    render(<PointDetailsModalExport {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it('botão Cancelar chama onCancel', () => {
    render(<PointDetailsModalExport {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('renderiza seção "1. Situação do Ponto" sempre visível', () => {
    render(<PointDetailsModalExport {...defaultProps} />);
    expect(screen.getByText(/Situação do Ponto/)).toBeInTheDocument();
  });

  it('re-inicializa ballExchanges ao reabrir com novo valor', () => {
    const { rerender } = render(
      <PointDetailsModalExport {...defaultProps} isOpen={false} ballExchangeCount={3} />,
    );
    rerender(<PointDetailsModalExport {...defaultProps} isOpen={true} ballExchangeCount={3} />);
    const input = screen.getByLabelText(/cliques de bola/i) as HTMLInputElement;
    expect(input.value).toBe('3');
  });
});
