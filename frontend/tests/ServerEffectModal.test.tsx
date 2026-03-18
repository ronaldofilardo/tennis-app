// tests/ServerEffectModal.test.tsx
// Testes do modal "Efeito do Saque" — cobre render, fontScale e interações

import "../vitest.setup";

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ── Mocks de CSS ────────────────────────────────────────────
vi.mock("../src/components/ServerEffectModal.css", () => ({}));

import ServerEffectModal from "../src/components/ServerEffectModal";

// ── Helpers ──────────────────────────────────────────────────
const defaultProps = {
  isOpen: true,
  playerInFocus: "PLAYER_1" as const,
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe("ServerEffectModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Renderização ─────────────────────────────────────────
  describe("Renderização básica", () => {
    it("não renderiza quando isOpen é false", () => {
      render(<ServerEffectModal {...defaultProps} isOpen={false} />);
      expect(
        screen.queryByTestId("server-effect-modal"),
      ).not.toBeInTheDocument();
    });

    it("renderiza o modal quando isOpen é true", () => {
      render(<ServerEffectModal {...defaultProps} />);
      expect(screen.getByTestId("server-effect-modal")).toBeInTheDocument();
    });

    it("exibe título 'Efeito do Saque'", () => {
      render(<ServerEffectModal {...defaultProps} />);
      expect(screen.getByText(/Efeito do Saque/i)).toBeInTheDocument();
    });

    it("indica 'Jogador 1' quando playerInFocus é PLAYER_1", () => {
      render(<ServerEffectModal {...defaultProps} playerInFocus="PLAYER_1" />);
      expect(screen.getByText(/Jogador 1/i)).toBeInTheDocument();
    });

    it("indica 'Jogador 2' quando playerInFocus é PLAYER_2", () => {
      render(<ServerEffectModal {...defaultProps} playerInFocus="PLAYER_2" />);
      expect(screen.getByText(/Jogador 2/i)).toBeInTheDocument();
    });

    it("exibe botões de efeito: TopSpin, Slice, Flat", () => {
      render(<ServerEffectModal {...defaultProps} />);
      expect(screen.getByText("TopSpin")).toBeInTheDocument();
      expect(screen.getByText("Slice")).toBeInTheDocument();
      expect(screen.getByText("Flat")).toBeInTheDocument();
    });

    it("exibe botões de direção: Aberto, Centro, Fechado", () => {
      render(<ServerEffectModal {...defaultProps} />);
      expect(screen.getByText("Aberto")).toBeInTheDocument();
      expect(screen.getByText("Centro")).toBeInTheDocument();
      expect(screen.getByText("Fechado")).toBeInTheDocument();
    });
  });

  // ── fontScale → --sb-scale ───────────────────────────────
  describe("fontScale → variável CSS --sb-scale", () => {
    it("aplica --sb-scale=1 por padrão (sem prop fontScale)", () => {
      render(<ServerEffectModal {...defaultProps} />);
      const modal = screen.getByTestId("server-effect-modal");
      expect(modal).toHaveStyle({ "--sb-scale": "1" });
    });

    it("aplica --sb-scale com valor numérico passado via fontScale", () => {
      render(<ServerEffectModal {...defaultProps} fontScale={1.4} />);
      const modal = screen.getByTestId("server-effect-modal");
      expect(modal).toHaveStyle({ "--sb-scale": "1.4" });
    });

    it("aplica --sb-scale com valor mínimo (0.6)", () => {
      render(<ServerEffectModal {...defaultProps} fontScale={0.6} />);
      const modal = screen.getByTestId("server-effect-modal");
      expect(modal).toHaveStyle({ "--sb-scale": "0.6" });
    });

    it("aplica --sb-scale com valor máximo (2.0)", () => {
      render(<ServerEffectModal {...defaultProps} fontScale={2.0} />);
      const modal = screen.getByTestId("server-effect-modal");
      expect(modal).toHaveStyle({ "--sb-scale": "2" });
    });

    it("atualiza --sb-scale ao re-render com novo fontScale", () => {
      const { rerender } = render(
        <ServerEffectModal {...defaultProps} fontScale={1} />,
      );
      const modal = screen.getByTestId("server-effect-modal");
      expect(modal).toHaveStyle({ "--sb-scale": "1" });

      rerender(<ServerEffectModal {...defaultProps} fontScale={1.6} />);
      expect(modal).toHaveStyle({ "--sb-scale": "1.6" });
    });
  });

  // ── Interações ───────────────────────────────────────────
  describe("Interações com botões", () => {
    it("chama onCancel ao clicar no overlay", () => {
      render(<ServerEffectModal {...defaultProps} />);
      const overlay = document.querySelector(".server-effect-modal-overlay");
      expect(overlay).toBeInTheDocument();
      fireEvent.click(overlay!);
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it("chama onCancel ao clicar no botão Cancelar", () => {
      render(<ServerEffectModal {...defaultProps} />);
      fireEvent.click(screen.getByLabelText("Cancel ServerEffect"));
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it("chama onConfirm sem efeito/direção ao clicar em Confirmar sem seleção", () => {
      render(<ServerEffectModal {...defaultProps} />);
      fireEvent.click(screen.getByLabelText("Confirm ServerEffect"));
      expect(defaultProps.onConfirm).toHaveBeenCalledWith(undefined, undefined);
    });

    it("chama onConfirm com efeito selecionado", () => {
      render(<ServerEffectModal {...defaultProps} />);
      fireEvent.click(screen.getByText("TopSpin"));
      fireEvent.click(screen.getByLabelText("Confirm ServerEffect"));
      expect(defaultProps.onConfirm).toHaveBeenCalledWith("TopSpin", undefined);
    });

    it("chama onConfirm com direção selecionada", () => {
      render(<ServerEffectModal {...defaultProps} />);
      fireEvent.click(screen.getByText("Fechado"));
      fireEvent.click(screen.getByLabelText("Confirm ServerEffect"));
      expect(defaultProps.onConfirm).toHaveBeenCalledWith(undefined, "Fechado");
    });

    it("chama onConfirm com efeito e direção selecionados", () => {
      render(<ServerEffectModal {...defaultProps} />);
      fireEvent.click(screen.getByText("Slice"));
      fireEvent.click(screen.getByText("Aberto"));
      fireEvent.click(screen.getByLabelText("Confirm ServerEffect"));
      expect(defaultProps.onConfirm).toHaveBeenCalledWith("Slice", "Aberto");
    });

    it("clique no modal não propaga para overlay (não chama onCancel)", () => {
      render(<ServerEffectModal {...defaultProps} />);
      const modal = screen.getByTestId("server-effect-modal");
      fireEvent.click(modal);
      expect(defaultProps.onCancel).not.toHaveBeenCalled();
    });

    it("reseta seleção de efeito/direção ao reabrir o modal", () => {
      const { rerender } = render(<ServerEffectModal {...defaultProps} />);
      // Seleciona um efeito
      fireEvent.click(screen.getByText("Slice"));
      // Fecha e reabre
      rerender(<ServerEffectModal {...defaultProps} isOpen={false} />);
      rerender(<ServerEffectModal {...defaultProps} isOpen={true} />);
      // Confirma sem seleção — deve chamar com undefined
      fireEvent.click(screen.getByLabelText("Confirm ServerEffect"));
      expect(defaultProps.onConfirm).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  // ── Contexto de Erro de Saque ─────────────────────────────
  describe("Contexto de Erro (context='error')", () => {
    it("renderiza com header de erro quando context='error'", () => {
      render(
        <ServerEffectModal
          {...defaultProps}
          context="error"
          errorType="out"
          serveStep="first"
        />,
      );
      expect(screen.getByText(/⚠️ Erro de Saque/i)).toBeInTheDocument();
      expect(screen.getByText(/Out/i)).toBeInTheDocument();
    });

    it("indica corretamente o tipo de erro (Out)", () => {
      render(
        <ServerEffectModal
          {...defaultProps}
          context="error"
          errorType="out"
          serveStep="first"
        />,
      );
      expect(screen.getByText(/Out/i)).toBeInTheDocument();
    });

    it("indica corretamente o tipo de erro (Net)", () => {
      render(
        <ServerEffectModal
          {...defaultProps}
          context="error"
          errorType="net"
          serveStep="first"
        />,
      );
      expect(screen.getByText(/Net/i)).toBeInTheDocument();
    });

    it("exibe botão 'Registrar e Continuar' para 1º saque com erro", () => {
      render(
        <ServerEffectModal
          {...defaultProps}
          context="error"
          errorType="out"
          serveStep="first"
        />,
      );
      expect(screen.getByText(/Registrar e Continuar/i)).toBeInTheDocument();
    });

    it("exibe botão 'Registrar Dupla Falta' para 2º saque com erro", () => {
      render(
        <ServerEffectModal
          {...defaultProps}
          context="error"
          errorType="net"
          serveStep="second"
        />,
      );
      expect(screen.getByText(/Registrar Dupla Falta/i)).toBeInTheDocument();
    });

    it("aplica classe CSS de erro ao modal", () => {
      render(
        <ServerEffectModal
          {...defaultProps}
          context="error"
          errorType="out"
          serveStep="first"
        />,
      );
      const modal = screen.getByTestId("server-effect-modal");
      expect(modal.className).toContain("server-effect-modal--error");
    });

    it("permite seleção de efeito e direção no contexto de erro", () => {
      render(
        <ServerEffectModal
          {...defaultProps}
          context="error"
          errorType="out"
          serveStep="first"
        />,
      );
      fireEvent.click(screen.getByText("TopSpin"));
      fireEvent.click(screen.getByText("Centro"));
      fireEvent.click(screen.getByLabelText("Confirm ServerEffect"));
      expect(defaultProps.onConfirm).toHaveBeenCalledWith("TopSpin", "Centro");
    });

    it("chama onConfirm com efeito/direção ao confirmar erro de 1º saque", () => {
      render(
        <ServerEffectModal
          {...defaultProps}
          context="error"
          errorType="out"
          serveStep="first"
        />,
      );
      fireEvent.click(screen.getByText("Slice"));
      fireEvent.click(screen.getByText("Aberto"));
      fireEvent.click(screen.getByText(/Registrar e Continuar/i));
      expect(defaultProps.onConfirm).toHaveBeenCalledWith("Slice", "Aberto");
    });

    it("chama onConfirm sem seleção ao confirmar erro sem efeito/direção", () => {
      render(
        <ServerEffectModal
          {...defaultProps}
          context="error"
          errorType="net"
          serveStep="second"
        />,
      );
      fireEvent.click(screen.getByText(/Registrar Dupla Falta/i));
      expect(defaultProps.onConfirm).toHaveBeenCalledWith(undefined, undefined);
    });

    it("permite cancelamento do erro de saque", () => {
      render(
        <ServerEffectModal
          {...defaultProps}
          context="error"
          errorType="out"
          serveStep="first"
        />,
      );
      fireEvent.click(screen.getByLabelText("Cancel ServerEffect"));
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });
  });
});
