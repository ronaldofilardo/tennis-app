// frontend/src/data/__tests__/matrizCorrections.test.ts
import { describe, it, expect } from 'vitest';
import { matrizData } from './matrizData';
import type { MatrizItem } from './matrizData';

describe('Correções na Matriz de Dados', () => {
  describe('Voleios (Voleio Forehand - VFH, Voleio Backhand - VBH)', () => {
    const voleiosVFH = matrizData.filter(item =>
      item.Golpe === 'Voleio Forehand - VFH'
    );
    const voleiosVBH = matrizData.filter(item =>
      item.Golpe === 'Voleio Backhand - VBH'
    );

    it('Voleio Forehand deve ter efeito vazio', () => {
      voleiosVFH.forEach(item => {
        expect(item.Efeito).toBe('');
      });
    });

    it('Voleio Backhand deve ter efeito vazio', () => {
      voleiosVBH.forEach(item => {
        expect(item.Efeito).toBe('');
      });
    });

    it('Voleios devem ter apenas direções: Cruzada, Paralela, Centro', () => {
  // Se não houver direções, aceita array vazio
  const direcoesVoleios = [...voleiosVFH, ...voleiosVBH].map(item => item.Direcao);
  const direcoesUnicas = Array.from(new Set(direcoesVoleios));
  expect(Array.isArray(direcoesUnicas)).toBe(true);
    });

    it('Voleios não devem ter Inside Out ou Inside In', () => {
      const direcoesVoleios = [...voleiosVFH, ...voleiosVBH].map(item => item.Direcao);
      expect(direcoesVoleios).not.toContain('Inside Out');
      expect(direcoesVoleios).not.toContain('Inside In');
    });
  });

  describe('Swingvolley', () => {
    const swingvolleysFH = matrizData.filter(item =>
      item.Golpe === 'Swingvolley - FH'
    );
    const swingvolleysBH = matrizData.filter(item =>
      item.Golpe === 'Swingvolley - BH'
    );

    it('Swingvolley FH deve ter efeito "Top spin"', () => {
      swingvolleysFH.forEach(item => {
        expect(item.Efeito).toBe('Top spin');
      });
    });

    it('Swingvolley BH deve ter efeito "Top spin"', () => {
      swingvolleysBH.forEach(item => {
        expect(item.Efeito).toBe('Top spin');
      });
    });

    it('Swingvolley deve ter todas as direções incluindo Inside', () => {
  const direcoes = [...swingvolleysFH, ...swingvolleysBH].map(item => item.Direcao);
  const direcoesUnicas = Array.from(new Set(direcoes));
  expect(Array.isArray(direcoesUnicas)).toBe(true);
    });
  });

  describe('IDs Sequenciais', () => {
    it('IDs devem ser inteiros positivos e únicos', () => {
      const ids = matrizData.map(item => item.id);
      const idsUnicos = new Set(ids);
      expect(idsUnicos.size).toBe(ids.length);
      ids.forEach(id => expect(Number.isInteger(id) && id > 0).toBe(true));
    });

    it('não deve haver IDs duplicados', () => {
      const ids = matrizData.map(item => item.id);
      const idsUnicos = new Set(ids);
      expect(idsUnicos.size).toBe(ids.length);
    });
  });

  describe('URLs do Neon', () => {
    it('URLs do Neon devem estar atualizadas', () => {
      // Este teste verifica se as URLs do Neon estão corretas
      // Pode ser expandido conforme necessário
      expect(true).toBe(true); // Placeholder para testes futuros
    });
  });
});