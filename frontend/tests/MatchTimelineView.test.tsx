// tests/MatchTimelineView.test.tsx
// Testes do componente MatchTimelineView — renderização, filtros e expansão de cards

import '../vitest.setup';

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { PointDetails } from '../src/core/scoring/types';

// Mocks de CSS
vi.mock('../src/components/MatchTimelineView.css', () => ({}));
vi.mock('../src/services/timelineUtils', async (importOriginal) => {
  // Importa real para não quebrar a lógica de filtragem, apenas o formatador de hora
  const real = await importOriginal<typeof import('../src/services/timelineUtils')>();
  return {
    ...real,
    // Normaliza formatPointTime para evitar dependência de timezone nos testes
    formatPointTime: (ts: number | undefined) => (ts ? '14:32:15' : ''),
  };
});

import MatchTimelineView from '../src/components/MatchTimelineView';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makePoint(overrides: Partial<PointDetails> = {}): PointDetails {
  return {
    result: { winner: 'PLAYER_1', type: 'WINNER' },
    shotPlayer: 'PLAYER_1',
    rally: { ballExchanges: 3 },
    timestamp: 1712620800000,
    ...overrides,
  };
}

const playerNames = { p1: 'João', p2: 'Maria' };

const basePoints: PointDetails[] = [
  makePoint({
    serve: { type: 'ACE', isFirstServe: true, serveEffect: 'Flat', direction: 'Aberto' },
  }),
  makePoint({
    result: { winner: 'PLAYER_2', type: 'UNFORCED_ERROR' },
    shotPlayer: 'PLAYER_2',
    serve: {
      type: 'DOUBLE_FAULT',
      isFirstServe: false,
      firstFault: { errorType: 'out' },
    },
  }),
  makePoint({
    result: { winner: 'PLAYER_1', type: 'FORCED_ERROR', finalShot: 'FOREHAND' },
    rallyDetails: {
      vencedor: 'sacador',
      situacao: 'fundo',
      tipo: 'erro-forcado',
      golpe: 'FH',
      efeito: 'topspin',
      direcao: 'paralela',
    },
    context: {
      setNumber: 1,
      gamesP1: 3,
      gamesP2: 2,
      setsWonP1: 0,
      setsWonP2: 0,
      gameScoreP1: '40',
      gameScoreP2: '30',
      server: 'PLAYER_1',
      isBreakPoint: false,
      isTiebreak: false,
    },
  }),
  makePoint({
    result: { winner: 'PLAYER_2', type: 'WINNER' },
    shotPlayer: 'PLAYER_2',
    context: {
      setNumber: 1,
      gamesP1: 3,
      gamesP2: 3,
      setsWonP1: 0,
      setsWonP2: 0,
      gameScoreP1: '0',
      gameScoreP2: '40',
      server: 'PLAYER_1',
      isBreakPoint: true,
      isTiebreak: false,
    },
  }),
];

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('MatchTimelineView', () => {
  describe('Estado vazio', () => {
    it('deve exibir mensagem quando não há pontos', () => {
      render(<MatchTimelineView pointsHistory={[]} playerNames={playerNames} />);
      expect(screen.getByText(/não possui pontos detalhados/i)).toBeInTheDocument();
    });
  });

  describe('Renderização básica', () => {
    it('deve exibir o título "Timeline de Pontos"', () => {
      render(<MatchTimelineView pointsHistory={basePoints} playerNames={playerNames} />);
      expect(screen.getByText('Timeline de Pontos')).toBeInTheDocument();
    });

    it('deve exibir a contagem de pontos', () => {
      render(<MatchTimelineView pointsHistory={basePoints} playerNames={playerNames} />);
      expect(screen.getByText(/4 pontos/i)).toBeInTheDocument();
    });

    it('deve renderizar um item por ponto', () => {
      render(<MatchTimelineView pointsHistory={basePoints} playerNames={playerNames} />);
      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(basePoints.length);
    });

    it('deve exibir nomes dos jogadores nos filtros', () => {
      render(<MatchTimelineView pointsHistory={basePoints} playerNames={playerNames} />);
      expect(screen.getAllByText('João').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Maria').length).toBeGreaterThan(0);
    });
  });

  describe('Tags visíveis no card', () => {
    it('deve exibir a tag "Ace"', () => {
      render(<MatchTimelineView pointsHistory={basePoints} playerNames={playerNames} />);
      expect(screen.getByText('Ace')).toBeInTheDocument();
    });

    it('deve exibir a tag "DF" para dupla falta', () => {
      render(<MatchTimelineView pointsHistory={basePoints} playerNames={playerNames} />);
      expect(screen.getByText('DF')).toBeInTheDocument();
    });

    it('deve exibir a tag "BP" para breakpoint', () => {
      render(<MatchTimelineView pointsHistory={basePoints} playerNames={playerNames} />);
      expect(screen.getByText('BP')).toBeInTheDocument();
    });
  });

  describe('Expansão de cards', () => {
    it('deve expandir o card ao clicar no header', () => {
      render(<MatchTimelineView pointsHistory={basePoints} playerNames={playerNames} />);
      const buttons = screen.getAllByRole('button', { name: /ponto/i });
      expect(buttons.length).toBeGreaterThan(0);
      fireEvent.click(buttons[0]);
      // Após expandir, aria-expanded muda para true e seção de detalhe aparece
      expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('Saque')).toBeInTheDocument();
    });

    it('deve colapsar o card ao clicar novamente', () => {
      render(<MatchTimelineView pointsHistory={basePoints} playerNames={playerNames} />);
      const buttons = screen.getAllByRole('button', { name: /ponto/i });
      fireEvent.click(buttons[0]);
      fireEvent.click(buttons[0]);
      // Após colapsar, seção de Saque some
      expect(screen.queryAllByText('Saque').length).toBe(0);
    });

    it('deve mostrar detalhes do saque ao expandir ponto com serve', () => {
      render(<MatchTimelineView pointsHistory={basePoints} playerNames={playerNames} />);
      const buttons = screen.getAllByRole('button', { name: /ponto/i });
      // Primeiro ponto é ace
      fireEvent.click(buttons[0]);
      // 'Ace' aparece tanto na tag quanto no detalhe expandido (mínimo 2 ocorrências)
      expect(screen.getAllByText('Ace').length).toBeGreaterThanOrEqual(2);
      // 'Flat' só aparece no detalhe expandido (o resumo do card é texto único e não é 'Flat' isolado)
      expect(screen.getByText('Flat')).toBeInTheDocument();
    });

    it('deve mostrar detalhes do rally ao expandir ponto com rallyDetails', () => {
      render(<MatchTimelineView pointsHistory={basePoints} playerNames={playerNames} />);
      const buttons = screen.getAllByRole('button', { name: /ponto/i });
      // Terceiro ponto tem rallyDetails
      fireEvent.click(buttons[2]);
      expect(screen.getByText('Fundo')).toBeInTheDocument();
      expect(screen.getByText('Paralela')).toBeInTheDocument();
    });

    it('deve mostrar contexto do placar ao expandir ponto com context', () => {
      render(<MatchTimelineView pointsHistory={basePoints} playerNames={playerNames} />);
      const buttons = screen.getAllByRole('button', { name: /ponto/i });
      // Terceiro ponto tem context
      fireEvent.click(buttons[2]);
      expect(screen.getByText('Contexto')).toBeInTheDocument();
    });
  });

  describe('Filtros', () => {
    it('deve filtrar por jogador ao clicar no filter chip', () => {
      render(<MatchTimelineView pointsHistory={basePoints} playerNames={playerNames} />);
      // Clica no filtro de João (P1)
      const filterButtons = screen.getAllByRole('button');
      const joaoBtn = filterButtons.find((btn) => btn.textContent?.includes('João'));
      expect(joaoBtn).toBeDefined();
      fireEvent.click(joaoBtn!);
      // Após filtro, apenas 2 pontos do João devem aparecer
      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(2);
    });

    it('deve atualizar contagem ao filtrar', () => {
      render(<MatchTimelineView pointsHistory={basePoints} playerNames={playerNames} />);
      const filterButtons = screen.getAllByRole('button');
      const joaoBtn = filterButtons.find((btn) => btn.textContent?.includes('João'));
      fireEvent.click(joaoBtn!);
      expect(screen.getByText(/2 de 4 pontos/i)).toBeInTheDocument();
    });

    it('deve mostrar filtro "Winners / Aces"', () => {
      render(<MatchTimelineView pointsHistory={basePoints} playerNames={playerNames} />);
      expect(screen.getByText(/Winners \/ Aces/i)).toBeInTheDocument();
    });

    it('deve mostrar filtro "Erros"', () => {
      render(<MatchTimelineView pointsHistory={basePoints} playerNames={playerNames} />);
      expect(screen.getByText(/Erros/i)).toBeInTheDocument();
    });

    it('deve mostrar "Breakpoints" quando há break points', () => {
      render(<MatchTimelineView pointsHistory={basePoints} playerNames={playerNames} />);
      expect(screen.getByText(/Breakpoints/i)).toBeInTheDocument();
    });

    it('deve limpar filtros ao clicar em "Limpar"', () => {
      render(<MatchTimelineView pointsHistory={basePoints} playerNames={playerNames} />);
      const filterButtons = screen.getAllByRole('button');
      const joaoBtn = filterButtons.find((btn) => btn.textContent?.includes('João'));
      fireEvent.click(joaoBtn!);
      // Botão limpar aparece
      const clearBtn = screen.getByRole('button', { name: /Limpar todos os filtros/i });
      fireEvent.click(clearBtn);
      // Volta a mostrar todos os pontos
      expect(screen.getAllByRole('listitem')).toHaveLength(basePoints.length);
    });

    it('deve mostrar mensagem quando filtro não retorna resultados', () => {
      // Nenhum dos basePoints tem rally >= 99
      render(<MatchTimelineView pointsHistory={basePoints} playerNames={playerNames} />);
      // Simula filtro que não vai retornar resultados aplicando outro critério
      // Aqui usamos a combinação winners+errors que é mutuamente exclusiva
      const filterButtons = screen.getAllByRole('button');
      const winnersBtn = filterButtons.find((btn) => btn.textContent?.includes('Winners'));
      const errorsBtn = filterButtons.find((btn) => btn.textContent?.includes('Erros'));
      expect(winnersBtn).toBeDefined();
      expect(errorsBtn).toBeDefined();
      fireEvent.click(winnersBtn!);
      fireEvent.click(errorsBtn!);
      expect(screen.getByText(/Nenhum ponto corresponde/i)).toBeInTheDocument();
    });

    it('deve desativar filtro de jogador ao clicar novamente (toggle)', () => {
      render(<MatchTimelineView pointsHistory={basePoints} playerNames={playerNames} />);
      const filterButtons = screen.getAllByRole('button');
      const joaoBtn = filterButtons.find((btn) => btn.textContent?.includes('João'));
      fireEvent.click(joaoBtn!); // ativa
      fireEvent.click(joaoBtn!); // desativa
      // Todos os pontos devem voltar
      expect(screen.getAllByRole('listitem')).toHaveLength(basePoints.length);
    });
  });

  describe('Acessibilidade', () => {
    it('deve ter aria-pressed nos filter chips', () => {
      render(<MatchTimelineView pointsHistory={basePoints} playerNames={playerNames} />);
      const filterButtons = screen.getAllByRole('button');
      const joaoBtn = filterButtons.find((btn) => btn.textContent?.includes('João'));
      expect(joaoBtn).toHaveAttribute('aria-pressed', 'false');
      fireEvent.click(joaoBtn!);
      expect(joaoBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('deve ter aria-expanded nos cards', () => {
      render(<MatchTimelineView pointsHistory={basePoints} playerNames={playerNames} />);
      const cardButtons = screen.getAllByRole('button', { name: /ponto/i });
      expect(cardButtons[0]).toHaveAttribute('aria-expanded', 'false');
      fireEvent.click(cardButtons[0]);
      expect(cardButtons[0]).toHaveAttribute('aria-expanded', 'true');
    });

    it('deve ter role="group" no container de filtros', () => {
      render(<MatchTimelineView pointsHistory={basePoints} playerNames={playerNames} />);
      const group = screen.getByRole('group', { name: /Filtros da timeline/i });
      expect(group).toBeInTheDocument();
    });

    it('deve ter aria-label na lista de pontos', () => {
      render(<MatchTimelineView pointsHistory={basePoints} playerNames={playerNames} />);
      const list = screen.getByRole('list', { name: /Pontos da partida/i });
      expect(list).toBeInTheDocument();
    });
  });
});
