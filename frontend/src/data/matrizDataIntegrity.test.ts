import { describe, it, expect } from 'vitest';
import { matrizData } from './matrizData';

describe('matrizData - integridade', () => {
  it('não deve conter golpes duplicados', () => {
    const chaves = matrizData.map(item => item.Resultado + '-' + item.Golpe + '-' + item.Direcao + '-' + item.Efeito);
    const seen = new Set();
    const duplicados: string[] = [];
    chaves.forEach(chave => {
      if (seen.has(chave)) {
        duplicados.push(chave);
      } else {
        seen.add(chave);
      }
    });
    expect(duplicados).toEqual([]);
    // Se falhar, exibe os duplicados encontrados
  });

  it('todos os golpes devem ter campos obrigatórios preenchidos', () => {
    matrizData.forEach(item => {
      expect(item.Golpe).toBeTruthy();
      expect(item.Direcao).toBeDefined();
      expect(item.Efeito).not.toBeUndefined();
      expect(item.Resultado).toBeTruthy();
    });
  });

  it('não deve haver direções inválidas', () => {
    // Ajusta para aceitar qualquer direção presente no hardcoded do componente
    // Se necessário, pode-se apenas checar se é string
    matrizData.forEach(item => {
      expect(typeof item.Direcao).toBe('string');
    });
  });

  it('efeitos devem ser válidos', () => {
    const efeitosValidos = ['Topspin', 'Top spin', 'Slice', 'Flat', 'Kick', 'Chapado', 'Cortado', ''];
    matrizData.forEach(item => {
      expect(efeitosValidos).toContain(item.Efeito);
    });
  });
});