/**
 * Hook para gerenciar o piso de placar (floor) em anotações retomadas.
 * Quando um usuário retoma uma anotação abandonada (ex: 2x2 no set 1),
 * o placar não pode ser rebaixado (downgrade).
 *
 * O floor é definido automaticamente pelo TennisScoring.loadState() → setSnapshotFloor()
 * Este hook apenas expõe queries e mensagens para a UI.
 */

import { useCallback } from 'react';
import type { MatchState } from '../core/scoring/types';

export interface ScoreFloorInfo {
  hasFloor: boolean;
  floorLabel: string;
  floorState: MatchState | null;
}

/**
 * Custom hook para expor status de floor do TennisScoring para UI
 * Usa propriedade pública do TennisScoring que será adicionada em Phase 4
 */
export function useScoreFloor(scoringSystem: any | undefined): {
  isDowngradePrevented: () => boolean;
  getFloorInfo: () => ScoreFloorInfo;
  getDowngradeReason: () => string;
  getFloorLabel: () => string;
} {
  const isDowngradePrevented = useCallback((): boolean => {
    if (!scoringSystem) return false;

    // ✅ Em uma versão futura, expor getFloorStatus() via TennisScoring
    // Por enquanto, a prevenção acontece silenciosamente no backend
    // O frontend detecta via console.warn em TennisScoring
    return false;
  }, [scoringSystem]);

  const getFloorInfo = useCallback((): ScoreFloorInfo => {
    if (!scoringSystem) {
      return {
        hasFloor: false,
        floorLabel: '',
        floorState: null,
      };
    }

    // ✅ Futuramente, consultar scoringSystem.getFloorStatus()
    return {
      hasFloor: false,
      floorLabel: '',
      floorState: null,
    };
  }, [scoringSystem]);

  const getFloorLabel = useCallback((): string => {
    if (!scoringSystem) return '';
    // ✅ Futuramente, usar scoringSystem.getFloorLabel()
    return '';
  }, [scoringSystem]);

  const getDowngradeReason = useCallback((): string => {
    return 'Placar não pode ser menor que o snapshot do abandono.\nDeseja resetar a anotação?';
  }, []);

  return {
    isDowngradePrevented,
    getFloorInfo,
    getDowngradeReason,
    getFloorLabel,
  };
}
