import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { MatchData } from '../types/scoreboard';

/**
 * Hook que verifica se o usuário atual é criador de uma partida
 * E se tem permissão para gerenciar (role GESTOR ou ADMIN).
 *
 * Retorna true se:
 * - matchData.createdByUserId === currentUser.id
 * - currentUser.role === 'GESTOR' ou 'ADMIN'
 */
export function useCreatorManagerMode(matchData: MatchData | null): boolean {
  const { currentUser } = useAuth();

  return useMemo(() => {
    if (!matchData || !currentUser) return false;

    const isCreator = matchData.createdByUserId === currentUser.id;
    const isManagerRole = currentUser.role === 'GESTOR' || currentUser.role === 'ADMIN';

    return isCreator && isManagerRole;
  }, [matchData, currentUser]);
}
