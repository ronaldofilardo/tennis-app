import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Limpa o cache global do Vitest antes e depois de cada teste para evitar conflitos de redefinição
beforeEach(() => {
  // Remove possíveis propriedades globais do Vitest/Jest
  try {
    // @ts-ignore — delete de propriedade em Symbol global: TypeScript não tipifica
    // Symbol.for("$$jest-matchers-object") corretamente em globalThis (propriedade dinâmica).
    // Necessário para evitar conflitos de matcher entre suítes no Vitest.
    delete global[Symbol.for('$$jest-matchers-object')];
  } catch {}
});
afterEach(() => {
  try {
    // @ts-ignore — mesma razão do beforeEach: Symbol global não está no tipo globalThis
    delete global[Symbol.for('$$jest-matchers-object')];
  } catch {}
});

describe('Build do Projeto', () => {
  it('deve verificar configuração de build do frontend', async () => {
    // Verifica se o script de build está configurado
    const fs = await import('fs/promises');
    const path = await import('path');
    // Garante que sempre busque o package.json da raiz do monorepo
    let rootDir = process.cwd();
    if (rootDir.endsWith('frontend')) {
      rootDir = path.dirname(rootDir);
    }
    const rootPackageJsonPath = path.join(rootDir, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(rootPackageJsonPath, 'utf-8'));
    expect(packageJson.scripts.build).toBe('pnpm -r build');
  });

  // (Removido trecho antigo de require('../../package.json') para evitar confusão em ambientes de sandbox)

  it('deve verificar configuração de build do monorepo', async () => {
    // Verifica se o script de build do monorepo está configurado
    const fs = await import('fs/promises');
    const path = await import('path');
    // Garante que sempre busque o package.json da raiz do monorepo
    let rootDir = process.cwd();
    if (rootDir.endsWith('frontend')) {
      rootDir = path.dirname(rootDir);
    }
    const rootPackageJsonPath = path.join(rootDir, 'package.json');
    const rootPackageJson = JSON.parse(await fs.readFile(rootPackageJsonPath, 'utf-8'));
    expect(rootPackageJson.scripts.build).toBe('pnpm -r build');
  });

  it('deve verificar dependências do Prisma', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    // Busca sempre o frontend/package.json independente do cwd
    let rootDir = process.cwd();
    if (rootDir.endsWith('frontend')) {
      rootDir = path.dirname(rootDir);
    }
    const packageJsonPath = path.join(rootDir, 'frontend', 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    expect(packageJson.dependencies).toHaveProperty('@prisma/client');
    expect(packageJson.devDependencies).toHaveProperty('prisma');
  });

  it('deve verificar dependências do Vite', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    // Busca sempre o frontend/package.json independente do cwd
    let rootDir = process.cwd();
    if (rootDir.endsWith('frontend')) {
      rootDir = path.dirname(rootDir);
    }
    const packageJsonPath = path.join(rootDir, 'frontend', 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    expect(packageJson.devDependencies).toHaveProperty('vite');
    expect(packageJson.devDependencies).toHaveProperty('@vitejs/plugin-react');
  });
});
