// frontend/src/pages/__tests__/MatchComparisonPage.test.tsx
// Testes unitários da MatchComparisonPage — wrapper da rota /comparison/:matchId.
// Introduzida na sessão de anotações (abril/2026).

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom';
import MatchComparisonPage from '../MatchComparisonPage';

// Mock do MatchComparisonView para isolar a página do componente pesado
vi.mock('../../components/MatchComparisonView', () => ({
  default: ({ matchId, onClose }: { matchId: string; onClose: () => void }) => (
    <div data-testid="match-comparison-view">
      <span data-testid="match-id">{matchId}</span>
      <button onClick={onClose}>Fechar</button>
    </div>
  ),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderWithRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/comparison/:matchId" element={<MatchComparisonPage />} />
        <Route path="/comparison" element={<MatchComparisonPage />} />
        <Route path="/dashboard" element={<div data-testid="dashboard">Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

// ─── Testes ──────────────────────────────────────────────────────────────────

describe('MatchComparisonPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar o MatchComparisonView com matchId correto', () => {
    // Arrange & Act
    renderWithRoute('/comparison/match-abc-123');

    // Assert
    expect(screen.getByTestId('match-comparison-view')).toBeInTheDocument();
    expect(screen.getByTestId('match-id').textContent).toBe('match-abc-123');
  });

  it('deve exibir mensagem de partida não encontrada quando matchId está ausente', () => {
    // Arrange — rota sem parâmetro :matchId
    render(
      <MemoryRouter initialEntries={['/comparison']}>
        <Routes>
          <Route path="/comparison" element={<MatchComparisonPage />} />
        </Routes>
      </MemoryRouter>,
    );

    // Assert
    expect(screen.getByText(/partida não encontrada/i)).toBeInTheDocument();
    expect(screen.queryByTestId('match-comparison-view')).not.toBeInTheDocument();
  });

  it('deve navegar para /dashboard ao chamar onClose', async () => {
    // Arrange
    renderWithRoute('/comparison/match-xyz');

    // Act
    fireEvent.click(screen.getByRole('button', { name: /fechar/i }));

    // Assert — redireciona para dashboard
    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
  });

  it('deve passar matchId da URL para o MatchComparisonView', () => {
    // Arrange & Act
    renderWithRoute('/comparison/partida-456');

    // Assert
    expect(screen.getByTestId('match-id').textContent).toBe('partida-456');
  });
});
