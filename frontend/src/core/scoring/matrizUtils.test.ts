import { describe, it, expect } from 'vitest';
import { getGolpes, getDirecoes } from './matrizUtils';

describe('matrizUtils', () => {
  describe('getGolpes', () => {
    it('should exclude forbidden shots for EF', () => {
      const golpes = getGolpes(['Erro forçado - EF']);
      const forbidden = ['Swingvolley - BH', 'Swingvolley - FH', 'Drop shot - BH', 'Drop shot - FH', 'Devolução SQ BH', 'Devolução SQ FH'];
      forbidden.forEach(forbiddenGolpe => {
        expect(golpes).not.toContain(forbiddenGolpe);
      });
      // Ensure other shots are included
      expect(golpes).toContain('Backhand - BH');
      expect(golpes).toContain('Forehand - FH');
    });

    it('should exclude forbidden shots for ENF', () => {
      const golpes = getGolpes(['Erro não Forçado - ENF']);
      const forbidden = ['Swingvolley - BH', 'Swingvolley - FH', 'Drop shot - BH', 'Drop shot - FH', 'Devolução SQ BH', 'Devolução SQ FH'];
      forbidden.forEach(forbiddenGolpe => {
        expect(golpes).not.toContain(forbiddenGolpe);
      });
      // Ensure other shots are included
      expect(golpes).toContain('Backhand - BH');
      expect(golpes).toContain('Forehand - FH');
    });

    it('should include all shots for Winner', () => {
      const golpes = getGolpes(['Winner']);
      expect(golpes).toContain('Backhand - BH');
      expect(golpes).toContain('Forehand - FH');
      expect(golpes).toContain('Devolução SQ BH');
      expect(golpes).toContain('Devolução SQ FH');
      expect(golpes.length).toBeGreaterThan(0);
    });
  });

  describe('getDirecoes', () => {
    it('should return all directions for Winner Backhand Chapado', () => {
      const direcoes = getDirecoes(['Winner'], ['Backhand - BH'], ['Chapado']);
      expect(direcoes).toContain('Centro');
      expect(direcoes).toContain('Cruzada');
      expect(direcoes).toContain('Paralela');
      expect(direcoes).toHaveLength(3);
    });

    it('should return all directions for Winner Backhand Top spin', () => {
      const direcoes = getDirecoes(['Winner'], ['Backhand - BH'], ['Top spin']);
      expect(direcoes).toContain('Centro');
      expect(direcoes).toContain('Cruzada');
      expect(direcoes).toContain('Paralela');
      expect(direcoes).toHaveLength(3);
    });

    it('should return all directions for Winner Backhand Cortado', () => {
      const direcoes = getDirecoes(['Winner'], ['Backhand - BH'], ['Cortado']);
      expect(direcoes).toContain('Centro');
      expect(direcoes).toContain('Cruzada');
      expect(direcoes).toContain('Paralela');
      expect(direcoes).toHaveLength(3);
    });
  });
});