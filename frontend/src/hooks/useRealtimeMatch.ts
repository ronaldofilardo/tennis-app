// frontend/src/hooks/useRealtimeMatch.ts
import { useState, useEffect, useCallback } from 'react';
import { RealtimeMatchService, RealtimeMatchState } from '../services/RealtimeMatchService';

interface UseRealtimeMatchOptions {
  onError?: (error: Error) => void;
}

export function useRealtimeMatch(matchId: string, options: UseRealtimeMatchOptions = {}) {
  const [state, setState] = useState<RealtimeMatchState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { onError } = options;

  useEffect(() => {
    if (!matchId) return;

    const service = RealtimeMatchService.getInstance();

    const handleUpdate = (newState: RealtimeMatchState) => {
      setState(newState);
      setIsLoading(false);
      setError(null);
    };

    const handleError = (err: Error) => {
      setError(err);
      onError?.(err);
      setIsLoading(false);
    };

    // Inicia o monitoramento
    service.startWatching(matchId, handleUpdate).catch(handleError);

    // Cleanup
    return () => {
      service.stopWatching(matchId, handleUpdate);
    };
  }, [matchId, onError]);

  const updateState = useCallback(
    async (newState: Partial<RealtimeMatchState>) => {
      if (!matchId) {
        return;
      }

      try {
        setIsLoading(true);
        const service = RealtimeMatchService.getInstance();
        const updatedState = await service.updateMatchState(matchId, newState);
        setState(updatedState);
        setError(null);
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

  return {
    state,
    isLoading,
    error,
    updateState,
  };
}
