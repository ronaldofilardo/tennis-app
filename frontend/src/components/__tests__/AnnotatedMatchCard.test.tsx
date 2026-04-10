// frontend/src/components/__tests__/AnnotatedMatchCard.test.tsx
// Testes unitários do AnnotatedMatchCard — botões "Ver timeline" e "Ver comparativo"
// introduzidos na sessão de anotações (abril/2026).

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AnnotatedMatchCard, { type AnnotatedMatch } from '../AnnotatedMatchCard';

// ─── Factories ───────────────────────────────────────────────────────────────

function makeMatch(overrides: Partial<AnnotatedMatch> = {}): AnnotatedMatch {
  return {
    id: 'match-01',
    sportType: 'TENNIS',
    format: 'BEST_OF_3',
    playerP1: 'Atleta A',
    playerP2: 'Atleta B',
    completedAnnotations: [
      {
        id: 'session-01',
        annotatorId: 'user-01',
        annotatorName: 'Anotador 1',
        endedAt: '2026-04-10T12:00:00.000Z',
        hasFinalState: true,
      },
    ],
    comparisonAvailable: false,
    ...overrides,
  };
}

function makeProps(matchOverrides: Partial<AnnotatedMatch> = {}) {
  return {
    match: makeMatch(matchOverrides),
    viewerRole: 'PLAYER' as const,
    onViewReport: vi.fn(),
    onViewComparison: vi.fn(),
    onDismiss: vi.fn(),
  };
}

// ─── Testes ──────────────────────────────────────────────────────────────────

describe('AnnotatedMatchCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Renderização básica ---

  it('deve renderizar os nomes dos jogadores', () => {
    // Arrange
    const props = makeProps();

    // Act
    render(<AnnotatedMatchCard {...props} />);

    // Assert
    expect(screen.getByText('Atleta A')).toBeInTheDocument();
    expect(screen.getByText('Atleta B')).toBeInTheDocument();
  });

  it('deve usar player1.name / player2.name quando disponíveis', () => {
    // Arrange
    const props = makeProps({
      player1: { id: 'p1', name: 'Nome Completo 1' },
      player2: { id: 'p2', name: 'Nome Completo 2' },
    });

    // Act
    render(<AnnotatedMatchCard {...props} />);

    // Assert
    expect(screen.getByText('Nome Completo 1')).toBeInTheDocument();
    expect(screen.getByText('Nome Completo 2')).toBeInTheDocument();
  });

  it('deve exibir badge NOVO quando isNew=true e viewerRole=PLAYER', () => {
    // Arrange
    const props = makeProps({ isNew: true });

    // Act
    render(<AnnotatedMatchCard {...props} />);

    // Assert
    expect(screen.getByText('NOVO')).toBeInTheDocument();
  });

  it('não deve exibir badge NOVO quando isNew=false', () => {
    // Arrange
    const props = makeProps({ isNew: false });

    // Act
    render(<AnnotatedMatchCard {...props} />);

    // Assert
    expect(screen.queryByText('NOVO')).not.toBeInTheDocument();
  });

  // --- Botão "Ver timeline" (PLAYER com firstAnnotation) ---

  it('deve exibir botão "Ver timeline" quando há anotação concluída (viewerRole=PLAYER)', () => {
    // Arrange — firstAnnotation existe, portanto canViewTimeline = true
    const props = makeProps();

    // Act
    render(<AnnotatedMatchCard {...props} />);

    // Assert
    expect(screen.getByRole('button', { name: /ver timeline/i })).toBeInTheDocument();
  });

  it('deve chamar onViewReport com (sessionId, matchId) ao clicar "Ver timeline"', () => {
    // Arrange
    const props = makeProps();

    // Act
    render(<AnnotatedMatchCard {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /ver timeline/i }));

    // Assert
    expect(props.onViewReport).toHaveBeenCalledOnce();
    expect(props.onViewReport).toHaveBeenCalledWith('session-01', 'match-01');
  });

  it('deve exibir botão "Ver timeline" para ANNOTATOR com mySession', () => {
    // Arrange
    const props = {
      ...makeProps(),
      viewerRole: 'ANNOTATOR' as const,
      match: makeMatch({
        mySession: {
          id: 'my-session-99',
          endedAt: '2026-04-10T12:00:00.000Z',
          hasFinalState: true,
        },
      }),
    };

    // Act
    render(<AnnotatedMatchCard {...props} />);

    // Assert
    expect(screen.getByRole('button', { name: /ver timeline/i })).toBeInTheDocument();
  });

  it('deve chamar onViewReport com mySession.id para ANNOTATOR', () => {
    // Arrange
    const onViewReport = vi.fn();
    const props = {
      match: makeMatch({
        mySession: {
          id: 'my-session-99',
          endedAt: '2026-04-10T12:00:00.000Z',
          hasFinalState: true,
        },
      }),
      viewerRole: 'ANNOTATOR' as const,
      onViewReport,
      onViewComparison: vi.fn(),
      onDismiss: vi.fn(),
    };

    // Act
    render(<AnnotatedMatchCard {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /ver timeline/i }));

    // Assert
    expect(onViewReport).toHaveBeenCalledWith('my-session-99', 'match-01');
  });

  it('não deve exibir botão "Ver timeline" quando sem sessão disponível', () => {
    // Arrange — sem completedAnnotations e sem mySession
    const props = makeProps({ completedAnnotations: [], comparisonAvailable: false });

    // Act
    render(<AnnotatedMatchCard {...props} />);

    // Assert
    expect(screen.queryByRole('button', { name: /ver timeline/i })).not.toBeInTheDocument();
  });

  // --- Botão "Ver comparativo" ---

  it('deve exibir botão "Ver comparativo" quando comparisonAvailable=true', () => {
    // Arrange
    const props = makeProps({
      comparisonAvailable: true,
      completedAnnotations: [
        {
          id: 'session-01',
          annotatorId: 'u1',
          annotatorName: 'A1',
          endedAt: '2026-04-10T12:00:00.000Z',
        },
        {
          id: 'session-02',
          annotatorId: 'u2',
          annotatorName: 'A2',
          endedAt: '2026-04-10T12:00:00.000Z',
        },
      ],
    });

    // Act
    render(<AnnotatedMatchCard {...props} />);

    // Assert
    expect(screen.getByRole('button', { name: /ver comparativo/i })).toBeInTheDocument();
  });

  it('deve chamar onViewComparison com matchId ao clicar "Ver comparativo"', () => {
    // Arrange
    const props = makeProps({ comparisonAvailable: true });

    // Act
    render(<AnnotatedMatchCard {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /ver comparativo/i }));

    // Assert
    expect(props.onViewComparison).toHaveBeenCalledOnce();
    expect(props.onViewComparison).toHaveBeenCalledWith('match-01');
  });

  it('não deve exibir botão "Ver comparativo" quando comparisonAvailable=false', () => {
    // Arrange
    const props = makeProps({ comparisonAvailable: false });

    // Act
    render(<AnnotatedMatchCard {...props} />);

    // Assert
    expect(screen.queryByRole('button', { name: /ver comparativo/i })).not.toBeInTheDocument();
  });

  // --- Botão "Sem dados" (fallback) ---

  it('deve exibir botão desabilitado "Sem dados" quando não há sessão nem comparativo', () => {
    // Arrange
    const props = makeProps({
      completedAnnotations: [],
      comparisonAvailable: false,
      mySession: undefined,
    });

    // Act
    render(<AnnotatedMatchCard {...props} />);

    // Assert
    const btn = screen.getByRole('button', { name: /dados da anotação ainda não disponíveis/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeDisabled();
  });

  // --- Botão Dismiss ---

  it('deve chamar onDismiss com matchId ao clicar no botão de fechar', () => {
    // Arrange
    const props = makeProps();

    // Act
    render(<AnnotatedMatchCard {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /ignorar/i }));

    // Assert
    expect(props.onDismiss).toHaveBeenCalledWith('match-01');
  });

  // --- Coexistência dos botões ---

  it('deve exibir ambos os botões quando há timeline e comparisonAvailable=true', () => {
    // Arrange
    const props = makeProps({ comparisonAvailable: true });

    // Act
    render(<AnnotatedMatchCard {...props} />);

    // Assert
    expect(screen.getByRole('button', { name: /ver timeline/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ver comparativo/i })).toBeInTheDocument();
  });
});
