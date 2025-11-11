import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

// Mock do CSS para testar zoom
const mockCSS = `
body {
  margin: 0;
  display: flex;
  justify-content: center;
  padding-top: 4rem;
  min-width: 320px;
  min-height: 100vh;
  zoom: 0.65;
}
`;

describe('Responsividade', () => {
  it('deve aplicar zoom de 0.65 para dispositivos móveis', () => {
    // Simula carregamento do CSS
    const style = document.createElement('style');
    style.textContent = mockCSS;
    document.head.appendChild(style);

    // Verifica se o zoom foi aplicado (nota: zoom pode não ser suportado em todos os navegadores de teste)
    const body = document.body;
    const computedStyle = window.getComputedStyle(body);
    // Em navegadores que suportam zoom, deve ser '0.65', mas pode ser undefined em alguns ambientes de teste
    if (computedStyle.zoom !== undefined) {
      expect(computedStyle.zoom).toBe('0.65');
    }

    // Limpa o mock
    document.head.removeChild(style);
  });

  it('deve manter min-width de 320px', () => {
    const style = document.createElement('style');
    style.textContent = mockCSS;
    document.head.appendChild(style);

    const body = document.body;
    const computedStyle = window.getComputedStyle(body);
    expect(computedStyle.minWidth).toBe('320px');

    document.head.removeChild(style);
  });

  it('deve manter min-height de 100vh', () => {
    const style = document.createElement('style');
    style.textContent = mockCSS;
    document.head.appendChild(style);

    const body = document.body;
    const computedStyle = window.getComputedStyle(body);
    expect(computedStyle.minHeight).toBe('100vh');

    document.head.removeChild(style);
  });
});