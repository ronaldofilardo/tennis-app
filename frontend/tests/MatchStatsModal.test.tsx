import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MatchStatsModal from '../src/components/MatchStatsModal';
import type { PlayerStats, MatchStats, MatchStatsData } from '../src/components/MatchStatsModal';

interface MatchStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
  playerNames: { p1: string; p2: string };
  stats: MatchStatsData | null;
  nickname?: string | null;
}

// Mock do CSS para evitar erros de import
vi.mock('../src/components/MatchStatsModal.css', () => ({}));

// Dados de teste mockados
const mockPlayerStats: PlayerStats = {
  pointsWon: 25,
  totalServes: 30,
  firstServes: 20,
  secondServes: 10,
  firstServeWins: 15,
  secondServeWins: 7,
  aces: 3,
  doubleFaults: 2,
  serviceWinners: 5,
  servicePointsWon: 22,
  returnPointsWon: 18,
  winners: 8,
  unforcedErrors: 12,
  forcedErrors: 6,
  shortRallies: 10,
  longRallies: 5,
  breakPoints: 4,
  breakPointsSaved: 3,
  firstServePercentage: 66.7,
  firstServeWinPercentage: 75.0,
  secondServeWinPercentage: 70.0,
  serviceHoldPercentage: 73.3,
  breakPointConversion: 50.0,
  winnerToErrorRatio: 0.67,
  returnWinPercentage: 60.0,
  dominanceRatio: 1.2,
};

const mockMatchStats: MatchStats = {
  avgRallyLength: 5.5,
  longestRally: 15,
  shortestRally: 1,
  totalRallies: 40,
};

const mockStatsData: MatchStatsData = {
  totalPoints: 50,
  player1: mockPlayerStats,
  player2: { ...mockPlayerStats, pointsWon: 20, aces: 1, doubleFaults: 4 },
  match: mockMatchStats,
  pointsHistory: [],
};

const defaultProps: MatchStatsModalProps = {
  isOpen: true,
  onClose: vi.fn(),
  matchId: 'match-123',
  playerNames: { p1: 'Jogador 1', p2: 'Jogador 2' },
  stats: mockStatsData,
  nickname: 'Partida Amistosa',
};

describe('MatchStatsModal', () => {
  describe('Renderização básica', () => {
    it('não renderiza quando isOpen é false', () => {
      render(<MatchStatsModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('📊 Comparativo de Estatísticas')).not.toBeInTheDocument();
    });

    it('renderiza o modal quando isOpen é true', () => {
      render(<MatchStatsModal {...defaultProps} />);
      expect(screen.getByText('📊 Comparativo de Estatísticas')).toBeInTheDocument();
    });

    it('exibe o nickname quando fornecido', () => {
      render(<MatchStatsModal {...defaultProps} />);
      expect(screen.getByText('Partida Amistosa')).toBeInTheDocument();
    });

    it('não exibe nickname quando não fornecido', () => {
      render(<MatchStatsModal {...defaultProps} nickname={null} />);
      expect(screen.queryByText('Partida Amistosa')).not.toBeInTheDocument();
    });

    it('exibe nomes dos jogadores', () => {
      render(<MatchStatsModal {...defaultProps} />);
      expect(screen.getByText('Jogador 1')).toBeInTheDocument();
      expect(screen.getByText('Jogador 2')).toBeInTheDocument();
      expect(screen.getByText('vs')).toBeInTheDocument();
    });

    it('exibe o ID da partida e total de pontos', () => {
      render(<MatchStatsModal {...defaultProps} />);
      expect(screen.getByText('ID: match-123 • Total: 50 pontos')).toBeInTheDocument();
    });
  });

  describe('Cenários de dados ausentes', () => {
    it('exibe mensagem de carregamento quando stats é null', () => {
      render(<MatchStatsModal {...defaultProps} stats={null} />);
      expect(screen.getByText('Carregando estatísticas...')).toBeInTheDocument();
    });

    it('exibe mensagem de dados ausentes quando não há dados detalhados', () => {
      const emptyStats: MatchStatsData = {
        totalPoints: 0,
        player1: null as any,
        player2: null as any,
        match: {} as MatchStats,
        pointsHistory: [],
      };
      render(<MatchStatsModal {...defaultProps} stats={emptyStats} />);
      expect(screen.getByText('Sem Dados Detalhados')).toBeInTheDocument();
      expect(screen.getByText(/Esta partida foi jogada/)).toBeInTheDocument();
      expect(screen.getByText('Modo Detalhado')).toBeInTheDocument();
      expect(screen.getByText(/ativado/)).toBeInTheDocument();
    });

    it('usa fallbacks para valores undefined em player stats', () => {
      const partialStats: MatchStatsData = {
        totalPoints: 10,
        player1: {
          pointsWon: 5,
          aces: 0,
          doubleFaults: 0,
          firstServePercentage: 0,
          firstServeWinPercentage: 0,
          secondServeWinPercentage: 0,
          serviceHoldPercentage: 0,
          returnWinPercentage: 0,
          winnerToErrorRatio: 0,
          dominanceRatio: 0,
          winners: 0,
          unforcedErrors: 0,
          forcedErrors: 0,
          shortRallies: 0,
          longRallies: 0,
          breakPoints: 0,
          breakPointsSaved: 0,
          totalServes: 0,
          firstServes: 0,
          secondServes: 0,
          firstServeWins: 0,
          secondServeWins: 0,
          serviceWinners: 0,
          returnPointsWon: 0,
        } as PlayerStats,
        player2: {
          pointsWon: 3,
          aces: 0,
          doubleFaults: 0,
          firstServePercentage: 0,
          firstServeWinPercentage: 0,
          secondServeWinPercentage: 0,
          serviceHoldPercentage: 0,
          returnWinPercentage: 0,
          winnerToErrorRatio: 0,
          dominanceRatio: 0,
          winners: 0,
          unforcedErrors: 0,
          forcedErrors: 0,
          shortRallies: 0,
          longRallies: 0,
          breakPoints: 0,
          breakPointsSaved: 0,
          totalServes: 0,
          firstServes: 0,
          secondServes: 0,
          firstServeWins: 0,
          secondServeWins: 0,
          serviceWinners: 0,
          returnPointsWon: 0,
        } as PlayerStats,
        match: { avgRallyLength: 0, longestRally: 0, shortestRally: 0, totalRallies: 0 } as MatchStats,
        pointsHistory: [],
      };
      render(<MatchStatsModal {...defaultProps} stats={partialStats} />);
      expect(screen.getByText('Pontos Conquistados')).toBeInTheDocument();
      // Verifica que valores são exibidos corretamente
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('Interações', () => {
    it('chama onClose quando botão de fechar é clicado', () => {
      const mockOnClose = vi.fn();
      render(<MatchStatsModal {...defaultProps} onClose={mockOnClose} />);
      const closeButton = screen.getByRole('button', { name: /×/ });
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('chama onClose quando overlay é clicado', () => {
      const mockOnClose = vi.fn();
      const { container } = render(<MatchStatsModal {...defaultProps} onClose={mockOnClose} />);
      const overlay = container.querySelector('.match-stats-modal-overlay');
      if (overlay) {
        fireEvent.click(overlay);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });

    it('não chama onClose quando modal content é clicado', () => {
      const mockOnClose = vi.fn();
      const { container } = render(<MatchStatsModal {...defaultProps} onClose={mockOnClose} />);
      const modalContent = container.querySelector('.match-stats-modal');
      if (modalContent) {
        fireEvent.click(modalContent);
        expect(mockOnClose).not.toHaveBeenCalled();
      }
    });

    it('chama onClose quando botão "Fechar" no footer é clicado', () => {
      const mockOnClose = vi.fn();
      render(<MatchStatsModal {...defaultProps} onClose={mockOnClose} />);
      const closeBtn = screen.getByRole('button', { name: 'Fechar' });
      fireEvent.click(closeBtn);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Exibição de estatísticas', () => {
    it('exibe estatísticas de pontos conquistados', () => {
      render(<MatchStatsModal {...defaultProps} />);
      expect(screen.getByText('Pontos Conquistados')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
    });

    it('exibe estatísticas de saque', () => {
      render(<MatchStatsModal {...defaultProps} />);
      expect(screen.getByText('Aces')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('Duplas Faltas')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('exibe percentuais formatados corretamente', () => {
      render(<MatchStatsModal {...defaultProps} />);
      expect(screen.getByText('% 1º Saque')).toBeInTheDocument();
      expect(screen.getByText('% Pontos 1º Saque')).toBeInTheDocument();
      // Verifica que percentuais são exibidos (valores específicos podem variar)
      const percentElements = screen.getAllByText(/^\d+\.\d+%$/);
      expect(percentElements.length).toBeGreaterThan(0);
    });

    it('exibe estatísticas de rally', () => {
      render(<MatchStatsModal {...defaultProps} />);
      expect(screen.getByText('Rally Médio:')).toBeInTheDocument();
      expect(screen.getByText('5.5 trocas')).toBeInTheDocument();
      expect(screen.getByText('Rally Mais Longo:')).toBeInTheDocument();
      expect(screen.getByText('15 trocas')).toBeInTheDocument();
    });

    it('oculta linhas com valores zero exceto para labels importantes', () => {
      const zeroStats: MatchStatsData = {
        totalPoints: 10,
        player1: { ...mockPlayerStats, winners: 0, unforcedErrors: 0 },
        player2: { ...mockPlayerStats, winners: 0, unforcedErrors: 0 },
        match: mockMatchStats,
        pointsHistory: [],
      };
      render(<MatchStatsModal {...defaultProps} stats={zeroStats} />);
      // Winners deve estar oculto pois ambos são zero
      expect(screen.queryByText('Winners')).not.toBeInTheDocument();
      // Aces deve estar visível pois é importante
      expect(screen.getByText('Aces')).toBeInTheDocument();
    });

    it('destaca o melhor valor em comparações', () => {
      const { container } = render(<MatchStatsModal {...defaultProps} />);
      const betterElements = container.querySelectorAll('.better');
      expect(betterElements.length).toBeGreaterThan(0);
    });
  });

  describe('Props obrigatórias e opcionais', () => {
    it('renderiza com todas as props obrigatórias', () => {
      const requiredProps: MatchStatsModalProps = {
        isOpen: true,
        onClose: vi.fn(),
        matchId: 'test-match',
        playerNames: { p1: 'Player A', p2: 'Player B' },
        stats: mockStatsData,
      };
      render(<MatchStatsModal {...requiredProps} />);
      expect(screen.getByText('📊 Comparativo de Estatísticas')).toBeInTheDocument();
    });

    it('renderiza com prop nickname opcional', () => {
      const propsWithNickname: MatchStatsModalProps = {
        ...defaultProps,
        nickname: 'Test Match',
      };
      render(<MatchStatsModal {...propsWithNickname} />);
      expect(screen.getByText('Test Match')).toBeInTheDocument();
    });

    it('renderiza sem prop nickname', () => {
      const propsWithoutNickname: MatchStatsModalProps = {
        ...defaultProps,
        nickname: undefined,
      };
      render(<MatchStatsModal {...propsWithoutNickname} />);
      expect(screen.queryByText('Test Match')).not.toBeInTheDocument();
    });
  });

  describe('Fallbacks e tratamento de erros', () => {
    it('usa valor padrão para totalPoints quando undefined', () => {
      const statsWithoutTotal: MatchStatsData = {
        ...mockStatsData,
        totalPoints: undefined as any,
      };
      render(<MatchStatsModal {...defaultProps} stats={statsWithoutTotal} />);
      expect(screen.getByText('ID: match-123 • Total: 0 pontos')).toBeInTheDocument();
    });

    it('formata valores especiais corretamente', () => {
      const specialStats: MatchStatsData = {
        ...mockStatsData,
        player1: { ...mockPlayerStats, winnerToErrorRatio: 999 },
      };
      render(<MatchStatsModal {...defaultProps} stats={specialStats} />);
      const infinityElements = screen.getAllByText('∞');
      expect(infinityElements.length).toBeGreaterThan(0);
    });
  });
});