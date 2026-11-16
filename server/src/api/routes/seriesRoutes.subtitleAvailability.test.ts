import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerSeriesRoutes } from './seriesRoutes';

function buildApp(deps: ApiDependencies): FastifyInstance {
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerSeriesRoutes(app, deps);
  return app;
}

function ep(id: number, episodeNumber: number, subtitleTracks: Array<{ languageCode: string | null }>) {
  return {
    id,
    seriesId: 1,
    seasonId: 10,
    seasonNumber: 1,
    episodeNumber,
    title: `Episode ${episodeNumber}`,
    monitored: true,
    path: null,
    fileVariants: [{
      fileSize: 4096,
      subtitleTracks,
    }],
  };
}

describe('GET /api/series/:id — per-episode subtitleAvailability', () => {
  let app: FastifyInstance;
  let prismaSeries: any;

  beforeEach(() => {
    prismaSeries = { findUnique: vi.fn() };
    app = buildApp({
      prisma: {
        series: prismaSeries,
        playbackProgress: { findMany: vi.fn().mockResolvedValue([]) },
      } as any,
    });
  });

  it('reports zh/en availability per episode from each episode variant’s tracks', async () => {
    prismaSeries.findUnique.mockResolvedValue({
      id: 1,
      title: 'My Show',
      qualityProfile: null,
      seasons: [{
        id: 10,
        seriesId: 1,
        seasonNumber: 1,
        monitored: true,
        episodes: [
          ep(100, 1, [{ languageCode: 'zho' }, { languageCode: 'eng' }]),
          ep(101, 2, [{ languageCode: 'chi' }]),
          ep(102, 3, [{ languageCode: 'en' }]),
          ep(103, 4, []),
        ],
      }],
    });

    const response = await app.inject({ method: 'GET', url: '/api/series/1' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    const episodes = body.data.seasons[0].episodes;
    const byId = new Map<number, any>(episodes.map((item: any) => [item.id, item]));
    expect(byId.get(100).subtitleAvailability).toEqual({ zh: true, en: true });
    expect(byId.get(101).subtitleAvailability).toEqual({ zh: true, en: false });
    expect(byId.get(102).subtitleAvailability).toEqual({ zh: false, en: true });
    expect(byId.get(103).subtitleAvailability).toEqual({ zh: false, en: false });
    // Series-level roll-up for the detail header: any episode with zh/en.
    expect(body.data.subtitleAvailability).toEqual({ zh: true, en: true });
  });

  it('stays additive: hasFile and the raw fileVariants contract are unchanged', async () => {
    prismaSeries.findUnique.mockResolvedValue({
      id: 1,
      title: 'My Show',
      qualityProfile: null,
      seasons: [{
        id: 10,
        seriesId: 1,
        seasonNumber: 1,
        monitored: true,
        episodes: [ep(100, 1, [{ languageCode: 'zho' }])],
      }],
    });

    const response = await app.inject({ method: 'GET', url: '/api/series/1' });

    const body = JSON.parse(response.body);
    expect(body.data.seasons[0].episodes[0]).toMatchObject({
      id: 100,
      hasFile: true,
      subtitleAvailability: { zh: true, en: false },
    });
    expect(body.data.seasons[0].episodes[0].fileVariants).toBeUndefined();
  });

  it('reports both false when an episode variant has no subtitle tracks at all', async () => {
    prismaSeries.findUnique.mockResolvedValue({
      id: 1,
      title: 'My Show',
      qualityProfile: null,
      seasons: [{
        id: 10,
        seriesId: 1,
        seasonNumber: 1,
        monitored: true,
        episodes: [{
          id: 100,
          seriesId: 1,
          seasonId: 10,
          seasonNumber: 1,
          episodeNumber: 1,
          title: 'Pilot',
          monitored: true,
          path: null,
          fileVariants: [{ fileSize: 1024 }],
        }],
      }],
    });

    const response = await app.inject({ method: 'GET', url: '/api/series/1' });

    const body = JSON.parse(response.body);
    expect(body.data.seasons[0].episodes[0].subtitleAvailability).toEqual({ zh: false, en: false });
  });
});
