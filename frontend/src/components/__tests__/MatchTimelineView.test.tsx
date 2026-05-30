// frontend/src/components/__tests__/MatchTimelineView.test.tsx
// Testes unitários do MatchTimelineView — tabela de pontos, filtros, agrupamento por set.

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import MatchTimelineView from '../MatchTimelineView';
import type { PointDetails } from '../../core/scoring/types';

// ─── Factory de PointDetails ─────────────────────────────────────────────────

function makePoint(overrides: Partial<PointDetails> = {}): PointDetails {
  return {
    result: {
      winner: 'PLAYER_1',
      type: 'WINNER',
      finalShot: 'Forehand',
    },
    shotPlayer: 'PLAYER_1',
    rally: { ballExchanges: 3 },
    timestamp: 0,
    serve: {
      type: 'FAULT_FIRST',
      isFirstServe: true,
    },
    context: {
      setNumber: 1,
      gamesP1: 0,
      gamesP2: 0,
      gameScoreP1: '0',
      gameScoreP2: '0',
      isBreakPoint: false,
    },
    ...overrides,
  };
}

const PLAYER_NAMES = { p1: 'Jogador A', p2: 'Jogador B' };

// ─── Testes ──────────────────────────────────────────────────────────────────

describe('MatchTimelineView', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Estado vazio ---

  it('exibe mensagem quando não há pontos', () => {
    render(<MatchTimelineView pointsHistory={[]} playerNames={PLAYER_NAMES} />);
    expect(
      screen.getByText(/esta sessão não possui pontos detalhados registrados/i),
    ).toBeInTheDocument();
  });

  // --- Tabela ---

  it('renderiza uma <table> com aria-label', () => {
    const points = [
      makePoint(),
      makePoint({ result: { winner: 'PLAYER_2', type: 'UNFORCED_ERROR', finalShot: 'Backhand' } }),
    ];
    render(<MatchTimelineView pointsHistory={points} playerNames={PLAYER_NAMES} />);
    expect(screen.getByRole('table', { name: /timeline de pontos/i })).toBeInTheDocument();
  });

  it('exibe cabeçalhos das colunas esperados', () => {
    render(<MatchTimelineView pointsHistory={[makePoint()]} playerNames={PLAYER_NAMES} />);
    const table = screen.getByRole('table', { name: /timeline de pontos/i });
    expect(within(table).getByText('ACE ou DF')).toBeInTheDocument();
    expect(within(table).getByText('TROCAS')).toBeInTheDocument();
    expect(within(table).getByText('SITUAÇÃO')).toBeInTheDocument();
    expect(within(table).getByText('RESULTADO')).toBeInTheDocument();
    expect(within(table).getByText('GOLPE')).toBeInTheDocument();
    expect(within(table).getByText(/ERROU/i)).toBeInTheDocument();
    expect(within(table).getByText('DIREÇÃO')).toBeInTheDocument();
    expect(within(table).getByText('EFEITO')).toBeInTheDocument();
    expect(within(table).getByText('ESPECIAIS')).toBeInTheDocument();
  });

  it('exibe contagem de pontos no cabeçalho', () => {
    const points = [makePoint(), makePoint()];
    render(<MatchTimelineView pointsHistory={points} playerNames={PLAYER_NAMES} />);
    expect(screen.getByText(/2 pontos/i)).toBeInTheDocument();
  });

  // --- Separadores de Set ---

  it('exibe separador SET 1', () => {
    render(<MatchTimelineView pointsHistory={[makePoint()]} playerNames={PLAYER_NAMES} />);
    expect(screen.getByText(/SET 1/i)).toBeInTheDocument();
  });

  it('exibe dois separadores SET quando há pontos de dois sets', () => {
    const points = [
      makePoint({
        context: {
          setNumber: 1,
          gamesP1: 0,
          gamesP2: 0,
          gameScoreP1: '0',
          gameScoreP2: '0',
          isBreakPoint: false,
        },
      }),
      makePoint({
        context: {
          setNumber: 2,
          gamesP1: 6,
          gamesP2: 0,
          gameScoreP1: '0',
          gameScoreP2: '0',
          isBreakPoint: false,
        },
      }),
    ];
    render(<MatchTimelineView pointsHistory={points} playerNames={PLAYER_NAMES} />);
    expect(screen.getByText(/SET 1/i)).toBeInTheDocument();
    expect(screen.getByText(/SET 2/i)).toBeInTheDocument();
  });

  // --- Conteúdo das células ---

  it('exibe ACE na coluna ACE ou DF para pontos de ACE', () => {
    const pt = makePoint({
      serve: { type: 'ACE', isFirstServe: true, serveEffect: 'Flat', direction: 'Centro' },
      result: { winner: 'PLAYER_1', type: 'WINNER', finalShot: 'Serve' },
    });
    render(<MatchTimelineView pointsHistory={[pt]} playerNames={PLAYER_NAMES} />);
    const table = screen.getByRole('table', { name: /timeline de pontos/i });
    const aceMatches = within(table).getAllByText(/ACE/);
    // Deve haver pelo menos uma célula de dado com ACE (além do header "ACE ou DF")
    expect(aceMatches.length).toBeGreaterThanOrEqual(1);
    const dataCell = aceMatches.find((el) => el.tagName === 'TD');
    expect(dataCell).toBeDefined();
  });

  it('exibe DF na coluna ACE ou DF para dupla falta', () => {
    const pt = makePoint({
      serve: { type: 'DOUBLE_FAULT', isFirstServe: false },
      result: { winner: 'PLAYER_2', type: 'WINNER', finalShot: 'Serve' },
    });
    render(<MatchTimelineView pointsHistory={[pt]} playerNames={PLAYER_NAMES} />);
    const table = screen.getByRole('table', { name: /timeline de pontos/i });
    expect(within(table).getByText(/DF:/)).toBeInTheDocument();
  });

  it('exibe Winner na coluna RESULTADO para winner de rally', () => {
    const pt = makePoint({ result: { winner: 'PLAYER_1', type: 'WINNER', finalShot: 'Forehand' } });
    render(<MatchTimelineView pointsHistory={[pt]} playerNames={PLAYER_NAMES} />);
    const table = screen.getByRole('table', { name: /timeline de pontos/i });
    expect(within(table).getByText('Winner')).toBeInTheDocument();
  });

  it('exibe ENF na coluna RESULTADO para erro não forçado', () => {
    const pt = makePoint({
      result: { winner: 'PLAYER_2', type: 'UNFORCED_ERROR', finalShot: 'Backhand' },
    });
    render(<MatchTimelineView pointsHistory={[pt]} playerNames={PLAYER_NAMES} />);
    const table = screen.getByRole('table', { name: /timeline de pontos/i });
    expect(within(table).getByText('ENF')).toBeInTheDocument();
  });

  it('exibe EF na coluna RESULTADO para erro forçado', () => {
    const pt = makePoint({
      result: { winner: 'PLAYER_2', type: 'FORCED_ERROR', finalShot: 'Backhand' },
    });
    render(<MatchTimelineView pointsHistory={[pt]} playerNames={PLAYER_NAMES} />);
    const table = screen.getByRole('table', { name: /timeline de pontos/i });
    expect(within(table).getByText('EF')).toBeInTheDocument();
  });

  // --- Aria labels das linhas ---

  it('exibe aria-label indicando o vencedor do ponto', () => {
    render(<MatchTimelineView pointsHistory={[makePoint()]} playerNames={PLAYER_NAMES} />);
    expect(screen.getByRole('row', { name: /ponto: jogador a venceu/i })).toBeInTheDocument();
  });

  // --- Filtros ---

  it('exibe o grupo de filtros', () => {
    render(<MatchTimelineView pointsHistory={[makePoint()]} playerNames={PLAYER_NAMES} />);
    expect(screen.getByRole('group', { name: /filtros da timeline/i })).toBeInTheDocument();
  });

  it('filtrar por PLAYER_1 reduz a contagem mostrada', () => {
    const points = [
      makePoint({ result: { winner: 'PLAYER_1', type: 'WINNER', finalShot: 'FH' } }),
      makePoint({ result: { winner: 'PLAYER_2', type: 'UNFORCED_ERROR', finalShot: 'BH' } }),
    ];
    render(<MatchTimelineView pointsHistory={points} playerNames={PLAYER_NAMES} />);

    // Antes do filtro: "2 pontos"
    expect(screen.getByText(/2 pontos/i)).toBeInTheDocument();

    // Ativa filtro P1
    const filterBtn = screen.getByRole('button', { name: /jogador a/i });
    fireEvent.click(filterBtn);

    // Depois do filtro: "1 de 2 pontos"
    expect(screen.getByText(/1 de 2 pontos/i)).toBeInTheDocument();
  });

  it('botão Limpar aparece com filtro ativo e some ao clicar', () => {
    render(<MatchTimelineView pointsHistory={[makePoint()]} playerNames={PLAYER_NAMES} />);

    // Limpar não aparece inicialmente
    expect(
      screen.queryByRole('button', { name: /limpar todos os filtros/i }),
    ).not.toBeInTheDocument();

    // Ativa filtro
    fireEvent.click(screen.getByRole('button', { name: /jogador a/i }));
    const limparBtn = screen.getByRole('button', { name: /limpar todos os filtros/i });
    expect(limparBtn).toBeInTheDocument();

    // Clica em Limpar
    fireEvent.click(limparBtn);
    expect(
      screen.queryByRole('button', { name: /limpar todos os filtros/i }),
    ).not.toBeInTheDocument();
  });
});
