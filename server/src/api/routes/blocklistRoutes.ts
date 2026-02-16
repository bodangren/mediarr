/**
 * Blocklist API Routes
 *
 * Manages blocked releases that should not be downloaded.
 * Blocklist entries are created when a release fails to download or is rejected.
 *
 * @module routes/blocklist
 */
import type { FastifyInstance } from 'fastify';
import type { Blocklist } from '@prisma/client';
import { ValidationError } from '../../errors/domainErrors';
import {
  parsePaginationParams,
  sendPaginatedSuccess,
  sendSuccess,
} from '../contracts';
import type { ApiDependencies } from '../types';

/** Blocklist item as returned by the API */
interface BlocklistListItem {
  id: number;
  seriesId: number | null;
  seriesTitle: string;
  episodeId: number | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  releaseTitle: string;
  quality: string | null;
  dateBlocked: string;
  reason: string;
  indexer: string | null;
  size: number | null;
}

function toBlocklistListItem(item: Blocklist): BlocklistListItem {
  return {
    id: item.id,
    seriesId: item.seriesId,
    seriesTitle: item.seriesTitle,
    episodeId: item.episodeId,
    seasonNumber: item.seasonNumber,
    episodeNumber: item.episodeNumber,
    releaseTitle: item.releaseTitle,
    quality: item.quality,
    dateBlocked: item.dateBlocked.toISOString(),
    reason: item.reason,
    indexer: item.indexer,
    size: item.size !== null ? Number(item.size) : null,
  };
}

/**
 * Register blocklist routes on the Fastify instance
 * @param app - Fastify application instance
 * @param deps - API dependencies including Prisma client
 */
export function registerBlocklistRoutes(
  app: FastifyInstance,
  deps: ApiDependencies,
): void {
  /**
   * GET /api/blocklist
   * Returns paginated list of blocked releases
   *
   * Query Parameters:
   * - page: number (default: 1)
   * - pageSize: number (default: 25)
   * - seriesId: number - Filter by series ID (optional)
   * - sortBy: string - Field to sort by (default: 'dateBlocked')
   * - sortDir: 'asc' | 'desc' - Sort direction (default: 'desc')
   */
  app.get('/api/blocklist', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', default: 1 },
          pageSize: { type: 'number', default: 25 },
          seriesId: { type: 'number', description: 'Filter by series ID' },
          sortBy: { type: 'string', description: 'Sort field' },
          sortDir: { type: 'string', enum: ['asc', 'desc'], description: 'Sort direction' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.prisma?.blocklist) {
      throw new ValidationError('Blocklist repository is not configured');
    }

    const query = request.query as Record<string, unknown>;
    const { page, pageSize, sortBy, sortDir } = parsePaginationParams(query);

    const seriesId = typeof query.seriesId === 'number'
      ? query.seriesId
      : typeof query.seriesId === 'string'
        ? Number.parseInt(query.seriesId, 10)
        : undefined;

    const result = await deps.prisma.blocklist.findMany({
      where: seriesId !== undefined && !Number.isNaN(seriesId) ? { seriesId } : undefined,
      orderBy: { [sortBy ?? 'dateBlocked']: sortDir ?? 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const total = await deps.prisma.blocklist.count({
      where: seriesId !== undefined && !Number.isNaN(seriesId) ? { seriesId } : undefined,
    });

    const items = result.map(toBlocklistListItem);

    return sendPaginatedSuccess(reply, items, {
      page,
      pageSize,
      totalCount: total,
    });
  });

  app.delete('/api/blocklist/remove', {
    schema: {
      body: {
        type: 'object',
        required: ['ids'],
        properties: {
          ids: {
            type: 'array',
            items: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.prisma?.blocklist) {
      throw new ValidationError('Blocklist repository is not configured');
    }

    const body = request.body as { ids: number[] };

    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return sendSuccess(reply, { deletedCount: 0 });
    }

    const result = await deps.prisma.blocklist.deleteMany({
      where: {
        id: { in: body.ids },
      },
    });

    return sendSuccess(reply, { deletedCount: result.count });
  });

  app.delete('/api/blocklist/clear', async (_request, reply) => {
    if (!deps.prisma?.blocklist) {
      throw new ValidationError('Blocklist repository is not configured');
    }

    const result = await deps.prisma.blocklist.deleteMany();

    return sendSuccess(reply, { deletedCount: result.count });
  });

  // Single item delete endpoint (as per task requirements)
  app.delete('/api/blocklist/:id', {
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
    if (!deps.prisma?.blocklist) {
      throw new ValidationError('Blocklist repository is not configured');
    }

    const params = request.params as { id: string };
    const id = Number.parseInt(params.id, 10);

    if (Number.isNaN(id) || id <= 0) {
      throw new ValidationError('Invalid blocklist item id');
    }

    const result = await deps.prisma.blocklist.deleteMany({
      where: { id },
    });

    return sendSuccess(reply, { deleted: result.count > 0, id });
  });
}
