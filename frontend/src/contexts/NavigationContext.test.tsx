import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NavigationProvider, useNavigation } from './NavigationContext';
import '@testing-library/jest-dom/vitest';

const mockNavigate = vi.fn();

// Mock do react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual as any,
    useNavigate: () => mockNavigate,
  };
});

// Mock do react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual as any,
    useNavigate: () => mockNavigate,
  };
});

// Componente de teste para usar o hook
const TestComponent: React.FC = () => {
  const {
    navigateToDashboard,
    navigateToMatch,
    navigateToNewMatch,
    navigateToLogin
  } = useNavigation();

  return (
    <div>
      <button onClick={navigateToDashboard}>Go to Dashboard</button>
      <button onClick={() => navigateToMatch('test-match-id')}>Go to Match</button>
      <button onClick={navigateToNewMatch}>Go to New Match</button>
      <button onClick={navigateToLogin}>Go to Login</button>
      <div data-testid="navigation-ready">Navigation Ready</div>
    </div>
  );
};

describe('NavigationContext', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('deve fornecer funções de navegação', () => {
    render(
      <MemoryRouter>
        <NavigationProvider>
          <TestComponent />
        </NavigationProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('navigation-ready')).toHaveTextContent('Navigation Ready');
  });

  describe('Funções de navegação', () => {
    beforeEach(() => {
      mockNavigate.mockClear();
    });

    it('navigateToDashboard deve chamar navigate com /dashboard', () => {
      render(
        <MemoryRouter>
          <NavigationProvider>
            <TestComponent />
          </NavigationProvider>
        </MemoryRouter>
      );

      screen.getByText('Go to Dashboard').click();
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: false });
    });

    it('navigateToMatch deve chamar navigate com /match/:id', () => {
      render(
        <MemoryRouter>
          <NavigationProvider>
            <TestComponent />
          </NavigationProvider>
        </MemoryRouter>
      );

      screen.getByText('Go to Match').click();
      expect(mockNavigate).toHaveBeenCalledWith('/match/test-match-id', { replace: false });
    });

    it('navigateToNewMatch deve chamar navigate com /match/new', () => {
      render(
        <MemoryRouter>
          <NavigationProvider>
            <TestComponent />
          </NavigationProvider>
        </MemoryRouter>
      );

      screen.getByText('Go to New Match').click();
      expect(mockNavigate).toHaveBeenCalledWith('/match/new', { replace: false });
    });

    it('navigateToLogin deve chamar navigate com /login', () => {
      render(
        <MemoryRouter>
          <NavigationProvider>
            <TestComponent />
          </NavigationProvider>
        </MemoryRouter>
      );

      screen.getByText('Go to Login').click();
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: false });
    });
  });

  describe('Hook useNavigation', () => {
    it('deve lançar erro quando usado fora do provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<TestComponent />)).toThrow(
        'useNavigation must be used within a NavigationProvider'
      );

      consoleSpy.mockRestore();
    });
  });
});