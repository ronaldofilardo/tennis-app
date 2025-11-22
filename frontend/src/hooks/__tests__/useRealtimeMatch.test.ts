import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRealtimeMatch } from '../useRealtimeMatch';
import { RealtimeMatchService } from '../../services/RealtimeMatchService';

// Mock do RealtimeMatchService
vi.mock('../../services/RealtimeMatchService', () => ({
  RealtimeMatchService: {
    getInstance: vi.fn(() => ({
      startWatching: vi.fn(),
      stopWatching: vi.fn(),
      updateMatchState: vi.fn(),
    })),
  },
}));

describe('useRealtimeMatch', () => {
  let mockService: any;
  let mockStartWatching: any;
  let mockStopWatching: any;
  let mockUpdateMatchState: any;

  beforeEach(() => {
    mockStartWatching = vi.fn().mockResolvedValue(undefined);
    mockStopWatching = vi.fn();
    mockUpdateMatchState = vi.fn().mockResolvedValue(undefined);

    mockService = {
      startWatching: mockStartWatching,
      stopWatching: mockStopWatching,
      updateMatchState: mockUpdateMatchState,
    };

    (RealtimeMatchService.getInstance as any).mockReturnValue(mockService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('deve inicializar com estado correto', () => {
    const { result } = renderHook(() => useRealtimeMatch('test-match-id'));

    expect(result.current.state).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('deve iniciar monitoramento quando matchId é fornecido', async () => {
    mockStartWatching.mockImplementationOnce((matchId: string, onUpdate: Function) => {
      // Simula chamada imediata do callback
      setTimeout(() => onUpdate({ status: 'IN_PROGRESS', lastUpdate: new Date() }), 0);
      return Promise.resolve();
    });

    const { result } = renderHook(() => useRealtimeMatch('test-match-id'));

    await waitFor(() => {
      expect(mockStartWatching).toHaveBeenCalledWith('test-match-id', expect.any(Function));
    });
  });

  it('não deve iniciar monitoramento sem matchId', () => {
    renderHook(() => useRealtimeMatch(''));

    expect(mockStartWatching).not.toHaveBeenCalled();
  });

  it('deve atualizar estado quando recebe atualização', async () => {
    const mockState = {
      status: 'IN_PROGRESS' as const,
      lastUpdate: new Date(),
      sets: { PLAYER_1: 0, PLAYER_2: 0 }
    };

    mockStartWatching.mockImplementationOnce((matchId: string, onUpdate: Function) => {
      // Simula uma atualização imediata
      setTimeout(() => onUpdate(mockState), 0);
      return Promise.resolve();
    });

    const { result } = renderHook(() => useRealtimeMatch('test-match-id'));

    await waitFor(() => {
      expect(result.current.state).toEqual(mockState);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  it('deve lidar com erros durante o monitoramento', async () => {
    const mockError = new Error('Erro de conexão');
    const mockOnError = vi.fn();

    mockStartWatching.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() =>
      useRealtimeMatch('test-match-id', { onError: mockOnError })
    );

    await waitFor(() => {
      expect(result.current.error).toEqual(mockError);
      expect(result.current.isLoading).toBe(false);
      expect(mockOnError).toHaveBeenCalledWith(mockError);
    });
  });

  it('deve atualizar estado via updateState', async () => {
    const newState = { status: 'FINISHED' as const };
    const updatedState = { ...newState, lastUpdate: new Date() };

    mockUpdateMatchState.mockResolvedValueOnce(updatedState);

    const { result } = renderHook(() => useRealtimeMatch('test-match-id'));

    await act(async () => {
      await result.current.updateState(newState);
    });

    expect(mockUpdateMatchState).toHaveBeenCalledWith('test-match-id', newState);
    expect(result.current.state).toEqual(updatedState);
    expect(result.current.isLoading).toBe(false);
  });

  it('deve lidar com erros em updateState', async () => {
    const mockError = new Error('Erro ao atualizar');
    const mockOnError = vi.fn();

    mockUpdateMatchState.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() =>
      useRealtimeMatch('test-match-id', { onError: mockOnError })
    );

    await act(async () => {
      try {
        await result.current.updateState({ status: 'FINISHED' });
      } catch (error) {
        // Erro esperado
      }
    });

    expect(result.current.error).toEqual(mockError);
    expect(mockOnError).toHaveBeenCalledWith(mockError);
  });

  it('não deve atualizar estado sem matchId', async () => {
    const { result } = renderHook(() => useRealtimeMatch(''));

    await act(async () => {
      await result.current.updateState({ status: 'FINISHED' });
    });

    expect(mockUpdateMatchState).not.toHaveBeenCalled();
  });

  it('deve limpar monitoramento ao desmontar', () => {
    const { unmount } = renderHook(() => useRealtimeMatch('test-match-id'));

    unmount();

    expect(mockStopWatching).toHaveBeenCalledWith('test-match-id', expect.any(Function));
  });

  it('deve reiniciar monitoramento quando matchId muda', () => {
    const { rerender } = renderHook(({ matchId }) => useRealtimeMatch(matchId), {
      initialProps: { matchId: 'match-1' }
    });

    expect(mockStartWatching).toHaveBeenCalledWith('match-1', expect.any(Function));

    rerender({ matchId: 'match-2' });

    expect(mockStopWatching).toHaveBeenCalledWith('match-1', expect.any(Function));
    expect(mockStartWatching).toHaveBeenCalledWith('match-2', expect.any(Function));
  });
});