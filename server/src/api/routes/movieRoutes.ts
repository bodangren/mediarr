import type { FastifyInstance } from 'fastify';
import { sendPaginatedSuccess, sendSuccess, parsePaginationParams, paginateArray } from '../contracts';
import { assertFound, assertNoActiveTorrents, parseBoolean, parseIdParam, sortByField } from '../routeUtils';
import { ValidationError } from '../../errors/domainErrors';
import type { ApiDependencies } from '../types';
import { MovieOrganizeService, DEFAULT_MEDIA_MANAGEMENT_SETTINGS } from '../../services/MovieOrganizeService';
import { FilenameParsingService } from '../../services/FilenameParsingService';
import { MovieRepository, type BulkMovieChanges } from '../../repositories/MovieRepository';
import fs from 'node:fs/promises';
import path from 'node:path';

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
        fileVariants: true,
      },
    });

    const filtered = filterMovies(allItems, query);
    const sortField = pagination.sortBy && ['title', 'year', 'status', 'added'].includes(pagination.sortBy)
      ? pagination.sortBy
      : 'title';
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
          },
        },
      },
    });

    return sendSuccess(reply, assertFound(movie, `Movie ${id} not found`));
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
    },
  }, async (request, reply) => {
    const id = parseIdParam((request.params as { id: string }).id, 'movie');
    const body = (request.body ?? {}) as { deleteFiles?: boolean };

    await assertNoActiveTorrents(deps.prisma as any, `movie:${id}`);

    if (deps.mediaService?.deleteMedia) {
      await deps.mediaService.deleteMedia(id, 'MOVIE', body.deleteFiles ?? false);
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
