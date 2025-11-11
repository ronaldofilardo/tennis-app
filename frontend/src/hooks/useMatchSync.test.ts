import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocka API_URL para garantir URL absoluta válida nos testes
vi.mock('../config/api', () => ({
  API_URL: 'http://localhost:4001',
}));

import { useMatchSync } from './useMatchSync';

describe('useMatchSync', () => {
  const mockMatchId = '123';
  const mockState = { id: mockMatchId, status: 'IN_PROGRESS' };
  

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((input, init) => {
      // PATCH: sucesso
      if (typeof input === 'string' && input.includes('/matches/') && init?.method === 'PATCH') {
        return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      // GET: sucesso
      if (typeof input === 'string' && input.includes('/matches/')) {
        return Promise.resolve(new Response(JSON.stringify({ id: mockMatchId, status: 'IN_PROGRESS' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      // fallback erro
      return Promise.resolve(new Response('{}', { status: 500, headers: { 'Content-Type': 'application/json' } }));
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
    
    // Mocka fetch para erro
  (global.fetch as any) = vi.fn(() => Promise.resolve(new Response('{}', { status: 500, headers: { 'Content-Type': 'application/json' } })));
    await act(async () => {
      await expect(result.current.syncState(null)).rejects.toThrow();
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeTruthy();
  });
});