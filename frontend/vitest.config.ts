/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    exclude: [
      'e2e/**',
      '**/e2e/**',
      '**/*.e2e.{js,ts}',
      '**/playwright.config.{js,ts}',
      '**/playwright-report/**',
      '**/playwright/**',
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