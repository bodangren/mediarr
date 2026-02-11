import type { FastifyInstance } from 'fastify';
import { sendPaginatedSuccess, sendSuccess, parsePaginationParams, paginateArray } from '../contracts';
import { assertFound, assertNoActiveTorrents, parseBoolean, parseIdParam, sortByField } from '../routeUtils';
import { ValidationError } from '../../errors/domainErrors';
import type { ApiDependencies } from '../types';

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
}
