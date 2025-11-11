import '../../../vitest.setup';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
// import axios from 'axios';
import MatchSetup from '../MatchSetup';

// Mock do CSS
vi.mock('../MatchSetup.css', () => ({}));

// Mock axios para usar fetch global
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  post: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

// Mock do alert global
const mockAlert = vi.fn();
vi.stubGlobal('alert', mockAlert);

const mockPlayers = [
  { id: '1', name: 'Jogador 1', email: 'j1@test.com' },
  { id: '2', name: 'Jogador 2', email: 'j2@test.com' }
];

const defaultProps = {
  onMatchCreated: vi.fn(),
  onBackToDashboard: vi.fn(),
  players: mockPlayers
};

import { AuthProvider } from '../../contexts/AuthContext';
import { MatchesProvider } from '../../contexts/MatchesContext';

const renderMatchSetup = (props = {}) => {
  return render(
    <AuthProvider>
      <BrowserRouter>
        <MatchesProvider>
          <MatchSetup {...defaultProps} {...props} />
        </MatchesProvider>
      </BrowserRouter>
    </AuthProvider>
  );
};

describe('MatchSetup - Match Creation Flow', () => {
   beforeEach(() => {
     (global as any).resetGlobalMocks();
  (axios.post as any).mockReset && (axios.post as any).mockReset();
  (axios.post as any).mockResolvedValue({
       data: {
         id: 'test-match-id',
         sportType: 'TENNIS',
         format: 'BEST_OF_3',
         players: { p1: 'Jogador 1', p2: 'Jogador 2' },
         status: 'NOT_STARTED'
       }
     });
   });

  describe('Match creation and navigation', () => {
    it('creates match and navigates without showing alert', async () => {
      const mockOnMatchCreated = vi.fn();
      renderMatchSetup({ onMatchCreated: mockOnMatchCreated });

      // Fill required fields
      const player1Select = screen.getByTestId('player1-input');
      const player2Select = screen.getByTestId('player2-input');

      fireEvent.change(player1Select, { target: { value: '1' } });
      fireEvent.change(player2Select, { target: { value: '2' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: 'Iniciar Partida' });
      fireEvent.click(submitButton);

      // Wait for API call and navigation
      await waitFor(() => {
  expect((axios.post as any)).toHaveBeenCalledWith(
          expect.stringContaining('/matches'),
          expect.objectContaining({
            sportType: 'TENNIS',
            format: 'BEST_OF_3',
            players: { p1: '1', p2: '2' },
            nickname: null,
            visibleTo: 'both',
          })
        );
      });

      // Verify onMatchCreated was called with match data
      expect(mockOnMatchCreated).toHaveBeenCalledWith({
        id: 'test-match-id',
        sportType: 'TENNIS',
        format: 'BEST_OF_3',
        players: { p1: 'Jogador 1', p2: 'Jogador 2' },
        status: 'NOT_STARTED'
      });

      // Verify no alert was shown
      expect(mockAlert).not.toHaveBeenCalled();
    });

    it('handles API errors gracefully', async () => {
      (axios.post as any).mockRejectedValue(new Error('API Error'));
      renderMatchSetup();

      // Fill required fields
      const player1Select = screen.getByTestId('player1-input');
      const player2Select = screen.getByTestId('player2-input');

      fireEvent.change(player1Select, { target: { value: '1' } });
      fireEvent.change(player2Select, { target: { value: '2' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: 'Iniciar Partida' });
      fireEvent.click(submitButton);

      // Wait for error handling
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Falha ao criar a partida. Verifique o console do navegador e do backend.');
      });
    });

    it('validates required player fields', async () => {
      renderMatchSetup();

      // Try to submit without players
      const submitButton = screen.getByRole('button', { name: 'Iniciar Partida' });
      fireEvent.click(submitButton);

      // Should show error and not call API
      await waitFor(() => {
        expect(screen.getByText('Os nomes dos jogadores são obrigatórios.')).toBeInTheDocument();
      });
  expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Form validation', () => {
    it('requires both players to be selected', async () => {
      renderMatchSetup();

      const submitButton = screen.getByRole('button', { name: 'Iniciar Partida' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Os nomes dos jogadores são obrigatórios.')).toBeInTheDocument();
      });
    });

    it('allows form submission when both players are selected', async () => {
      renderMatchSetup();

      const player1Select = screen.getByTestId('player1-input');
      const player2Select = screen.getByTestId('player2-input');

      fireEvent.change(player1Select, { target: { value: '1' } });
      fireEvent.change(player2Select, { target: { value: '2' } });

      const submitButton = screen.getByRole('button', { name: 'Iniciar Partida' });
      fireEvent.click(submitButton);

      await waitFor(() => {
  expect((axios.post as any)).toHaveBeenCalled();
      });
    });
  });

  describe('Back navigation', () => {
    it('calls onBackToDashboard when back button is clicked', () => {
      const mockOnBack = vi.fn();
      renderMatchSetup({ onBackToDashboard: mockOnBack });

      const backButton = screen.getByRole('button', { name: '← Voltar' });
      fireEvent.click(backButton);

      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
  });
});