// useAdminData.http-errors.test.ts
// Testes de cobertura de erros HTTP (401, 403, 500) para o hook useAdminData
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAdminData } from '../useAdminData';
import { HttpError } from '../../config/httpClient';

// ── Mock do httpClient ─────────────────────────────────────────────────────

const { mockHttpClient } = vi.hoisted(() => ({
  mockHttpClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    setAuthConfig: vi.fn(),
    setTenantConfig: vi.fn(),
    onUnauthorized: vi.fn(),
  },
}));

vi.mock('../../config/httpClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../config/httpClient')>();
  return { ...actual, httpClient: mockHttpClient };
});

// ── Testes ─────────────────────────────────────────────────────────────────

describe('useAdminData — erros HTTP em fetchStats', () => {
  const mockToast = { error: vi.fn(), success: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('armazena mensagem de erro quando fetchStats retorna HTTP 401', async () => {
    mockHttpClient.get.mockRejectedValueOnce(new HttpError('Não autorizado', 'AUTH_ERROR', 401));

    const { result } = renderHook(() => useAdminData(mockToast));

    await waitFor(() => {
      expect(result.current.state.loadingStats).toBe(false);
    });

    expect(result.current.state.error).toBe('Não autorizado');
    expect(result.current.state.stats).toBeNull();
  });

  it('armazena mensagem de erro quando fetchStats retorna HTTP 403', async () => {
    mockHttpClient.get.mockRejectedValueOnce(
      new HttpError('Acesso negado', 'PERMISSION_ERROR', 403),
    );

    const { result } = renderHook(() => useAdminData(mockToast));

    await waitFor(() => {
      expect(result.current.state.loadingStats).toBe(false);
    });

    expect(result.current.state.error).toBe('Acesso negado');
    expect(result.current.state.stats).toBeNull();
  });

  it('armazena mensagem de erro quando fetchStats retorna HTTP 500', async () => {
    mockHttpClient.get.mockRejectedValueOnce(
      new HttpError('Erro interno do servidor', 'SERVER_ERROR', 500),
    );

    const { result } = renderHook(() => useAdminData(mockToast));

    await waitFor(() => {
      expect(result.current.state.loadingStats).toBe(false);
    });

    expect(result.current.state.error).toBe('Erro interno do servidor');
    expect(result.current.state.stats).toBeNull();
  });

  it('exibe toast de erro quando fetchClubs retorna HTTP 500', async () => {
    // fetchStats sucesso
    mockHttpClient.get.mockResolvedValueOnce({
      data: { totalClubs: 0, totalUsers: 0, totalMatches: 0 },
    });
    // fetchClubs erro
    mockHttpClient.get.mockRejectedValueOnce(
      new HttpError('Erro interno do servidor', 'SERVER_ERROR', 500),
    );

    const { result } = renderHook(() => useAdminData(mockToast));

    // Aguarda stats carregar
    await waitFor(() => expect(result.current.state.loadingStats).toBe(false));

    // Dispara fetchClubs
    await result.current.fetchClubs();

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Erro ao carregar clubes.');
    });
  });
});
