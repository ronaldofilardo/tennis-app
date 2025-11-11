import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MatchesProvider, useMatches } from './MatchesContext';
import { AuthProvider } from './AuthContext';

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
  value: localStorageMock
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
  API_URL: 'http://localhost:3001'
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
    <MatchesProvider>
      {children}
    </MatchesProvider>
  </AuthProvider>
);

describe('MatchesContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    mockUseLocation.mockReturnValue({ pathname: '/dashboard' });

    // Mock do usuário autenticado
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'racket_auth') return 'true';
      if (key === 'racket_user') return JSON.stringify({ role: 'annotator', email: 'test@test.com' });
      return null;
    });

    // Mock do fetch
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 'match1', sportType: 'Tennis' },
        { id: 'match2', sportType: 'Tennis' }
      ]
    });
  });

  describe('Estado inicial', () => {
    it('deve começar com lista vazia', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
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
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('matches-count')).toHaveTextContent('2');
      });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/matches/visible?email=test%40test.com&role=annotator'
      );
    });

    it('não deve carregar matches se usuário não estiver autenticado', () => {
      localStorageMock.getItem.mockReturnValue(null);

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('não deve carregar matches se não estiver na rota dashboard', () => {
      mockUseLocation.mockReturnValue({ pathname: '/login' });

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Adicionar match', () => {
    it('deve adicionar match à lista', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
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
        </TestWrapper>
      );

      // Aguardar carregamento inicial
      await waitFor(() => {
        expect(screen.getByTestId('matches-count')).toHaveTextContent('2');
      });

      // Modificar mock para retornar dados diferentes
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: 'match3', sportType: 'Tennis' },
          { id: 'match4', sportType: 'Tennis' },
          { id: 'match5', sportType: 'Tennis' }
        ]
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
      (globalThis.fetch as any).mockRejectedValueOnce(new Error('API Error'));

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('API Error');
      });
    });

    it('deve tratar resposta não-ok da API', async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Falha ao carregar partidas');
      });
    });
  });

  describe('Hook useMatches', () => {
    it('deve lançar erro quando usado fora do provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<TestComponent />)).toThrow(
        'useMatches must be used within a MatchesProvider'
      );

      consoleSpy.mockRestore();
    });
  });
});