/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    exclude: [
      'e2e/**',
      '**/e2e/**',
      '**/*.e2e.{js,ts}',
      '**/playwright.config.{js,ts}',
      '**/playwright-report/**',
      '**/playwright/**',
      // Ignorar testes de dependências externas (Zod, jest-dom)
      '**/node_modules/zod/**/tests/**',
      '**/node_modules/zod/**/test.{js,ts}',
      '**/node_modules/@testing-library/jest-dom/**/test.{js,ts}',
      '**/node_modules/@testing-library/jest-dom/**/tests/**',
      '**/node_modules/@testing-library/jest-dom/types/__tests__/**',
    ],
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: 2,
        minForks: 1,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'coverage/',
        'e2e/',
        '**/*.e2e.{js,ts}',
        '**/*.config.{js,ts}',
        'playwright-report/',
        'test-results/',
        'playwright.config.ts',
        'vitest.config.ts',
        'vitest.setup.ts',
        'dev-server.cjs',
        'test-server.cjs',
        'api/',
        'prisma/',
        'scripts/',
        'public/',
        '.vercel/',
        'playwright-e2e/',
      ],
    },
  },
})