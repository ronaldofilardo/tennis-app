// tests/PointDetailsModal.test.tsx
// Testes do modal "Detalhes do Ponto" — cobre render, fontScale e fluxo básico

import "../vitest.setup";

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ── Mocks de CSS ────────────────────────────────────────────
vi.mock("../src/components/PointDetailsModal.css", () => ({}));

// Mock pointFlowRules para isolar do motor de regras
vi.mock("../src/core/scoring/pointFlowRules", () => ({
  getValidSituacoes: () => ["fundo", "rede", "passada"] as const,
  getValidTipos: (_v: string, _s: string) =>
    ["winner", "erro-forcado", "erro-nao-forcado"] as const,
  requiresSubtipo1: () => false,
  requiresSubtipo2: () => false,
  requiresEfeito: () => false,
  getValidSubtipo1: () => [],
  getValidSubtipo2: () => [],
  getValidGolpes: () => ["BH", "FH"] as const,
  getValidEfeitos: () => ["Plano", "Liftado"] as const,
  getValidDirecoes: () => ["Paralela", "Cruzada"] as const,
  getValidGolpeEsp: () => [],
  SITUACAO_LABELS: {
    fundo: "Fundo",
    rede: "Rede",
    passada: "Passada",
    devolucao: "Devolução",
  },
  TIPO_LABELS: {
    winner: "Winner",
    "erro-forcado": "Erro Forçado",
    "erro-nao-forcado": "Erro Não-Forçado",
  },
  SUBTIPO1_LABELS: {},
  SUBTIPO2_LABELS: {},
  GOLPE_LABELS: { BH: "Backhand", FH: "Forehand" },
  EFEITO_LABELS: { Plano: "Plano", Liftado: "Liftado" },
  DIRECAO_LABELS: { Paralela: "Paralela", Cruzada: "Cruzada" },
  GOLPE_ESP_LABELS: {},
}));

import PointDetailsModal from "../src/components/PointDetailsModal";

// ── Helpers ──────────────────────────────────────────────────
const defaultProps = {
  isOpen: true,
  playerWinner: "PLAYER_1" as const,
  currentServer: "PLAYER_1" as const,
  playerNames: { PLAYER_1: "João", PLAYER_2: "Maria" },
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe("PointDetailsModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Renderização ─────────────────────────────────────────
  describe("Renderização básica", () => {
    it("não renderiza quando isOpen é false", () => {
      render(<PointDetailsModal {...defaultProps} isOpen={false} />);
      expect(
        document.querySelector(".point-details-modal"),
      ).not.toBeInTheDocument();
    });

    it("renderiza o modal quando isOpen é true", () => {
      render(<PointDetailsModal {...defaultProps} />);
      expect(
        document.querySelector(".point-details-modal"),
      ).toBeInTheDocument();
    });

    it("exibe nome do vencedor do ponto", () => {
      render(<PointDetailsModal {...defaultProps} />);
      expect(screen.getByText(/João/i)).toBeInTheDocument();
    });

    it("exibe nome de PLAYER_2 como vencedor quando corresponde", () => {
      render(
        <PointDetailsModal
          {...defaultProps}
          playerWinner="PLAYER_2"
          currentServer="PLAYER_1"
        />,
      );
      expect(screen.getByText(/Maria/i)).toBeInTheDocument();
    });

    it("exibe botão Confirmar Ponto (inicialmente desabilitado)", () => {
      render(<PointDetailsModal {...defaultProps} />);
      const btn = screen.getByRole("button", { name: /confirmar ponto/i });
      expect(btn).toBeInTheDocument();
      expect(btn).toBeDisabled();
    });

    it("exibe botão Cancelar", () => {
      render(<PointDetailsModal {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: /cancelar/i }),
      ).toBeInTheDocument();
    });
  });

  // ── fontScale → --sb-scale ───────────────────────────────
  describe("fontScale → variável CSS --sb-scale", () => {
    it("aplica --sb-scale=1 por padrão (sem prop fontScale)", () => {
      render(<PointDetailsModal {...defaultProps} />);
      const modal = document.querySelector(
        ".point-details-modal",
      ) as HTMLElement;
      expect(modal).toHaveStyle({ "--sb-scale": "1" });
    });

    it("aplica --sb-scale com valor 1.2 passado via fontScale", () => {
      render(<PointDetailsModal {...defaultProps} fontScale={1.2} />);
      const modal = document.querySelector(
        ".point-details-modal",
      ) as HTMLElement;
      expect(modal).toHaveStyle({ "--sb-scale": "1.2" });
    });

    it("aplica --sb-scale com valor mínimo (0.6)", () => {
      render(<PointDetailsModal {...defaultProps} fontScale={0.6} />);
      const modal = document.querySelector(
        ".point-details-modal",
      ) as HTMLElement;
      expect(modal).toHaveStyle({ "--sb-scale": "0.6" });
    });

    it("aplica --sb-scale com valor máximo (2.0)", () => {
      render(<PointDetailsModal {...defaultProps} fontScale={2.0} />);
      const modal = document.querySelector(
        ".point-details-modal",
      ) as HTMLElement;
      expect(modal).toHaveStyle({ "--sb-scale": "2" });
    });

    it("atualiza --sb-scale ao re-render com novo fontScale", () => {
      const { rerender } = render(
        <PointDetailsModal {...defaultProps} fontScale={1} />,
      );
      const modal = document.querySelector(
        ".point-details-modal",
      ) as HTMLElement;
      expect(modal).toHaveStyle({ "--sb-scale": "1" });

      rerender(<PointDetailsModal {...defaultProps} fontScale={1.8} />);
      expect(modal).toHaveStyle({ "--sb-scale": "1.8" });
    });
  });

  // ── Interações ───────────────────────────────────────────
  describe("Interações com botões de ação", () => {
    it("chama onCancel ao clicar em Cancelar", () => {
      render(<PointDetailsModal {...defaultProps} />);
      fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it("botão Confirmar fica habilitado após selecionar golpe", () => {
      render(<PointDetailsModal {...defaultProps} />);
      // Seleciona situação → tipo → golpe (isComplete = !!sel.golpe)
      fireEvent.click(screen.getByText("Fundo"));
      fireEvent.click(screen.getByText("Winner"));
      fireEvent.click(screen.getByText("Backhand"));
      const btn = screen.getByRole("button", { name: /confirmar ponto/i });
      expect(btn).not.toBeDisabled();
    });

    it("chama onConfirm com detalhes após preencher golpe e confirmar", () => {
      render(<PointDetailsModal {...defaultProps} />);
      fireEvent.click(screen.getByText("Fundo"));
      fireEvent.click(screen.getByText("Winner"));
      fireEvent.click(screen.getByText("Backhand"));
      fireEvent.click(screen.getByRole("button", { name: /confirmar ponto/i }));
      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
      // deve receber objeto RallyDetails, não undefined
      expect(defaultProps.onConfirm).not.toHaveBeenCalledWith(undefined);
    });

    it("reseta seleção ao reabrir modal (nova passagem de isOpen)", () => {
      const { rerender } = render(<PointDetailsModal {...defaultProps} />);
      // Faz uma seleção
      fireEvent.click(screen.getByText("Fundo"));
      // fecha e reabre
      rerender(<PointDetailsModal {...defaultProps} isOpen={false} />);
      rerender(<PointDetailsModal {...defaultProps} isOpen={true} />);
      // Botão Confirmar deve estar desabilitado novamente
      const btn = screen.getByRole("button", { name: /confirmar ponto/i });
      expect(btn).toBeDisabled();
    });
  });

  // ── Situação inicial de seleção ───────────────────────────
  describe("Fluxo de seleção de situação", () => {
    it("renderiza as opções de situação: Fundo, Rede, Passada", () => {
      render(<PointDetailsModal {...defaultProps} />);
      expect(screen.getByText("Fundo")).toBeInTheDocument();
      expect(screen.getByText("Rede")).toBeInTheDocument();
      expect(screen.getByText("Passada")).toBeInTheDocument();
    });

    it("ao clicar em uma situação, exibe botões de tipo", () => {
      render(<PointDetailsModal {...defaultProps} />);
      fireEvent.click(screen.getByText("Fundo"));
      expect(screen.getByText("Winner")).toBeInTheDocument();
      expect(screen.getByText("Erro Forçado")).toBeInTheDocument();
      expect(screen.getByText("Erro Não-Forçado")).toBeInTheDocument();
    });
  });
});
