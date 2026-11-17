import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerSeriesRoutes } from './seriesRoutes';

/**
 * The TV grid derives a poster's "has file" state from `episodeFileCount`, and
 * `episodeCount` drives the "n episodes" line. Neither field was sent, so every
 * series card in the grid looked file-less: it carried a "monitored but missing"
 * status dot and later a "Missing" label, even for a show with 140 files on disk
 * (verified on the TV 2026-11-17).
 */
function buildApp(deps: ApiDependencies): FastifyInstance {
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerSeriesRoutes(app, deps);
  return app;
}

function seriesFixture(overrides: { total: number; withFile: number }) {
  const episodes = Array.from({ length: overrides.total }, (_, index) => ({
    id: 100 + index,
    seasonNumber: 1,
    episodeNumber: index + 1,
    fileVariants: index < overrides.withFile ? [{ fileSize: 1000 }] : [],
  }));
  return {
    id: 7,
    title: 'Test Series',
    monitored: true,
    qualityProfile: null,
    seasons: [{ id: 1, seasonNumber: 1, episodes }],
  };
}

describe('GET /api/series — card counts', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    const deps: ApiDependencies = {
      prisma: {
        series: { findMany: vi.fn().mockResolvedValue([seriesFixture({ total: 4, withFile: 3 })]) },
        playbackProgress: { findMany: vi.fn().mockResolvedValue([]) },
      } as any,
    } as ApiDependencies;
    app = buildApp(deps);
    await app.ready();
  });

  it('reports episodeCount and episodeFileCount so the grid can tell missing from present', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/series' });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    const items = body.data?.items ?? body.data;
    const series = items[0];
    expect(series.episodeCount).toBe(4);
    expect(series.episodeFileCount).toBe(3);
    expect(series.statistics.episodeFileCount).toBe(3);
  });
});
