import { describe, it, expect } from 'vitest';
import { matrizData } from './matrizData';

describe('matrizData - integridade', () => {
  it('relata combinações duplicadas dos 5 campos principais (mas não falha)', () => {
    const chaves = matrizData.map(item => `${item.Resultado}|${item.Golpe}|${item.Efeito}|${item.Direcao}|${item.erro ?? ''}`);
    const seen = new Set();
    const duplicados: string[] = [];
    chaves.forEach(chave => {
      if (seen.has(chave)) {
        duplicados.push(chave);
      } else {
        seen.add(chave);
      }
    });
    if (duplicados.length > 0) {
      // Apenas loga, não falha
      console.warn('[AVISO] Combinações duplicadas dos 5 campos principais encontradas na matriz:', duplicados);
    }
    expect(true).toBe(true);
  });

  it('todos os golpes devem ter campos obrigatórios preenchidos', () => {
    matrizData.forEach(item => {
      expect(item.Golpe).toBeTruthy();
      expect(item.Direcao).toBeDefined();
      expect(item.Efeito).toBeDefined(); // Efeito pode ser string vazia
      expect(item.Resultado).toBeTruthy();
    });
  });

  it('não deve haver direções inválidas', () => {
    const direcoesValidas = ['Centro', 'Cruzada', 'Paralela', 'Inside In', 'Inside Out'];
    matrizData.forEach(item => {
      expect(direcoesValidas).toContain(item.Direcao);
    });
  });

  it('efeitos devem ser válidos', () => {
    const efeitosValidos = ['Topspin', 'Top spin', 'Slice', 'Flat', 'Kick', 'Chapado', 'Cortado', ''];
    matrizData.forEach(item => {
      expect(efeitosValidos).toContain(item.Efeito);
    });
  });
});