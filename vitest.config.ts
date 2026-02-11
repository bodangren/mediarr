import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    maxWorkers: 1,
    minWorkers: 1,
    exclude: ['**/node_modules/**', '**/reference/**', '**/dist/**'],
  },
});
