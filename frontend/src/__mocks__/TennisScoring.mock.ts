import { vi } from 'vitest';

type MockState = {
  gamesP1: number;
  gamesP2: number;
  finished: boolean;
  winner: 'PLAYER_1' | 'PLAYER_2';
};

const buildSnapshot = (state: MockState & { pointP1: string; setsP1: number; setsP2: number }) => ({
  startedAt: new Date().toISOString(),
  server: 'PLAYER_1',
  isFinished: state.finished,
  winner: state.finished ? state.winner : undefined,
  sets: { PLAYER_1: state.setsP1, PLAYER_2: state.setsP2 },
  currentSetState: { games: { PLAYER_1: state.gamesP1, PLAYER_2: state.gamesP2 } },
  currentGame: { points: { PLAYER_1: state.pointP1, PLAYER_2: '0' }, isTiebreak: false },
});

export let mockState: MockState & { pointP1: string; setsP1: number; setsP2: number } = {
  gamesP1: 0,
  gamesP2: 0,
  setsP1: 0,
  setsP2: 0,
  finished: false,
  winner: 'PLAYER_1',
  pointP1: '0',
};

const pointOrder = ['0', '15', '30', '40'];
const createAddPointMock = () => vi.fn(async () => {
  if (!mockState.finished) {
    const idx = pointOrder.indexOf(mockState.pointP1);
    if (idx < pointOrder.length - 1) {
      mockState.pointP1 = pointOrder[idx + 1];
    } else {
      // Ganhou o game
      mockState.pointP1 = '0';
      mockState.gamesP1 += 1;
      // Considera que 1 game = 1 set para simplificação dos testes
      if (mockState.gamesP1 >= 1) {
        mockState.setsP1 += 1;
        // Finaliza após 1 set ganho
        if (mockState.setsP1 >= 1) {
          mockState.finished = true;
          mockState.winner = 'PLAYER_1';
          // NÃO zera gamesP1 imediatamente, para o snapshot mostrar Games: 1
        } else {
          mockState.gamesP1 = 0;
        }
      }
    }
  }
  return buildSnapshot(mockState);
});

export const mockTennisScoring = {
  getState: vi.fn(() => buildSnapshot(mockState)),
  addPointWithSync: createAddPointMock(),
  undoLastPointWithSync: vi.fn(),
  canUndo: vi.fn(() => false),
  enableSync: vi.fn(),
  loadState: vi.fn(),
  syncState: vi.fn(async () => true),
  setStartedAt: vi.fn(),
  setEndedAt: vi.fn(),
};

export function __resetMockTennisScoring(overrides: Partial<typeof mockTennisScoring> = {}) {
  mockState = { gamesP1: 0, gamesP2: 0, setsP1: 0, setsP2: 0, finished: false, winner: 'PLAYER_1', pointP1: '0' };
  mockTennisScoring.getState = vi.fn(() => buildSnapshot(mockState));
  mockTennisScoring.addPointWithSync = createAddPointMock();
  mockTennisScoring.undoLastPointWithSync = vi.fn();
  mockTennisScoring.canUndo = vi.fn(() => false);
  mockTennisScoring.enableSync = vi.fn();
  mockTennisScoring.loadState = vi.fn();
  mockTennisScoring.syncState = vi.fn(async () => true);
  mockTennisScoring.setStartedAt = vi.fn();
  mockTennisScoring.setEndedAt = vi.fn();

  Object.assign(mockTennisScoring, overrides);
}

export const TennisScoring = vi.fn(function () {
  return mockTennisScoring;
});
