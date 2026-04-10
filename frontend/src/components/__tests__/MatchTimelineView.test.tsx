// frontend/src/components/__tests__/MatchTimelineView.test.tsx
// Testes unitários do MatchTimelineView — renderização, expansão de cards,
// prop forceExpand e integração com eventos beforeprint/afterprint.

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
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
      type: 'NORMAL',
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

  it('deve exibir mensagem de estado vazio quando pointsHistory está vazio', () => {
    // Arrange & Act
    render(<MatchTimelineView pointsHistory={[]} playerNames={PLAYER_NAMES} />);

    // Assert
    expect(
      screen.getByText(/esta sessão não possui pontos detalhados registrados/i),
    ).toBeInTheDocument();
  });

  it('não deve exibir a lista de pontos quando pointsHistory está vazio', () => {
    // Arrange & Act
    render(<MatchTimelineView pointsHistory={[]} playerNames={PLAYER_NAMES} />);

    // Assert
    expect(screen.queryByRole('list', { name: /pontos da partida/i })).not.toBeInTheDocument();
  });

  // --- Renderização de pontos ---

  it('deve renderizar o número de pontos correto no cabeçalho', () => {
    // Arrange
    const points = [makePoint(), makePoint({ result: { winner: 'PLAYER_2', type: 'UNFORCED_ERROR' } })];

    // Act
    render(<MatchTimelineView pointsHistory={points} playerNames={PLAYER_NAMES} />);

    // Assert
    expect(screen.getByText('2 pontos')).toBeInTheDocument();
  });

  it('deve renderizar um card para cada ponto', () => {
    // Arrange
    const points = [makePoint(), makePoint(), makePoint()];

    // Act
    render(<MatchTimelineView pointsHistory={points} playerNames={PLAYER_NAMES} />);

    // Assert — três botões de header (um por card)
    const headers = screen.getAllByRole('button', { name: /ponto \d+:/i });
    expect(headers).toHaveLength(3);
  });

  it('deve exibir o número do ponto no cabeçalho do card', () => {
    // Arrange
    const points = [makePoint()];

    // Act
    render(<MatchTimelineView pointsHistory={points} playerNames={PLAYER_NAMES} />);

    // Assert
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('deve exibir o nome do vencedor do ponto (PLAYER_1)', () => {
    // Arrange
    const points = [makePoint({ result: { winner: 'PLAYER_1', type: 'WINNER' } })];

    // Act
    render(<MatchTimelineView pointsHistory={points} playerNames={PLAYER_NAMES} />);

    // Assert
    expect(screen.getAllByText('Jogador A').length).toBeGreaterThan(0);
  });

  it('deve exibir o nome do vencedor do ponto (PLAYER_2)', () => {
    // Arrange
    const points = [makePoint({ result: { winner: 'PLAYER_2', type: 'WINNER' } })];

    // Act
    render(<MatchTimelineView pointsHistory={points} playerNames={PLAYER_NAMES} />);

    // Assert
    expect(screen.getAllByText('Jogador B').length).toBeGreaterThan(0);
  });

  // --- Expansão de cards ---

  it('deve estar recolhido por padrão (sem região de detalhe visível)', () => {
    // Arrange
    const points = [makePoint()];

    // Act
    render(<MatchTimelineView pointsHistory={points} playerNames={PLAYER_NAMES} />);

    // Assert — sem região de detalhe no DOM
    expect(screen.queryByRole('region', { name: /detalhes do ponto 1/i })).not.toBeInTheDocument();
  });

  it('deve expandir o card ao clicar no header', () => {
    // Arrange
    const points = [makePoint()];
    render(<MatchTimelineView pointsHistory={points} playerNames={PLAYER_NAMES} />);

    // Act
    const header = screen.getByRole('button', { name: /ponto 1:/i });
    fireEvent.click(header);

    // Assert
    expect(screen.getByRole('region', { name: /detalhes do ponto 1/i })).toBeInTheDocument();
  });

  it('deve recolher o card ao clicar novamente no header', () => {
    // Arrange
    const points = [makePoint()];
    render(<MatchTimelineView pointsHistory={points} playerNames={PLAYER_NAMES} />);
    const header = screen.getByRole('button', { name: /ponto 1:/i });

    // Act — expandir e recolher
    fireEvent.click(header);
    fireEvent.click(header);

    // Assert
    expect(screen.queryByRole('region', { name: /detalhes do ponto 1/i })).not.toBeInTheDocument();
  });

  it('deve definir aria-expanded=true no header quando expandido', () => {
    // Arrange
    const points = [makePoint()];
    render(<MatchTimelineView pointsHistory={points} playerNames={PLAYER_NAMES} />);
    const header = screen.getByRole('button', { name: /ponto 1:/i });

    // Act
    fireEvent.click(header);

    // Assert
    expect(header).toHaveAttribute('aria-expanded', 'true');
  });

  it('deve suportar expansão via teclado (Enter)', () => {
    // Arrange
    const points = [makePoint()];
    render(<MatchTimelineView pointsHistory={points} playerNames={PLAYER_NAMES} />);
    const header = screen.getByRole('button', { name: /ponto 1:/i });

    // Act
    fireEvent.keyDown(header, { key: 'Enter' });

    // Assert
    expect(screen.getByRole('region', { name: /detalhes do ponto 1/i })).toBeInTheDocument();
  });

  it('deve suportar expansão via teclado (Space)', () => {
    // Arrange
    const points = [makePoint()];
    render(<MatchTimelineView pointsHistory={points} playerNames={PLAYER_NAMES} />);
    const header = screen.getByRole('button', { name: /ponto 1:/i });

    // Act
    fireEvent.keyDown(header, { key: ' ' });

    // Assert
    expect(screen.getByRole('region', { name: /detalhes do ponto 1/i })).toBeInTheDocument();
  });

  // --- prop forceExpand (print mode) ---

  it('deve mostrar detalhe de todos os cards quando forceExpand via beforeprint', async () => {
    // Arrange
    const points = [makePoint(), makePoint()];
    render(<MatchTimelineView pointsHistory={points} playerNames={PLAYER_NAMES} />);

    // Assert — sem detalhe inicialmente
    expect(screen.queryByRole('region', { name: /detalhes do ponto 1/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /detalhes do ponto 2/i })).not.toBeInTheDocument();

    // Act — disparar beforeprint
    await act(async () => {
      window.dispatchEvent(new Event('beforeprint'));
    });

    // Assert — detalhes visíveis para todos os cards
    expect(screen.getByRole('region', { name: /detalhes do ponto 1/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /detalhes do ponto 2/i })).toBeInTheDocument();
  });

  it('deve recolher todos os cards após evento afterprint', async () => {
    // Arrange
    const points = [makePoint()];
    render(<MatchTimelineView pointsHistory={points} playerNames={PLAYER_NAMES} />);

    // Expandir via beforeprint
    await act(async () => {
      window.dispatchEvent(new Event('beforeprint'));
    });
    expect(screen.getByRole('region', { name: /detalhes do ponto 1/i })).toBeInTheDocument();

    // Act — disparar afterprint
    await act(async () => {
      window.dispatchEvent(new Event('afterprint'));
    });

    // Assert — detalhe recolhido (card não estava expandido manualmente)
    expect(screen.queryByRole('region', { name: /detalhes do ponto 1/i })).not.toBeInTheDocument();
  });

  it('deve remover os event listeners ao desmontar o componente', () => {
    // Arrange
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const points = [makePoint()];
    const { unmount } = render(
      <MatchTimelineView pointsHistory={points} playerNames={PLAYER_NAMES} />,
    );

    // Act
    unmount();

    // Assert
    expect(
      removeEventListenerSpy.mock.calls.some(([event]) => event === 'beforeprint'),
    ).toBe(true);
    expect(
      removeEventListenerSpy.mock.calls.some(([event]) => event === 'afterprint'),
    ).toBe(true);
  });

  // --- Tags especiais ---

  it('deve exibir tag "Ace" quando o tipo de saque é ACE', () => {
    // Arrange
    const points = [makePoint({ serve: { type: 'ACE', isFirstServe: true } })];

    // Act
    render(<MatchTimelineView pointsHistory={points} playerNames={PLAYER_NAMES} />);

    // Assert — "Ace" aparece no card-summary E na tag; buscamos a tag específica
    const tags = screen.getAllByText('Ace');
    expect(tags.some((el) => el.classList.contains('match-timeline__tag--ace'))).toBe(true);
  });

  it('deve exibir tag "DF" quando o tipo de saque é DOUBLE_FAULT', () => {
    // Arrange
    const points = [
      makePoint({
        serve: { type: 'DOUBLE_FAULT', isFirstServe: false },
        result: { winner: 'PLAYER_2', type: 'DOUBLE_FAULT' },
      }),
    ];

    // Act
    render(<MatchTimelineView pointsHistory={points} playerNames={PLAYER_NAMES} />);

    // Assert — busca pelo container de tags para evitar matches duplicados
    const tags = screen.getAllByText('DF');
    expect(tags.some((el) => el.classList.contains('match-timeline__tag--fault'))).toBe(true);
  });

  it('deve exibir tag "BP" para breakpoints', () => {
    // Arrange
    const points = [
      makePoint({
        context: {
          setNumber: 1,
          gamesP1: 0,
          gamesP2: 0,
          gameScoreP1: '0',
          gameScoreP2: '0',
          isBreakPoint: true,
        },
      }),
    ];

    // Act
    render(<MatchTimelineView pointsHistory={points} playerNames={PLAYER_NAMES} />);

    // Assert
    expect(screen.getByText('BP')).toBeInTheDocument();
  });

  // --- Filtros ---

  it('deve renderizar chips de filtros', () => {
    // Arrange
    const points = [makePoint()];

    // Act
    render(<MatchTimelineView pointsHistory={points} playerNames={PLAYER_NAMES} />);

    // Assert
    expect(screen.getByRole('group', { name: /filtros da timeline/i })).toBeInTheDocument();
  });

  it('deve filtrar por PLAYER_1 ao clicar no chip do jogador', () => {
    // Arrange
    const points = [
      makePoint({ result: { winner: 'PLAYER_1', type: 'WINNER' } }),
      makePoint({ result: { winner: 'PLAYER_2', type: 'WINNER' } }),
    ];
    render(<MatchTimelineView pointsHistory={points} playerNames={PLAYER_NAMES} />);

    // Act — clicar no chip de Jogador A dentro do grupo de filtros
    const filtersGroup = screen.getByRole('group', { name: /filtros da timeline/i });
    const chip = within(filtersGroup).getByRole('button', { name: /jogador a/i });
    fireEvent.click(chip);

    // Assert — apenas 1 ponto visível; header mostra "1 de 2 pontos"
    expect(screen.getByText(/1 de 2 pontos/i)).toBeInTheDocument();
  });

  it('deve exibir "Limpar" quando filtro está ativo e ao clicar deve remover filtros', () => {
    // Arrange
    const points = [makePoint()];
    render(<MatchTimelineView pointsHistory={points} playerNames={PLAYER_NAMES} />);
    const filtersGroup = screen.getByRole('group', { name: /filtros da timeline/i });
    fireEvent.click(within(filtersGroup).getByRole('button', { name: /jogador a/i }));

    // Assert — chip Limpar aparece
    expect(screen.getByRole('button', { name: /limpar todos os filtros/i })).toBeInTheDocument();

    // Act — limpar filtros
    fireEvent.click(screen.getByRole('button', { name: /limpar todos os filtros/i }));

    // Assert — chip Limpar some
    expect(
      screen.queryByRole('button', { name: /limpar todos os filtros/i }),
    ).not.toBeInTheDocument();
  });
});
