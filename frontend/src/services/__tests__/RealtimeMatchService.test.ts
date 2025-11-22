import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { RealtimeMatchService, RealtimeMatchState } from '../RealtimeMatchService';

// Mock do fetch global
const fetchMock = vi.fn();
global.fetch = fetchMock;

// Mock da API_URL
vi.mock('../../config/api', () => ({
  API_URL: 'http://localhost:3000/api'
}));

describe('RealtimeMatchService', () => {
  let service: RealtimeMatchService;

  beforeAll(() => {
    service = RealtimeMatchService.getInstance();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Limpa os mapas internos para cada teste
    (service as any).pollingIntervals.clear();
    (service as any).subscribers.clear();
    (service as any).activeWatchers.clear();
  });

  afterEach(() => {
    // Limpa todos os intervalos após cada teste
    (service as any).pollingIntervals.forEach((interval: NodeJS.Timeout) => {
      clearInterval(interval);
    });
    (service as any).pollingIntervals.clear();
  });

  describe('getInstance', () => {
    it('deve retornar a mesma instância (singleton)', () => {
      const instance1 = RealtimeMatchService.getInstance();
      const instance2 = RealtimeMatchService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('startWatching', () => {
    it('deve iniciar monitoramento para uma partida', async () => {
      const mockState: RealtimeMatchState = {
        status: 'IN_PROGRESS',
        lastUpdate: new Date(),
        sets: { PLAYER_1: 0, PLAYER_2: 0 }
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockState)
      });

      const onUpdate = vi.fn();
      await service.startWatching('test-match', onUpdate);

      expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/matches/test-match/state');
      expect(onUpdate).toHaveBeenCalledWith(mockState);

      // Verifica se o polling foi iniciado
      expect((service as any).pollingIntervals.has('test-match')).toBe(true);
      expect((service as any).activeWatchers.get('test-match')).toBe(1);
    });

    it('deve reutilizar polling existente para múltiplos watchers', async () => {
      const mockState: RealtimeMatchState = {
        status: 'NOT_STARTED',
        lastUpdate: new Date()
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockState)
      });

      const onUpdate1 = vi.fn();
      const onUpdate2 = vi.fn();

      await service.startWatching('test-match', onUpdate1);
      await service.startWatching('test-match', onUpdate2);

      expect((service as any).activeWatchers.get('test-match')).toBe(2);
      // Deve haver apenas um intervalo de polling
      expect((service as any).pollingIntervals.size).toBe(1);
    });

    it('deve lidar com erro na busca inicial', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not found')
      });

      const onUpdate = vi.fn();

      await expect(service.startWatching('invalid-match', onUpdate)).rejects.toThrow(
        'Falha ao buscar estado da partida: 404 Not found'
      );

      expect(onUpdate).not.toHaveBeenCalled();
    });
  });

  describe('stopWatching', () => {
    it('deve parar monitoramento para uma partida específica', async () => {
      const mockState: RealtimeMatchState = {
        status: 'IN_PROGRESS',
        lastUpdate: new Date()
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockState)
      });

      const onUpdate1 = vi.fn();
      const onUpdate2 = vi.fn();

      await service.startWatching('test-match', onUpdate1);
      await service.startWatching('test-match', onUpdate2);

      service.stopWatching('test-match', onUpdate1);

      expect((service as any).activeWatchers.get('test-match')).toBe(1);
      expect((service as any).pollingIntervals.has('test-match')).toBe(true);
    });

    it('deve parar completamente quando não há mais watchers', async () => {
      const mockState: RealtimeMatchState = {
        status: 'IN_PROGRESS',
        lastUpdate: new Date()
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockState)
      });

      const onUpdate = vi.fn();

      await service.startWatching('test-match', onUpdate);
      service.stopWatching('test-match', onUpdate);

      expect((service as any).activeWatchers.has('test-match')).toBe(false);
      expect((service as any).pollingIntervals.has('test-match')).toBe(false);
      expect((service as any).subscribers.has('test-match')).toBe(false);
    });

    it('deve parar todos os watchers quando chamado sem callback específico', async () => {
      const mockState: RealtimeMatchState = {
        status: 'IN_PROGRESS',
        lastUpdate: new Date()
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockState)
      });

      const onUpdate1 = vi.fn();
      const onUpdate2 = vi.fn();

      await service.startWatching('test-match', onUpdate1);
      await service.startWatching('test-match', onUpdate2);

      service.stopWatching('test-match');

      expect((service as any).activeWatchers.has('test-match')).toBe(false);
      expect((service as any).pollingIntervals.has('test-match')).toBe(false);
    });
  });

  describe('updateMatchState', () => {
    it('deve atualizar estado com sucesso', async () => {
      const newState = { status: 'FINISHED' as const };
      const updatedState: RealtimeMatchState = {
        ...newState,
        lastUpdate: new Date(),
        sets: { PLAYER_1: 1, PLAYER_2: 0 }
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedState)
      });

      const result = await service.updateMatchState('test-match', newState);

      expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/matches/test-match/state', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newState),
      });

      expect(result).toEqual(updatedState);
    });

    it('deve lidar com erro na atualização', async () => {
      const newState = { status: 'FINISHED' as const };

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal server error')
      });

      await expect(service.updateMatchState('test-match', newState)).rejects.toThrow(
        'Falha ao atualizar estado da partida: 500 Internal server error'
      );
    });

    it('deve notificar subscribers após atualização', async () => {
      const newState = { status: 'FINISHED' as const };
      const updatedState: RealtimeMatchState = {
        ...newState,
        lastUpdate: new Date()
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedState)
      });

      const onUpdate = vi.fn();
      await service.startWatching('test-match', onUpdate);

      await service.updateMatchState('test-match', newState);

      expect(onUpdate).toHaveBeenCalledWith(updatedState);
    });
  });

  describe('fetchMatchState', () => {
    it('deve buscar estado com sucesso', async () => {
      const mockState: RealtimeMatchState = {
        status: 'IN_PROGRESS',
        lastUpdate: new Date(),
        sets: { PLAYER_1: 0, PLAYER_2: 0 }
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockState)
      });

      const result = await (service as any).fetchMatchState('test-match');

      expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/matches/test-match/state');
      expect(result).toEqual(mockState);
    });

    it('deve lidar com erro na busca', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not found')
      });

      await expect((service as any).fetchMatchState('invalid-match')).rejects.toThrow(
        'Falha ao buscar estado da partida: 404 Not found'
      );
    });
  });

  describe('notifySubscribers', () => {
    it('deve notificar todos os subscribers', async () => {
      const mockState: RealtimeMatchState = {
        status: 'IN_PROGRESS',
        lastUpdate: new Date()
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockState)
      });

      const onUpdate1 = vi.fn();
      const onUpdate2 = vi.fn();

      await service.startWatching('test-match', onUpdate1);
      await service.startWatching('test-match', onUpdate2);

      (service as any).notifySubscribers('test-match', mockState);

      expect(onUpdate1).toHaveBeenCalledWith(mockState);
      expect(onUpdate2).toHaveBeenCalledWith(mockState);
    });
  });
});