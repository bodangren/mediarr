import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    exclude: ['**/node_modules/**', '**/reference/**', '**/dist/**'],
  },
});
