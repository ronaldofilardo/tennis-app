import "../../../vitest.setup";

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ServerEffectModal from "../ServerEffectModal";
import type { Player } from "../../core/scoring/types";

// Mock do CSS para evitar erros de import
vi.mock("../ServerEffectModal.css", () => ({}));

interface ServerEffectModalProps {
  isOpen: boolean;
  playerInFocus: Player;
  onConfirm: (effect?: string, direction?: string) => void;
  onCancel: () => void;
}

const defaultProps: ServerEffectModalProps = {
  isOpen: true,
  playerInFocus: "PLAYER_1",
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe("ServerEffectModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Renderização básica", () => {
    it("não renderiza quando isOpen é false", () => {
      render(<ServerEffectModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText("🎾 Efeito do Saque")).toBeNull();
    });

    it("renderiza o modal quando isOpen é true", () => {
      render(<ServerEffectModal {...defaultProps} />);
      expect(screen.getByText("🎾 Efeito do Saque")).toBeTruthy();
    });

    it("exibe o jogador em foco corretamente", () => {
      render(<ServerEffectModal {...defaultProps} />);
      expect(screen.getByText(/Ponto para:/)).toBeTruthy();
      expect(screen.getByText("Jogador 1")).toBeTruthy();
    });

    it("exibe o jogador em foco para PLAYER_2", () => {
      render(<ServerEffectModal {...defaultProps} playerInFocus="PLAYER_2" />);
      expect(screen.getByText(/Ponto para:/)).toBeTruthy();
      expect(screen.getByText("Jogador 2")).toBeTruthy();
    });
  });

  describe("Opções de Efeito", () => {
    it("exibe todas as opções de efeito", () => {
      render(<ServerEffectModal {...defaultProps} />);
      expect(screen.getByText("Efeito (opcional)")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Chapado" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Top spin" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Cortado" })).toBeTruthy();
    });

    it("permite seleção de efeito", () => {
      render(<ServerEffectModal {...defaultProps} />);
      const efeitoButton = screen.getByRole("button", { name: "Chapado" });
      fireEvent.click(efeitoButton);
      expect(efeitoButton.classList.contains("active")).toBe(true);
    });

    it("permite mudança de efeito", () => {
      render(<ServerEffectModal {...defaultProps} />);
      const chapadoButton = screen.getByRole("button", { name: "Chapado" });
      const topspinButton = screen.getByRole("button", { name: "Top spin" });

      fireEvent.click(chapadoButton);
      expect(chapadoButton.classList.contains("active")).toBe(true);

      fireEvent.click(topspinButton);
      expect(chapadoButton.classList.contains("active")).toBe(false);
      expect(topspinButton.classList.contains("active")).toBe(true);
    });
  });

  describe("Opções de Direção", () => {
    it("exibe todas as opções de direção", () => {
      render(<ServerEffectModal {...defaultProps} />);
      expect(screen.getByText("Direção (opcional)")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Fechado" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Aberto" })).toBeTruthy();
    });

    it("permite seleção de direção", () => {
      render(<ServerEffectModal {...defaultProps} />);
      const direcaoButton = screen.getByRole("button", { name: "Fechado" });
      fireEvent.click(direcaoButton);
      expect(direcaoButton.classList.contains("active")).toBe(true);
    });

    it("permite mudança de direção", () => {
      render(<ServerEffectModal {...defaultProps} />);
      const fechadoButton = screen.getByRole("button", { name: "Fechado" });
      const abertoButton = screen.getByRole("button", { name: "Aberto" });

      fireEvent.click(fechadoButton);
      expect(fechadoButton.classList.contains("active")).toBe(true);

      fireEvent.click(abertoButton);
      expect(fechadoButton.classList.contains("active")).toBe(false);
      expect(abertoButton.classList.contains("active")).toBe(true);
    });
  });

  describe("Botão Confirmar Ponto", () => {
    it("está sempre habilitado", () => {
      render(<ServerEffectModal {...defaultProps} />);
      const confirmButton = screen.getByRole("button", {
        name: /Confirm ServerEffect/i,
      }) as HTMLButtonElement;
      expect(confirmButton.disabled).toBe(false);
    });

    it("permite confirmação sem seleção de efeito ou direção", () => {
      const mockOnConfirm = vi.fn();
      render(<ServerEffectModal {...defaultProps} onConfirm={mockOnConfirm} />);

      const confirmButton = screen.getByRole("button", {
        name: /Confirm ServerEffect/i,
      });
      fireEvent.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledWith(undefined, undefined);
    });

    it("permite confirmação com apenas efeito selecionado", () => {
      const mockOnConfirm = vi.fn();
      render(<ServerEffectModal {...defaultProps} onConfirm={mockOnConfirm} />);

      fireEvent.click(screen.getByRole("button", { name: "Chapado" }));
      fireEvent.click(
        screen.getByRole("button", { name: /Confirm ServerEffect/i }),
      );

      expect(mockOnConfirm).toHaveBeenCalledWith("Chapado", undefined);
    });

    it("permite confirmação com apenas direção selecionada", () => {
      const mockOnConfirm = vi.fn();
      render(<ServerEffectModal {...defaultProps} onConfirm={mockOnConfirm} />);

      fireEvent.click(screen.getByRole("button", { name: "Fechado" }));
      fireEvent.click(
        screen.getByRole("button", { name: /Confirm ServerEffect/i }),
      );

      expect(mockOnConfirm).toHaveBeenCalledWith(undefined, "Fechado");
    });

    it("permite confirmação com efeito e direção selecionados", () => {
      const mockOnConfirm = vi.fn();
      render(<ServerEffectModal {...defaultProps} onConfirm={mockOnConfirm} />);

      fireEvent.click(screen.getByRole("button", { name: "Top spin" }));
      fireEvent.click(screen.getByRole("button", { name: "Aberto" }));
      fireEvent.click(
        screen.getByRole("button", { name: /Confirm ServerEffect/i }),
      );

      expect(mockOnConfirm).toHaveBeenCalledWith("Top spin", "Aberto");
    });
  });

  describe("Reset ao reabrir", () => {
    it("reseta seleções quando modal é reaberto", () => {
      const { rerender } = render(<ServerEffectModal {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: "Chapado" }));
      fireEvent.click(screen.getByRole("button", { name: "Fechado" }));

      expect(
        screen
          .getByRole("button", { name: "Chapado" })
          .classList.contains("active"),
      ).toBe(true);
      expect(
        screen
          .getByRole("button", { name: "Fechado" })
          .classList.contains("active"),
      ).toBe(true);

      // Fechar modal
      rerender(<ServerEffectModal {...defaultProps} isOpen={false} />);

      // Reabrir modal
      rerender(<ServerEffectModal {...defaultProps} isOpen={true} />);

      expect(
        screen
          .getByRole("button", { name: "Chapado" })
          .classList.contains("active"),
      ).toBe(false);
      expect(
        screen
          .getByRole("button", { name: "Fechado" })
          .classList.contains("active"),
      ).toBe(false);
    });
  });

  describe("Cancelamento", () => {
    it("chama onCancel quando botão Cancelar é clicado", () => {
      const mockOnCancel = vi.fn();
      render(<ServerEffectModal {...defaultProps} onCancel={mockOnCancel} />);
      fireEvent.click(
        screen.getByRole("button", { name: /Cancel ServerEffect/i }),
      );
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe("Interações de overlay", () => {
    it("chama onCancel quando overlay é clicado", () => {
      const mockOnCancel = vi.fn();
      const { container } = render(
        <ServerEffectModal {...defaultProps} onCancel={mockOnCancel} />,
      );
      const overlay = container.querySelector(".server-effect-modal-overlay");
      if (overlay) {
        fireEvent.click(overlay);
        expect(mockOnCancel).toHaveBeenCalledTimes(1);
      }
    });

    it("não chama onCancel quando modal content é clicado", () => {
      const mockOnCancel = vi.fn();
      const { container } = render(
        <ServerEffectModal {...defaultProps} onCancel={mockOnCancel} />,
      );
      const modalContent = container.querySelector(".server-effect-modal");
      if (modalContent) {
        fireEvent.click(modalContent);
        expect(mockOnCancel).not.toHaveBeenCalled();
      }
    });
  });

  // ── Novos testes: redesign dark theme ────────────────────────────────────────

  describe("Redesign — estrutura dark theme", () => {
    it("botão Confirmar aparece antes do botão Cancelar no DOM", () => {
      const { container } = render(<ServerEffectModal {...defaultProps} />);
      const actions = container.querySelector(".modal-actions");
      expect(actions).not.toBeNull();
      const buttons = actions!.querySelectorAll("button");
      expect(buttons.length).toBe(2);
      expect(buttons[0]).toHaveAttribute("aria-label", "Confirm ServerEffect");
      expect(buttons[1]).toHaveAttribute("aria-label", "Cancel ServerEffect");
    });

    it("usa classe confirm-btn no botão de confirmação", () => {
      const { container } = render(<ServerEffectModal {...defaultProps} />);
      expect(container.querySelector(".confirm-btn")).toBeInTheDocument();
    });

    it("usa classe cancel-btn no botão de cancelamento", () => {
      const { container } = render(<ServerEffectModal {...defaultProps} />);
      expect(container.querySelector(".cancel-btn")).toBeInTheDocument();
    });

    it("botões de opção usam classe button-group button", () => {
      const { container } = render(<ServerEffectModal {...defaultProps} />);
      const buttonGroup = container.querySelector(".button-group");
      expect(buttonGroup).toBeInTheDocument();
      expect(buttonGroup!.querySelectorAll("button").length).toBeGreaterThan(0);
    });

    it("botão selecionado recebe classe active", () => {
      render(<ServerEffectModal {...defaultProps} />);
      const btn = screen.getByRole("button", { name: "Top spin" });
      fireEvent.click(btn);
      expect(btn.classList.contains("active")).toBe(true);
    });

    it("usa data-testid=server-effect-modal no container", () => {
      render(<ServerEffectModal {...defaultProps} />);
      expect(screen.getByTestId("server-effect-modal")).toBeInTheDocument();
    });
  });
});
