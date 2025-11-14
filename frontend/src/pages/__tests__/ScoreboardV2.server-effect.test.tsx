import '../../../vitest.setup';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import '@testing-library/jest-dom';
import ScoreboardV2 from '../ScoreboardV2';
import { __resetMockTennisScoring, mockTennisScoring } from '../../__mocks__';
import { AuthProvider } from '../../contexts/AuthContext';
import { MatchesProvider } from '../../contexts/MatchesContext';
import { NavigationProvider } from '../../contexts/NavigationContext';

const navigateMock = vi.fn();

vi.mock('../ScoreboardV2.css', () => ({}));

vi.mock('../../components/MatchStatsModal', () => ({
  default: ({ isOpen, onClose }: any) => isOpen ? <div>MatchStatsModal</div> : null,
}));

vi.mock('../../components/PointDetailsModal', () => ({
  default: ({ isOpen, onConfirm, onCancel, playerInFocus }: any) =>
    isOpen ? (
      <div data-testid="point-details-modal">
        PointDetailsModal
        <button onClick={() => onConfirm({}, playerInFocus)}>Confirm PointDetails</button>
        <button onClick={onCancel}>Cancel PointDetails</button>
      </div>
    ) : null,
}));

vi.mock('../../components/ServerEffectModal', () => ({
  default: ({ isOpen, onConfirm, onCancel }: any) =>
    isOpen ? (
      <div data-testid="server-effect-modal">
        ServerEffectModal
        <button onClick={() => onConfirm('Chapado', 'Fechado')}>Confirm ServerEffect</button>
        <button onClick={onCancel}>Cancel ServerEffect</button>
      </div>
    ) : null,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ matchId: 'test-match-id' }),
  };
});

vi.mock('../../config/api', async () => {
  const mocks = await import('../../__mocks__');
  return {
    ...mocks.mockApi,
    API_URL: '/api',
  };
});

vi.mock('../../hooks/useMatchSync', () => ({
  useMatchSync: vi.fn(),
}));

vi.mock('../../core/scoring/TennisScoring', async () => {
  const mocks = await import('../../__mocks__');
  return { TennisScoring: mocks.MockTennisScoring };
});

vi.mock('../../core/scoring/TennisConfigFactory', () => ({
  TennisConfigFactory: {
    getFormatDisplayName: vi.fn(() => 'Melhor de 3'),
  }
}));

vi.mock('../../components/LoadingIndicator', async () => {
  const mocks = await import('../../__mocks__');
  return { default: mocks.MockLoadingIndicator };
});

interface MatchData {
  id: string;
  sportType: string;
  format: string;
  players: { p1: string; p2: string };
  status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'FINISHED';
  matchState?: any;
}

const mockMatchData: MatchData = {
  id: 'test-match-id',
  sportType: 'Tênis',
  format: 'BEST_OF_3',
  players: { p1: 'Player 1', p2: 'Player 2' },
  status: 'IN_PROGRESS',
  matchState: {
    sets: { PLAYER_1: 0, PLAYER_2: 0 },
    currentSet: 1,
    currentSetState: { games: { PLAYER_1: 0, PLAYER_2: 0 } },
    currentGame: {
      points: { PLAYER_1: '0', PLAYER_2: '0' },
      server: 'PLAYER_1',
      isTiebreak: false,
    },
    server: 'PLAYER_1',
    isFinished: false,
    config: {} as any,
    startedAt: new Date().toISOString(),
  }
};

const renderScoreboard = (props = {}) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <MatchesProvider>
          <NavigationProvider>
            <ScoreboardV2 onEndMatch={vi.fn()} {...props} />
          </NavigationProvider>
        </MatchesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('ScoreboardV2 - ServerEffect Integration', () => {
  beforeEach(() => {
    (globalThis as any).resetGlobalMocks();
    __resetMockTennisScoring();
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockMatchData)
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Botões informativos de saque', () => {
    it('exibe "1º Saque" e, após falta, "2º Saque" como botões informativos sem funcionalidade', async () => {
      renderScoreboard();

      // 1º Saque
      await waitFor(() => {
        expect(screen.getByText('1º Saque')).toBeInTheDocument();
      });
      const firstServeButton = screen.getByRole('button', { name: '1º Saque' });
      expect(firstServeButton).toHaveClass('serve-info');
      expect(firstServeButton).toHaveClass('first-serve');
      fireEvent.click(firstServeButton);
      expect(screen.queryByTestId('point-details-modal')).not.toBeInTheDocument();
      expect(screen.queryByTestId('server-effect-modal')).not.toBeInTheDocument();

      // Simula falta (Out) para ir ao 2º saque
      const outButton = screen.getByRole('button', { name: 'Out' });
      fireEvent.click(outButton);

      await waitFor(() => {
        expect(screen.getByText('2º Saque')).toBeInTheDocument();
      });
      const secondServeButton = screen.getByRole('button', { name: '2º Saque' });
      expect(secondServeButton).toHaveClass('serve-info');
      expect(secondServeButton).toHaveClass('second-serve');
      fireEvent.click(secondServeButton);
      expect(screen.queryByTestId('point-details-modal')).not.toBeInTheDocument();
      expect(screen.queryByTestId('server-effect-modal')).not.toBeInTheDocument();
    });
  });

  describe('Fluxo Ace → ServerEffect', () => {
    it('abre ServerEffectModal ao clicar em Ace no 1º saque', async () => {
      renderScoreboard();

      await waitFor(() => {
        expect(screen.getByText('Player 1')).toBeInTheDocument();
      });

      const aceButton = screen.getAllByRole('button', { name: 'Ace' })[0]; // Primeiro saque
      fireEvent.click(aceButton);

      await waitFor(() => {
        expect(screen.getByTestId('server-effect-modal')).toBeInTheDocument();
      });
    });

    it('abre ServerEffectModal ao clicar em Ace no 2º saque', async () => {
      renderScoreboard();

      await waitFor(() => {
        expect(screen.getByText('Player 1')).toBeInTheDocument();
      });

      // Ir para 2º saque

      const outButton = screen.getByRole('button', { name: 'Out' });
      fireEvent.click(outButton); // 1ª falta, vai para 2º saque

      // No 2º saque, botão Ace ainda é o mesmo
      const aceButton = screen.getByRole('button', { name: 'Ace' });
      fireEvent.click(aceButton);

      await waitFor(() => {
        expect(screen.getByTestId('server-effect-modal')).toBeInTheDocument();
      });
    });
  });

  describe('Fluxo Dupla Falta → Ponto Automático', () => {
    it('marca ponto automaticamente ao clicar em Out no 2º saque (dupla falta)', async () => {
      renderScoreboard();

      await waitFor(() => {
        expect(screen.getByText('Player 1')).toBeInTheDocument();
      });

      // Clicar uma vez no botão Out (vai para 2º saque)
      const outButton = screen.getByRole('button', { name: 'Out' });
      fireEvent.click(outButton); // 1ª falta - vai para 2º saque

      // Aguardar mudança para 2º saque
      await waitFor(() => {
        expect(screen.getByText('2º Saque')).toBeInTheDocument();
      });

      // Pegar o botão Out novamente após re-renderização
      const outButtonSecond = screen.getByRole('button', { name: 'Out' });
      fireEvent.click(outButtonSecond); // 2ª falta - dupla falta automática

      // Verificar que handleFault foi chamado (dupla falta automática)
      await waitFor(() => {
        expect(mockTennisScoring.addPointWithSync).toHaveBeenCalledWith('PLAYER_2', {
          serve: { type: 'DOUBLE_FAULT', isFirstServe: false },
          result: { winner: 'PLAYER_2', type: 'FORCED_ERROR' },
          rally: { ballExchanges: 1 }
        });
      });
    });

    it('marca ponto automaticamente ao clicar em Net no 2º saque (dupla falta)', async () => {
      renderScoreboard();

      await waitFor(() => {
        expect(screen.getByText('Player 1')).toBeInTheDocument();
      });

      // Clicar uma vez no botão Net (vai para 2º saque)
      const netButton = screen.getByRole('button', { name: 'Net' });
      fireEvent.click(netButton); // 1ª falta - vai para 2º saque

      // Aguardar mudança para 2º saque
      await waitFor(() => {
        expect(screen.getByText('2º Saque')).toBeInTheDocument();
      });

      // Pegar o botão Net novamente após re-renderização
      const netButtonSecond = screen.getByRole('button', { name: 'Net' });
      fireEvent.click(netButtonSecond); // 2ª falta - dupla falta automática

      // Verificar que handleFault foi chamado (dupla falta automática)
      await waitFor(() => {
        expect(mockTennisScoring.addPointWithSync).toHaveBeenCalledWith('PLAYER_2', {
          serve: { type: 'DOUBLE_FAULT', isFirstServe: false },
          result: { winner: 'PLAYER_2', type: 'FORCED_ERROR' },
          rally: { ballExchanges: 1 }
        });
      });
    });
  });

  describe('Fluxo +Ponto → PointDetails', () => {
    it('abre PointDetailsModal ao clicar em "+ Ponto Player 1"', async () => {
      renderScoreboard();

      await waitFor(() => {
        expect(screen.getByText('Player 1')).toBeInTheDocument();
      });

      const pointButton = screen.getByRole('button', { name: /\+ Ponto Player 1/ });
      fireEvent.click(pointButton);

      await waitFor(() => {
        expect(screen.getByTestId('point-details-modal')).toBeInTheDocument();
      });
    });

    it('abre PointDetailsModal ao clicar em "+ Ponto Player 2"', async () => {
      renderScoreboard();

      await waitFor(() => {
        expect(screen.getByText('Player 1')).toBeInTheDocument();
      });

      const pointButton = screen.getByRole('button', { name: /\+ Ponto Player 2/ });
      fireEvent.click(pointButton);

      await waitFor(() => {
        expect(screen.getByTestId('point-details-modal')).toBeInTheDocument();
      });
    });
  });

  describe('Confirmação de pontos', () => {
    it('marca ponto de Ace com detalhes do ServerEffect', async () => {
      renderScoreboard();

      await waitFor(() => {
        expect(screen.getByText('Player 1')).toBeInTheDocument();
      });

      const aceButton = screen.getAllByRole('button', { name: 'Ace' })[0];
      fireEvent.click(aceButton);

      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: 'Confirm ServerEffect' });
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(mockTennisScoring.addPointWithSync).toHaveBeenCalledWith('PLAYER_1', expect.objectContaining({
          serve: { type: 'ACE', isFirstServe: true, serveEffect: 'Chapado', direction: 'Fechado' },
          result: { winner: 'PLAYER_1', type: 'WINNER' },
        }));
      });
    });

    it('marca ponto de Ace no 2º saque corretamente para o sacador', async () => {
      renderScoreboard();

      await waitFor(() => {
        expect(screen.getByText('Player 1')).toBeInTheDocument();
      });

      // Ir para 2º saque
      const outButton = screen.getByRole('button', { name: 'Out' });
      fireEvent.click(outButton); // 1ª falta - vai para 2º saque

      await waitFor(() => {
        expect(screen.getByText('2º Saque')).toBeInTheDocument();
      });

      // Clicar em Ace no 2º saque
      const aceButton = screen.getByRole('button', { name: 'Ace' });
      fireEvent.click(aceButton);

      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: 'Confirm ServerEffect' });
        fireEvent.click(confirmButton);
      });

      // Verificar que o ponto foi marcado para o SACADOR (PLAYER_1), não para o adversário
      await waitFor(() => {
        expect(mockTennisScoring.addPointWithSync).toHaveBeenCalledWith('PLAYER_1', expect.objectContaining({
          serve: { type: 'ACE', isFirstServe: false, serveEffect: 'Chapado', direction: 'Fechado' },
          result: { winner: 'PLAYER_1', type: 'WINNER' },
        }));
      });
    });

    it('marca ponto de dupla falta automaticamente sem modal', async () => {
      renderScoreboard();

      await waitFor(() => {
        expect(screen.getByText('Player 1')).toBeInTheDocument();
      });

      // Causar dupla falta clicando duas vezes no Out
      const outButton = screen.getByRole('button', { name: 'Out' });
      fireEvent.click(outButton); // 1ª falta - vai para 2º saque

      // Aguardar mudança para 2º saque
      await waitFor(() => {
        expect(screen.getByText('2º Saque')).toBeInTheDocument();
      });

      // Pegar o botão Out novamente após re-renderização
      const outButtonSecond = screen.getByRole('button', { name: 'Out' });
      fireEvent.click(outButtonSecond); // 2ª falta - dupla falta automática

      // Verificar que o ponto foi marcado automaticamente
      await waitFor(() => {
        expect(mockTennisScoring.addPointWithSync).toHaveBeenCalledWith('PLAYER_2', {
          serve: { type: 'DOUBLE_FAULT', isFirstServe: false },
          result: { winner: 'PLAYER_2', type: 'FORCED_ERROR' },
          rally: { ballExchanges: 1 }
        });
      });

      // Verificar que nenhum modal foi aberto
      expect(screen.queryByTestId('server-effect-modal')).not.toBeInTheDocument();
    });
  });
});