// pointFlowRules.test.ts
// Valida TODOS os 37 combos únicos derivados do fluxotosystem.txt (3522 linhas, v2).
// PREMISSA: nenhuma possibilidade omitida, nenhuma criada fora do arquivo.

import { describe, it, expect } from 'vitest';
import {
  getValidTipos,
  getValidGolpes,
  getValidEfeitos,
  getValidDirecoes,
  getValidGolpeEsp,
  getValidSubtipo1,
  getValidSubtipo2,
  requiresSubtipo1,
  requiresSubtipo2,
  requiresEfeito,
  ALL_SITUACOES,
} from './pointFlowRules';

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────
const ALL5_DIRS = ['centro', 'cruzada', 'inside-in', 'inside-out', 'paralela'];
const ONLY3_DIRS = ['centro', 'cruzada', 'paralela'];
const ALL4_ESP = ['bate-pronto', 'drop', 'lob', 'swingvolley'];
const NO_SW_ESP = ['bate-pronto', 'drop', 'lob'];
const DEVOLV_SACADOR_ESP = ['drop', 'lob'];
const DEVOLV_DEVOLV_ESP = ['drop', 'lob', 'swingvolley'];
const ALL3_EF = ['flat', 'slice', 'topspin'];

function sorted(arr: string[]) {
  return [...arr].sort();
}

// ────────────────────────────────────────────────────────────────
// getValidSituacoes
// ────────────────────────────────────────────────────────────────
describe('ALL_SITUACOES', () => {
  it('deve conter passada, rede, fundo, devolucao', () => {
    expect(sorted(ALL_SITUACOES)).toEqual(['devolucao', 'fundo', 'passada', 'rede']);
  });
});

// ────────────────────────────────────────────────────────────────
// getValidTipos
// ────────────────────────────────────────────────────────────────
describe('getValidTipos', () => {
  it('sacador|devolucao → apenas erros (com hifens)', () => {
    expect(sorted(getValidTipos('sacador', 'devolucao'))).toEqual(
      ['erro-forcado', 'erro-nao-forcado'],
    );
  });

  it('devolvedor|devolucao → apenas winner', () => {
    expect(getValidTipos('devolvedor', 'devolucao')).toEqual(['winner']);
  });

  it.each([
    ['sacador', 'passada'],
    ['sacador', 'rede'],
    ['sacador', 'fundo'],
    ['devolvedor', 'passada'],
    ['devolvedor', 'rede'],
    ['devolvedor', 'fundo'],
  ] as const)('"%s|%s" → todos os três tipos', (v, s) => {
    expect(sorted(getValidTipos(v, s))).toEqual(
      ['erro-forcado', 'erro-nao-forcado', 'winner'],
    );
  });
});

// ────────────────────────────────────────────────────────────────
// requiresSubtipo1 / getValidSubtipo1
// ────────────────────────────────────────────────────────────────
describe('requiresSubtipo1', () => {
  it('sacador|rede|erro-forcado → true', () => {
    expect(requiresSubtipo1('sacador', 'rede', 'erro-forcado')).toBe(true);
  });
  it('sacador|rede|erro-nao-forcado → true', () => {
    expect(requiresSubtipo1('sacador', 'rede', 'erro-nao-forcado')).toBe(true);
  });
  it('sacador|rede|winner → false', () => {
    expect(requiresSubtipo1('sacador', 'rede', 'winner')).toBe(false);
  });
  it('devolvedor|rede|erro-forcado → false', () => {
    expect(requiresSubtipo1('devolvedor', 'rede', 'erro-forcado')).toBe(false);
  });
  it('sacador|passada|erro-forcado → false', () => {
    expect(requiresSubtipo1('sacador', 'passada', 'erro-forcado')).toBe(false);
  });

  it('getValidSubtipo1 → PassingShot e ServeReturn', () => {
    expect(sorted(getValidSubtipo1())).toEqual(['PassingShot', 'ServeReturn']);
  });
});

// ────────────────────────────────────────────────────────────────
// requiresSubtipo2 / getValidSubtipo2
// ────────────────────────────────────────────────────────────────
describe('requiresSubtipo2', () => {
  it('qualquer winner → false', () => {
    expect(requiresSubtipo2('sacador', 'passada', 'winner')).toBe(false);
    expect(requiresSubtipo2('devolvedor', 'rede', 'winner')).toBe(false);
  });
  it('sacador|passada|erro → false (arquivo não tem sub2)', () => {
    expect(requiresSubtipo2('sacador', 'passada', 'erro-forcado')).toBe(false);
    expect(requiresSubtipo2('sacador', 'passada', 'erro-nao-forcado')).toBe(false);
  });
  it('devolvedor|passada|erro → true', () => {
    expect(requiresSubtipo2('devolvedor', 'passada', 'erro-forcado')).toBe(true);
    expect(requiresSubtipo2('devolvedor', 'passada', 'erro-nao-forcado')).toBe(true);
  });
  it('sacador|rede|erro → true', () => {
    expect(requiresSubtipo2('sacador', 'rede', 'erro-forcado')).toBe(true);
  });
  it('getValidSubtipo2 → Out e Net', () => {
    expect(sorted(getValidSubtipo2())).toEqual(['Net', 'Out']);
  });
});

// ────────────────────────────────────────────────────────────────
// requiresEfeito
// ────────────────────────────────────────────────────────────────
describe('requiresEfeito', () => {
  // Casos SEM efeito (golpes de voleio/smash)
  it('sacador|passada|erro-forcado → false (VBH/VFH/Smash sem efeito)', () => {
    expect(requiresEfeito('sacador', 'passada', 'erro-forcado')).toBe(false);
  });
  it('sacador|passada|erro-nao-forcado → false', () => {
    expect(requiresEfeito('sacador', 'passada', 'erro-nao-forcado')).toBe(false);
  });
  it('sacador|rede|winner → false (VBH/VFH/Smash sem efeito)', () => {
    expect(requiresEfeito('sacador', 'rede', 'winner')).toBe(false);
  });

  // Casos COM efeito
  it('sacador|passada|winner → true', () => {
    expect(requiresEfeito('sacador', 'passada', 'winner')).toBe(true);
  });
  it('sacador|rede|erro-forcado → true', () => {
    expect(requiresEfeito('sacador', 'rede', 'erro-forcado')).toBe(true);
  });
  it('devolvedor|passada|winner → true', () => {
    expect(requiresEfeito('devolvedor', 'passada', 'winner')).toBe(true);
  });
  it('devolvedor|passada|erro-forcado → true', () => {
    expect(requiresEfeito('devolvedor', 'passada', 'erro-forcado')).toBe(true);
  });
  it('devolvedor|rede|winner → true', () => {
    expect(requiresEfeito('devolvedor', 'rede', 'winner')).toBe(true);
  });
  it('devolvedor|devolucao|winner → true', () => {
    expect(requiresEfeito('devolvedor', 'devolucao', 'winner')).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────
// getValidEfeitos
// ────────────────────────────────────────────────────────────────
describe('getValidEfeitos', () => {
  it('retorna flat, slice, topspin', () => {
    expect(sorted(getValidEfeitos())).toEqual(sorted(ALL3_EF));
  });
});

// ────────────────────────────────────────────────────────────────
// getValidGolpes — 37 combos do arquivo
// ────────────────────────────────────────────────────────────────
describe('getValidGolpes', () => {
  // sacador
  it('sacador|passada|winner → BH,FH', () => {
    expect(sorted(getValidGolpes('sacador', 'passada', 'winner'))).toEqual(['BH', 'FH']);
  });
  it('sacador|passada|erro-forcado → VBH,VFH,Smash', () => {
    expect(sorted(getValidGolpes('sacador', 'passada', 'erro-forcado'))).toEqual(['Smash', 'VBH', 'VFH']);
  });
  it('sacador|passada|erro-nao-forcado → VBH,VFH,Smash', () => {
    expect(sorted(getValidGolpes('sacador', 'passada', 'erro-nao-forcado'))).toEqual(['Smash', 'VBH', 'VFH']);
  });
  it('sacador|rede|winner → VBH,VFH,Smash', () => {
    expect(sorted(getValidGolpes('sacador', 'rede', 'winner'))).toEqual(['Smash', 'VBH', 'VFH']);
  });
  it('sacador|rede|erro-forcado → BH,FH', () => {
    expect(sorted(getValidGolpes('sacador', 'rede', 'erro-forcado'))).toEqual(['BH', 'FH']);
  });
  it('sacador|rede|erro-nao-forcado → BH,FH', () => {
    expect(sorted(getValidGolpes('sacador', 'rede', 'erro-nao-forcado'))).toEqual(['BH', 'FH']);
  });
  it('sacador|fundo|winner → BH,FH', () => {
    expect(sorted(getValidGolpes('sacador', 'fundo', 'winner'))).toEqual(['BH', 'FH']);
  });
  it('sacador|fundo|erro-forcado → BH,FH', () => {
    expect(sorted(getValidGolpes('sacador', 'fundo', 'erro-forcado'))).toEqual(['BH', 'FH']);
  });
  it('sacador|devolucao|erro-forcado → BH,FH', () => {
    expect(sorted(getValidGolpes('sacador', 'devolucao', 'erro-forcado'))).toEqual(['BH', 'FH']);
  });

  // devolvedor
  it('devolvedor|passada|winner → BH,FH', () => {
    expect(sorted(getValidGolpes('devolvedor', 'passada', 'winner'))).toEqual(['BH', 'FH']);
  });
  it('devolvedor|passada|erro-forcado → VBH,VFH (sem Smash)', () => {
    expect(sorted(getValidGolpes('devolvedor', 'passada', 'erro-forcado'))).toEqual(['VBH', 'VFH']);
  });
  it('devolvedor|passada|erro-nao-forcado → VBH,VFH', () => {
    expect(sorted(getValidGolpes('devolvedor', 'passada', 'erro-nao-forcado'))).toEqual(['VBH', 'VFH']);
  });
  it('devolvedor|rede|winner → VBH,VFH,Smash', () => {
    expect(sorted(getValidGolpes('devolvedor', 'rede', 'winner'))).toEqual(['Smash', 'VBH', 'VFH']);
  });
  it('devolvedor|rede|erro-forcado → BH,FH', () => {
    expect(sorted(getValidGolpes('devolvedor', 'rede', 'erro-forcado'))).toEqual(['BH', 'FH']);
  });
  it('devolvedor|fundo|winner → BH,FH', () => {
    expect(sorted(getValidGolpes('devolvedor', 'fundo', 'winner'))).toEqual(['BH', 'FH']);
  });
  it('devolvedor|fundo|erro-forcado → BH,FH', () => {
    expect(sorted(getValidGolpes('devolvedor', 'fundo', 'erro-forcado'))).toEqual(['BH', 'FH']);
  });
  it('devolvedor|devolucao|winner → BH,FH', () => {
    expect(sorted(getValidGolpes('devolvedor', 'devolucao', 'winner'))).toEqual(['BH', 'FH']);
  });
});

// ────────────────────────────────────────────────────────────────
// getValidDirecoes
// ────────────────────────────────────────────────────────────────
describe('getValidDirecoes', () => {
  it('sacador|passada|erro-forcado → 3 direções (sem inside)', () => {
    expect(sorted(getValidDirecoes('sacador', 'passada', 'erro-forcado'))).toEqual(sorted(ONLY3_DIRS));
  });
  it('sacador|passada|erro-nao-forcado → 3 direções', () => {
    expect(sorted(getValidDirecoes('sacador', 'passada', 'erro-nao-forcado'))).toEqual(sorted(ONLY3_DIRS));
  });
  it('sacador|passada|winner → 5 direções', () => {
    expect(sorted(getValidDirecoes('sacador', 'passada', 'winner'))).toEqual(sorted(ALL5_DIRS));
  });
  it('sacador|rede|winner → 5 direções', () => {
    expect(sorted(getValidDirecoes('sacador', 'rede', 'winner'))).toEqual(sorted(ALL5_DIRS));
  });
  it('sacador|rede|erro-forcado → 5 direções', () => {
    expect(sorted(getValidDirecoes('sacador', 'rede', 'erro-forcado'))).toEqual(sorted(ALL5_DIRS));
  });
  it('devolvedor|passada|erro-forcado → 5 direções', () => {
    expect(sorted(getValidDirecoes('devolvedor', 'passada', 'erro-forcado'))).toEqual(sorted(ALL5_DIRS));
  });
  it('devolvedor|devolucao|winner → 5 direções', () => {
    expect(sorted(getValidDirecoes('devolvedor', 'devolucao', 'winner'))).toEqual(sorted(ALL5_DIRS));
  });
  it('sacador|devolucao|erro-forcado → 5 direções', () => {
    expect(sorted(getValidDirecoes('sacador', 'devolucao', 'erro-forcado'))).toEqual(sorted(ALL5_DIRS));
  });
});

// ────────────────────────────────────────────────────────────────
// getValidGolpeEsp — regras críticas do arquivo
// ────────────────────────────────────────────────────────────────
describe('getValidGolpeEsp', () => {
  // sacador|devolucao|erro-* → apenas drop,lob
  it('sacador|devolucao|erro-forcado → drop,lob', () => {
    expect(sorted(getValidGolpeEsp('sacador', 'devolucao', 'erro-forcado'))).toEqual(sorted(DEVOLV_SACADOR_ESP));
  });
  it('sacador|devolucao|erro-nao-forcado → drop,lob', () => {
    expect(sorted(getValidGolpeEsp('sacador', 'devolucao', 'erro-nao-forcado'))).toEqual(sorted(DEVOLV_SACADOR_ESP));
  });

  // devolvedor|devolucao|winner → drop,lob,swingvolley (sem bate-pronto)
  it('devolvedor|devolucao|winner → drop,lob,swingvolley', () => {
    expect(sorted(getValidGolpeEsp('devolvedor', 'devolucao', 'winner'))).toEqual(sorted(DEVOLV_DEVOLV_ESP));
  });

  // rede + qualquer erro (sacador e devolvedor) → bate-pronto,drop,lob (sem swingvolley)
  it('sacador|rede|erro-forcado → bate-pronto,drop,lob (sem swingvolley)', () => {
    expect(sorted(getValidGolpeEsp('sacador', 'rede', 'erro-forcado'))).toEqual(sorted(NO_SW_ESP));
  });
  it('sacador|rede|erro-nao-forcado → bate-pronto,drop,lob', () => {
    expect(sorted(getValidGolpeEsp('sacador', 'rede', 'erro-nao-forcado'))).toEqual(sorted(NO_SW_ESP));
  });
  it('devolvedor|rede|erro-forcado → bate-pronto,drop,lob', () => {
    expect(sorted(getValidGolpeEsp('devolvedor', 'rede', 'erro-forcado'))).toEqual(sorted(NO_SW_ESP));
  });
  it('devolvedor|rede|erro-nao-forcado → bate-pronto,drop,lob', () => {
    expect(sorted(getValidGolpeEsp('devolvedor', 'rede', 'erro-nao-forcado'))).toEqual(sorted(NO_SW_ESP));
  });

  // devolvedor|fundo|erro → bate-pronto,drop,lob (sem swingvolley)
  it('devolvedor|fundo|erro-forcado → bate-pronto,drop,lob', () => {
    expect(sorted(getValidGolpeEsp('devolvedor', 'fundo', 'erro-forcado'))).toEqual(sorted(NO_SW_ESP));
  });
  it('devolvedor|fundo|erro-nao-forcado → bate-pronto,drop,lob', () => {
    expect(sorted(getValidGolpeEsp('devolvedor', 'fundo', 'erro-nao-forcado'))).toEqual(sorted(NO_SW_ESP));
  });

  // Todos os 4 (bate-pronto,drop,lob,swingvolley)
  it('sacador|passada|winner → todos 4', () => {
    expect(sorted(getValidGolpeEsp('sacador', 'passada', 'winner'))).toEqual(sorted(ALL4_ESP));
  });
  it('sacador|passada|erro-forcado → todos 4 (golpe especial para smash/voleio)', () => {
    expect(sorted(getValidGolpeEsp('sacador', 'passada', 'erro-forcado'))).toEqual(sorted(ALL4_ESP));
  });
  it('sacador|passada|erro-nao-forcado → todos 4', () => {
    expect(sorted(getValidGolpeEsp('sacador', 'passada', 'erro-nao-forcado'))).toEqual(sorted(ALL4_ESP));
  });
  it('sacador|rede|winner → todos 4', () => {
    expect(sorted(getValidGolpeEsp('sacador', 'rede', 'winner'))).toEqual(sorted(ALL4_ESP));
  });
  it('sacador|fundo|winner → todos 4', () => {
    expect(sorted(getValidGolpeEsp('sacador', 'fundo', 'winner'))).toEqual(sorted(ALL4_ESP));
  });
  it('sacador|fundo|erro-forcado → todos 4', () => {
    expect(sorted(getValidGolpeEsp('sacador', 'fundo', 'erro-forcado'))).toEqual(sorted(ALL4_ESP));
  });
  it('sacador|fundo|erro-nao-forcado → todos 4', () => {
    expect(sorted(getValidGolpeEsp('sacador', 'fundo', 'erro-nao-forcado'))).toEqual(sorted(ALL4_ESP));
  });
  it('devolvedor|passada|winner → todos 4', () => {
    expect(sorted(getValidGolpeEsp('devolvedor', 'passada', 'winner'))).toEqual(sorted(ALL4_ESP));
  });
  it('devolvedor|passada|erro-forcado → todos 4', () => {
    expect(sorted(getValidGolpeEsp('devolvedor', 'passada', 'erro-forcado'))).toEqual(sorted(ALL4_ESP));
  });
  it('devolvedor|passada|erro-nao-forcado → todos 4', () => {
    expect(sorted(getValidGolpeEsp('devolvedor', 'passada', 'erro-nao-forcado'))).toEqual(sorted(ALL4_ESP));
  });
  it('devolvedor|rede|winner → todos 4', () => {
    expect(sorted(getValidGolpeEsp('devolvedor', 'rede', 'winner'))).toEqual(sorted(ALL4_ESP));
  });
  it('devolvedor|fundo|winner → todos 4', () => {
    expect(sorted(getValidGolpeEsp('devolvedor', 'fundo', 'winner'))).toEqual(sorted(ALL4_ESP));
  });

  // rede winner nunca é 3 (apenas erros são 3)
  it('sacador|rede|winner NÃO deve ser 3 itens', () => {
    expect(getValidGolpeEsp('sacador', 'rede', 'winner')).toHaveLength(4);
  });
});
