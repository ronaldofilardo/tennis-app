import '../../../vitest.setup';

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ServerEffectModal from '../ServerEffectModal';
import type { Player } from '../../core/scoring/types';

// Mock do CSS para evitar erros de import
vi.mock('../ServerEffectModal.css', () => ({}));

interface ServerEffectModalProps {
  isOpen: boolean;
  playerInFocus: Player;
  onConfirm: (effect?: string, direction?: string) => void;
  onCancel: () => void;
}

const defaultProps: ServerEffectModalProps = {
  isOpen: true,
  playerInFocus: 'PLAYER_1',
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe('ServerEffectModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Renderização básica', () => {
    it('não renderiza quando isOpen é false', () => {
      render(<ServerEffectModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('🎾 Efeito do Saque')).toBeNull();
    });

    it('renderiza o modal quando isOpen é true', () => {
      render(<ServerEffectModal {...defaultProps} />);
      expect(screen.getByText('🎾 Efeito do Saque')).toBeTruthy();
    });

    it('exibe o jogador em foco corretamente', () => {
      render(<ServerEffectModal {...defaultProps} />);
      expect(screen.getByText(/Ponto para:/)).toBeTruthy();
      expect(screen.getByText('Jogador 1')).toBeTruthy();
    });

    it('exibe o jogador em foco para PLAYER_2', () => {
      render(<ServerEffectModal {...defaultProps} playerInFocus="PLAYER_2" />);
      expect(screen.getByText(/Ponto para:/)).toBeTruthy();
      expect(screen.getByText('Jogador 2')).toBeTruthy();
    });
  });

  describe('Opções de Efeito', () => {
    it('exibe todas as opções de efeito', () => {
      render(<ServerEffectModal {...defaultProps} />);
      expect(screen.getByText('Efeito (opcional)')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'TopSpin' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Slice' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Flat' })).toBeTruthy();
    });

    it('permite seleção de efeito', () => {
      render(<ServerEffectModal {...defaultProps} />);
      const efeitoButton = screen.getByRole('button', { name: 'TopSpin' });
      fireEvent.click(efeitoButton);
      expect(efeitoButton.classList.contains('active')).toBe(true);
    });

    it('permite mudança de efeito', () => {
      render(<ServerEffectModal {...defaultProps} />);
      const topspinButton = screen.getByRole('button', { name: 'TopSpin' });
      const sliceButton = screen.getByRole('button', { name: 'Slice' });

      fireEvent.click(topspinButton);
      expect(topspinButton.classList.contains('active')).toBe(true);

      fireEvent.click(sliceButton);
      expect(topspinButton.classList.contains('active')).toBe(false);
      expect(sliceButton.classList.contains('active')).toBe(true);
    });
  });

  describe('Opções de Direção', () => {
    it('exibe todas as opções de direção', () => {
      render(<ServerEffectModal {...defaultProps} />);
      expect(screen.getByText('Direção (opcional)')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Aberto' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Centro' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Fechado' })).toBeTruthy();
    });

    it('permite seleção de direção', () => {
      render(<ServerEffectModal {...defaultProps} />);
      const direcaoButton = screen.getByRole('button', { name: 'Aberto' });
      fireEvent.click(direcaoButton);
      expect(direcaoButton.classList.contains('active')).toBe(true);
    });

    it('permite mudança de direção', () => {
      render(<ServerEffectModal {...defaultProps} />);
      const abertoButton = screen.getByRole('button', { name: 'Aberto' });
      const centroButton = screen.getByRole('button', { name: 'Centro' });

      fireEvent.click(abertoButton);
      expect(abertoButton.classList.contains('active')).toBe(true);

      fireEvent.click(centroButton);
      expect(abertoButton.classList.contains('active')).toBe(false);
      expect(centroButton.classList.contains('active')).toBe(true);
    });
  });

  describe('Botão Confirmar Ponto', () => {
    it('está sempre habilitado', () => {
      render(<ServerEffectModal {...defaultProps} />);
      const confirmButton = screen.getByRole('button', {
        name: /Confirm ServerEffect/i,
      }) as HTMLButtonElement;
      expect(confirmButton.disabled).toBe(false);
    });

    it('permite confirmação sem seleção de efeito ou direção', () => {
      const mockOnConfirm = vi.fn();
      render(<ServerEffectModal {...defaultProps} onConfirm={mockOnConfirm} />);

      const confirmButton = screen.getByRole('button', {
        name: /Confirm ServerEffect/i,
      });
      fireEvent.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledWith(undefined, undefined);
    });

    it('permite confirmação com apenas efeito selecionado', () => {
      const mockOnConfirm = vi.fn();
      render(<ServerEffectModal {...defaultProps} onConfirm={mockOnConfirm} />);

      fireEvent.click(screen.getByRole('button', { name: 'Slice' }));
      fireEvent.click(screen.getByRole('button', { name: /Confirm ServerEffect/i }));

      expect(mockOnConfirm).toHaveBeenCalledWith('Slice', undefined);
    });

    it('permite confirmação com apenas direção selecionada', () => {
      const mockOnConfirm = vi.fn();
      render(<ServerEffectModal {...defaultProps} onConfirm={mockOnConfirm} />);

      fireEvent.click(screen.getByRole('button', { name: 'Fechado' }));
      fireEvent.click(screen.getByRole('button', { name: /Confirm ServerEffect/i }));

      expect(mockOnConfirm).toHaveBeenCalledWith(undefined, 'Fechado');
    });

    it('permite confirmação com efeito e direção selecionados', () => {
      const mockOnConfirm = vi.fn();
      render(<ServerEffectModal {...defaultProps} onConfirm={mockOnConfirm} />);

      fireEvent.click(screen.getByRole('button', { name: 'TopSpin' }));
      fireEvent.click(screen.getByRole('button', { name: 'Aberto' }));
      fireEvent.click(screen.getByRole('button', { name: /Confirm ServerEffect/i }));

      expect(mockOnConfirm).toHaveBeenCalledWith('TopSpin', 'Aberto');
    });
  });

  describe('Reset ao reabrir', () => {
    it('reseta seleções quando modal é reaberto', () => {
      const { rerender } = render(<ServerEffectModal {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: 'TopSpin' }));
      fireEvent.click(screen.getByRole('button', { name: 'Fechado' }));

      expect(screen.getByRole('button', { name: 'TopSpin' }).classList.contains('active')).toBe(
        true,
      );
      expect(screen.getByRole('button', { name: 'Fechado' }).classList.contains('active')).toBe(
        true,
      );

      // Fechar modal
      rerender(<ServerEffectModal {...defaultProps} isOpen={false} />);

      // Reabrir modal
      rerender(<ServerEffectModal {...defaultProps} isOpen={true} />);

      expect(screen.getByRole('button', { name: 'TopSpin' }).classList.contains('active')).toBe(
        false,
      );
      expect(screen.getByRole('button', { name: 'Fechado' }).classList.contains('active')).toBe(
        false,
      );
    });
  });

  describe('Cancelamento', () => {
    it('chama onCancel quando botão Cancelar é clicado', () => {
      const mockOnCancel = vi.fn();
      render(<ServerEffectModal {...defaultProps} onCancel={mockOnCancel} />);
      fireEvent.click(screen.getByRole('button', { name: /Cancel ServerEffect/i }));
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Interações de overlay', () => {
    it('chama onCancel quando overlay é clicado', () => {
      const mockOnCancel = vi.fn();
      const { container } = render(<ServerEffectModal {...defaultProps} onCancel={mockOnCancel} />);
      const overlay = container.querySelector('.server-effect-modal-overlay');
      if (overlay) {
        fireEvent.click(overlay);
        expect(mockOnCancel).toHaveBeenCalledTimes(1);
      }
    });

    it('não chama onCancel quando modal content é clicado', () => {
      const mockOnCancel = vi.fn();
      const { container } = render(<ServerEffectModal {...defaultProps} onCancel={mockOnCancel} />);
      const modalContent = container.querySelector('.server-effect-modal');
      if (modalContent) {
        fireEvent.click(modalContent);
        expect(mockOnCancel).not.toHaveBeenCalled();
      }
    });
  });

  // ── Contexto de Erro de Saque ─────────────────────────────
  describe("Contexto de Erro (context='error')", () => {
    it("renderiza com header diferente quando context='error'", () => {
      render(
        <ServerEffectModal {...defaultProps} context="error" errorType="out" serveStep="first" />,
      );
      expect(screen.getByText(/⚠️ Erro de Saque/i)).toBeTruthy();
    });

    it("aplica classe CSS error quando context='error'", () => {
      render(
        <ServerEffectModal {...defaultProps} context="error" errorType="out" serveStep="first" />,
      );
      const modal = document.body.querySelector('.server-effect-modal--error');
      expect(modal).toBeInTheDocument();
    });

    it("mostra tipo de erro Out quando errorType='out'", () => {
      render(
        <ServerEffectModal {...defaultProps} context="error" errorType="out" serveStep="first" />,
      );
      expect(screen.getByText(/Out/i)).toBeTruthy();
    });

    it("mostra tipo de erro Net quando errorType='net'", () => {
      render(
        <ServerEffectModal {...defaultProps} context="error" errorType="net" serveStep="first" />,
      );
      expect(screen.getByText(/Net/i)).toBeTruthy();
    });

    it("mostra 'Registrar e Continuar' para 1º saque", () => {
      render(
        <ServerEffectModal {...defaultProps} context="error" errorType="out" serveStep="first" />,
      );
      expect(screen.getByText(/Registrar e Continuar/i)).toBeTruthy();
    });

    it("mostra 'Registrar Dupla Falta' para 2º saque", () => {
      render(
        <ServerEffectModal {...defaultProps} context="error" errorType="net" serveStep="second" />,
      );
      expect(screen.getByText(/Registrar Dupla Falta/i)).toBeTruthy();
    });

    it('permite seleção de efeito e direção em contexto de erro', () => {
      const mockOnConfirm = vi.fn();
      render(
        <ServerEffectModal
          {...defaultProps}
          context="error"
          errorType="out"
          serveStep="first"
          onConfirm={mockOnConfirm}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Slice' }));
      fireEvent.click(screen.getByRole('button', { name: 'Centro' }));
      fireEvent.click(screen.getByText(/Registrar e Continuar/i));

      expect(mockOnConfirm).toHaveBeenCalledWith('Slice', 'Centro');
    });

    it('registra dupla falta sem seleção em 2º saque', () => {
      const mockOnConfirm = vi.fn();
      render(
        <ServerEffectModal
          {...defaultProps}
          context="error"
          errorType="out"
          serveStep="second"
          onConfirm={mockOnConfirm}
        />,
      );
      fireEvent.click(screen.getByText(/Registrar Dupla Falta/i));
      expect(mockOnConfirm).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  // ── Novos testes: redesign dark theme ────────────────────────────────────────

  describe('Redesign — estrutura dark theme', () => {
    it('botão Confirmar aparece antes do botão Cancelar no DOM', () => {
      render(<ServerEffectModal {...defaultProps} />);
      const actions = document.body.querySelector('.modal-actions');
      expect(actions).not.toBeNull();
      const buttons = actions!.querySelectorAll('button');
      expect(buttons.length).toBe(2);
      expect(buttons[0]).toHaveAttribute('aria-label', 'Confirm ServerEffect');
      expect(buttons[1]).toHaveAttribute('aria-label', 'Cancel ServerEffect');
    });

    it('usa classe confirm-btn no botão de confirmação', () => {
      render(<ServerEffectModal {...defaultProps} />);
      expect(document.body.querySelector('.confirm-btn')).toBeInTheDocument();
    });

    it('usa classe cancel-btn no botão de cancelamento', () => {
      render(<ServerEffectModal {...defaultProps} />);
      expect(document.body.querySelector('.cancel-btn')).toBeInTheDocument();
    });

    it('botões de opção usam classe button-group button', () => {
      render(<ServerEffectModal {...defaultProps} />);
      const buttonGroup = document.body.querySelector('.button-group');
      expect(buttonGroup).toBeInTheDocument();
      expect(buttonGroup!.querySelectorAll('button').length).toBeGreaterThan(0);
    });

    it('botão selecionado recebe classe active', () => {
      render(<ServerEffectModal {...defaultProps} />);
      const btn = screen.getByRole('button', { name: 'TopSpin' });
      fireEvent.click(btn);
      expect(btn.classList.contains('active')).toBe(true);
    });

    it('usa data-testid=server-effect-modal no container', () => {
      render(<ServerEffectModal {...defaultProps} />);
      expect(screen.getByTestId('server-effect-modal')).toBeInTheDocument();
    });
  });
});
