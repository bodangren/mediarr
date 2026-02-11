import type { FastifyInstance } from 'fastify';
import { sendPaginatedSuccess, sendSuccess, parsePaginationParams, paginateArray } from '../contracts';
import { assertFound, assertNoActiveTorrents, parseBoolean, parseIdParam, sortByField } from '../routeUtils';
import { ValidationError } from '../../errors/domainErrors';
import type { ApiDependencies } from '../types';

function filterSeries(
  items: any[],
  query: Record<string, unknown>,
): any[] {
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

export function registerSeriesRoutes(
  app: FastifyInstance,
  deps: ApiDependencies,
): void {
  app.get('/api/series', {
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
    const prismaSeries = (deps.prisma as any).series;
    if (!prismaSeries?.findMany) {
      throw new ValidationError('Series data source is not configured');
    }

    const query = request.query as Record<string, unknown>;
    const pagination = parsePaginationParams(query);

    const allItems = await prismaSeries.findMany({
      include: {
        qualityProfile: true,
        seasons: {
          include: {
            episodes: true,
          },
        },
      },
    });

    const filtered = filterSeries(allItems, query);
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

  app.get('/api/series/:id', {
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
    const id = parseIdParam((request.params as { id: string }).id, 'series');
    const prismaSeries = (deps.prisma as any).series;

    const record = await prismaSeries.findUnique({
      where: { id },
      include: {
        seasons: {
          include: {
            episodes: true,
          },
        },
        qualityProfile: true,
      },
    });

    return sendSuccess(reply, assertFound(record, `Series ${id} not found`));
  });

  app.patch('/api/series/:id/monitored', {
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
    const id = parseIdParam((request.params as { id: string }).id, 'series');
    const body = request.body as { monitored: boolean };

    const updated = deps.mediaService?.setMonitored
      ? await deps.mediaService.setMonitored(id, body.monitored, 'TV')
      : await (deps.prisma as any).series.update({
        where: { id },
        data: {
          monitored: body.monitored,
        },
      });

    return sendSuccess(reply, updated);
  });

  app.delete('/api/series/:id', {
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
    const id = parseIdParam((request.params as { id: string }).id, 'series');
    const body = (request.body ?? {}) as { deleteFiles?: boolean };

    await assertNoActiveTorrents(deps.prisma as any, `series:${id}`);

    if (deps.mediaService?.deleteMedia) {
      await deps.mediaService.deleteMedia(id, 'TV', body.deleteFiles ?? false);
    } else {
      await (deps.prisma as any).series.delete({ where: { id } });
    }

    return sendSuccess(reply, {
      deleted: true,
      id,
    });
  });
}
