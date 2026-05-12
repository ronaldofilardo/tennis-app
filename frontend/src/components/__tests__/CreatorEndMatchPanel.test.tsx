import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreatorEndMatchPanel from '../../components/CreatorEndMatchPanel';
import * as httpClient from '../../config/httpClient';

// Mock httpClient
vi.mock('../../config/httpClient', () => ({
  httpClient: {
    patch: vi.fn(),
  },
}));

describe('CreatorEndMatchPanel', () => {
  const mockMatchId = 'test-match-123';
  const mockOnMatchEnded = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render if user is not creator', () => {
    const { container } = render(
      <CreatorEndMatchPanel matchId={mockMatchId} isCreator={false} matchStatus="IN_PROGRESS" />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('should not render if match is already finished', () => {
    const { container } = render(
      <CreatorEndMatchPanel matchId={mockMatchId} isCreator={true} matchStatus="FINISHED" />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render button when creator and match in progress', () => {
    render(
      <CreatorEndMatchPanel matchId={mockMatchId} isCreator={true} matchStatus="IN_PROGRESS" />,
    );

    const button = screen.getByText(/Encerrar Partida/i);
    expect(button).toBeInTheDocument();
  });

  it('should open modal when button is clicked', async () => {
    render(
      <CreatorEndMatchPanel matchId={mockMatchId} isCreator={true} matchStatus="IN_PROGRESS" />,
    );

    const button = screen.getByText(/Encerrar Partida/i);
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Ao encerrar, a partida será marcada/i)).toBeInTheDocument();
    });
  });

  it('should call API to end match without winner', async () => {
    const mockPatch = vi.fn().mockResolvedValue({ ok: true, data: {} });
    (httpClient.httpClient.patch as any) = mockPatch;

    render(
      <CreatorEndMatchPanel
        matchId={mockMatchId}
        isCreator={true}
        matchStatus="IN_PROGRESS"
        onMatchEnded={mockOnMatchEnded}
      />,
    );

    fireEvent.click(screen.getByText(/Encerrar Partida/i));

    await waitFor(() => {
      fireEvent.click(screen.getByText(/Encerrar Sem Vencedor/i));
    });

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith(`/matches/${mockMatchId}`, {
        action: 'endMatch',
      });
      expect(mockOnMatchEnded).toHaveBeenCalled();
    });
  });

  it('should call API to end match with winner', async () => {
    const mockPatch = vi.fn().mockResolvedValue({ ok: true, data: {} });
    (httpClient.httpClient.patch as any) = mockPatch;

    render(
      <CreatorEndMatchPanel
        matchId={mockMatchId}
        isCreator={true}
        matchStatus="IN_PROGRESS"
        onMatchEnded={mockOnMatchEnded}
      />,
    );

    fireEvent.click(screen.getByText(/Encerrar Partida/i));

    await waitFor(() => {
      fireEvent.click(screen.getByText(/Indicar Vencedor/i));
    });

    await waitFor(() => {
      const player1Btn = screen.getAllByText(/Jogador 1/i).find((btn) => btn.tagName === 'BUTTON');
      if (player1Btn) fireEvent.click(player1Btn);
    });

    await waitFor(() => {
      fireEvent.click(screen.getByText(/Confirmar/i));
    });

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith(`/matches/${mockMatchId}`, {
        action: 'endMatch',
        winner: 'PLAYER_1',
      });
      expect(mockOnMatchEnded).toHaveBeenCalled();
    });
  });

  it('should display error if API fails', async () => {
    const mockPatch = vi.fn().mockRejectedValue(new Error('Erro ao encerrar partida: 500'));
    (httpClient.httpClient.patch as any) = mockPatch;

    render(
      <CreatorEndMatchPanel matchId={mockMatchId} isCreator={true} matchStatus="IN_PROGRESS" />,
    );

    fireEvent.click(screen.getByText(/Encerrar Partida/i));

    await waitFor(() => {
      fireEvent.click(screen.getByText(/Encerrar Sem Vencedor/i));
    });

    await waitFor(() => {
      expect(screen.getByText(/Erro ao encerrar partida/i)).toBeInTheDocument();
    });
  });
});
