import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRealtimeMatch } from './useRealtimeMatch';
import type { RealtimeMatch } from '../types/match';

describe('useRealtimeMatch', () => {
  const mockMatchId = '123';
  const mockState: RealtimeMatch = {
    id: mockMatchId,
    status: 'IN_PROGRESS',
    players: { p1: 'Player 1', p2: 'Player 2' },
    currentScore: { sets: [], games: [], points: [] },
    timestamp: new Date().toISOString()
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