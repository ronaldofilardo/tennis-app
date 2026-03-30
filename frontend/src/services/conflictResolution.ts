// frontend/src/services/conflictResolution.ts
// === AREA 3: Estratégia de Conflito ===
// Hook de resolução preparado para quando múltiplos treinadores/clubes
// editarem dados do mesmo atleta simultaneamente.
// Hoje funciona como "no-op" (server wins), mas a mecânica está pronta.

import type { MatchState } from '../core/scoring/types';

/**
 * Tipos de estratégia de resolução de conflito.
 */
export type ConflictStrategy =
  | 'SERVER_WINS' // Estado do servidor prevalece (padrão atual)
  | 'CLIENT_WINS' // Estado local prevalece
  | 'LATEST_WINS' // Timestamp mais recente prevalece
  | 'MANUAL' // Requer intervenção do usuário
  | 'MERGE'; // Tenta merge automático (futuro)

/**
 * Resultado da resolução de conflito.
 */
export interface ConflictResult<T = unknown> {
  /** Estado resolvido */
  resolvedState: T;
  /** Estratégia usada */
  strategy: ConflictStrategy;
  /** Se houve conflito real */
  hadConflict: boolean;
  /** Campos que divergiram */
  divergentFields: string[];
  /** Detalhes do conflito (para logging/audit) */
  details?: string;
}

/**
 * Detecta campos divergentes entre dois estados.
 */
export function detectDivergentFields(
  localState: Record<string, unknown>,
  serverState: Record<string, unknown>,
  fieldsToCheck?: string[],
): string[] {
  const fields = fieldsToCheck || Object.keys({ ...localState, ...serverState });
  const divergent: string[] = [];

  for (const field of fields) {
    const localVal = JSON.stringify(localState[field]);
    const serverVal = JSON.stringify(serverState[field]);
    if (localVal !== serverVal) {
      divergent.push(field);
    }
  }

  return divergent;
}

/**
 * Resolve conflito entre estado local e estado do servidor.
 *
 * Hoje: Server wins (no-op). A chamada deve existir no fluxo de addPoint/undo
 * para que, quando as regras de clube forem ativadas, a resolução já esteja conectada.
 *
 * @param localState - Estado local atual
 * @param serverState - Estado recebido do servidor
 * @param strategy - Estratégia de resolução (default: SERVER_WINS)
 * @returns Resultado da resolução com o estado a ser aplicado
 */
export function resolveConflict<T extends Record<string, unknown>>(
  localState: T,
  serverState: T,
  strategy: ConflictStrategy = 'SERVER_WINS',
): ConflictResult<T> {
  const divergentFields = detectDivergentFields(localState, serverState);
  const hadConflict = divergentFields.length > 0;

  if (!hadConflict) {
    return {
      resolvedState: serverState,
      strategy,
      hadConflict: false,
      divergentFields: [],
    };
  }

  switch (strategy) {
    case 'SERVER_WINS':
      return {
        resolvedState: serverState,
        strategy,
        hadConflict,
        divergentFields,
        details: `Conflito resolvido: servidor prevalece. Campos: ${divergentFields.join(', ')}`,
      };

    case 'CLIENT_WINS':
      return {
        resolvedState: localState,
        strategy,
        hadConflict,
        divergentFields,
        details: `Conflito resolvido: cliente prevalece. Campos: ${divergentFields.join(', ')}`,
      };

    case 'LATEST_WINS': {
      const localTime = (localState as Record<string, unknown>)['startedAt'] as string | undefined;
      const serverTime = (serverState as Record<string, unknown>)['startedAt'] as
        | string
        | undefined;

      const localTimestamp = localTime ? new Date(localTime).getTime() : 0;
      const serverTimestamp = serverTime ? new Date(serverTime).getTime() : 0;

      const winner = localTimestamp >= serverTimestamp ? localState : serverState;
      return {
        resolvedState: winner,
        strategy,
        hadConflict,
        divergentFields,
        details: `Conflito resolvido: timestamp mais recente prevalece (${localTimestamp >= serverTimestamp ? 'local' : 'server'}).`,
      };
    }

    case 'MANUAL':
      // Em modo MANUAL, retorna serverState mas marca para revisão
      return {
        resolvedState: serverState,
        strategy,
        hadConflict,
        divergentFields,
        details: `Conflito requer resolução manual. Campos divergentes: ${divergentFields.join(', ')}`,
      };

    case 'MERGE':
      // Merge simples: usa server como base, mantém campos exclusivos do local
      const merged = { ...serverState };
      for (const field of divergentFields) {
        // Se o campo só existe no local, preserva
        if (!(field in serverState) && field in localState) {
          (merged as Record<string, unknown>)[field] = localState[field];
        }
        // Senão, server prevalece (merge conservador)
      }
      return {
        resolvedState: merged as T,
        strategy,
        hadConflict,
        divergentFields,
        details: `Conflito resolvido via merge. Campos exclusivos do local preservados.`,
      };

    default:
      return {
        resolvedState: serverState,
        strategy: 'SERVER_WINS',
        hadConflict,
        divergentFields,
        details: `Estratégia desconhecida '${strategy}'. Fallback para SERVER_WINS.`,
      };
  }
}

/**
 * Resolve conflito especificamente para MatchState.
 * Wrapper tipado sobre resolveConflict para uso direto no fluxo do placar.
 */
export function resolveMatchConflict(
  localState: MatchState,
  serverState: MatchState,
  strategy: ConflictStrategy = 'SERVER_WINS',
): ConflictResult<MatchState> {
  return resolveConflict(
    localState as unknown as Record<string, unknown>,
    serverState as unknown as Record<string, unknown>,
    strategy,
  ) as unknown as ConflictResult<MatchState>;
}
