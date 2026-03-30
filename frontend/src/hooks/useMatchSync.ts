// frontend/src/hooks/useMatchSync.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { httpClient } from '../config/httpClient';

interface MatchSyncOptions {
  interval?: number;
  onStateChange?: (newState: unknown) => void;
  onError?: (error: Error) => void;
}

export function useMatchSync(matchId: string, options: MatchSyncOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const { interval = 5000, onStateChange, onError } = options;

  // Ref para cancelar requests de getState em voo quando uma nova polling dispara
  const getStateAbortRef = useRef<AbortController | null>(null);

  const syncState = useCallback(
    async (state: unknown) => {
      try {
        setIsLoading(true);
        const response = await httpClient.patch(`/matches/${matchId}/state`, state, {
          timeout: 8_000,
        });

        if (!response.ok) {
          throw new Error('Falha ao sincronizar estado');
        }

        const data = response.data;
        setLastSync(new Date());
        return data;
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [matchId, onError],
  );

  const getState = useCallback(async () => {
    // Abortar request anterior ainda em voo (evita race condition no polling)
    getStateAbortRef.current?.abort();
    const controller = new AbortController();
    getStateAbortRef.current = controller;

    try {
      setIsLoading(true);
      const response = await httpClient.get(`/matches/${matchId}/state`, {
        signal: controller.signal,
        timeout: 8_000,
      });

      if (!response.ok) {
        throw new Error('Falha ao buscar estado');
      }

      const data = response.data;
      onStateChange?.(data);
      setLastSync(new Date());
      return data;
    } catch (err: unknown) {
      // Ignorar cancelamentos originados pelo próprio hook (nova chamada sobrepôs a anterior)
      if (err instanceof Error && err.name === 'AbortError') return;
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [matchId, onStateChange, onError]);

  // Polling automático se interval > 0
  useEffect(() => {
    if (interval > 0) {
      const timer = setInterval(() => {
        getState().catch(() => {});
      }, interval);

      return () => {
        clearInterval(timer);
        // Cancelar request em voo ao destruir o efeito
        getStateAbortRef.current?.abort();
      };
    }
  }, [interval, getState]);

  return {
    syncState,
    getState,
    isLoading,
    error,
    lastSync,
  };
}
