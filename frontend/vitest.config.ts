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
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 2,
        minThreads: 1,
      },
    },
  },
})