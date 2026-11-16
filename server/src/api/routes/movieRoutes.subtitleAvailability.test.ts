import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerMovieRoutes } from './movieRoutes';

function buildApp(deps: ApiDependencies): FastifyInstance {
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerMovieRoutes(app, deps);
  return app;
}

function movie(id: number, title: string, subtitleTracks: Array<{ languageCode: string | null }>) {
  return {
    id,
    title,
    year: 2024,
    monitored: true,
    qualityProfile: null,
    path: null,
    fileVariants: subtitleTracks.length > 0
      ? [{ id: id * 10, mediaType: 'MOVIE', fileSize: 4096, subtitleTracks, missingSubtitles: [] }]
      : [],
  };
}

describe('GET /api/movies — subtitleAvailability', () => {
  let app: FastifyInstance;
  let prismaMovie: any;

  beforeEach(() => {
    prismaMovie = { findMany: vi.fn() };
    app = buildApp({ prisma: { movie: prismaMovie } as any });
  });

  it('reports zh/en availability per movie from its subtitle tracks', async () => {
    prismaMovie.findMany.mockResolvedValue([
      movie(1, 'Dual Subs', [{ languageCode: 'zho' }, { languageCode: 'eng' }]),
      movie(2, 'Chinese Only', [{ languageCode: 'chi' }]),
      movie(3, 'English Only', [{ languageCode: 'en' }]),
      movie(4, 'No Subs', []),
    ]);

    const response = await app.inject({ method: 'GET', url: '/api/movies' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    const byId = new Map<number, any>(body.data.map((item: any) => [item.id, item]));
    expect(byId.get(1).subtitleAvailability).toEqual({ zh: true, en: true });
    expect(byId.get(2).subtitleAvailability).toEqual({ zh: true, en: false });
    expect(byId.get(3).subtitleAvailability).toEqual({ zh: false, en: true });
    expect(byId.get(4).subtitleAvailability).toEqual({ zh: false, en: false });
  });

  it('stays additive: the existing list fields are still present', async () => {
    prismaMovie.findMany.mockResolvedValue([movie(1, 'Alien', [{ languageCode: 'zho' }])]);

    const response = await app.inject({ method: 'GET', url: '/api/movies' });

    const body = JSON.parse(response.body);
    expect(body.data[0]).toMatchObject({
      id: 1,
      title: 'Alien',
      hasFile: true,
      subtitleAvailability: { zh: true, en: false },
    });
  });
});

describe('GET /api/movies/:id — subtitleAvailability', () => {
  let app: FastifyInstance;
  let prismaMovie: any;

  beforeEach(() => {
    prismaMovie = { findUnique: vi.fn() };
    app = buildApp({ prisma: { movie: prismaMovie } as any });
  });

  it('exposes zh/en availability on the movie detail payload', async () => {
    prismaMovie.findUnique.mockResolvedValue({
      id: 5,
      title: 'Matrix',
      year: 1999,
      tmdbId: 603,
      qualityProfile: null,
      collection: null,
      path: null,
      fileVariants: [
        {
          id: 1,
          mediaType: 'MOVIE',
          movieId: 5,
          fileSize: 4096,
          audioTracks: [],
          subtitleTracks: [{ languageCode: 'zho' }, { languageCode: 'eng' }],
          missingSubtitles: [],
        },
      ],
    });

    const response = await app.inject({ method: 'GET', url: '/api/movies/5' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toMatchObject({
      id: 5,
      hasFile: true,
      subtitleAvailability: { zh: true, en: true },
    });
  });

  it('reports both false when the movie has no subtitle tracks', async () => {
    prismaMovie.findUnique.mockResolvedValue({
      id: 6,
      title: 'Missing',
      year: 2020,
      tmdbId: 999,
      qualityProfile: null,
      collection: null,
      path: null,
      fileVariants: [],
    });

    const response = await app.inject({ method: 'GET', url: '/api/movies/6' });

    const body = JSON.parse(response.body);
    expect(body.data.subtitleAvailability).toEqual({ zh: false, en: false });
  });
});
