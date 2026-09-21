import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createApiServer } from './createApiServer';

// Representative -arr domain routes. In slim mode these must return 404 at
// the route map: the domains are never registered, so no partially
// initialised handler can run.
const DISABLED_DOMAIN_ROUTES: Array<{ method: 'GET' | 'POST'; url: string }> = [
  { method: 'GET', url: '/api/torrents' },
  { method: 'GET', url: '/api/indexers' },
  { method: 'POST', url: '/api/subtitles/search' },
  { method: 'GET', url: '/api/import-lists' },
  { method: 'GET', url: '/api/notifications' },
  { method: 'GET', url: '/api/quality-profiles' },
  { method: 'POST', url: '/api/releases/search' },
];

const apps: FastifyInstance[] = [];

async function buildApp(slimMode?: boolean): Promise<FastifyInstance> {
  const app = createApiServer({ prisma: {} } as any, slimMode === undefined ? {} : { slimMode });
  apps.push(app);
  return app;
}

afterEach(async () => {
  while (apps.length > 0) {
    await apps.pop()!.close();
  }
});

describe('slim mode route gating', () => {
  it('returns 404 for every disabled-domain route', async () => {
    const app = await buildApp(true);

    for (const route of DISABLED_DOMAIN_ROUTES) {
      const response = await app.inject(route);
      expect(response.statusCode, `${route.method} ${route.url} must be dark in slim mode`).toBe(404);
    }
  });

  it('keeps core playback and library routes registered', async () => {
    const app = await buildApp(true);

    const status = await app.inject({ method: 'GET', url: '/api/system/status' });
    expect(status.statusCode, 'GET /api/system/status must stay registered in slim mode').not.toBe(404);

    // The library scan endpoint stays registered; without the container deps
    // it answers 500, never 404.
    const scan = await app.inject({ method: 'POST', url: '/api/library/scan' });
    expect(scan.statusCode, 'POST /api/library/scan must stay registered in slim mode').not.toBe(404);
  });

  it('registers disabled-domain routes in full mode (regression guard)', async () => {
    const app = await buildApp(false);

    for (const route of DISABLED_DOMAIN_ROUTES) {
      const response = await app.inject(route);
      expect(response.statusCode, `${route.method} ${route.url} must stay registered in full mode`).not.toBe(404);
    }
  });
});
