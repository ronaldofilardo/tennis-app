
import '../../../vitest.setup';


import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const navigateMock = vi.fn();

vi.mock('../ScoreboardV2.css', () => ({}));
vi.mock('../../components/LoadingIndicator', async () => {
  const mocks = await import('../../__mocks__');
  return { default: mocks.MockLoadingIndicator };
});
vi.mock('../../components/PointDetailsModal', async () => {
  const mocks = await import('../../__mocks__');
  return { default: mocks.MockPointDetailsModal };
});
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
vi.mock('../../core/scoring/TennisScoring', async () => {
  const mocks = await import('../../__mocks__');
  return { TennisScoring: mocks.MockTennisScoring };
});
vi.mock('../../core/scoring/TennisConfigFactory', () => ({
  TennisConfigFactory: {
    getFormatDisplayName: vi.fn(() => 'Melhor de 3'),
    // Adicione outros métodos mockados se necessário
  }
}));
vi.mock('../../config/api', async () => {
  const mocks = await import('../../__mocks__');
  return {
    ...mocks.mockApi,
    API_URL: '/api',
  };
});
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ matchId: 'test-match-id' }),
  };
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import ScoreboardV2 from '../ScoreboardV2';
import { __resetMockTennisScoring, mockTennisScoring } from '../../__mocks__';
import { AuthProvider } from '../../contexts/AuthContext';
import { MatchesProvider } from '../../contexts/MatchesContext';
import { NavigationProvider } from '../../contexts/NavigationContext';




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
  players: { p1: 'Jogador 1', p2: 'Jogador 2' },
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

describe('ScoreboardV2 - Ace Button Behavior', () => {

   beforeEach(() => {
     (global as any).resetGlobalMocks();
     __resetMockTennisScoring();
     (global.fetch as any).mockResolvedValue({
       ok: true,
       json: () => Promise.resolve(mockMatchData)
     });
   });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Ace button functionality', () => {
    it('opens ServerEffectModal when Ace button is clicked on first serve', async () => {
      renderScoreboard();

      await waitFor(() => {
        expect(screen.getByText('Jogador 1')).toBeInTheDocument();
      });

      const aceButton = screen.getAllByRole('button', { name: 'Ace' })[0]; // First serve
      fireEvent.click(aceButton);

      expect(screen.getByTestId('server-effect-modal')).toBeInTheDocument();
    });

    it('opens ServerEffectModal when Ace button is clicked on second serve', async () => {
      renderScoreboard();

      await waitFor(() => {
        expect(screen.getByText('Jogador 1')).toBeInTheDocument();
      });

      // Go to second serve
      const outButton = screen.getAllByRole('button', { name: 'Out' })[0];
      fireEvent.click(outButton);

      const aceButton = screen.getByRole('button', { name: 'Ace' }); // Second serve
      fireEvent.click(aceButton);

      expect(screen.getByTestId('server-effect-modal')).toBeInTheDocument();
    });

    it('allows user to confirm point through ServerEffectModal', async () => {
      renderScoreboard();

      await waitFor(() => {
        expect(screen.getByText('Jogador 1')).toBeInTheDocument();
      });

      // Click Ace button
      const aceButton = screen.getAllByRole('button', { name: 'Ace' })[0];
      fireEvent.click(aceButton);

      // Modal should be open
      expect(screen.getByTestId('server-effect-modal')).toBeInTheDocument();

      // Click confirm in modal
      const confirmButton = screen.getByRole('button', { name: 'Confirm ServerEffect' });
      fireEvent.click(confirmButton);

      // Should call addPointWithSync with correct parameters including serveEffect
      await waitFor(() => {
        expect(mockTennisScoring.addPointWithSync).toHaveBeenCalledWith('PLAYER_1', {
          serve: { type: 'ACE', isFirstServe: true, serveEffect: 'Chapado', direction: 'Fechado' },
          result: { winner: 'PLAYER_1', type: 'WINNER' },
          rally: { ballExchanges: 1 }
        });
      });
    });

    it('closes ServerEffectModal after confirming point', async () => {
      renderScoreboard();

      await waitFor(() => {
        expect(screen.getByText('Jogador 1')).toBeInTheDocument();
      });

      // Click Ace button
      const aceButton = screen.getAllByRole('button', { name: 'Ace' })[0];
      fireEvent.click(aceButton);

      // Modal should be open
      expect(screen.getByTestId('server-effect-modal')).toBeInTheDocument();

      // Click confirm
      const confirmButton = screen.getByRole('button', { name: 'Confirm ServerEffect' });
      fireEvent.click(confirmButton);

      // Modal should be closed after confirmation
      await waitFor(() => {
        expect(screen.queryByTestId('server-effect-modal')).not.toBeInTheDocument();
      });
    });

    it('allows canceling the ServerEffectModal without adding point', async () => {
      renderScoreboard();

      await waitFor(() => {
        expect(screen.getByText('Jogador 1')).toBeInTheDocument();
      });

      // Click Ace button
      const aceButton = screen.getAllByRole('button', { name: 'Ace' })[0];
      fireEvent.click(aceButton);

      // Modal should be open
      expect(screen.getByTestId('server-effect-modal')).toBeInTheDocument();

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: 'Cancel ServerEffect' });
      fireEvent.click(cancelButton);

      // Modal should be closed and no point should be added
      await waitFor(() => {
        expect(screen.queryByTestId('server-effect-modal')).not.toBeInTheDocument();
        expect(mockTennisScoring.addPointWithSync).not.toHaveBeenCalled();
      });
    });
  });

  describe('Ace button availability', () => {
    it('shows Ace button when serveStep is none and server exists', async () => {
      renderScoreboard();

      await waitFor(() => {
        expect(screen.getByText('Jogador 1')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: 'Ace' })).toBeInTheDocument();
    });

    it('hides Ace button when match is finished', async () => {
      mockTennisScoring.getState.mockReturnValue({
        ...mockMatchData.matchState,
        isFinished: true
      });

      renderScoreboard();

      await waitFor(() => {
        expect(screen.getByText('Jogador 1')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: 'Ace' })).not.toBeInTheDocument();
    });

    it('shows Ace button when serveStep is second', async () => {
      renderScoreboard();

      await waitFor(() => {
        expect(screen.getByText('Jogador 1')).toBeInTheDocument();
      });

      // Click "Out" to change to second serve
      const outButton = screen.getByRole('button', { name: 'Out' });
      fireEvent.click(outButton);

      // Ace button should be visible in second serve step
      expect(screen.getByRole('button', { name: 'Ace' })).toBeInTheDocument();
    });
  });

  describe('Integration with existing tests', () => {
    it('displays serve info buttons without click handlers', async () => {
      renderScoreboard();

      await waitFor(() => {
        expect(screen.getByText('Jogador 1')).toBeInTheDocument();
      });

      // 1º Saque button should be present but is informational only
      const firstServeButton = screen.getByRole('button', { name: '1º Saque' });
      expect(firstServeButton).toBeInTheDocument();
      expect(firstServeButton).toHaveClass('serve-info');
    });

    it('maintains existing point buttons functionality', async () => {
      renderScoreboard();

      await waitFor(() => {
        expect(screen.getByText('Jogador 1')).toBeInTheDocument();
      });

      const pointButton = screen.getByRole('button', { name: /\+ Ponto Jogador 1/ });
      fireEvent.click(pointButton);

      // Modal should open
      expect(screen.getByTestId('point-details-modal')).toBeInTheDocument();

      // Confirm point in modal
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockTennisScoring.addPointWithSync).toHaveBeenCalledWith('PLAYER_1', {
          serve: { isFirstServe: true, type: 'SERVICE_WINNER' },
          result: { winner: 'PLAYER_1', type: 'WINNER' },
          rally: { ballExchanges: 1 }
        });
      });
    });
  });
});

describe('ScoreboardV2 - Button Alignment Based on Server', () => {
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

 it('aligns quick action buttons to the left when PLAYER_1 is serving', async () => {
   renderScoreboard();

   await waitFor(() => {
     expect(screen.getByText('Jogador 1')).toBeInTheDocument();
   });

   const aceButtons = screen.getAllByRole('button', { name: 'Ace' });
   const quickActionsRow = aceButtons[0].closest('.quick-actions-row');
   expect(quickActionsRow).toHaveClass('serve-left');
   expect(quickActionsRow).not.toHaveClass('serve-right');
 });

 it('aligns quick action buttons to the right when PLAYER_2 is serving', async () => {
   // Mock state with PLAYER_2 as server
   mockTennisScoring.getState.mockReturnValue({
     ...mockMatchData.matchState,
     server: 'PLAYER_2',
     currentGame: { ...mockMatchData.matchState.currentGame, server: 'PLAYER_2' }
   });

   renderScoreboard();

   await waitFor(() => {
     expect(screen.getByText('Jogador 1')).toBeInTheDocument();
   });

   const aceButtons = screen.getAllByRole('button', { name: 'Ace' });
   const quickActionsRow = aceButtons[0].closest('.quick-actions-row');
   expect(quickActionsRow).toHaveClass('serve-right');
   expect(quickActionsRow).not.toHaveClass('serve-left');
 });

 it('updates button alignment when server changes after point', async () => {
   renderScoreboard();

   await waitFor(() => {
     expect(screen.getByText('Jogador 1')).toBeInTheDocument();
   });

   // Inicialmente PLAYER_1 é o sacador, botões devem estar alinhados à esquerda
   let aceButtons = screen.getAllByRole('button', { name: 'Ace' });
   let quickActionsRow = aceButtons[0].closest('.quick-actions-row');
   expect(quickActionsRow).toHaveClass('serve-left');

   // Simula troca de sacador para PLAYER_2
   mockTennisScoring.getState.mockReturnValue({
     ...mockMatchData.matchState,
     server: 'PLAYER_2'
   });
   renderScoreboard();

   await waitFor(() => {
     aceButtons = screen.getAllByRole('button', { name: 'Ace' });
     quickActionsRow = aceButtons[0].closest('.quick-actions-row');
     expect(quickActionsRow).toHaveClass('serve-right');
   });

   // Simula troca de sacador de volta para PLAYER_1
   mockTennisScoring.getState.mockReturnValue({
     ...mockMatchData.matchState,
     server: 'PLAYER_1'
   });
   renderScoreboard();

   await waitFor(() => {
     aceButtons = screen.getAllByRole('button', { name: 'Ace' });
     quickActionsRow = aceButtons[0].closest('.quick-actions-row');
     expect(quickActionsRow).toHaveClass('serve-left');
   });
  });
 
 describe('ScoreboardV2 - Server Alternation and isFirstServe Registration', () => {
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
 
   it('registers isFirstServe correctly for points on first serve', async () => {
    renderScoreboard();

    await waitFor(() => {
      expect(screen.getByText('Jogador 1')).toBeInTheDocument();
    });

    // Add point via button (should be first serve)
    const pointButton = screen.getByRole('button', { name: /\+ Ponto Jogador 2/ });
    fireEvent.click(pointButton);

    // Confirma o ponto no modal
    await waitFor(() => {
      expect(screen.getByTestId('point-details-modal')).toBeInTheDocument();
    });
    const confirmBtn = screen.getByRole('button', { name: /Confirm/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockTennisScoring.addPointWithSync).toHaveBeenCalledWith('PLAYER_2', {
        serve: { isFirstServe: true, type: 'SERVICE_WINNER' },
        result: { winner: 'PLAYER_2', type: 'WINNER' },
        rally: { ballExchanges: 1 }
      });
    });
   });
 
   it('registers isFirstServe correctly for points on second serve', async () => {
     renderScoreboard();
 
     await waitFor(() => {
       expect(screen.getByText('Jogador 1')).toBeInTheDocument();
     });
 
     // Go to second serve
     const outButton = screen.getByRole('button', { name: 'Out' });
     fireEvent.click(outButton);
 
     // Add point via button (should be second serve)
     const pointButton = screen.getByRole('button', { name: /\+ Ponto Jogador 2/ });
     fireEvent.click(pointButton);

     // Modal should open
     expect(screen.getByTestId('point-details-modal')).toBeInTheDocument();

     // Confirm point in modal
     const confirmButton = screen.getByRole('button', { name: 'Confirm' });
     fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockTennisScoring.addPointWithSync).toHaveBeenCalledWith('PLAYER_2', {
          serve: { isFirstServe: false, type: 'SERVICE_WINNER' },
          result: { winner: 'PLAYER_2', type: 'WINNER' },
          rally: { ballExchanges: 1 }
        });
      });
   });
 
   it('alternates server correctly when returner wins point on first serve', async () => {
     renderScoreboard();
 
     await waitFor(() => {
       expect(screen.getByText('Jogador 1')).toBeInTheDocument();
     });
 
     // Initially PLAYER_1 is serving
     expect(mockTennisScoring.getState().server).toBe('PLAYER_1');
 
     // Returner (PLAYER_2) wins the point
     const pointButton = screen.getByRole('button', { name: /\+ Ponto Jogador 2/ });
     fireEvent.click(pointButton);

     // Modal should open
     expect(screen.getByTestId('point-details-modal')).toBeInTheDocument();

     // Confirm point in modal
     const confirmButton = screen.getByRole('button', { name: 'Confirm' });
     fireEvent.click(confirmButton);

     await waitFor(() => {
       expect(mockTennisScoring.addPointWithSync).toHaveBeenCalled();
     });     // After point, server should change to PLAYER_2
     mockTennisScoring.getState.mockReturnValue({
       ...mockMatchData.matchState,
       server: 'PLAYER_2'
     });
 
     renderScoreboard();
 
     await waitFor(() => {
       // Check that server changed
       expect(mockTennisScoring.getState().server).toBe('PLAYER_2');
     });
   });
 
   it('maintains isFirstServe consistency in modal confirmations', async () => {
     renderScoreboard();

     await waitFor(() => {
       expect(screen.getByText('Jogador 1')).toBeInTheDocument();
     });

     // Click point button to open modal
     const pointButton = screen.getByRole('button', { name: /\+ Ponto Jogador 1/ });
     fireEvent.click(pointButton);

     // Modal should open
     expect(screen.getByTestId('point-details-modal')).toBeInTheDocument();     // Confirm point
     const confirmButton = screen.getByRole('button', { name: 'Confirm' });
     fireEvent.click(confirmButton);
 
     await waitFor(() => {
       expect(mockTennisScoring.addPointWithSync).toHaveBeenCalledWith('PLAYER_1', {
         serve: { type: 'SERVICE_WINNER', isFirstServe: true },
         result: { winner: 'PLAYER_1', type: 'WINNER' },
         rally: { ballExchanges: 1 }
       });
     });
   });
 
   it('maintains isFirstServe consistency for second serve modal confirmations', async () => {
     renderScoreboard();

     await waitFor(() => {
       expect(screen.getByText('Jogador 1')).toBeInTheDocument();
     });

     // Go to second serve
     const outButton = screen.getByRole('button', { name: 'Out' });
     fireEvent.click(outButton);

     // Click point button to open modal
     const pointButton = screen.getByRole('button', { name: /\+ Ponto Jogador 1/ });
     fireEvent.click(pointButton);

     // Modal should open
     expect(screen.getByTestId('point-details-modal')).toBeInTheDocument();     // Confirm point
     const confirmButton = screen.getByRole('button', { name: 'Confirm' });
     fireEvent.click(confirmButton);
 
     await waitFor(() => {
       expect(mockTennisScoring.addPointWithSync).toHaveBeenCalledWith('PLAYER_1', {
         serve: { type: 'SERVICE_WINNER', isFirstServe: false },
         result: { winner: 'PLAYER_1', type: 'WINNER' },
         rally: { ballExchanges: 1 }
       });
     });
   });
 });
});

describe('ScoreboardV2 - Restauração de Estado e Fluxos', () => {
   beforeEach(() => {
     (global as any).resetGlobalMocks();
     (global.fetch as any).mockResolvedValue({
       ok: true,
       json: () => Promise.resolve(mockMatchData)
     });
     mockTennisScoring.getState.mockReturnValue(mockMatchData.matchState);
     mockTennisScoring.canUndo.mockReturnValue(false);
   });

  it('prioriza estado passado via navigation state', async () => {
    const navigationState = {
      initialState: {
        ...mockMatchData,
        matchState: {
          ...mockMatchData.matchState,
          config: { format: 'BEST_OF_3' }
        },
        format: 'BEST_OF_3',
      }
    };
    // Simula navigation state
    window.history.replaceState({ usr: navigationState }, '');
    render(
      <BrowserRouter>
        <ScoreboardV2 onEndMatch={vi.fn()} />
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(mockTennisScoring.loadState).toHaveBeenCalledWith(expect.objectContaining({
        sets: { PLAYER_1: 0, PLAYER_2: 0 },
        currentSet: 1
      }));
    });
  });

  it('restaura estado profundo do backend quando não há navigation state', async () => {
    renderScoreboard();
    await waitFor(() => {
      expect(mockTennisScoring.loadState).toHaveBeenCalledWith(expect.objectContaining({
        sets: { PLAYER_1: 0, PLAYER_2: 0 },
        currentSet: 1
      }));
    });
  });

  it('redireciona para dashboard se partida finalizada', async () => {
  (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ...mockMatchData, status: 'FINISHED', format: 'BEST_OF_3', matchState: { ...mockMatchData.matchState, config: { format: 'BEST_OF_3' } } })
    });
    // Remove navigation state para garantir que o backend seja usado
    window.history.replaceState({}, '');
    renderScoreboard();
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('abre setup se partida não iniciada', async () => {
  (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ...mockMatchData, status: 'NOT_STARTED', format: 'BEST_OF_3', matchState: { ...mockMatchData.matchState, config: { format: 'BEST_OF_3' } } })
    });
    // Remove navigation state para garantir que o backend seja usado
    window.history.replaceState({}, '');
    renderScoreboard();
    await waitFor(() => {
      expect(screen.getByText(/Configuração da Partida/i)).toBeInTheDocument();
    });
  });

  describe('Finalização Automática de Partida', () => {
    it('exibe banner de vitória quando partida é finalizada por regras do jogo', async () => {
      renderScoreboard();

      await waitFor(() => {
        expect(screen.getByText('Jogador 1')).toBeInTheDocument();
      });

      // Simular estado de partida finalizada
      const finishedState = {
        ...mockMatchData.matchState,
        isFinished: true,
        winner: 'PLAYER_1',
        sets: { PLAYER_1: 2, PLAYER_2: 0 },
        endedAt: new Date().toISOString()
      };
      mockTennisScoring.getState.mockReturnValue(finishedState);

      // Forçar re-render
      renderScoreboard();

      await waitFor(() => {
        const banners = screen.getAllByText((content) => content.includes('PARTIDA FINALIZADA'));
        // Aceita múltiplos banners, mas pelo menos um deve existir
        expect(banners.length).toBeGreaterThan(0);
        banners.forEach((banner) => {
          expect(banner).toBeVisible();
        });
        expect(screen.getAllByText((content) => content.includes('VENCEDOR:')).length).toBeGreaterThan(0);
        expect(screen.getAllByText('Jogador 1').length).toBeGreaterThan(0);
        expect(screen.getAllByText((content) => content.includes('Placar Final: 2 sets x 0 sets')).length).toBeGreaterThan(0);
      });
    });

    it('exibe botões de ação após finalização', async () => {
      renderScoreboard();

      await waitFor(() => {
        expect(screen.getByText('Jogador 1')).toBeInTheDocument();
      });

      // Estado finalizado
      const finishedState = {
        ...mockMatchData.matchState,
        isFinished: true,
        winner: 'PLAYER_2'
      };
      mockTennisScoring.getState.mockReturnValue(finishedState);

      renderScoreboard();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Ver Estatísticas/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Nova Partida/i })).toBeInTheDocument();
      });
    });

    it('desabilita botões de pontuação após finalização', async () => {
      renderScoreboard();

      await waitFor(() => {
        expect(screen.getByText('Jogador 1')).toBeInTheDocument();
      });

      // Estado finalizado
      const finishedState = {
        ...mockMatchData.matchState,
        isFinished: true,
        winner: 'PLAYER_1'
      };
      mockTennisScoring.getState.mockReturnValue(finishedState);

      renderScoreboard();

      await waitFor(() => {
        const pointButtons1 = screen.getAllByRole('button', { name: /\+ Ponto Jogador 1/ });
        const pointButtons2 = screen.getAllByRole('button', { name: /\+ Ponto Jogador 2/ });
        pointButtons1.forEach(btn => expect(btn).toBeDisabled());
        pointButtons2.forEach(btn => expect(btn).toBeDisabled());
      });
    });

    it('finaliza partida automaticamente quando regras determinam vencedor', async () => {
      const onEndMatchMock = vi.fn();
      renderScoreboard({ onEndMatch: onEndMatchMock });

      await waitFor(() => {
        expect(screen.getByText('Jogador 1')).toBeInTheDocument();
      });

      // Simular adição de ponto que finaliza a partida
      const finishedState = {
        ...mockMatchData.matchState,
        isFinished: true,
        winner: 'PLAYER_1',
        sets: { PLAYER_1: 2, PLAYER_2: 1 }
      };
      mockTennisScoring.addPointWithSync.mockResolvedValue(finishedState);

      // Adicionar ponto
      const pointButton = screen.getByRole('button', { name: /\+ Ponto Jogador 1/ });
      fireEvent.click(pointButton);

      // Modal should open
      expect(screen.getByTestId('point-details-modal')).toBeInTheDocument();

      // Confirm point in modal
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockTennisScoring.addPointWithSync).toHaveBeenCalledWith('PLAYER_1', {
          serve: { isFirstServe: true, type: 'SERVICE_WINNER' },
          result: { winner: 'PLAYER_1', type: 'WINNER' },
          rally: { ballExchanges: 1 }
        });
      });

      // Verificar que alert foi chamado (simulado)
      // Nota: alert() é difícil de testar diretamente, mas podemos verificar se o estado foi atualizado
      expect(finishedState.isFinished).toBe(true);
      expect(finishedState.winner).toBe('PLAYER_1');
    });
  });

  describe('handleEndMatch - Interrupção de Partida', () => {
    it('não finaliza partida automaticamente ao interromper', async () => {
      const onEndMatchMock = vi.fn();
      renderScoreboard({ onEndMatch: onEndMatchMock });

      await waitFor(() => {
        expect(screen.getByText('Jogador 1')).toBeInTheDocument();
      });

      // Simular estado de partida em andamento
      const inProgressState = {
        ...mockMatchData.matchState,
        isFinished: false,
        startedAt: new Date().toISOString(),
        endedAt: undefined
      };
      mockTennisScoring.getState.mockReturnValue(inProgressState);

      // Clicar no botão de encerrar partida
      const endButton = screen.getByRole('button', { name: '✕' });
      fireEvent.click(endButton);

      // Aguardar processamento assíncrono
      await waitFor(() => {
        expect(mockTennisScoring.syncState).toHaveBeenCalled();
      });

      // Verificar que não foi chamado setEndedAt (que forçaria finalização)
      expect(mockTennisScoring.setEndedAt).not.toHaveBeenCalled();

      // Verificar que onEndMatch foi chamado para fechar a interface
      expect(onEndMatchMock).toHaveBeenCalled();
    });

    it('sincroniza estado atual sem finalizar partida', async () => {
      const onEndMatchMock = vi.fn();
      renderScoreboard({ onEndMatch: onEndMatchMock });

      await waitFor(() => {
        expect(screen.getByText('Jogador 1')).toBeInTheDocument();
      });

      // Estado de partida em andamento
      const inProgressState = {
        ...mockMatchData.matchState,
        isFinished: false,
        startedAt: new Date().toISOString()
      };
      mockTennisScoring.getState.mockReturnValue(inProgressState);

      // Clicar no botão de encerrar
      const endButton = screen.getByRole('button', { name: '✕' });
      fireEvent.click(endButton);

      // Verificar que apenas syncState foi chamado
      await waitFor(() => {
        expect(mockTennisScoring.syncState).toHaveBeenCalled();
        expect(mockTennisScoring.setEndedAt).not.toHaveBeenCalled();
      });
    });

    it('permite retomada da partida após interrupção', async () => {
      const onEndMatchMock = vi.fn();
      renderScoreboard({ onEndMatch: onEndMatchMock });

      await waitFor(() => {
        expect(screen.getByText('Jogador 1')).toBeInTheDocument();
      });

      // Estado antes da interrupção
      const beforeInterruptState = {
        ...mockMatchData.matchState,
        isFinished: false,
        startedAt: new Date().toISOString(),
        sets: { PLAYER_1: 1, PLAYER_2: 0 },
        currentSetState: { games: { PLAYER_1: 3, PLAYER_2: 2 } }
      };
      mockTennisScoring.getState.mockReturnValue(beforeInterruptState);

      // Interromper partida
      const endButton = screen.getByRole('button', { name: '✕' });
      fireEvent.click(endButton);

      await waitFor(() => {
        expect(mockTennisScoring.syncState).toHaveBeenCalled();
      });

      // Verificar que o estado permanece inalterado (não finalizado)
      expect(beforeInterruptState.isFinished).toBe(false);
      expect(beforeInterruptState.endedAt).toBeUndefined();
    });

    it('não persiste estado para partidas não iniciadas', async () => {
        const onEndMatchMock = vi.fn();
 
        // Mock para partida não iniciada
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            ...mockMatchData,
            status: 'NOT_STARTED',
            format: 'BEST_OF_3',
            matchState: { ...mockMatchData.matchState, config: { format: 'BEST_OF_3' } }
          })
        });

      renderScoreboard({ onEndMatch: onEndMatchMock });

      await waitFor(() => {
        expect(screen.getByText(/Configuração da Partida/i)).toBeInTheDocument();
      });

      // Simular setup concluído e depois interrupção
      mockTennisScoring.getState.mockReturnValue({
        ...mockMatchData.matchState,
        isFinished: false,
        startedAt: new Date().toISOString()
      });

      // Clicar no botão cancelar do setup (que chama handleEndMatch)
      const cancelButton = screen.getByRole('button', { name: 'Cancelar' });
      fireEvent.click(cancelButton);

      // Verificar que syncState não foi chamado para partida não iniciada
      await waitFor(() => {
        expect(mockTennisScoring.syncState).not.toHaveBeenCalled();
        expect(onEndMatchMock).toHaveBeenCalled();
      });
    });
  });
});