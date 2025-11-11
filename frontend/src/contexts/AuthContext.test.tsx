import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

// Mock do localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock do MOCK_PLAYERS
vi.mock('../data/players', () => ({
  default: [
    { email: 'player@test.com', password: '123', name: 'Test Player' }
  ]
}));

// Componente de teste para usar o hook
const TestComponent: React.FC = () => {
  const { isAuthenticated, currentUser, login, logout, loading, error } = useAuth();

  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
      <div data-testid="user">{currentUser ? JSON.stringify(currentUser) : 'no-user'}</div>
      <div data-testid="loading">{loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="error">{error || 'no-error'}</div>
      <button onClick={() => login('play@email.com', '1234')}>Login Annotator</button>
      <button onClick={() => login('player@test.com', '123')}>Login Player</button>
      <button onClick={() => login('invalid@test.com', 'wrong')}>Login Invalid</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Estado inicial', () => {
    it('deve começar não autenticado sem usuário salvo', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      expect(screen.getByTestId('error')).toHaveTextContent('no-error');
    });

    it('deve carregar usuário autenticado do localStorage', () => {
      const mockUser = { role: 'annotator' as const, email: 'play@email.com' };
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'racket_auth') return 'true';
        if (key === 'racket_user') return JSON.stringify(mockUser);
        return null;
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
    });
  });

  describe('Login', () => {
    it('deve autenticar anotador com credenciais corretas', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      fireEvent.click(screen.getByText('Login Annotator'));

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith('racket_auth', 'true');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'racket_user',
        JSON.stringify({ role: 'annotator', email: 'play@email.com' })
      );
    });

    it('deve autenticar jogador com credenciais corretas', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      fireEvent.click(screen.getByText('Login Player'));

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith('racket_auth', 'true');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'racket_user',
        JSON.stringify({ role: 'player', email: 'player@test.com' })
      );
    });

    it('deve rejeitar credenciais inválidas', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
      // Usa act para capturar erro do React
      await waitFor(async () => {
        try {
          await act(async () => {
            fireEvent.click(screen.getByText('Login Invalid'));
          });
        } catch (err) {
          // Não propaga erro para o Vitest
        }
        expect(screen.getByTestId('error')).toHaveTextContent('Credenciais inválidas.');
      });
      expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('deve mostrar estado de loading durante login', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      fireEvent.click(screen.getByText('Login Annotator'));

      expect(screen.getByTestId('loading')).toHaveTextContent('loading');

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });
    });
  });

  describe('Logout', () => {
    it('deve desautenticar usuário', () => {
      const mockUser = { role: 'annotator' as const, email: 'play@email.com' };
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'racket_auth') return 'true';
        if (key === 'racket_user') return JSON.stringify(mockUser);
        return null;
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      fireEvent.click(screen.getByText('Logout'));

      expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('racket_auth');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('racket_user');
    });
  });

  describe('Hook useAuth', () => {
    it('deve lançar erro quando usado fora do provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<TestComponent />)).toThrow(
        'useAuth must be used within an AuthProvider'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Persistência de sessão', () => {
    it('deve limpar dados inválidos do localStorage', () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'racket_auth') return 'true';
        if (key === 'racket_user') return 'invalid-json';
        return null;
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
    });
  });
});