import '../../../vitest.setup';

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MatchesProvider, useMatches } from '../MatchesContext';
import { AuthProvider } from '../AuthContext';
import { MemoryRouter } from 'react-router-dom';

// Mock do fetch global
const mockFetch = vi.fn();
(vi as any).stubGlobal('fetch', mockFetch);

const mockMatches = [
  { id: '1', sportType: 'Tennis', status: 'NOT_STARTED' },
  { id: '2', sportType: 'Tennis', status: 'IN_PROGRESS' },
  { id: '3', sportType: 'Tennis', status: 'FINISHED' },
];

const TestComponent: React.FC = () => {
  const { matches, loading, error } = useMatches();
  return (
    <div>
      <div data-testid="matches-count">{matches.length}</div>
      <div data-testid="statuses">{matches.map(m => m.status).join(',')}</div>
      <div data-testid="loading">{loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="error">{error || 'no-error'}</div>
    </div>
  );
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MemoryRouter initialEntries={["/dashboard"]}>
    <AuthProvider>
      <MatchesProvider>{children}</MatchesProvider>
    </AuthProvider>
  </MemoryRouter>
);

describe('MatchesContext integração com estados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock usuário autenticado
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => {
        if (key === 'racket_auth') return 'true';
        if (key === 'racket_user') return JSON.stringify({ role: 'annotator', email: 'test@test.com' });
        return null;
      },
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockMatches,
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('exibe todos os estados recebidos do backend', async () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );
    await waitFor(() => {
      expect(screen.getByTestId('matches-count')).toHaveTextContent('3');
      expect(screen.getByTestId('statuses')).toHaveTextContent('NOT_STARTED,IN_PROGRESS,FINISHED');
    });
  });
});
