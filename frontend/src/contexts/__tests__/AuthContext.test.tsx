import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthContext, AuthProvider } from '../AuthContext';
import { useContext } from 'react';
import '@testing-library/jest-dom';

// Mock do localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Componente de teste
import { useAuth } from '../AuthContext';
const TestComponent = () => {
  const { isAuthenticated, login, logout, currentUser } = useAuth();
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'true' : 'false'}</div>
      <div data-testid="user-info">{currentUser ? JSON.stringify(currentUser) : ''}</div>
      <button onClick={() => login('play@email.com', '1234')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('deve inicializar com estado não autenticado', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('false');
  expect(screen.getByTestId('user-info')).toHaveTextContent('');
  });

  it('deve autenticar usuário com sucesso', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('true');
      expect(screen.getByTestId('user-info')).toHaveTextContent('play@email.com');
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'racket_auth',
      'true'
    );
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'racket_user',
      expect.any(String)
    );
  });

  it('deve fazer logout com sucesso', async () => {
    // Simular usuário já logado
  mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ role: 'annotator', email: 'play@email.com' }));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Logout'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('false');
  expect(screen.getByTestId('user-info')).toHaveTextContent('');
    });

  expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('racket_auth');
  expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('racket_user');
  });

  it('deve restaurar sessão do localStorage', () => {
    const savedUser = { role: 'annotator', email: 'play@email.com' };
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === 'racket_auth') return 'true';
      if (key === 'racket_user') return JSON.stringify(savedUser);
      return null;
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('true');
    expect(screen.getByTestId('user-info')).toHaveTextContent('play@email.com');
  });

  it('deve lidar com dados inválidos no localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue('invalid-json');

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('false');
  expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('racket_auth');
  expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('racket_user');
  });
});