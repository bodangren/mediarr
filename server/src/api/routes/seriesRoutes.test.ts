import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerSeriesRoutes } from './seriesRoutes';

function buildApp(deps: ApiDependencies): FastifyInstance {
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerSeriesRoutes(app, deps);
  return app;
}

describe('GET /api/series/:id — per-episode hasFile derivation', () => {
  let app: FastifyInstance;
  let prismaSeries: any;
  let tempDir: string;

  beforeEach(async () => {
    prismaSeries = {
      findUnique: vi.fn(),
    };

    const deps: ApiDependencies = {
      prisma: {
        series: prismaSeries,
        playbackProgress: { findMany: vi.fn().mockResolvedValue([]) },
      } as any,
    };

    app = buildApp(deps);
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'series-hasfile-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('marks an episode as hasFile=true when its fileVariants exist, even if path is null', async () => {
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
          fileVariants: [{ fileSize: 4096 }],
        }],
      }],
    });

    const response = await app.inject({ method: 'GET', url: '/api/series/1' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.seasons[0].episodes[0]).toMatchObject({
      id: 100,
      hasFile: true,
    });
  });

  it('marks an episode as hasFile=true when its path is set even with no variants', async () => {
    const filePath = path.join(tempDir, 's01e02.mkv');
    await fs.writeFile(filePath, 'x');

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
          id: 101,
          seriesId: 1,
          seasonId: 10,
          seasonNumber: 1,
          episodeNumber: 2,
          title: 'Second',
          monitored: true,
          path: filePath,
          fileVariants: [],
        }],
      }],
    });

    const response = await app.inject({ method: 'GET', url: '/api/series/1' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.seasons[0].episodes[0]).toMatchObject({
      id: 101,
      hasFile: true,
    });
  });

  it('marks an episode as hasFile=false when neither path nor variants exist', async () => {
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
          id: 102,
          seriesId: 1,
          seasonId: 10,
          seasonNumber: 1,
          episodeNumber: 3,
          title: 'Third',
          monitored: true,
          path: null,
          fileVariants: [],
        }],
      }],
    });

    const response = await app.inject({ method: 'GET', url: '/api/series/1' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.seasons[0].episodes[0]).toMatchObject({
      id: 102,
      hasFile: false,
    });
  });

  it('omits the raw fileVariants array from the augmented episode payload', async () => {
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
          id: 103,
          seriesId: 1,
          seasonId: 10,
          seasonNumber: 1,
          episodeNumber: 4,
          title: 'Fourth',
          monitored: true,
          path: null,
          fileVariants: [{ fileSize: 1024 }],
        }],
      }],
    });

    const response = await app.inject({ method: 'GET', url: '/api/series/1' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.seasons[0].episodes[0].fileVariants).toBeUndefined();
  });
});