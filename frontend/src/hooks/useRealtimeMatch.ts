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
  const [isWatching, setIsWatching] = useState(false);

  const { onError } = options;

  useEffect(() => {
    if (!matchId || isWatching) return;

    console.log(`[useRealtimeMatch] Iniciando monitoramento para partida ${matchId}`);
    setIsWatching(true);

    const service = RealtimeMatchService.getInstance();

    const handleUpdate = (newState: RealtimeMatchState) => {
      console.log(`[useRealtimeMatch] Estado atualizado para partida ${matchId}:`, newState);
      setState(newState);
      setIsLoading(false);
      setError(null);
    };

    const handleError = (err: Error) => {
      console.error(`[useRealtimeMatch] Erro no monitoramento da partida ${matchId}:`, err);
      setError(err);
      onError?.(err);
      setIsLoading(false);
    };

    // Inicia o monitoramento
    service.startWatching(matchId, handleUpdate).catch(handleError);

    // Cleanup
    return () => {
      console.log(`[useRealtimeMatch] Limpando monitoramento para partida ${matchId}`);
      service.stopWatching(matchId, handleUpdate);
      setIsWatching(false);
    };
  }, [matchId, onError, isWatching]);

  const updateState = useCallback(
    async (newState: Partial<RealtimeMatchState>) => {
      if (!matchId) {
        console.warn('[useRealtimeMatch] Tentativa de atualizar estado sem matchId');
        return;
      }

      try {
        console.log(`[useRealtimeMatch] Atualizando estado para partida ${matchId}:`, newState);
        setIsLoading(true);
        const service = RealtimeMatchService.getInstance();
        const updatedState = await service.updateMatchState(matchId, newState);
        setState(updatedState);
        setError(null);
      } catch (err: any) {
        console.error(`[useRealtimeMatch] Erro ao atualizar estado da partida ${matchId}:`, err);
        setError(err);
        onError?.(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [matchId, onError]
  );

  return {
    state,
    isLoading,
    error,
    updateState,
  };
}