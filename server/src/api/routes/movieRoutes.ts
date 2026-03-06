import type { FastifyInstance } from 'fastify';
import { sendPaginatedSuccess, sendSuccess, parsePaginationParams, paginateArray } from '../contracts';
import { assertFound, parseBoolean, parseIdParam, sortByField } from '../routeUtils';
import { ValidationError } from '../../errors/domainErrors';
import type { ApiDependencies } from '../types';
import { MovieOrganizeService, DEFAULT_MEDIA_MANAGEMENT_SETTINGS } from '../../services/MovieOrganizeService';
import { FilenameParsingService } from '../../services/FilenameParsingService';
import { MovieRepository, type BulkMovieChanges } from '../../repositories/MovieRepository';
import type { SearchParams } from '../../services/MediaSearchService';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { PlaybackProgress } from '@prisma/client';

function latestPlaybackMap(records: PlaybackProgress[]): Map<number, PlaybackProgress> {
  const result = new Map<number, PlaybackProgress>();
  for (const record of records) {
    if (!result.has(record.mediaId)) {
      result.set(record.mediaId, record);
    }
  }
  return result;
}

function serializePlaybackState(progress: PlaybackProgress | null | undefined) {
  if (!progress) {
    return null;
  }

  return {
    position: progress.position,
    duration: progress.duration,
    progress: progress.progress,
    isWatched: progress.isWatched,
    lastWatched: progress.lastWatched.toISOString(),
  };
}

function filterMovies(items: any[], query: Record<string, unknown>): any[] {
  const monitored =
    typeof query.monitored === 'string' || typeof query.monitored === 'boolean'
      ? parseBoolean(query.monitored)
      : undefined;
  const status =
    typeof query.status === 'string' && query.status.trim().length > 0
      ? query.status.toLowerCase()
      : undefined;
  const search =
    typeof query.search === 'string' && query.search.trim().length > 0
      ? query.search.toLowerCase()
      : undefined;

  return items.filter(item => {
    if (monitored !== undefined && item.monitored !== monitored) {
      return false;
    }

    if (status && String(item.status ?? '').toLowerCase() !== status) {
      return false;
    }

    if (search && !String(item.title ?? '').toLowerCase().includes(search)) {
      return false;
    }

    return true;
  });
}

export function registerMovieRoutes(
  app: FastifyInstance,
  deps: ApiDependencies,
): void {
  app.get('/api/movies', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: ['number', 'string'] },
          pageSize: { type: ['number', 'string'] },
          sortBy: { type: 'string' },
          sortDir: { type: 'string' },
          status: { type: 'string' },
          monitored: { type: ['boolean', 'string'] },
          search: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const prismaMovies = (deps.prisma as any).movie;
    if (!prismaMovies?.findMany) {
      throw new ValidationError('Movie data source is not configured');
    }

    const query = request.query as Record<string, unknown>;
    const pagination = parsePaginationParams(query);

    const allItems = await prismaMovies.findMany({
      include: {
        qualityProfile: true,
        fileVariants: {
          include: {
            subtitleTracks: {
              select: {
                languageCode: true,
                isForced: true,
                isHi: true,
                filePath: true,
              },
            },
            missingSubtitles: {
              select: {
                languageCode: true,
                isForced: true,
                isHi: true,
              },
            },
          },
        },
      },
    });

    const itemsWithSize = allItems.map((movie: any) => ({
      ...movie,
      sizeOnDisk: (movie.fileVariants ?? []).reduce(
        (sum: number, v: any) => sum + Number(v.fileSize ?? 0),
        0,
      ),
    }));
    const movieIds = itemsWithSize.map((movie: any) => movie.id);
    const playbackRows = movieIds.length > 0 && (deps.prisma as any).playbackProgress?.findMany
      ? await (deps.prisma as any).playbackProgress.findMany({
          where: {
            mediaType: 'MOVIE',
            mediaId: { in: movieIds },
          },
          orderBy: [
            { lastWatched: 'desc' },
            { updatedAt: 'desc' },
            { id: 'desc' },
          ],
        })
      : [];
    const playbackMap = latestPlaybackMap(playbackRows);
    const itemsWithPlayback = itemsWithSize.map((movie: any) => ({
      ...movie,
      playbackState: serializePlaybackState(playbackMap.get(movie.id)),
    }));

    const filtered = filterMovies(itemsWithPlayback, query);
    const sortField = pagination.sortBy && ['title', 'year', 'status', 'added', 'sizeOnDisk'].includes(pagination.sortBy)
      ? (pagination.sortBy === 'title' ? 'sortTitle' : pagination.sortBy)
      : 'sortTitle';
    const sortDirection = pagination.sortDir ?? 'asc';

    const sorted = sortByField(filtered, sortField, sortDirection);
    const paged = paginateArray(sorted, pagination.page, pagination.pageSize);

    return sendPaginatedSuccess(reply, paged.items, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalCount: paged.totalCount,
    });
  });

  app.get('/api/movies/:id', {
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
    const id = parseIdParam((request.params as { id: string }).id, 'movie');

    const movie = await (deps.prisma as any).movie.findUnique({
      where: { id },
      include: {
        qualityProfile: true,
        fileVariants: {
          include: {
            audioTracks: true,
            subtitleTracks: true,
            missingSubtitles: true,
          },
        },
        collection: {
          select: {
            id: true,
            name: true,
            posterPath: true,
          },
        },
      },
    });

    const found = assertFound(movie, `Movie ${id} not found`);
    const playbackState = (deps.prisma as any).playbackProgress?.findFirst
      ? await (deps.prisma as any).playbackProgress.findFirst({
          where: {
            mediaType: 'MOVIE',
            mediaId: found.id,
          },
          orderBy: [
            { lastWatched: 'desc' },
            { updatedAt: 'desc' },
            { id: 'desc' },
          ],
        })
      : null;
    const sizeOnDisk = (found.fileVariants ?? []).reduce(
      (sum: number, v: any) => sum + Number(v.fileSize ?? 0),
      0,
    );

    const collection = found.collection
      ? {
          id: found.collection.id,
          name: found.collection.name,
          posterUrl: found.collection.posterPath
            ? `https://image.tmdb.org/t/p/w500${found.collection.posterPath}`
            : null,
        }
      : null;

    return sendSuccess(reply, {
      ...found,
      sizeOnDisk,
      collection,
      playbackState: serializePlaybackState(playbackState),
    });
  });

  // PUT /api/movies/:id - Update movie metadata/settings
  app.put('/api/movies/:id', {
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
          monitored: { type: 'boolean' },
          qualityProfileId: { type: 'number' },
          path: { type: 'string' },
          title: { type: 'string' },
          titleSlug: { type: 'string' },
          overview: { type: 'string' },
          studio: { type: 'string' },
          certification: { type: 'string' },
          genres: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    const id = parseIdParam((request.params as { id: string }).id, 'movie');
    const body = request.body as {
      monitored?: boolean;
      qualityProfileId?: number;
      path?: string;
      title?: string;
      titleSlug?: string;
      overview?: string;
      studio?: string;
      certification?: string;
      genres?: string[];
    };

    const movie = await (deps.prisma as any).movie.findUnique({ where: { id } });
    assertFound(movie, `Movie ${id} not found`);

    const updateData: Record<string, unknown> = {};
    if (body.monitored !== undefined) updateData.monitored = body.monitored;
    if (body.qualityProfileId !== undefined) updateData.qualityProfileId = body.qualityProfileId;
    if (body.path !== undefined) updateData.path = body.path;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.titleSlug !== undefined) updateData.titleSlug = body.titleSlug;
    if (body.overview !== undefined) updateData.overview = body.overview;
    if (body.studio !== undefined) updateData.studio = body.studio;
    if (body.certification !== undefined) updateData.certification = body.certification;
    if (body.genres !== undefined) updateData.genres = body.genres;

    const updated = await (deps.prisma as any).movie.update({
      where: { id },
      data: updateData,
    });

    return sendSuccess(reply, updated);
  });

  // GET /api/movies/:id/tmdb-collection - Detect TMDB collection for a movie
  app.get('/api/movies/:id/tmdb-collection', {
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
    const id = parseIdParam((request.params as { id: string }).id, 'movie');

    const movie = await (deps.prisma as any).movie.findUnique({
      where: { id },
      select: { id: true, tmdbId: true },
    });

    assertFound(movie, `Movie ${id} not found`);

    if (!movie.tmdbId) {
      return sendSuccess(reply, { collection: null });
    }

    if (!deps.collectionService) {
      return sendSuccess(reply, { collection: null });
    }

    const detected = await deps.collectionService.detectMovieCollection(movie.tmdbId);

    if (!detected) {
      return sendSuccess(reply, { collection: null });
    }

    return sendSuccess(reply, {
      collection: {
        tmdbCollectionId: detected.tmdbCollectionId,
        name: detected.name,
        posterUrl: detected.posterPath ? `https://image.tmdb.org/t/p/w500${detected.posterPath}` : null,
      },
    });
  });

  app.post('/api/movies/:id/search', {
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
          query: { type: 'string' },
          title: { type: 'string' },
          year: { type: 'number', minimum: 1900, maximum: 2100 },
          tmdbId: { type: 'number' },
          imdbId: { type: 'string' },
          qualityProfileId: { type: 'number', minimum: 1 },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1 },
          pageSize: { type: 'number', minimum: 1, maximum: 100 },
          sortBy: { type: 'string' },
          sortDir: { type: 'string', enum: ['asc', 'desc'] },
        },
      },
    },
  }, async (request, reply) => {
    const searchAllIndexers = deps.searchAggregationService?.searchAllIndexers
      ?? deps.mediaSearchService?.searchAllIndexers;
    if (!searchAllIndexers) {
      throw new ValidationError('Search aggregation service is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'movie');
    const body = (request.body ?? {}) as {
      query?: string;
      title?: string;
      year?: number;
      tmdbId?: number;
      imdbId?: string;
      qualityProfileId?: number;
    };
    const pagination = parsePaginationParams(request.query as Record<string, unknown>);
    const prisma = deps.prisma as any;
    if (!prisma.movie?.findUnique) {
      throw new ValidationError('Movie search data source is not configured');
    }

    const movie = await prisma.movie.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        year: true,
        tmdbId: true,
        imdbId: true,
        qualityProfileId: true,
      },
    });
    if (!movie) {
      throw new ValidationError(`Movie ${id} not found`);
    }

    const searchParams: SearchParams = {
      type: 'movie',
      query: body.query,
      title: body.title ?? movie.title,
      qualityProfileId: body.qualityProfileId ?? movie.qualityProfileId ?? undefined,
    };
    if (body.year !== undefined) {
      searchParams.year = body.year;
    } else if (typeof movie.year === 'number') {
      searchParams.year = movie.year;
    }

    if (body.tmdbId !== undefined) {
      searchParams.tmdbId = body.tmdbId;
    } else if (typeof movie.tmdbId === 'number') {
      searchParams.tmdbId = movie.tmdbId;
    }

    if (body.imdbId) {
      searchParams.imdbId = body.imdbId;
    } else if (typeof movie.imdbId === 'string' && movie.imdbId.length > 0) {
      searchParams.imdbId = movie.imdbId;
    }

    const result = deps.searchAggregationService?.searchAllIndexers 
      ? await deps.searchAggregationService.searchAllIndexers(searchParams)
      : await deps.mediaSearchService!.searchAllIndexers(searchParams);
    const { items, totalCount } = paginateArray(
      result.releases,
      pagination.page,
      pagination.pageSize,
    );

    return sendPaginatedSuccess(reply, items, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalCount,
    });
  });

  app.patch('/api/movies/:id/monitored', {
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
        required: ['monitored'],
        properties: {
          monitored: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    const id = parseIdParam((request.params as { id: string }).id, 'movie');
    const body = request.body as { monitored: boolean };

    const updated = deps.mediaService?.setMonitored
      ? await deps.mediaService.setMonitored(id, body.monitored, 'MOVIE')
      : await (deps.prisma as any).movie.update({
        where: { id },
        data: {
          monitored: body.monitored,
        },
      });

    return sendSuccess(reply, updated);
  });

  app.delete('/api/movies/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          deleteFiles: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const id = parseIdParam((request.params as { id: string }).id, 'movie');
    // deleteFiles can arrive as a query param (preferred for DELETE) or body fallback
    const query = request.query as Record<string, string | undefined>;
    const body = (request.body ?? {}) as Record<string, unknown>;
    const deleteFiles = query.deleteFiles === 'true' || body.deleteFiles === true;

    if (deps.mediaService?.deleteMedia) {
      await deps.mediaService.deleteMedia(id, 'MOVIE', deleteFiles);
    } else {
      await (deps.prisma as any).movie.delete({
        where: {
          id,
        },
      });
    }

    return sendSuccess(reply, {
      deleted: true,
      id,
    });
  });

  // =====================
  // Bulk Update Routes
  // =====================

  // Bulk update multiple movies
  app.put('/api/movies/bulk', {
    schema: {
      body: {
        type: 'object',
        required: ['movieIds', 'changes'],
        properties: {
          movieIds: {
            type: 'array',
            items: { type: 'number' },
            minItems: 1,
          },
          changes: {
            type: 'object',
            properties: {
              qualityProfileId: { type: 'number' },
              monitored: { type: 'boolean' },
              minimumAvailability: { type: 'string' },
              path: { type: 'string' },
              addTags: {
                type: 'array',
                items: { type: 'string' },
              },
              removeTags: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const body = request.body as {
      movieIds: number[];
      changes: BulkMovieChanges;
    };

    const movieRepo = new MovieRepository(deps.prisma as any);
    const result = await movieRepo.bulkUpdate(body.movieIds, body.changes);

    return sendSuccess(reply, result);
  });

  // Get root folders from existing movies
  app.get('/api/movies/root-folders', async (_request, reply) => {
    const movieRepo = new MovieRepository(deps.prisma as any);
    const rootFolders = await movieRepo.getDistinctRootFolders();

    return sendSuccess(reply, { rootFolders });
  });

  // =====================
  // Organize/Rename Routes
  // =====================

  // Preview rename for selected movies
  app.post('/api/movies/organize/preview', {
    schema: {
      body: {
        type: 'object',
        required: ['movieIds'],
        properties: {
          movieIds: {
            type: 'array',
            items: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const body = request.body as { movieIds: number[] };

    const organizeService = new MovieOrganizeService(
      deps.prisma,
      DEFAULT_MEDIA_MANAGEMENT_SETTINGS
    );

    const previews = await organizeService.previewRename(body.movieIds);

    return sendSuccess(reply, { previews });
  });

  // Apply rename for selected movies
  app.put('/api/movies/organize/apply', {
    schema: {
      body: {
        type: 'object',
        required: ['movieIds'],
        properties: {
          movieIds: {
            type: 'array',
            items: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const body = request.body as { movieIds: number[] };

    const organizeService = new MovieOrganizeService(
      deps.prisma,
      DEFAULT_MEDIA_MANAGEMENT_SETTINGS
    );

    const result = await organizeService.applyRename(body.movieIds);

    return sendSuccess(reply, result);
  });

  // =====================
  // Interactive Import Routes
  // =====================

  // Scan a directory for movie files
  app.post('/api/movies/import/scan', {
    schema: {
      body: {
        type: 'object',
        required: ['path'],
        properties: {
          path: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const body = request.body as { path: string };

    // Validate path exists
    try {
      const stat = await fs.stat(body.path);
      if (!stat.isDirectory()) {
        throw new ValidationError('Path is not a directory');
      }
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new ValidationError('Path does not exist or is not accessible');
    }

    const parsingService = new FilenameParsingService(deps.prisma);
    const files = await parsingService.scanAndMatch(body.path);

    return sendSuccess(reply, { files });
  });

  // Apply import for selected files
  app.post('/api/movies/import/apply', {
    schema: {
      body: {
        type: 'object',
        required: ['files'],
        properties: {
          files: {
            type: 'array',
            items: {
              type: 'object',
              required: ['path', 'movieId'],
              properties: {
                path: { type: 'string' },
                movieId: { type: 'number' },
                quality: { type: 'string' },
                language: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const body = request.body as {
      files: Array<{
        path: string;
        movieId: number;
        quality?: string;
        language?: string;
      }>;
    };

    let imported = 0;
    let failed = 0;
    const errors: Array<{ path: string; error: string }> = [];

    for (const file of body.files) {
      try {
        // Get the movie to find its root path
        const movie = await (deps.prisma as any).movie.findUnique({
          where: { id: file.movieId },
        });

        if (!movie || !movie.path) {
          failed++;
          errors.push({ path: file.path, error: 'Movie not found or has no path' });
          continue;
        }

        // Build destination path
        const extension = path.extname(file.path);
        const movieFolderName = `${movie.title} (${movie.year})`;
        const destDir = path.join(movie.path, movieFolderName);
        const destFilename = `${movieFolderName}${extension}`;
        const destPath = path.join(destDir, destFilename);

        // Ensure destination directory exists
        await fs.mkdir(destDir, { recursive: true });

        // Move the file
        await fs.rename(file.path, destPath);

        // Get file size
        const stat = await fs.stat(destPath);

        // Create file variant in database
        await (deps.prisma as any).mediaFileVariant.create({
          data: {
            mediaType: 'MOVIE',
            movieId: movie.id,
            path: destPath,
            fileSize: stat.size,
            quality: file.quality || null,
          },
        });

        // Update movie hasFile status
        await (deps.prisma as any).movie.update({
          where: { id: movie.id },
          data: { hasFile: true },
        });

        imported++;
      } catch (error) {
        failed++;
        errors.push({
          path: file.path,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return sendSuccess(reply, { imported, failed, errors });
  });
}
