import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MatchesProvider, useMatches } from './MatchesContext';
import { AuthProvider } from './AuthContext';
import { HttpError } from '../config/httpClient';

// vi.hoisted para inicializar mockHttpClient antes do hoisting do vi.mock
const { mockHttpClient } = vi.hoisted(() => ({
  mockHttpClient: {
    post: vi.fn(),
    get: vi.fn(),
    setAuthConfig: vi.fn(),
    setTenantConfig: vi.fn(),
    onUnauthorized: vi.fn(),
  },
}));

vi.mock('../config/httpClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config/httpClient')>();
  return {
    ...actual,
    default: mockHttpClient,
    httpClient: mockHttpClient,
  };
});

vi.mock('../config/themeProvider', () => ({
  loadClubTheme: vi.fn().mockResolvedValue({}),
  applyClubTheme: vi.fn(),
  resetTheme: vi.fn(),
}));

vi.mock('../services/logger', () => ({
  logger: {
    createModuleLogger: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
    setGlobalContext: vi.fn(),
    clearGlobalContext: vi.fn(),
  },
}));

// Mock do fetch
globalThis.fetch = vi.fn();

// Mock do localStorage para AuthProvider
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock do useLocation
const mockUseLocation = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => mockUseLocation(),
  };
});

// Mock do API_URL
vi.mock('../config/api', () => ({
  API_URL: 'http://localhost:3001',
}));

// Componente de teste para usar o hook
const TestComponent: React.FC = () => {
  const { matches, loading, error, addMatch, refreshMatches } = useMatches();

  return (
    <div>
      <div data-testid="matches-count">{matches.length}</div>
      <div data-testid="loading">{loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="error">{error || 'no-error'}</div>
      <button onClick={() => addMatch({ id: 'test-match', sportType: 'Tennis' })}>Add Match</button>
      <button onClick={refreshMatches}>Refresh</button>
      <div data-testid="matches-data">{JSON.stringify(matches)}</div>
    </div>
  );
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    <MatchesProvider>{children}</MatchesProvider>
  </AuthProvider>
);

describe('MatchesContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    mockUseLocation.mockReturnValue({ pathname: '/dashboard' });

    // Mock do usuário autenticado com formato novo (AuthUser completo)
    // racket_schema_v é obrigatório para que loadStoredUser() não limpe tudo
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'racket_schema_v') return '3';
      if (key === 'racket_token') return 'test-token';
      if (key === 'racket_user')
        return JSON.stringify({
          id: 'user-001',
          email: 'test@test.com',
          name: 'Test User',
          role: 'COACH',
          clubs: [],
          activeClubId: null,
          activeRole: 'COACH',
        });
      return null;
    });

    // Mock do httpClient.get
    mockHttpClient.get.mockResolvedValue({
      ok: true,
      status: 200,
      data: [
        { id: 'match1', sportType: 'Tennis' },
        { id: 'match2', sportType: 'Tennis' },
      ],
      headers: {},
    });
  });

  describe('Estado inicial', () => {
    it('deve começar com lista vazia', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>,
      );

      expect(screen.getByTestId('matches-count')).toHaveTextContent('0');
      expect(screen.getByTestId('loading')).toHaveTextContent('loading');
      expect(screen.getByTestId('error')).toHaveTextContent('no-error');
    });
  });

  describe('Carregamento automático', () => {
    it('deve carregar matches automaticamente quando dashboard é acessado', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('matches-count')).toHaveTextContent('2');
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/matches/visible',
        expect.objectContaining({ timeout: 10_000 }),
      );
    });

    it('não deve carregar matches se usuário não estiver autenticado', () => {
      localStorageMock.getItem.mockReturnValue(null);

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>,
      );

      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });

    it('não deve carregar matches se não estiver na rota dashboard', () => {
      mockUseLocation.mockReturnValue({ pathname: '/login' });

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>,
      );

      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });
  });

  describe('Adicionar match', () => {
    it('deve adicionar match à lista', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>,
      );

      // Aguardar carregamento inicial
      await waitFor(() => {
        expect(screen.getByTestId('matches-count')).toHaveTextContent('2');
      });

      // Adicionar novo match
      screen.getByText('Add Match').click();

      await waitFor(() => {
        expect(screen.getByTestId('matches-count')).toHaveTextContent('3');
      });

      const matchesData = JSON.parse(screen.getByTestId('matches-data').textContent || '[]');
      expect(matchesData).toHaveLength(3);
      expect(matchesData[2]).toEqual({ id: 'match2', sportType: 'Tennis' });
    });
  });

  describe('Refresh matches', () => {
    it('deve recarregar lista de matches', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>,
      );

      // Aguardar carregamento inicial
      await waitFor(() => {
        expect(screen.getByTestId('matches-count')).toHaveTextContent('2');
      });

      // Modificar mock para retornar dados diferentes
      mockHttpClient.get.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: [
          { id: 'match3', sportType: 'Tennis' },
          { id: 'match4', sportType: 'Tennis' },
          { id: 'match5', sportType: 'Tennis' },
        ],
        headers: {},
      });

      // Chamar refresh
      screen.getByText('Refresh').click();

      await waitFor(() => {
        expect(screen.getByTestId('matches-count')).toHaveTextContent('3');
      });
    });
  });

  describe('Tratamento de erros', () => {
    it('deve tratar erro na API', async () => {
      mockHttpClient.get.mockRejectedValueOnce(new Error('API Error'));

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('API Error');
      });
    });

    it('deve tratar resposta não-ok da API', async () => {
      mockHttpClient.get.mockRejectedValueOnce(new Error('Falha ao carregar partidas'));

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Falha ao carregar partidas');
      });
    });

    it('deve tratar erro 401 (não autenticado) e exibir mensagem de erro', async () => {
      mockHttpClient.get.mockRejectedValueOnce(
        new HttpError('Token inválido ou expirado', 'AUTH_ERROR', 401),
      );

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Token inválido ou expirado');
      });
    });

    it('deve tratar erro 403 (sem permissão) e exibir mensagem de erro', async () => {
      mockHttpClient.get.mockRejectedValueOnce(
        new HttpError('Acesso não autorizado', 'PERMISSION_ERROR', 403),
      );

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Acesso não autorizado');
      });
    });

    it('deve tratar erro 500 (erro do servidor) e exibir mensagem de erro', async () => {
      mockHttpClient.get.mockRejectedValueOnce(
        new HttpError('Erro interno do servidor', 'SERVER_ERROR', 500),
      );

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Erro interno do servidor');
      });
    });
  });

  describe('Hook useMatches', () => {
    it('deve lançar erro quando usado fora do provider', () => {
      const OutsideProviderComponent = () => {
        const { matches } = useMatches();
        return <div>{matches.length}</div>;
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<OutsideProviderComponent />)).toThrow(
        'useMatches must be used within a MatchesProvider',
      );

      consoleSpy.mockRestore();
    });
  });
});
