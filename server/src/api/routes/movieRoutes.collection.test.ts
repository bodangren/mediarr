import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerMovieRoutes } from './movieRoutes';

function createApp(deps: ApiDependencies): FastifyInstance {
  const app = Fastify();
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerMovieRoutes(app, deps);
  return app;
}

describe('GET /api/movies/:id — collection data', () => {
  let deps: ApiDependencies;
  let app: FastifyInstance;

  beforeEach(() => {
    deps = {
      prisma: {
        movie: {
          findUnique: vi.fn().mockResolvedValue({
            id: 1,
            title: 'The Matrix',
            year: 1999,
            tmdbId: 603,
            qualityProfile: { id: 1, name: 'HD-1080p' },
            fileVariants: [],
            collection: {
              id: 10,
              tmdbCollectionId: 87359,
              name: 'The Matrix Collection',
              posterPath: '/poster.jpg',
            },
          }),
        },
      },
    } as unknown as ApiDependencies;

    app = createApp(deps);
  });

  it('includes collection data when movie belongs to a collection', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/movies/1' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.collection).toMatchObject({
      id: 10,
      name: 'The Matrix Collection',
      posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
    });
  });

  it('returns null collection when movie has no collection', async () => {
    (deps.prisma as any).movie.findUnique.mockResolvedValue({
      id: 2,
      title: 'A Movie',
      year: 2020,
      tmdbId: 999,
      qualityProfile: null,
      fileVariants: [],
      collection: null,
    });

    const response = await app.inject({ method: 'GET', url: '/api/movies/2' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.collection).toBeNull();
  });
});
