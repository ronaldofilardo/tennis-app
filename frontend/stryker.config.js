/**
 * @type {import('@stryker-mutator/api/core').StrykerOptions}
 */
export default {
  packageManager: "pnpm",
  reporters: ["html", "clear-text", "progress"],
  testRunner: "vitest",
  vitest: {
    configFile: "vitest.config.ts",
  },
  coverageAnalysis: "perTest",
  mutate: ["src/__tests__/contracts.test.js", "src/schemas/contracts.ts"],
  thresholds: {
    high: 80,
    low: 60,
    break: 50,
  },
  ignorePatterns: [
    "node_modules",
    "dist",
    "build",
    "*.config.js",
    "*.config.ts",
  ],
};
