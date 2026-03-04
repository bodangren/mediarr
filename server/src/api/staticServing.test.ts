import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import fs from 'node:fs/promises';
import path from 'node:path';
import { registerStaticServing } from './staticServing';

const TEST_STATIC_DIR = path.join(__dirname, '__test_static__');

async function createTestStaticDir(): Promise<void> {
  await cleanupTestStaticDir();
  await fs.mkdir(TEST_STATIC_DIR, { recursive: true });
  await fs.mkdir(path.join(TEST_STATIC_DIR, 'assets'), { recursive: true });
  await fs.writeFile(
    path.join(TEST_STATIC_DIR, 'index.html'),
    '<!DOCTYPE html><html><head><title>Mediarr</title></head><body><div id="root"></div></body></html>',
  );
  await fs.writeFile(
    path.join(TEST_STATIC_DIR, 'assets', 'index.js'),
    'console.log("test");',
  );
  await fs.writeFile(
    path.join(TEST_STATIC_DIR, 'assets', 'index.css'),
    'body { margin: 0; }',
  );
}

async function cleanupTestStaticDir(): Promise<void> {
  try {
    await fs.rm(TEST_STATIC_DIR, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
}

describe('Static File Serving for SPA', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    await createTestStaticDir();
    app = Fastify();
  });

  afterEach(async () => {
    await app.close();
    await cleanupTestStaticDir();
  });

  describe('Static asset serving', () => {
    it('serves index.html at root path', async () => {
      registerStaticServing(app, TEST_STATIC_DIR);

      const response = await app.inject({
        method: 'GET',
        url: '/',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.body).toContain('<title>Mediarr</title>');
    });

    it('serves static JavaScript files from assets directory', async () => {
      registerStaticServing(app, TEST_STATIC_DIR);

      const response = await app.inject({
        method: 'GET',
        url: '/assets/index.js',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/javascript');
      expect(response.body).toContain('console.log');
    });

    it('serves static CSS files from assets directory', async () => {
      registerStaticServing(app, TEST_STATIC_DIR);

      const response = await app.inject({
        method: 'GET',
        url: '/assets/index.css',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/css');
      expect(response.body).toContain('margin: 0');
    });

    it('returns 404 for non-existent static files', async () => {
      registerStaticServing(app, TEST_STATIC_DIR);

      const response = await app.inject({
        method: 'GET',
        url: '/assets/nonexistent.js',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('SPA deep-link fallback', () => {
    it('serves index.html for /dashboard route (SPA fallback)', async () => {
      registerStaticServing(app, TEST_STATIC_DIR);

      const response = await app.inject({
        method: 'GET',
        url: '/dashboard',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.body).toContain('<title>Mediarr</title>');
    });

    it('serves index.html for /library/movies route (SPA fallback)', async () => {
      registerStaticServing(app, TEST_STATIC_DIR);

      const response = await app.inject({
        method: 'GET',
        url: '/library/movies',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.body).toContain('<title>Mediarr</title>');
    });

    it('serves index.html for /library/movies/:id route (SPA fallback)', async () => {
      registerStaticServing(app, TEST_STATIC_DIR);

      const response = await app.inject({
        method: 'GET',
        url: '/library/movies/123',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.body).toContain('<title>Mediarr</title>');
    });

    it('serves index.html for /library/tv route (SPA fallback)', async () => {
      registerStaticServing(app, TEST_STATIC_DIR);

      const response = await app.inject({
        method: 'GET',
        url: '/library/tv',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.body).toContain('<title>Mediarr</title>');
    });

    it('serves index.html for /library/tv/:id route (SPA fallback)', async () => {
      registerStaticServing(app, TEST_STATIC_DIR);

      const response = await app.inject({
        method: 'GET',
        url: '/library/tv/456',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.body).toContain('<title>Mediarr</title>');
    });

    it('serves index.html for /settings/* routes (SPA fallback)', async () => {
      registerStaticServing(app, TEST_STATIC_DIR);

      const settingsRoutes = [
        '/settings',
        '/settings/media',
        '/settings/profiles',
        '/settings/indexers',
        '/settings/clients',
        '/settings/subtitles',
        '/settings/streaming',
        '/settings/notifications',
        '/settings/general',
      ];

      for (const route of settingsRoutes) {
        const response = await app.inject({
          method: 'GET',
          url: route,
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toContain('text/html');
        expect(response.body).toContain('<title>Mediarr</title>');
      }
    });

    it('serves index.html for /system/* routes (SPA fallback)', async () => {
      registerStaticServing(app, TEST_STATIC_DIR);

      const systemRoutes = ['/system/tasks', '/system/logs', '/system/backup'];

      for (const route of systemRoutes) {
        const response = await app.inject({
          method: 'GET',
          url: route,
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toContain('text/html');
        expect(response.body).toContain('<title>Mediarr</title>');
      }
    });

    it('serves index.html for activity routes (SPA fallback)', async () => {
      registerStaticServing(app, TEST_STATIC_DIR);

      const response = await app.inject({
        method: 'GET',
        url: '/activity/queue',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.body).toContain('<title>Mediarr</title>');
    });

    it('serves index.html for calendar route (SPA fallback)', async () => {
      registerStaticServing(app, TEST_STATIC_DIR);

      const response = await app.inject({
        method: 'GET',
        url: '/calendar',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.body).toContain('<title>Mediarr</title>');
    });

    it('serves index.html for deeply nested SPA routes', async () => {
      registerStaticServing(app, TEST_STATIC_DIR);

      const response = await app.inject({
        method: 'GET',
        url: '/library/tv/789/season/1/episode/5',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.body).toContain('<title>Mediarr</title>');
    });
  });

  describe('API route preservation', () => {
    it('does not serve index.html for /api routes (passes through to API handlers)', async () => {
      registerStaticServing(app, TEST_STATIC_DIR);

      const response = await app.inject({
        method: 'GET',
        url: '/api/movies',
      });

      expect(response.statusCode).toBe(404);
      expect(response.headers['content-type']).not.toContain('text/html');
    });

    it('does not serve index.html for /api/* sub-routes', async () => {
      registerStaticServing(app, TEST_STATIC_DIR);

      const apiRoutes = [
        '/api/movies/1',
        '/api/series',
        '/api/indexers',
        '/api/settings',
        '/api/download-clients',
      ];

      for (const route of apiRoutes) {
        const response = await app.inject({
          method: 'GET',
          url: route,
        });

        expect(response.statusCode).toBe(404);
      }
    });
  });

  describe('Graceful handling of missing static directory', () => {
    it('returns 404 when static directory does not exist', async () => {
      const nonExistentDir = path.join(__dirname, '__nonexistent_static__');
      registerStaticServing(app, nonExistentDir);

      const response = await app.inject({
        method: 'GET',
        url: '/',
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
