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
      'app_src_backup/**',
      'app/src/**/*.test.{ts,tsx,js,jsx}',
    ],
  },
});
