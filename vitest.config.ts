import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './app/src'),
      '@server': path.resolve(__dirname, './server/src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    maxWorkers: 1,
    exclude: [
      '**/node_modules/**',
      '**/reference/**',
      '**/dist/**',
      'app/src/**/*.test.{ts,tsx,js,jsx}',
    ],
    deps: {
      inline: ['zod'],
    },
    server: {
      deps: {
        inline: ['zod'],
      },
    },
  },
});
