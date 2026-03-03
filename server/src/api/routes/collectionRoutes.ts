import type { FastifyInstance } from 'fastify';
import { sendSuccess, sendPaginatedSuccess, parsePaginationParams } from '../contracts';
import { assertFound, parseIdParam } from '../routeUtils';
import { NotFoundError, ValidationError, ConflictError } from '../../errors/domainErrors';
import type { ApiDependencies } from '../types';

export function registerCollectionRoutes(
  app: FastifyInstance,
  deps: ApiDependencies,
): void {
  // GET /api/collections - List all collections
  app.get('/api/collections', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: ['number', 'string'] },
          pageSize: { type: ['number', 'string'] },
        },
      },
    },
  }, async (request, reply) => {
    const prismaCollections = (deps.prisma as any).collection;
    if (!prismaCollections?.findMany) {
      throw new ValidationError('Collection data source is not configured');
    }

    const query = request.query as Record<string, unknown>;
    const pagination = parsePaginationParams(query);

    const collections = await prismaCollections.findMany({
      include: {
        _count: {
          select: { movies: true },
        },
        movies: {
          select: {
            id: true,
            fileVariants: {
              select: { id: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const items = collections.map((collection: any) => ({
      id: collection.id,
      tmdbCollectionId: collection.tmdbCollectionId,
      name: collection.name,
      overview: collection.overview,
      posterUrl: collection.posterPath
        ? `https://image.tmdb.org/t/p/w500${collection.posterPath}`
        : null,
      backdropUrl: collection.backdropPath
        ? `https://image.tmdb.org/t/p/w1280${collection.backdropPath}`
        : null,
      monitored: collection.monitored,
      movieCount: collection._count.movies,
      moviesInLibrary: collection.movies.filter((m: any) => m.fileVariants.length > 0).length,
      qualityProfileId: collection.qualityProfileId,
      rootFolderPath: collection.rootFolderPath,
      minimumAvailability: collection.minimumAvailability,
    }));

    return sendSuccess(reply, items);
  });

  // GET /api/collections/:id - Get single collection with movies
  app.get('/api/collections/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const id = parseIdParam((request.params as { id: string }).id, 'collection');

    const collection = await (deps.prisma as any).collection?.findUnique({
      where: { id },
      include: {
        qualityProfile: {
          select: {
            id: true,
            name: true,
          },
        },
        movies: {
          select: {
            id: true,
            tmdbId: true,
            title: true,
            year: true,
            overview: true,
            status: true,
            monitored: true,
            fileVariants: {
              select: {
                quality: true,
              },
              take: 1,
            },
          },
          orderBy: { year: 'asc' },
        },
      },
    });

    if (!collection) {
      throw new NotFoundError(`Collection ${id} not found`);
    }

    const movies = collection.movies.map((movie: any) => ({
      id: movie.id,
      tmdbId: movie.tmdbId,
      title: movie.title,
      year: movie.year,
      overview: movie.overview,
      status: movie.status,
      monitored: movie.monitored,
      inLibrary: movie.fileVariants.length > 0,
      quality: movie.fileVariants[0]?.quality ?? null,
    }));

    return sendSuccess(reply, {
      id: collection.id,
      tmdbCollectionId: collection.tmdbCollectionId,
      name: collection.name,
      overview: collection.overview,
      posterUrl: collection.posterPath
        ? `https://image.tmdb.org/t/p/w500${collection.posterPath}`
        : null,
      backdropUrl: collection.backdropPath
        ? `https://image.tmdb.org/t/p/w1280${collection.backdropPath}`
        : null,
      monitored: collection.monitored,
      qualityProfileId: collection.qualityProfileId,
      qualityProfile: collection.qualityProfile,
      rootFolderPath: collection.rootFolderPath,
      addMoviesAutomatically: collection.addMoviesAutomatically,
      searchOnAdd: collection.searchOnAdd,
      minimumAvailability: collection.minimumAvailability,
      movies,
      movieCount: movies.length,
      moviesInLibrary: movies.filter((m: any) => m.inLibrary).length,
    });
  });

  // POST /api/collections - Create collection from TMDB ID
  app.post('/api/collections', {
    schema: {
      body: {
        type: 'object',
        required: ['tmdbCollectionId'],
        properties: {
          tmdbCollectionId: { type: 'number' },
          monitored: { type: 'boolean' },
          qualityProfileId: { type: 'number' },
          rootFolderPath: { type: 'string' },
          addMoviesAutomatically: { type: 'boolean' },
          searchOnAdd: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    const body = request.body as {
      tmdbCollectionId: number;
      monitored?: boolean;
      qualityProfileId?: number;
      rootFolderPath?: string;
      addMoviesAutomatically?: boolean;
      searchOnAdd?: boolean;
    };

    // Check if collection already exists — return it rather than erroring so
    // callers can safely retry (e.g. after a failed sync) without getting stuck.
    const existing = await (deps.prisma as any).collection?.findUnique({
      where: { tmdbCollectionId: body.tmdbCollectionId },
    });

    if (existing) {
      return sendSuccess(reply, { id: existing.id, name: existing.name, moviesAdded: 0 }, 200);
    }

    // Use collection service to fetch from TMDB and create
    const result = await deps.collectionService?.createCollection(body.tmdbCollectionId, {
      monitored: body.monitored,
      qualityProfileId: body.qualityProfileId,
      rootFolderPath: body.rootFolderPath,
      addMoviesAutomatically: body.addMoviesAutomatically,
      searchOnAdd: body.searchOnAdd,
    });

    return sendSuccess(reply, result, 201);
  });

  // PUT /api/collections/:id - Update collection settings
  app.put('/api/collections/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          overview: { type: ['string', 'null'] },
          monitored: { type: 'boolean' },
          qualityProfileId: { type: ['number', 'null'] },
          rootFolderPath: { type: ['string', 'null'] },
          addMoviesAutomatically: { type: 'boolean' },
          searchOnAdd: { type: 'boolean' },
          minimumAvailability: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const id = parseIdParam((request.params as { id: string }).id, 'collection');
    const body = request.body as Record<string, unknown>;

    const existing = await (deps.prisma as any).collection?.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError(`Collection ${id} not found`);
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.overview !== undefined) updateData.overview = body.overview;
    if (body.monitored !== undefined) updateData.monitored = body.monitored;
    if (body.qualityProfileId !== undefined) updateData.qualityProfileId = body.qualityProfileId;
    if (body.rootFolderPath !== undefined) updateData.rootFolderPath = body.rootFolderPath;
    if (body.addMoviesAutomatically !== undefined) updateData.addMoviesAutomatically = body.addMoviesAutomatically;
    if (body.searchOnAdd !== undefined) updateData.searchOnAdd = body.searchOnAdd;
    if (body.minimumAvailability !== undefined) updateData.minimumAvailability = body.minimumAvailability;

    const updated = await (deps.prisma as any).collection?.update({
      where: { id },
      data: updateData,
    });

    return sendSuccess(reply, updated);
  });

  // DELETE /api/collections/:id - Delete collection (keeps movies)
  app.delete('/api/collections/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const id = parseIdParam((request.params as { id: string }).id, 'collection');

    const existing = await (deps.prisma as any).collection?.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError(`Collection ${id} not found`);
    }

    // Remove collectionId from all movies first
    await (deps.prisma as any).movie?.updateMany({
      where: { collectionId: id },
      data: { collectionId: null },
    });

    // Delete the collection
    await (deps.prisma as any).collection?.delete({
      where: { id },
    });

    return sendSuccess(reply, { id, deleted: true });
  });

  // POST /api/collections/:id/search - Trigger search for missing movies
  app.post('/api/collections/:id/search', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const id = parseIdParam((request.params as { id: string }).id, 'collection');

    const existing = await (deps.prisma as any).collection?.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError(`Collection ${id} not found`);
    }

    // Use collection service to search missing movies
    const result = await deps.collectionService?.searchMissingMovies(id);

    return sendSuccess(reply, {
      id,
      message: `Searching for ${result?.missing ?? 0} missing movies`,
      searched: result?.searched ?? 0,
      missing: result?.missing ?? 0,
    });
  });

  // POST /api/collections/:id/sync - Sync collection movies from TMDB
  app.post('/api/collections/:id/sync', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const id = parseIdParam((request.params as { id: string }).id, 'collection');

    const existing = await (deps.prisma as any).collection?.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError(`Collection ${id} not found`);
    }

    // Use collection service to sync movies from TMDB
    const result = await deps.collectionService?.syncCollectionMovies(id);

    return sendSuccess(reply, {
      id,
      message: `Added ${result?.added ?? 0} new movies, updated ${result?.updated ?? 0} movies`,
      added: result?.added ?? 0,
      updated: result?.updated ?? 0,
    });
  });
}
