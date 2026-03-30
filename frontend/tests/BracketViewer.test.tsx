// tests/BracketViewer.test.tsx
// Cobertura das correções da Fase 7 (Auditoria Sênior):
// Garante que o agrupamento de partidas por rodada usa spread imutável (sem .push sobre referências do Map).

import '../vitest.setup';

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../src/components/BracketViewer.css', () => ({}));

// ── Mock httpClient ────────────────────────────────────────────────────────────
const mockGet = vi.fn();
vi.mock('../src/config/httpClient', () => ({
  default: { get: (...args: unknown[]) => mockGet(...args) },
  httpClient: { get: (...args: unknown[]) => mockGet(...args) },
}));

import BracketViewer from '../src/components/BracketViewer';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeMatch(
  overrides: Partial<{
    id: string;
    playerP1: string;
    playerP2: string;
    player1Id: string;
    player2Id: string;
    roundNumber: number;
    bracketPosition: number;
    status: string;
    winner?: string;
  }>,
) {
  return {
    id: 'match-1',
    playerP1: 'P1',
    playerP2: 'P2',
    player1Id: 'pid-1',
    player2Id: 'pid-2',
    roundNumber: 1,
    bracketPosition: 1,
    status: 'PENDING',
    ...overrides,
  };
}

function mockApiResponse(matches: ReturnType<typeof makeMatch>[]) {
  mockGet.mockResolvedValue({
    data: { tournament: { matches } },
  });
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe('BracketViewer — Agrupamento imutável por rodada', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe spinner durante o carregamento inicial', () => {
    mockGet.mockReturnValue(new Promise(() => {})); // pendente indefinidamente
    render(<BracketViewer tournamentId="t-1" refreshInterval={0} />);
    expect(screen.getByText(/carregando chaveamento/i)).toBeInTheDocument();
  });

  it('exibe mensagem de erro quando a API falha', async () => {
    mockGet.mockRejectedValue(new Error('network error'));
    render(<BracketViewer tournamentId="t-1" refreshInterval={0} />);
    await waitFor(() => expect(screen.getByText(/erro ao carregar/i)).toBeInTheDocument());
  });

  it('exibe mensagem vazia quando não há partidas', async () => {
    mockApiResponse([]);
    render(<BracketViewer tournamentId="t-1" refreshInterval={0} />);
    await waitFor(() =>
      expect(screen.getByText(/chaveamento ainda não foi gerado/i)).toBeInTheDocument(),
    );
  });

  it('renderiza uma rodada com uma partida', async () => {
    mockApiResponse([
      makeMatch({
        id: 'm-1',
        playerP1: 'Alice',
        playerP2: 'Bob',
        roundNumber: 1,
        bracketPosition: 1,
      }),
    ]);
    render(<BracketViewer tournamentId="t-1" refreshInterval={0} />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    expect(screen.getByText('Bob')).toBeInTheDocument();
    // Rótulo de final para rodada 1
    expect(screen.getByText('Final')).toBeInTheDocument();
  });

  it('agrupa corretamente múltiplas partidas na mesma rodada', async () => {
    mockApiResponse([
      makeMatch({
        id: 'm-1',
        playerP1: 'Alice',
        playerP2: 'Bob',
        roundNumber: 2,
        bracketPosition: 1,
      }),
      makeMatch({
        id: 'm-2',
        playerP1: 'Carol',
        playerP2: 'Dave',
        roundNumber: 2,
        bracketPosition: 2,
      }),
    ]);
    render(<BracketViewer tournamentId="t-1" refreshInterval={0} />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Carol')).toBeInTheDocument();
    expect(screen.getByText('Dave')).toBeInTheDocument();
    // Rodada 2 com 2 total rounds → label Semifinal
    expect(screen.getByText('Semifinal')).toBeInTheDocument();
  });

  it('partidas em rodadas diferentes renderizam rótulos distintos', async () => {
    mockApiResponse([
      makeMatch({
        id: 'm-1',
        playerP1: 'Alice',
        playerP2: 'Bob',
        roundNumber: 1,
        bracketPosition: 1,
      }),
      makeMatch({
        id: 'm-2',
        playerP1: 'Carol',
        playerP2: 'Dave',
        roundNumber: 2,
        bracketPosition: 1,
      }),
    ]);
    render(<BracketViewer tournamentId="t-1" refreshInterval={0} />);
    await waitFor(() => expect(screen.getByText('Final')).toBeInTheDocument());
    expect(screen.getByText('Semifinal')).toBeInTheDocument();
  });

  it('ignora partidas sem roundNumber definido', async () => {
    mockApiResponse([
      // @ts-expect-error — deliberadamente sem roundNumber
      makeMatch({ id: 'm-invalid', playerP1: 'Ghost', playerP2: 'Shadow', roundNumber: 0 }),
      makeMatch({
        id: 'm-ok',
        playerP1: 'Alice',
        playerP2: 'Bob',
        roundNumber: 1,
        bracketPosition: 1,
      }),
    ]);
    render(<BracketViewer tournamentId="t-1" refreshInterval={0} />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    // Ghost/Shadow estão em roundNumber 0 — falsy — devem ser ignorados
    expect(screen.queryByText('Ghost')).not.toBeInTheDocument();
  });

  it('exibe badge AO VIVO para partidas em andamento', async () => {
    mockApiResponse([
      makeMatch({
        id: 'm-1',
        playerP1: 'Alice',
        playerP2: 'Bob',
        roundNumber: 1,
        bracketPosition: 1,
        status: 'IN_PROGRESS',
      }),
    ]);
    render(<BracketViewer tournamentId="t-1" refreshInterval={0} />);
    await waitFor(() => expect(screen.getByText('AO VIVO')).toBeInTheDocument());
  });

  it('chama onMatchClick ao clicar em uma partida', async () => {
    const onMatchClick = vi.fn();
    mockApiResponse([
      makeMatch({
        id: 'm-1',
        playerP1: 'Alice',
        playerP2: 'Bob',
        roundNumber: 1,
        bracketPosition: 1,
      }),
    ]);
    render(<BracketViewer tournamentId="t-1" onMatchClick={onMatchClick} refreshInterval={0} />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    screen.getByRole('button').click();
    expect(onMatchClick).toHaveBeenCalledOnce();
  });
});
