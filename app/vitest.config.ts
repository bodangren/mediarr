import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@server': path.resolve(__dirname, '../server/src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // MSW's setupServer can hang or leak event-loop handles with the default
    // 'threads' pool when many test files load it. 'forks' isolates MSW's
    // interceptor per worker and keeps the suite reliable now that MSW is
    // unconditionally wired in setup.ts.
    pool: 'forks',
    // jsdom + React + MSW workers are memory-intensive in this suite. Run one
    // isolated fork at a time so interaction tests do not exceed their timeout
    // merely because sibling files are competing for CPU and memory.
    maxWorkers: 1,
    fileParallelism: false,
  },
});
