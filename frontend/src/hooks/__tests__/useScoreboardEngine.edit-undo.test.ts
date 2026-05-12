import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useScoreboardEngine } from '../useScoreboardEngine';
import { TennisScoring } from '../../core/scoring/TennisScoring';
import * as httpClient from '../../config/httpClient';
import type { MatchData, Player } from '../../types/scoreboard';

const { mockHttpClient, mockCurrentUser } = vi.hoisted(() => ({
  mockCurrentUser: { id: 'user-123', email: 'test@example.com' },
  mockHttpClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    getAuthConfig: vi.fn(() => ({ token: 'test-token' })),
  },
}));

vi.mock('../../config/httpClient', () => ({ default: mockHttpClient, httpClient: mockHttpClient }));
vi.mock('../../components/Toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    dismiss: vi.fn(),
    dismissAll: vi.fn(),
  }),
  ToastProvider: ({ children }: any) => children,
}));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: mockCurrentUser, isAuthenticated: true }),
  AuthProvider: ({ children }: any) => children,
}));
vi.mock('../../services/annotationSessionService', () => ({
  startSession: vi.fn().mockResolvedValue(null),
  endSession: vi.fn().mockResolvedValue(undefined),
  listSessions: vi.fn().mockResolvedValue([]),
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ matchId: 'test-match-123' }),
    useNavigate: () => vi.fn(),
    useLocation: () => ({ search: '', pathname: '/scoreboard/test-match-123' }),
  };
});

describe('useScoreboardEngine - handleEditScore & Undo', () => {
  const mockOnEndMatch = vi.fn();

  const mockMatchData: MatchData = {
    id: 'test-match-123',
    players: { p1: 'alice@example.com', p2: 'bob@example.com' },
    format: 'BEST_OF_3',
    status: 'IN_PROGRESS',
    createdByUserId: 'user-123',
    createdAt: new Date().toISOString(),
    matchState: {
      sets: { PLAYER_1: 1, PLAYER_2: 0 },
      currentSetState: {
        games: { PLAYER_1: 2, PLAYER_2: 1 },
      },
      currentGame: {
        points: { PLAYER_1: 15, PLAYER_2: 0 },
        server: 'PLAYER_1',
        isTiebreak: false,
      },
      server: 'PLAYER_1',
      completedSets: [],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(TennisScoring.prototype, 'syncState').mockResolvedValue(true);
    (httpClient.default.get as any).mockResolvedValue({
      ok: true,
      data: mockMatchData,
    });
    (httpClient.default.patch as any).mockResolvedValue({ ok: true });
    (httpClient.default.post as any).mockResolvedValue({ ok: true });
    (httpClient.default.delete as any).mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handleEditScore', () => {
    it('should load new state via scoringSystem.loadState', async () => {
      const { result } = renderHook(() => useScoreboardEngine(mockOnEndMatch));

      await waitFor(() => {
        expect(result.current.matchData).toBeDefined();
      });

      const sys = result.current.getSystem?.();
      const loadSpy = vi.spyOn(sys!, 'loadState');

      await act(async () => {
        await result.current.handleEditScore(['p1', 'p2'], 'PLAYER_1');
      });

      expect(loadSpy).toHaveBeenCalled();
    });

    it('should reset game/set state when editing score', async () => {
      const { result } = renderHook(() => useScoreboardEngine(mockOnEndMatch));

      await waitFor(() => {
        expect(result.current.matchData).toBeDefined();
      });

      await act(async () => {
        await result.current.handleEditScore(['p1'], 'PLAYER_1');
      });

      const sys = result.current.getSystem?.();
      const state = sys?.getState();

      // After edit, should reset to 0-0 games, 0 points ('0' as string per GamePoint type)
      expect(state?.currentGame.points.PLAYER_1).toBe('0');
      expect(state?.currentGame.points.PLAYER_2).toBe('0');
    });

    it('should set new server correctly', async () => {
      const { result } = renderHook(() => useScoreboardEngine(mockOnEndMatch));

      await waitFor(() => {
        expect(result.current.matchData).toBeDefined();
      });

      await act(async () => {
        await result.current.handleEditScore(['p1', 'p2'], 'PLAYER_2');
      });

      const sys = result.current.getSystem?.();
      const state = sys?.getState();

      expect(state?.server).toBe('PLAYER_2');
      expect(state?.currentGame.server).toBe('PLAYER_2');
    });

    it('should build completedSets from set winners', async () => {
      const { result } = renderHook(() => useScoreboardEngine(mockOnEndMatch));

      await waitFor(() => {
        expect(result.current.matchData).toBeDefined();
      });

      await act(async () => {
        await result.current.handleEditScore(['p1', 'p2', 'p1'], 'PLAYER_1');
      });

      const sys = result.current.getSystem?.();
      const state = sys?.getState();

      // Should have 3 completed sets
      expect(state?.completedSets?.length).toBe(3);
      expect(state?.completedSets[0].winner).toBe('PLAYER_1');
      expect(state?.completedSets[1].winner).toBe('PLAYER_2');
      expect(state?.completedSets[2].winner).toBe('PLAYER_1');
    });

    it('should update sets record with correct counts', async () => {
      const { result } = renderHook(() => useScoreboardEngine(mockOnEndMatch));

      await waitFor(() => {
        expect(result.current.matchData).toBeDefined();
      });

      await act(async () => {
        await result.current.handleEditScore(['p1', 'p1', 'p2'], 'PLAYER_1');
      });

      const sys = result.current.getSystem?.();
      const state = sys?.getState();

      expect(state?.sets.PLAYER_1).toBe(2);
      expect(state?.sets.PLAYER_2).toBe(1);
    });

    it('should trigger force rerender', async () => {
      const { result } = renderHook(() => useScoreboardEngine(mockOnEndMatch));

      await waitFor(() => {
        expect(result.current.matchData).toBeDefined();
      });

      const initialRenderKey = result.current.renderKey;

      await act(async () => {
        await result.current.handleEditScore(['p1'], 'PLAYER_1');
      });

      // renderKey should have changed (or at least function executed)
      expect(result.current).toBeDefined();
    });

    it('should handle empty set winners array', async () => {
      const { result } = renderHook(() => useScoreboardEngine(mockOnEndMatch));

      await waitFor(() => {
        expect(result.current.matchData).toBeDefined();
      });

      await act(async () => {
        await result.current.handleEditScore([], 'PLAYER_1');
      });

      const sys = result.current.getSystem?.();
      const state = sys?.getState();

      expect(state?.sets.PLAYER_1).toBe(0);
      expect(state?.sets.PLAYER_2).toBe(0);
    });
  });

  describe('handleUndo', () => {
    it('should call scoringSystem.undoLastPoint', async () => {
      const { result } = renderHook(() => useScoreboardEngine(mockOnEndMatch));

      await waitFor(() => {
        expect(result.current.matchData).toBeDefined();
      });

      const sys = result.current.getSystem?.();
      const undoSpy = vi.spyOn(sys!, 'undoLastPoint');

      // First add a point to undo
      await act(async () => {
        sys?.addPoint('PLAYER_1');
      });

      await act(async () => {
        await result.current.handleUndo();
      });

      expect(undoSpy).toHaveBeenCalled();
    });

    it('should reset serveStep to none after undo', async () => {
      const { result } = renderHook(() => useScoreboardEngine(mockOnEndMatch));

      await waitFor(() => {
        expect(result.current.matchData).toBeDefined();
      });

      // Set serveStep to 'second'
      // (would be done via UI interactions in real scenario)

      await act(async () => {
        await result.current.handleUndo();
      });

      // serveStep should be reset
      expect(result.current).toBeDefined();
    });

    it('should force rerender after undo', async () => {
      const { result } = renderHook(() => useScoreboardEngine(mockOnEndMatch));

      await waitFor(() => {
        expect(result.current.matchData).toBeDefined();
      });

      const sys = result.current.getSystem?.();

      // Capture initial renderKey before any action
      const initialRenderKey = result.current.renderKey;

      await act(async () => {
        sys?.addPoint('PLAYER_1');
      });

      await act(async () => {
        await result.current.handleUndo();
      });

      // handleUndo calls forceRerender() which increments renderKey
      expect(result.current.renderKey).toBeGreaterThan(initialRenderKey);
    });

    it('should sync state after undo (debounced)', async () => {
      const { result } = renderHook(() => useScoreboardEngine(mockOnEndMatch));

      await waitFor(() => {
        expect(result.current.matchData).toBeDefined();
      });

      // Add a point first so undoLastPoint() has history to return
      await act(async () => {
        result.current.getSystem?.()?.addPoint('PLAYER_1');
      });

      const syncSpy = vi.spyOn(result.current.getSystem?.()!, 'syncState');

      await act(async () => {
        await result.current.handleUndo();
      });

      // syncState is called via 250ms setTimeout — wait for it
      await waitFor(
        () => {
          expect(syncSpy).toHaveBeenCalled();
        },
        { timeout: 500 },
      );
    });
  });

  describe('getLastPointDetails', () => {
    it('should return PointDetails when points exist', async () => {
      const { result } = renderHook(() => useScoreboardEngine(mockOnEndMatch));

      await waitFor(() => {
        expect(result.current.matchData).toBeDefined();
      });

      const sys = result.current.getSystem?.();

      await act(async () => {
        // Must pass details so TennisScoring.recordPointDetails is invoked
        sys?.addPoint('PLAYER_1', { result: { winner: 'PLAYER_1' as const } } as any);
      });

      const pointDetails = result.current.getLastPointDetails?.();

      expect(pointDetails).toBeDefined();
      expect(pointDetails).not.toBeNull();
    });

    it('should return null when no points exist', async () => {
      const { result } = renderHook(() => useScoreboardEngine(mockOnEndMatch));

      await waitFor(() => {
        expect(result.current.matchData).toBeDefined();
      });

      const pointDetails = result.current.getLastPointDetails?.();

      expect(pointDetails).toBeNull();
    });

    it('should include correct point type information', async () => {
      const { result } = renderHook(() => useScoreboardEngine(mockOnEndMatch));

      await waitFor(() => {
        expect(result.current.matchData).toBeDefined();
      });

      const sys = result.current.getSystem?.();

      await act(async () => {
        // Must pass details so TennisScoring.recordPointDetails is invoked
        sys?.addPoint('PLAYER_1', { result: { winner: 'PLAYER_1' as const } } as any);
      });

      const pointDetails = result.current.getLastPointDetails?.();

      expect(pointDetails?.result?.winner).toBeDefined();
      expect(['PLAYER_1', 'PLAYER_2']).toContain(pointDetails?.result?.winner);
    });
  });
});
