import '../../../vitest.setup';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MatchSetup from '../MatchSetup';

// Mock do CSS
vi.mock('../MatchSetup.css', () => ({}));

// vi.hoisted garante inicialização antes do hoisting do vi.mock
const { mockHttpClient, mockToastError } = vi.hoisted(() => ({
  mockHttpClient: {
    post: vi.fn(),
    get: vi.fn(),
    setAuthConfig: vi.fn(),
    setTenantConfig: vi.fn(),
    onUnauthorized: vi.fn(),
  },
  mockToastError: vi.fn(),
}));

// Mock do httpClient (usado por MatchSetup e AuthProvider)
vi.mock('../../config/httpClient', () => ({ default: mockHttpClient, httpClient: mockHttpClient }));

// Mock do themeProvider (necessário para AuthProvider)
vi.mock('../../config/themeProvider', () => ({
  loadClubTheme: vi.fn().mockResolvedValue({}),
  applyClubTheme: vi.fn(),
  resetTheme: vi.fn(),
}));

// Mock do logger
vi.mock('../../services/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
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

// Mock do Toast
vi.mock('../../components/Toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
    success: vi.fn(),
    error: mockToastError,
    warning: vi.fn(),
    info: vi.fn(),
    dismiss: vi.fn(),
    dismissAll: vi.fn(),
  }),
  ToastProvider: ({ children }: any) => children,
}));

// Mock do VenueSelect
vi.mock('../../components/VenueSelect', () => ({
  default: ({ onChange, placeholder }: any) => (
    <input
      placeholder={placeholder ?? 'Buscar ou criar local...'}
      aria-label="Local da partida"
      onChange={() => onChange({ venueId: null, venueName: '' })}
    />
  ),
}));

// Mock do AthleteSearchInput — simula seleção via onChange para facilitar testes
vi.mock('../../components/AthleteSearchInput', () => ({
  default: ({ id, label, placeholder, onSelect }: any) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        placeholder={placeholder}
        aria-label={label}
        onChange={(e) =>
          onSelect(
            e.target.value
              ? {
                  id: `athlete_${Date.now()}`,
                  name: e.target.value,
                  email: '',
                }
              : null,
          )
        }
      />
    </div>
  ),
}));

// Mock do alert global
const mockAlert = vi.fn();
vi.stubGlobal('alert', mockAlert);

const defaultProps = {
  onMatchCreated: vi.fn(),
  onBackToDashboard: vi.fn(),
  players: [],
};

import { AuthProvider } from '../../contexts/AuthContext';
import { MatchesProvider } from '../../contexts/MatchesContext';
import { NavigationProvider } from '../../contexts/NavigationContext';

const renderMatchSetup = (props = {}) => {
  return render(
    <AuthProvider>
      <BrowserRouter>
        <MatchesProvider>
          <NavigationProvider>
            <MatchSetup {...defaultProps} {...props} />
          </NavigationProvider>
        </MatchesProvider>
      </BrowserRouter>
    </AuthProvider>,
  );
};

const mockMatchResponse = {
  data: {
    id: 'test-match-id',
    sportType: 'TENNIS',
    format: 'BEST_OF_3',
    players: { p1: 'Jogador 1', p2: 'Jogador 2' },
    status: 'NOT_STARTED',
  },
};

describe('MatchSetup - Match Creation Flow', () => {
  beforeEach(() => {
    (global as any).resetGlobalMocks();
    mockHttpClient.post.mockReset();
    mockHttpClient.post.mockResolvedValue(mockMatchResponse);
  });

  describe('Match creation and navigation', () => {
    it('creates match and navigates without showing alert', async () => {
      const mockOnMatchCreated = vi.fn();
      renderMatchSetup({ onMatchCreated: mockOnMatchCreated });

      // Preenche os campos usando o AthleteSearchInput mockado
      const [player1Input, player2Input] = screen.getAllByPlaceholderText('Buscar atleta...');

      fireEvent.change(player1Input, { target: { value: 'Jogador 1' } });
      fireEvent.change(player2Input, { target: { value: 'Jogador 2' } });

      // Preenche data e horário (obrigatórios)
      fireEvent.change(screen.getByLabelText('Data da partida'), {
        target: { value: '2025-12-01' },
      });
      fireEvent.change(screen.getByLabelText('Horário da partida'), {
        target: { value: '10:00' },
      });

      // Submit form
      const submitButton = screen.getByRole('button', {
        name: 'Iniciar Partida',
      });
      fireEvent.click(submitButton);

      // Wait for API call
      await waitFor(() => {
        expect(mockHttpClient.post).toHaveBeenCalledWith(
          '/matches',
          expect.objectContaining({
            sportType: 'TENNIS',
            format: 'BEST_OF_3',
            players: { p1: 'Jogador 1', p2: 'Jogador 2' },
            nickname: null,
            visibility: 'PLAYERS_ONLY',
          }),
        );
      });

      // Verify onMatchCreated was called with match data
      expect(mockOnMatchCreated).toHaveBeenCalledWith(mockMatchResponse.data);

      // Verify no alert was shown
      expect(mockAlert).not.toHaveBeenCalled();
    });

    it('handles API errors gracefully', async () => {
      mockHttpClient.post.mockRejectedValue(new Error('API Error'));
      renderMatchSetup();

      // Preenche os campos usando o AthleteSearchInput mockado
      const [player1Input2, player2Input2] = screen.getAllByPlaceholderText('Buscar atleta...');

      fireEvent.change(player1Input2, { target: { value: 'Jogador 1' } });
      fireEvent.change(player2Input2, { target: { value: 'Jogador 2' } });

      // Preenche data e horário (obrigatórios)
      fireEvent.change(screen.getByLabelText('Data da partida'), {
        target: { value: '2025-12-01' },
      });
      fireEvent.change(screen.getByLabelText('Horário da partida'), {
        target: { value: '10:00' },
      });

      // Submit form
      const submitButton = screen.getByRole('button', {
        name: 'Iniciar Partida',
      });
      fireEvent.click(submitButton);

      // Wait for error handling
      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          'Falha ao criar a partida. Verifique o console do navegador e do backend.',
          expect.anything(),
        );
      });
    });

    it('validates required player fields', async () => {
      renderMatchSetup();

      // Try to submit without players
      const submitButton = screen.getByRole('button', {
        name: 'Iniciar Partida',
      });
      fireEvent.click(submitButton);

      // Should show error and not call API
      await waitFor(() => {
        expect(screen.getByText('Os nomes dos jogadores são obrigatórios.')).toBeInTheDocument();
      });
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });
  });

  describe('Form validation', () => {
    it('requires both players to be selected', async () => {
      renderMatchSetup();

      const submitButton = screen.getByRole('button', {
        name: 'Iniciar Partida',
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Os nomes dos jogadores são obrigatórios.')).toBeInTheDocument();
      });
    });

    it('allows form submission when both players are selected', async () => {
      renderMatchSetup();

      const [p1, p2] = screen.getAllByPlaceholderText('Buscar atleta...');

      fireEvent.change(p1, { target: { value: 'Jogador 1' } });
      fireEvent.change(p2, { target: { value: 'Jogador 2' } });

      // Preenche data e horário (obrigatórios)
      fireEvent.change(screen.getByLabelText('Data da partida'), {
        target: { value: '2025-12-01' },
      });
      fireEvent.change(screen.getByLabelText('Horário da partida'), {
        target: { value: '10:00' },
      });

      const submitButton = screen.getByRole('button', {
        name: 'Iniciar Partida',
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockHttpClient.post).toHaveBeenCalled();
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
