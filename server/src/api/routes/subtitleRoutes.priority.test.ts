import { describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import { registerSubtitleRoutes } from './subtitleRoutes';
import type { ApiDependencies } from '../types';

const NOW = new Date();
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

function missingRow(input: {
  episodeId: number;
  seriesId: number;
  seriesTitle: string;
  addedAt: Date;
  languageCode?: string;
}) {
  return {
    languageCode: input.languageCode ?? 'zho',
    variant: {
      episode: {
        id: input.episodeId,
        seasonNumber: 1,
        episodeNumber: input.episodeId,
        title: `Episode ${input.episodeId}`,
        season: {
          series: { id: input.seriesId, title: input.seriesTitle, added: input.addedAt },
        },
      },
    },
  };
}

function createApp(rows: unknown[], progress: Array<Record<string, unknown>>): FastifyInstance {
  const drizzle = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({ where: vi.fn(() => Promise.resolve(progress)) })),
    })),
  };
  const deps = {
    prisma: {
      variantMissingSubtitle: { findMany: vi.fn().mockResolvedValue(rows) },
      drizzle,
    },
    subtitleAutomationService: { runAutomationCycle: vi.fn() },
  } as unknown as ApiDependencies;
  const app = Fastify();
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerSubtitleRoutes(app, deps);
  return app;
}

const IN_PROGRESS = missingRow({ episodeId: 2, seriesId: 25, seriesTitle: 'The 100', addedAt: daysAgo(400) });
const BACKFILL = missingRow({ episodeId: 9, seriesId: 30, seriesTitle: 'The Walking Dead', addedAt: daysAgo(400) });

describe('GET /api/subtitles/wanted/series — viewing priority', () => {
  it('orders in-progress episodes before backfill and exposes the priority', async () => {
    const app = createApp([BACKFILL, IN_PROGRESS], [
      { mediaId: 2, progress: 0.3, isWatched: 0, lastWatched: daysAgo(1) },
    ]);

    const response = await app.inject({ method: 'GET', url: '/api/subtitles/wanted/series?pageSize=10' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as {
      data: Array<{ episodeId: number; priority: { bucket: string; rank: number } }>;
    };

    expect(body.data.map((entry) => entry.episodeId)).toEqual([2, 9]);
    expect(body.data[0]?.priority).toEqual({ bucket: 'continue-watching', rank: 0 });
    expect(body.data[1]?.priority).toEqual({ bucket: 'backfill', rank: 3 });
  });

  it('filters by bucket', async () => {
    const app = createApp([BACKFILL, IN_PROGRESS], [
      { mediaId: 2, progress: 0.3, isWatched: 0, lastWatched: daysAgo(1) },
    ]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/subtitles/wanted/series?bucket=continue-watching',
    });
    const body = JSON.parse(response.body) as {
      data: Array<{ episodeId: number }>;
      meta: { totalCount: number };
    };
    expect(body.data.map((entry) => entry.episodeId)).toEqual([2]);
    expect(body.meta.totalCount).toBe(1);
  });

  it('rejects an unknown bucket', async () => {
    const app = createApp([], []);
    const response = await app.inject({
      method: 'GET',
      url: '/api/subtitles/wanted/series?bucket=sometimes',
    });
    expect(response.statusCode).toBe(422);
  });
});
