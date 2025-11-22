import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useRealtimeMatch } from './useRealtimeMatch';
import type { RealtimeMatch } from '../types/match';

// Mock do singleton e métodos do RealtimeMatchService
import * as RealtimeMatchServiceModule from '../services/RealtimeMatchService';

const mockStartWatching = vi.fn((_matchId, onUpdate) => {
  // Chama o onUpdate imediatamente com um estado fake
  onUpdate({
    status: 'IN_PROGRESS',
    lastUpdate: new Date(),
    sets: { PLAYER_1: 0, PLAYER_2: 0 },
    currentSet: 0,
    currentSetState: { games: { PLAYER_1: 0, PLAYER_2: 0 } },
    currentGame: { points: { PLAYER_1: '0', PLAYER_2: '0' }, server: 'PLAYER_1', isTiebreak: false },
    server: 'PLAYER_1',
    isFinished: false,
    config: {
      format: 'BEST_OF_3', setsToWin: 2, gamesPerSet: 6, useAdvantage: true, useTiebreak: true, tiebreakAt: 6, tiebreakPoints: 7
    }
  });
  return Promise.resolve();
});
const mockStopWatching = vi.fn();
const mockUpdateMatchState = vi.fn((_matchId, state) => {
  if (state.status === 'INVALID') {
    return Promise.reject(new Error('Estado inválido!'));
  }
  return Promise.resolve({
    ...state,
    lastUpdate: new Date(),
    sets: { PLAYER_1: 0, PLAYER_2: 0 },
    currentSet: 0,
    currentSetState: { games: { PLAYER_1: 0, PLAYER_2: 0 } },
    currentGame: { points: { PLAYER_1: '0', PLAYER_2: '0' }, server: 'PLAYER_1', isTiebreak: false },
    server: 'PLAYER_1',
    isFinished: false,
    config: {
      format: 'BEST_OF_3', setsToWin: 2, gamesPerSet: 6, useAdvantage: true, useTiebreak: true, tiebreakAt: 6, tiebreakPoints: 7
    }
  });
});

beforeEach(() => {
  vi.spyOn(RealtimeMatchServiceModule.RealtimeMatchService, 'getInstance').mockReturnValue({
    startWatching: mockStartWatching,
    stopWatching: mockStopWatching,
    updateMatchState: mockUpdateMatchState,
  } as any);
  // Mock global fetch para evitar qualquer chamada real
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe.skip('useRealtimeMatch', () => {
  const mockMatchId = '123';
  const mockState: any = {
    status: 'IN_PROGRESS',
    lastUpdate: new Date(),
    sets: { PLAYER_1: 0, PLAYER_2: 0 },
    currentSet: 0,
    currentSetState: { games: { PLAYER_1: 0, PLAYER_2: 0 } },
    currentGame: { points: { PLAYER_1: '0', PLAYER_2: '0' }, server: 'PLAYER_1', isTiebreak: false },
    server: 'PLAYER_1',
    isFinished: false,
    config: {
      format: 'BEST_OF_3', setsToWin: 2, gamesPerSet: 6, useAdvantage: true, useTiebreak: true, tiebreakAt: 6, tiebreakPoints: 7
    }
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve inicializar com o estado correto', () => {
    const { result } = renderHook(() => useRealtimeMatch(mockMatchId));
    expect(result.current.state).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.isLoading).toBe(false);
  });

  it('deve atualizar estado em tempo real', async () => {
    const { result } = renderHook(() => useRealtimeMatch(mockMatchId));
    
    await act(async () => {
      await result.current.updateState(mockState);
    });

    expect(result.current.state).toEqual(mockState);
    expect(result.current.error).toBe(null);
  });

  it('deve lidar com atualizações parciais', async () => {
    const { result } = renderHook(() => useRealtimeMatch(mockMatchId));
    
    await act(async () => {
      await result.current.updateState({ status: 'IN_PROGRESS' });
    });

    expect(result.current.state?.status).toBe('IN_PROGRESS');
  });

  it('deve lidar com erros de atualização', async () => {
    const { result } = renderHook(() => useRealtimeMatch(mockMatchId));
    
    await act(async () => {
      // Forçar erro com estado inválido
      await result.current.updateState({ status: 'INVALID' as any });
    });

    expect(result.current.error).toBeTruthy();
  });
});