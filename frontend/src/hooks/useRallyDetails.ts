import { useReducer, useCallback } from 'react';
import type {
  RallyVencedor,
  RallySituacao,
  RallyTipo,
  RallyGolpe,
  RallySubtipo1,
  RallySubtipo2,
  RallyEfeito,
  RallyDirecao,
  RallyGolpeEsp,
} from '../core/scoring/types';

export interface RallySelection {
  situacao?: RallySituacao;
  tipo?: RallyTipo;
  sub1?: RallySubtipo1;
  sub2?: RallySubtipo2;
  golpe?: RallyGolpe;
  efeito?: RallyEfeito;
  direcao?: RallyDirecao;
  golpe_esp?: RallyGolpeEsp;
}

type RallyAction =
  | { type: 'SET_SITUACAO'; value: RallySituacao }
  | { type: 'SET_TIPO'; value: RallyTipo }
  | { type: 'SET_GOLPE'; value: RallyGolpe }
  | { type: 'SET_SUB1'; value: RallySubtipo1 }
  | { type: 'SET_SUB2'; value: RallySubtipo2 }
  | { type: 'SET_EFEITO'; value: RallyEfeito }
  | { type: 'SET_DIRECAO'; value: RallyDirecao }
  | { type: 'SET_GOLPE_ESP'; value: RallyGolpeEsp }
  | { type: 'RESET' };

function rallyReducer(state: RallySelection, action: RallyAction): RallySelection {
  switch (action.type) {
    case 'SET_SITUACAO':
      // Reseta todo o resto
      return { situacao: action.value };

    case 'SET_TIPO':
      // Reseta campos após tipo (golpe e tudo depois dele)
      return {
        situacao: state.situacao,
        tipo: action.value,
      };

    case 'SET_GOLPE':
      // Reseta sub1, sub2, efeito, direcao, golpe_esp
      return {
        ...state,
        golpe: action.value,
        sub1: undefined,
        sub2: undefined,
        efeito: undefined,
        direcao: undefined,
        golpe_esp: undefined,
      };

    case 'SET_SUB1':
      // Reseta sub2, efeito, direcao, golpe_esp
      return {
        ...state,
        sub1: action.value,
        sub2: undefined,
        efeito: undefined,
        direcao: undefined,
        golpe_esp: undefined,
      };

    case 'SET_SUB2':
      // Reseta efeito, direcao, golpe_esp
      return {
        ...state,
        sub2: action.value,
        efeito: undefined,
        direcao: undefined,
        golpe_esp: undefined,
      };

    case 'SET_EFEITO':
      // Reseta direcao, golpe_esp
      return {
        ...state,
        efeito: action.value,
        direcao: undefined,
        golpe_esp: undefined,
      };

    case 'SET_DIRECAO':
      // Reseta apenas golpe_esp
      return {
        ...state,
        direcao: action.value,
        golpe_esp: undefined,
      };

    case 'SET_GOLPE_ESP':
      return {
        ...state,
        golpe_esp: action.value,
      };

    case 'RESET':
      return {};

    default:
      return state;
  }
}

/**
 * Hook customizado para gerenciar estado cascata de seleções em PointDetailsModal
 * Centraliza lógica de reset interdependente quando campos upstream são alterados
 */
export function useRallyDetails() {
  const [sel, dispatch] = useReducer(rallyReducer, {});

  return {
    sel,
    setSituacao: (value: RallySituacao) => dispatch({ type: 'SET_SITUACAO', value }),
    setTipo: (value: RallyTipo) => dispatch({ type: 'SET_TIPO', value }),
    setGolpe: (value: RallyGolpe) => dispatch({ type: 'SET_GOLPE', value }),
    setSub1: (value: RallySubtipo1) => dispatch({ type: 'SET_SUB1', value }),
    setSub2: (value: RallySubtipo2) => dispatch({ type: 'SET_SUB2', value }),
    setEfeito: (value: RallyEfeito) => dispatch({ type: 'SET_EFEITO', value }),
    setDirecao: (value: RallyDirecao) => dispatch({ type: 'SET_DIRECAO', value }),
    setGolpeEsp: (value: RallyGolpeEsp) => dispatch({ type: 'SET_GOLPE_ESP', value }),
    reset: () => dispatch({ type: 'RESET' }),
  };
}
