import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockHttpClient } = vi.hoisted(() => ({
  mockHttpClient: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../config/httpClient', () => ({ default: mockHttpClient, httpClient: mockHttpClient }));

import { useMatchSync } from './useMatchSync';

describe('useMatchSync', () => {
  const mockMatchId = '123';
  const mockState = { id: mockMatchId, status: 'IN_PROGRESS' };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHttpClient.patch.mockResolvedValue({
      ok: true,
      data: { success: true },
      status: 200,
    });
    mockHttpClient.get.mockResolvedValue({
      ok: true,
      data: { id: mockMatchId, status: 'IN_PROGRESS' },
      status: 200,
    });
  });

  it('deve inicializar com o estado correto', () => {
    const { result } = renderHook(() => useMatchSync(mockMatchId));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.lastSync).toBe(null);
  });

  it('deve sincronizar estado com sucesso', async () => {
    const { result } = renderHook(() => useMatchSync(mockMatchId));

    await act(async () => {
      await result.current.syncState(mockState);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.lastSync).toBeTruthy();
  });

  it('deve obter estado atual', async () => {
    const { result } = renderHook(() => useMatchSync(mockMatchId));

    await act(async () => {
      const state = await result.current.getState();
      expect(state).toBeTruthy();
    });
  });

  it('deve lidar com erros de sincronização', async () => {
    const { result } = renderHook(() => useMatchSync(mockMatchId));

    // Mocka httpClient para erro
    mockHttpClient.patch.mockRejectedValue(new Error('Falha ao sincronizar estado'));
    await act(async () => {
      await expect(result.current.syncState(null)).rejects.toThrow();
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeTruthy();
  });
});
