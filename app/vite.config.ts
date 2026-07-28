import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@server': path.resolve(__dirname, '../server/src'),
    },
  },
  build: {
    rollupOptions: {
      // Rollup defaults this to 1000. A buildah `RUN` layer — the context the
      // container image build actually executes in — has an fd soft limit of
      // 1024, so the default runs the module queue 24 descriptors under the
      // ceiling and intermittently loses the race against node's own fds. The
      // file then fails to open and rollup reports it as
      // `Rollup failed to resolve import "<dep>"`, naming whichever module lost.
      //
      // 128 keeps the build parallel while leaving 8x headroom. See
      // tests/spa-build-file-parallelism.test.js and Phase 6 of
      // measure/tracks/chore_home_network_deployment_hardening_20260712/plan.md.
      maxParallelFileOps: 128,
    },
  },
  server: {
    host: true, // listen on 0.0.0.0 so LAN devices (e.g. Android TV) can reach the dev server
    proxy: {
      // Forward all /api requests to the Node.js daemon
      '/api': {
        target: 'http://localhost:5174',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
