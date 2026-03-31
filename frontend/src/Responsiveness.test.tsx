import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexCssPath = join(__dirname, './index.css');

describe('Responsividade', () => {
  it('não deve usar zoom no body (substituído por font-size fluido)', () => {
    const css = readFileSync(indexCssPath, 'utf-8');
    // Garante que não há propriedade zoom no seletor body
    const bodyBlock = css.match(/body\s*\{[^}]*\}/s)?.[0] ?? '';
    expect(bodyBlock).not.toMatch(/\bzoom\s*:/);
  });

  it('deve ter min-width de 320px no body', () => {
    const css = readFileSync(indexCssPath, 'utf-8');
    expect(css).toContain('min-width: 320px');
  });

  it('deve ter padding-bottom para acomodar a BottomTabBar em mobile', () => {
    const css = readFileSync(indexCssPath, 'utf-8');
    // Verifica que há regra de padding-bottom com safe-area-inset-bottom para mobile
    expect(css).toMatch(/padding-bottom\s*:\s*calc\([^)]*safe-area-inset-bottom/);
  });

  it('deve resetar padding-bottom em desktop', () => {
    const css = readFileSync(indexCssPath, 'utf-8');
    // Garante que em media query de desktop o padding-bottom é resetado para 0
    expect(css).toMatch(/@media[^{]*min-width[^{]*1024px[^{]*\{[^}]*padding-bottom\s*:\s*0/s);
  });
});