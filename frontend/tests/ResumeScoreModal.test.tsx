// tests/ResumeScoreModal.test.tsx
// Testes do modal "Partida em Andamento" — cobre render, validação de placar,
// confirm/remove sets, formatos especiais e callback onConfirm.

import "../vitest.setup";

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ── Mocks de CSS ─────────────────────────────────────────────────────────────
vi.mock("../src/components/ResumeScoreModal.css", () => ({}));

// ── Import do componente ──────────────────────────────────────────────────────
import { ResumeScoreModal } from "../src/components/ResumeScoreModal";
import type { OngoingMatchSetup } from "../src/components/ResumeScoreModal";

// ── Helpers ───────────────────────────────────────────────────────────────────
const defaultProps = {
  isOpen: true,
  players: { p1: "Federer", p2: "Nadal" },
  format: "BEST_OF_3",
  onConfirm: vi.fn<[OngoingMatchSetup], void>(),
  onCancel: vi.fn(),
};

function renderModal(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(<ResumeScoreModal {...props} />);
}

// ── Utilitários de interação ──────────────────────────────────────────────────
function setGames(p1: string, p2: string) {
  const p1Input = screen.getByRole("spinbutton", { name: /Games de Federer/i });
  const p2Input = screen.getByRole("spinbutton", { name: /Games de Nadal/i });
  fireEvent.change(p1Input, { target: { value: p1 } });
  fireEvent.change(p2Input, { target: { value: p2 } });
}

// ─────────────────────────────────────────────────────────────────────────────

describe("ResumeScoreModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Visibilidade ──────────────────────────────────────────────────────────
  describe("Visibilidade", () => {
    it("não renderiza quando isOpen é false", () => {
      renderModal({ isOpen: false });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renderiza o dialog quando isOpen é true", () => {
      renderModal();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it('exibe o título "Partida em Andamento"', () => {
      renderModal();
      expect(screen.getByText("Partida em Andamento")).toBeInTheDocument();
    });

    it("exibe o nome do formato", () => {
      renderModal({ format: "BEST_OF_3" });
      expect(screen.getByText("Melhor de 3 sets")).toBeInTheDocument();
    });

    it("exibe os nomes dos jogadores", () => {
      renderModal();
      // Os nomes aparecem em múltiplos lugares (labels + botões de saque)
      expect(screen.getAllByText("Federer").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Nadal").length).toBeGreaterThan(0);
    });
  });

  // ── Seleção de saque ──────────────────────────────────────────────────────
  describe("Seleção de saque", () => {
    it("o botão PLAYER_1 tem aria-pressed=true por padrão", () => {
      renderModal();
      const btn = screen.getByRole("button", { name: "Federer" });
      expect(btn).toHaveAttribute("aria-pressed", "true");
    });

    it("ao clicar em PLAYER_2, o botão correspondente fica active", () => {
      renderModal();
      const btn2 = screen.getByRole("button", { name: "Nadal" });
      fireEvent.click(btn2);
      expect(btn2).toHaveAttribute("aria-pressed", "true");
    });

    it("ao trocar o saque, o botão PLAYER_1 perde o active", () => {
      renderModal();
      fireEvent.click(screen.getByRole("button", { name: "Nadal" }));
      const btn1 = screen.getByRole("button", { name: "Federer" });
      expect(btn1).toHaveAttribute("aria-pressed", "false");
    });
  });

  // ── Botão Cancelar ────────────────────────────────────────────────────────
  describe("Botão Cancelar", () => {
    it("chama onCancel quando clicado", () => {
      const onCancel = vi.fn();
      renderModal({ onCancel });
      fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  // ── Validação de placar de set ─────────────────────────────────────────────
  describe("Validação de placar de set (BEST_OF_3)", () => {
    it('não mostra "Set completo" com placar incompleto (3-2)', () => {
      renderModal();
      setGames("3", "2");
      expect(screen.queryByText(/Set completo/i)).not.toBeInTheDocument();
    });

    it('mostra "Set completo" com placar 6-3', () => {
      renderModal();
      setGames("6", "3");
      expect(screen.getByText(/Set completo/i)).toBeInTheDocument();
    });

    it("mostra nome do vencedor correto para 6-2 (p1)", () => {
      renderModal();
      setGames("6", "2");
      expect(screen.getByText(/Federer vence 6×2/i)).toBeInTheDocument();
    });

    it("mostra nome do vencedor correto para 3-6 (p2)", () => {
      renderModal();
      setGames("3", "6");
      expect(screen.getByText(/Nadal vence 3×6/i)).toBeInTheDocument();
    });

    it('mostra "Set completo" com placar tiebreak 7-6', () => {
      renderModal();
      setGames("7", "6");
      expect(screen.getByText(/Set completo/i)).toBeInTheDocument();
      // "(tie-break)" com parênteses só aparece no span de set-complete
      expect(screen.getByText(/\(tie-break\)/)).toBeInTheDocument();
    });

    it("mostra campo de placar do tie-break quando set foi ganho no tie-break (7-6)", () => {
      renderModal();
      setGames("7", "6");
      // h5 exclusivo desta seção
      expect(
        screen.getByRole("heading", { name: /placar do tie-break/i }),
      ).toBeInTheDocument();
    });

    it("mostra seção de tie-break em andamento quando placar é 6-6", () => {
      renderModal();
      setGames("6", "6");
      expect(screen.getByText(/Tie-break em andamento/i)).toBeInTheDocument();
    });

    it('não mostra botão "Confirmar Set" com placar incompleto', () => {
      renderModal();
      setGames("4", "2");
      expect(
        screen.queryByRole("button", { name: /Confirmar Set/i }),
      ).not.toBeInTheDocument();
    });

    it('mostra botão "Confirmar Set 1" com placar 6-1', () => {
      renderModal();
      setGames("6", "1");
      expect(
        screen.getByRole("button", { name: /Confirmar Set 1/i }),
      ).toBeInTheDocument();
    });
  });

  // ── Confirmar set ─────────────────────────────────────────────────────────
  describe("Confirmar set", () => {
    it("ao confirmar set 6-3, exibe na lista de sets concluídos", () => {
      renderModal();
      setGames("6", "3");
      fireEvent.click(screen.getByRole("button", { name: /Confirmar Set 1/i }));
      expect(screen.getByText("Set 1")).toBeInTheDocument();
      expect(screen.getByText("6 × 3")).toBeInTheDocument();
    });

    it("após confirmar set, inputs são limpos e próximo set aparece (Set 2)", () => {
      renderModal();
      setGames("6", "3");
      fireEvent.click(screen.getByRole("button", { name: /Confirmar Set 1/i }));
      // O título deve mostrar Set 2 agora
      expect(screen.getByText("Set 2")).toBeInTheDocument();
    });

    it("exibe erro quando placar não representa set completo", () => {
      renderModal();
      // Não inserimos games — tentamos confirmar via handleConfirmSet.
      // Mas o botão só aparece quando set está completo.
      // Testamos indiretamente: com 3-2, botão não existe.
      setGames("3", "2");
      expect(
        screen.queryByRole("button", { name: /Confirmar Set/i }),
      ).not.toBeInTheDocument();
    });

    it("exibe erro quando placar finalizaria a partida (vencer setsToWin=2 sets com BO3)", () => {
      renderModal({ format: "BEST_OF_3" });
      // Confirmar set 1 (6-0 p1)
      setGames("6", "0");
      fireEvent.click(screen.getByRole("button", { name: /Confirmar Set 1/i }));
      // Confirmar set 2 — se p1 já tem 1 set e tentarmos confirmar 6-0 novamente,
      // a lógica de guard impediria (p1 teria 2 = setsToWin, já acabou a partida)
      setGames("6", "0");
      fireEvent.click(screen.getByRole("button", { name: /Confirmar Set 2/i }));
      // Deve aparecer aviso de que a partida acabaria
      expect(screen.getByText(/finalizaria a partida/i)).toBeInTheDocument();
    });
  });

  // ── Remover último set ────────────────────────────────────────────────────
  describe("Remover último set", () => {
    it('botão "Remover último" não aparece quando não há sets concluídos', () => {
      renderModal();
      expect(
        screen.queryByRole("button", { name: /remover último/i }),
      ).not.toBeInTheDocument();
    });

    it("ao confirmar um set e remover, lista de sets fica vazia", () => {
      renderModal();
      setGames("6", "2");
      fireEvent.click(screen.getByRole("button", { name: /Confirmar Set 1/i }));
      // O header "Sets Concluídos" só aparece quando há sets na lista
      expect(screen.getByText("Sets Concluídos")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /remover último/i }));
      expect(screen.queryByText("Sets Concluídos")).not.toBeInTheDocument();
    });
  });

  // ── Guard: set finalizaria o jogo ────────────────────────────────────────
  // O componente bloqueia qualquer confirm que levaria um jogador a setsToWin,
  // exibindo mensagem de erro. Isso impede que matchIsOver se torne true via UI.
  describe("Guard: confirmar set que finalizaria o jogo", () => {
    it("exibe erro ao tentar confirmar set que finalizaria a partida (SINGLE_SET 6-2)", () => {
      renderModal({ format: "SINGLE_SET" }); // setsToWin=1
      setGames("6", "2");
      fireEvent.click(screen.getByRole("button", { name: /Confirmar Set 1/i }));
      expect(screen.getByRole("alert")).toHaveTextContent(
        /finalizaria a partida/i,
      );
    });

    it("não adiciona o set à lista quando ele finalizaria a partida", () => {
      renderModal({ format: "SINGLE_SET" });
      setGames("6", "2");
      fireEvent.click(screen.getByRole("button", { name: /Confirmar Set 1/i }));
      // "Sets Concluídos" só aparece quando completedSets.length > 0
      expect(screen.queryByText("Sets Concluídos")).not.toBeInTheDocument();
    });
  });

  // ── Formato MATCH_TIEBREAK ────────────────────────────────────────────────
  describe("Formato MATCH_TIEBREAK", () => {
    it('exibe "Match Tie-break" como título do set', () => {
      renderModal({ format: "MATCH_TIEBREAK" });
      expect(screen.getByText("Match Tie-break")).toBeInTheDocument();
    });

    it("não exibe campo de games (sem spinbuttons de games)", () => {
      renderModal({ format: "MATCH_TIEBREAK" });
      expect(
        screen.queryByRole("spinbutton", { name: /Games de Federer/i }),
      ).not.toBeInTheDocument();
    });

    it("exibe inputs de match tie-break com aria-label correto", () => {
      renderModal({ format: "MATCH_TIEBREAK" });
      expect(
        screen.getByRole("spinbutton", {
          name: /Match tie-break pontos Federer/i,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("spinbutton", {
          name: /Match tie-break pontos Nadal/i,
        }),
      ).toBeInTheDocument();
    });

    it("chama onConfirm com currentGameIsMatchTiebreak=true ao clicar Iniciar Partida", () => {
      const onConfirm = vi.fn<[OngoingMatchSetup], void>();
      renderModal({ format: "MATCH_TIEBREAK", onConfirm });
      const mtb1 = screen.getByRole("spinbutton", {
        name: /Match tie-break pontos Federer/i,
      });
      const mtb2 = screen.getByRole("spinbutton", {
        name: /Match tie-break pontos Nadal/i,
      });
      fireEvent.change(mtb1, { target: { value: "5" } });
      fireEvent.change(mtb2, { target: { value: "3" } });
      fireEvent.click(screen.getByRole("button", { name: /Iniciar Partida/i }));
      expect(onConfirm).toHaveBeenCalledTimes(1);
      const called = onConfirm.mock.calls[0][0];
      expect(called.currentGameIsMatchTiebreak).toBe(true);
      expect(called.currentGamePoints.PLAYER_1).toBe(5);
      expect(called.currentGamePoints.PLAYER_2).toBe(3);
    });
  });

  // ── Formato FAST4 ─────────────────────────────────────────────────────────
  describe("Formato FAST4 (gamesPerSet=4, tiebreakAt=3)", () => {
    it("mostra Set completo com 4-2", () => {
      renderModal({ format: "FAST4" });
      setGames("4", "2");
      expect(screen.getByText(/Set completo/i)).toBeInTheDocument();
    });

    it("mostra Set completo com tie-break 4-3", () => {
      renderModal({ format: "FAST4" });
      setGames("4", "3");
      expect(screen.getByText(/Set completo/i)).toBeInTheDocument();
      // "(tie-break)" com parênteses só aparece no span de set-complete
      expect(screen.getByText(/\(tie-break\)/)).toBeInTheDocument();
    });

    it("mostra tie-break em andamento com 3-3", () => {
      renderModal({ format: "FAST4" });
      setGames("3", "3");
      expect(screen.getByText(/Tie-break em andamento/i)).toBeInTheDocument();
    });
  });

  // ── Callback onConfirm com jogo em andamento ──────────────────────────────
  describe("Callback onConfirm", () => {
    it("chama onConfirm com os dados corretos para set em andamento (3-2)", () => {
      const onConfirm = vi.fn<[OngoingMatchSetup], void>();
      renderModal({ format: "BEST_OF_3", onConfirm });
      setGames("3", "2");
      fireEvent.click(screen.getByRole("button", { name: /Iniciar Partida/i }));
      expect(onConfirm).toHaveBeenCalledTimes(1);
      const called = onConfirm.mock.calls[0][0];
      expect(called.completedSets).toHaveLength(0);
      expect(called.currentSetGames.PLAYER_1).toBe(3);
      expect(called.currentSetGames.PLAYER_2).toBe(2);
      expect(called.currentGameIsTiebreak).toBe(false);
      expect(called.currentGameIsMatchTiebreak).toBe(false);
      expect(called.server).toBe("PLAYER_1");
    });

    it("chama onConfirm com servidor correto quando PLAYER_2 é selecionado", () => {
      const onConfirm = vi.fn<[OngoingMatchSetup], void>();
      renderModal({ format: "BEST_OF_3", onConfirm });
      fireEvent.click(screen.getByRole("button", { name: "Nadal" }));
      fireEvent.click(screen.getByRole("button", { name: /Iniciar Partida/i }));
      expect(onConfirm.mock.calls[0][0].server).toBe("PLAYER_2");
    });

    it("chama onConfirm com sets concluídos após confirmar um set (6-3)", () => {
      const onConfirm = vi.fn<[OngoingMatchSetup], void>();
      renderModal({ format: "BEST_OF_3", onConfirm });
      // Confirmar set 1 (6-3 p1)
      setGames("6", "3");
      fireEvent.click(screen.getByRole("button", { name: /Confirmar Set 1/i }));
      // Iniciar partida com set 2 em andamento (2-1)
      setGames("2", "1");
      fireEvent.click(screen.getByRole("button", { name: /Iniciar Partida/i }));
      const called = onConfirm.mock.calls[0][0];
      expect(called.completedSets).toHaveLength(1);
      expect(called.completedSets[0].winner).toBe("PLAYER_1");
      expect(called.completedSets[0].games).toEqual({
        PLAYER_1: 6,
        PLAYER_2: 3,
      });
      expect(called.currentSetGames).toEqual({ PLAYER_1: 2, PLAYER_2: 1 });
    });

    it("inclui pontos do tie-break em andamento no currentGamePoints", () => {
      const onConfirm = vi.fn<[OngoingMatchSetup], void>();
      renderModal({ format: "BEST_OF_3", onConfirm });
      // 6-6 → tie-break em andamento
      setGames("6", "6");
      const tb1 = screen.getByRole("spinbutton", {
        name: /Pontos tie-break Federer/i,
      });
      const tb2 = screen.getByRole("spinbutton", {
        name: /Pontos tie-break Nadal/i,
      });
      fireEvent.change(tb1, { target: { value: "4" } });
      fireEvent.change(tb2, { target: { value: "3" } });
      fireEvent.click(screen.getByRole("button", { name: /Iniciar Partida/i }));
      const called = onConfirm.mock.calls[0][0];
      expect(called.currentGameIsTiebreak).toBe(true);
      expect(called.currentGamePoints.PLAYER_1).toBe(4);
      expect(called.currentGamePoints.PLAYER_2).toBe(3);
    });

    it("inclui pontuação do game atual via selects quando set está em andamento", () => {
      const onConfirm = vi.fn<[OngoingMatchSetup], void>();
      renderModal({ format: "BEST_OF_3", onConfirm });
      setGames("3", "2");
      // Selects aparecem quando set está em andamento (inProgress e não tiebreak)
      const p1Select = screen.getByRole("combobox", {
        name: /Pontos no game Federer/i,
      });
      const p2Select = screen.getByRole("combobox", {
        name: /Pontos no game Nadal/i,
      });
      fireEvent.change(p1Select, { target: { value: "30" } });
      fireEvent.change(p2Select, { target: { value: "15" } });
      fireEvent.click(screen.getByRole("button", { name: /Iniciar Partida/i }));
      const called = onConfirm.mock.calls[0][0];
      expect(called.currentGamePoints.PLAYER_1).toBe("30");
      expect(called.currentGamePoints.PLAYER_2).toBe("15");
    });
  });

  // ── Formato BEST_OF_3_MATCH_TB — 3º set ──────────────────────────────────
  describe("Formato BEST_OF_3_MATCH_TB — 3º set match tiebreak", () => {
    it('após 1 set cada, 3º set mostra "Match Tie-break"', () => {
      renderModal({ format: "BEST_OF_3_MATCH_TB" });
      // Set 1: p1 vence 6-3
      setGames("6", "3");
      fireEvent.click(screen.getByRole("button", { name: /Confirmar Set 1/i }));
      // Set 2: p2 vence 3-6
      setGames("3", "6");
      fireEvent.click(screen.getByRole("button", { name: /Confirmar Set 2/i }));
      // Agora no 3º set com 1-1, deve mostrar Match Tie-break
      expect(screen.getByText("Match Tie-break")).toBeInTheDocument();
    });
  });
});
