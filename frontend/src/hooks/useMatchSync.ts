// frontend/src/hooks/useMatchSync.ts
import { useState, useEffect, useCallback } from "react";
import httpClient from "../config/httpClient";

interface MatchSyncOptions {
  interval?: number;
  onStateChange?: (newState: any) => void;
  onError?: (error: Error) => void;
}

export function useMatchSync(matchId: string, options: MatchSyncOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const { interval = 5000, onStateChange, onError } = options;

  const syncState = useCallback(
    async (state: any) => {
      try {
        setIsLoading(true);
        const response = await httpClient.patch(
          `/matches/${matchId}/state`,
          state,
        );

        if (!response.ok) {
          throw new Error("Falha ao sincronizar estado");
        }

        const data = response.data;
        setLastSync(new Date());
        return data;
      } catch (err: any) {
        setError(err);
        onError?.(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [matchId, onError],
  );

  const getState = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await httpClient.get(`/matches/${matchId}/state`);

      if (!response.ok) {
        throw new Error("Falha ao buscar estado");
      }

      const data = response.data;
      onStateChange?.(data);
      setLastSync(new Date());
      return data;
    } catch (err: any) {
      setError(err);
      onError?.(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [matchId, onStateChange, onError]);

  // Polling automático se interval > 0
  useEffect(() => {
    if (interval > 0) {
      const timer = setInterval(() => {
        getState().catch(console.error);
      }, interval);

      return () => clearInterval(timer);
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
