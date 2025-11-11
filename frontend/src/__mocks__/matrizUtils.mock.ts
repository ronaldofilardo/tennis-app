import { vi } from 'vitest';

export const getResultados = vi.fn();
export const getGolpes = vi.fn();
export const getEfeitos = vi.fn();
export const getDirecoes = vi.fn();

export function resetMockMatrizUtils({ resultados = [], golpes = [], efeitos = [], direcoes = [] } = {}) {
  getResultados.mockReturnValue(resultados);
  getGolpes.mockReturnValue(golpes);
  getEfeitos.mockReturnValue(efeitos);
  getDirecoes.mockReturnValue(direcoes);
}
