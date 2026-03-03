import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerCollectionRoutes } from './collectionRoutes';
import { registerMovieRoutes } from './movieRoutes';

function createCollectionApp(deps: ApiDependencies): FastifyInstance {
  const app = Fastify();
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerCollectionRoutes(app, deps);
  return app;
}

function createMovieApp(deps: ApiDependencies): FastifyInstance {
  const app = Fastify();
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerMovieRoutes(app, deps);
  return app;
}

describe('POST /api/collections — idempotent create', () => {
  let deps: ApiDependencies;
  let app: FastifyInstance;

  beforeEach(() => {
    deps = {
      prisma: {
        collection: {
          findUnique: vi.fn(),
        },
      },
      collectionService: {
        createCollection: vi.fn(),
      },
    } as unknown as ApiDependencies;

    app = createCollectionApp(deps);
  });

  it('creates a new collection and returns 201', async () => {
    (deps.prisma as any).collection.findUnique.mockResolvedValue(null);
    (deps.collectionService as any).createCollection.mockResolvedValue({
      id: 1,
      name: 'John Wick Collection',
      moviesAdded: 0,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/collections',
      body: { tmdbCollectionId: 87359, monitored: true },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.data).toMatchObject({ id: 1, name: 'John Wick Collection' });
    expect((deps.collectionService as any).createCollection).toHaveBeenCalledWith(87359, expect.objectContaining({ monitored: true }));
  });

  it('returns existing collection with 200 instead of 409 when already exists', async () => {
    (deps.prisma as any).collection.findUnique.mockResolvedValue({
      id: 4,
      name: 'John Wick Collection',
      tmdbCollectionId: 87359,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/collections',
      body: { tmdbCollectionId: 87359 },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toMatchObject({ id: 4, name: 'John Wick Collection', moviesAdded: 0 });
    expect((deps.collectionService as any).createCollection).not.toHaveBeenCalled();
  });
});

describe('GET /api/movies/:id/tmdb-collection', () => {
  let deps: ApiDependencies;
  let app: FastifyInstance;

  beforeEach(() => {
    deps = {
      prisma: {
        movie: {
          findUnique: vi.fn(),
        },
      },
      collectionService: {
        detectMovieCollection: vi.fn(),
      },
    } as unknown as ApiDependencies;

    app = createMovieApp(deps);
  });

  it('returns collection info when TMDB detects a collection', async () => {
    (deps.prisma as any).movie.findUnique.mockResolvedValue({ id: 1, tmdbId: 245891 });
    (deps.collectionService as any).detectMovieCollection.mockResolvedValue({
      tmdbCollectionId: 87359,
      name: 'John Wick Collection',
      posterPath: '/poster.jpg',
      backdropPath: null,
    });

    const response = await app.inject({ method: 'GET', url: '/api/movies/1/tmdb-collection' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.collection).toMatchObject({
      tmdbCollectionId: 87359,
      name: 'John Wick Collection',
      posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
    });
  });

  it('returns null collection when movie has no TMDB collection', async () => {
    (deps.prisma as any).movie.findUnique.mockResolvedValue({ id: 1, tmdbId: 12345 });
    (deps.collectionService as any).detectMovieCollection.mockResolvedValue(null);

    const response = await app.inject({ method: 'GET', url: '/api/movies/1/tmdb-collection' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.collection).toBeNull();
  });

  it('returns null collection when movie has no tmdbId', async () => {
    (deps.prisma as any).movie.findUnique.mockResolvedValue({ id: 1, tmdbId: null });

    const response = await app.inject({ method: 'GET', url: '/api/movies/1/tmdb-collection' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.collection).toBeNull();
    expect((deps.collectionService as any).detectMovieCollection).not.toHaveBeenCalled();
  });
});
