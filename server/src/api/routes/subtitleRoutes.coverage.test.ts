import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import { registerSubtitleRoutes } from './subtitleRoutes';
import type { ApiDependencies } from '../types';

const NOW_ISO = new Date();

function progressRow(mediaId: number, overrides: Record<string, unknown> = {}) {
  return {
    mediaId,
    progress: 0.4,
    isWatched: 0,
    lastWatched: NOW_ISO,
    ...overrides,
  };
}

/** The four model queries the coverage route runs, plus the batched progress query. */
function createCoverageDeps(fixtures: {
  movies?: Array<{ id: number; path: string | null; added: Date }>;
  episodes?: Array<{ id: number; path: string | null; added: Date }>;
  variants?: Array<{ id: number; movieId: number | null; episodeId: number | null }>;
  tracks?: Array<{ variantId: number; languageCode: string | null }>;
  progress?: Array<Record<string, unknown>>;
} = {}) {
  const progress = fixtures.progress ?? [];
  const drizzle = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve(progress)),
      })),
    })),
  };
  const prisma = {
    movie: { findMany: vi.fn().mockResolvedValue(fixtures.movies ?? []) },
    episode: { findMany: vi.fn().mockResolvedValue(fixtures.episodes ?? []) },
    mediaFileVariant: { findMany: vi.fn().mockResolvedValue(fixtures.variants ?? []) },
    variantSubtitleTrack: { findMany: vi.fn().mockResolvedValue(fixtures.tracks ?? []) },
    drizzle,
  };
  return { prisma, drizzle };
}

function createApp(prisma: Record<string, unknown>): FastifyInstance {
  const app = Fastify();
  const deps: ApiDependencies = { prisma } as unknown as ApiDependencies;
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerSubtitleRoutes(app, deps);
  return app;
}

describe('GET /api/subtitles/coverage', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = createApp(createCoverageDeps().prisma);
  });

  it('returns zeros for an empty library', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/subtitles/coverage' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: { buckets: unknown[]; highPriority: unknown } };
    expect(body.data.buckets).toHaveLength(4);
    expect(body.data.highPriority).toEqual({ total: 0, covered: 0, missing: 0 });
  });

  it('counts coverage per bucket from real track rows', async () => {
    const added = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const deps = createCoverageDeps({
      // Movie 1 is in progress; movie 2 was added long ago and never watched.
      movies: [
        { id: 1, path: '/movies/one.mkv', added },
        { id: 2, path: '/movies/two.mkv', added },
      ],
      episodes: [],
      variants: [
        { id: 10, movieId: 1, episodeId: null },
        { id: 11, movieId: 2, episodeId: null },
      ],
      tracks: [
        { variantId: 10, languageCode: 'en' },
        { variantId: 10, languageCode: 'zho' },
        { variantId: 11, languageCode: 'eng' },
      ],
      progress: [progressRow(1, { progress: 0.35, isWatched: 0 })],
    });
    app = createApp(deps.prisma);

    const response = await app.inject({ method: 'GET', url: '/api/subtitles/coverage' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as {
      data: {
        buckets: Array<{
          bucket: string;
          total: number;
          withChinese: number;
          withEnglish: number;
          withBoth: number;
          missingChinese: number;
        }>;
        totals: { total: number };
        highPriority: { total: number; covered: number; missing: number };
      };
    };

    const watching = body.data.buckets.find((entry) => entry.bucket === 'continue-watching');
    expect(watching).toMatchObject({ total: 1, withChinese: 1, withEnglish: 1, withBoth: 1, missingChinese: 0 });

    const backfill = body.data.buckets.find((entry) => entry.bucket === 'backfill');
    expect(backfill).toMatchObject({ total: 1, withChinese: 0, withEnglish: 1, withBoth: 0, missingChinese: 1 });

    expect(body.data.totals.total).toBe(2);
    expect(body.data.highPriority).toEqual({ total: 1, covered: 1, missing: 0 });
  });

  it('maps an episode variant to its episode coverage', async () => {
    const added = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const deps = createCoverageDeps({
      movies: [],
      episodes: [{ id: 77, path: '/tv/ep.mkv', added }],
      variants: [{ id: 20, movieId: null, episodeId: 77 }],
      tracks: [{ variantId: 20, languageCode: 'chi' }],
      progress: [],
    });
    app = createApp(deps.prisma);

    const response = await app.inject({ method: 'GET', url: '/api/subtitles/coverage' });
    const body = JSON.parse(response.body) as {
      data: { buckets: Array<{ bucket: string; total: number; withChinese: number }> };
    };
    const recent = body.data.buckets.find((entry) => entry.bucket === 'recently-added');
    expect(recent).toMatchObject({ total: 1, withChinese: 1 });
  });
});
