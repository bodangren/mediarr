import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerMetadataRoutes } from './metadataRoutes';

function createApp(deps: ApiDependencies): FastifyInstance {
  const app = Fastify();
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerMetadataRoutes(app, deps);
  return app;
}

describe('POST /api/metadata/refresh registered handler', () => {
  let app: FastifyInstance;
  let refreshAll: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    refreshAll = vi.fn();
    app = createApp({
      prisma: {},
      metadataRefreshService: { refreshAll },
    } as ApiDependencies);
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns the exact summary envelope from the refresh service', async () => {
    const summary = {
      moviesScanned: 1,
      seriesScanned: 1,
      moviesRefreshed: 1,
      seriesRefreshed: 1,
      failures: 0,
      durationMs: 42,
    };
    refreshAll.mockResolvedValue(summary);

    const response = await app.inject({ method: 'POST', url: '/api/metadata/refresh' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, data: summary });
    expect(refreshAll).toHaveBeenCalledOnce();
  });

  it('returns 500 when the refresh service is not configured', async () => {
    app = createApp({ prisma: {} } as ApiDependencies);

    const response = await app.inject({ method: 'POST', url: '/api/metadata/refresh' });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      ok: false,
      error: 'Metadata refresh service is not configured',
    });
  });

  it('propagates a provider failure as an error instead of hanging', async () => {
    refreshAll.mockRejectedValue(new Error('TMDB unreachable'));

    const response = await app.inject({ method: 'POST', url: '/api/metadata/refresh' });

    expect(response.statusCode).toBe(500);
  });
});
