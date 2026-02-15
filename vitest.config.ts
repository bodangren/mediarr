import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    maxWorkers: 1,
    exclude: [
      '**/node_modules/**',
      '**/reference/**',
      '**/dist/**',
      'app/src/**/*.test.tsx', // Only exclude React component tests from vitest (they need jsdom)
    ],
  },
});
