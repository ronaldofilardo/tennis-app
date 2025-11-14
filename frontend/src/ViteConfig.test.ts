import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Configuração do Vite', () => {
  it('deve ter host configurado para 0.0.0.0', () => {
    const viteConfigPath = join(process.cwd(), 'vite.config.ts');
    const viteConfigContent = readFileSync(viteConfigPath, 'utf-8');

    expect(viteConfigContent).toContain("host: '0.0.0.0'");
  });

  it('deve ter proxy configurado para /api', () => {
    const viteConfigPath = join(process.cwd(), 'vite.config.ts');
    const viteConfigContent = readFileSync(viteConfigPath, 'utf-8');

    expect(viteConfigContent).toContain("'/api': {");
  expect(viteConfigContent).toContain("target: 'http://localhost:3001'");
    expect(viteConfigContent).toContain("changeOrigin: true");
    // Aceita variações de espaços, aspas e barra invertida escapada
    const normalized = viteConfigContent.replace(/\s+/g, '');
    // Aceita qualquer quantidade de barras invertidas escapadas
    expect(normalized).toMatch(/rewrite:\(path\)=>path\.replace\(\/\^\\*\/api\/,''\)/);
  });

  it('deve ter plugin React configurado', () => {
    const viteConfigPath = join(process.cwd(), 'vite.config.ts');
    const viteConfigContent = readFileSync(viteConfigPath, 'utf-8');

    expect(viteConfigContent).toContain('react()');
    expect(viteConfigContent).toContain('@vitejs/plugin-react');
  });

  it('deve exportar configuração válida', () => {
    const viteConfigPath = join(process.cwd(), 'vite.config.ts');
    const viteConfigContent = readFileSync(viteConfigPath, 'utf-8');

    expect(viteConfigContent).toContain('export default defineConfig');
    expect(viteConfigContent).toContain('defineConfig');
  });
});