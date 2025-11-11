import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MatchStatsModal from '../MatchStatsModal';
import type { MatchStatsData } from '../MatchStatsModal';

const mockStats: MatchStatsData = {
  totalPoints: 100,
  player1: {
    pointsWon: 60,
    totalServes: 50,
    firstServes: 30,
    secondServes: 20,
    firstServeWins: 18,
    secondServeWins: 10,
    aces: 5,
    doubleFaults: 2,
    serviceWinners: 3,
    servicePointsWon: 28,
    returnPointsWon: 12,
    winners: 20,
    unforcedErrors: 8,
    forcedErrors: 5,
    shortRallies: 15,
    longRallies: 10,
    breakPoints: 4,
    breakPointsSaved: 2,
    firstServePercentage: 60,
    firstServeWinPercentage: 55,
    secondServeWinPercentage: 50,
    serviceHoldPercentage: 80,
    breakPointConversion: 50,
    winnerToErrorRatio: 2.5,
    returnWinPercentage: 30,
    dominanceRatio: 1.2
  },
  player2: {
    pointsWon: 40,
    totalServes: 48,
    firstServes: 28,
    secondServes: 20,
    firstServeWins: 12,
    secondServeWins: 8,
    aces: 3,
    doubleFaults: 4,
    serviceWinners: 2,
    servicePointsWon: 20,
    returnPointsWon: 10,
    winners: 10,
    unforcedErrors: 12,
    forcedErrors: 7,
    shortRallies: 10,
    longRallies: 8,
    breakPoints: 3,
    breakPointsSaved: 1,
    firstServePercentage: 58,
    firstServeWinPercentage: 45,
    secondServeWinPercentage: 40,
    serviceHoldPercentage: 60,
    breakPointConversion: 33,
    winnerToErrorRatio: 0.8,
    returnWinPercentage: 25,
    dominanceRatio: 0.7
  },
  match: {
    avgRallyLength: 4,
    longestRally: 12,
    shortestRally: 1,
    totalRallies: 50
  },
  pointsHistory: []
};

describe('MatchStatsModal', () => {
  it('deve exibir estatísticas principais', () => {
    render(
      <MatchStatsModal
        isOpen={true}
        stats={mockStats}
        onClose={() => {}}
        matchId="1"
        playerNames={{ p1: 'Jogador 1', p2: 'Jogador 2' }}
      />
    );
    expect(screen.getByText(/Jogador 1/)).toBeInTheDocument();
    expect(screen.getByText(/Jogador 2/)).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText(/Aces/)).toBeInTheDocument();
  expect(screen.getByText(/Duplas Faltas/)).toBeInTheDocument();
  });

  it('deve chamar onClose ao clicar em fechar', () => {
    const onClose = vi.fn();
    render(
      <MatchStatsModal
        isOpen={true}
        stats={mockStats}
        onClose={onClose}
        matchId="1"
        playerNames={{ p1: 'Jogador 1', p2: 'Jogador 2' }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /fechar/i }));
    expect(onClose).toHaveBeenCalled();
  });
});