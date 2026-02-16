import type { FastifyInstance } from 'fastify';
import { sendPaginatedSuccess, sendSuccess, parsePaginationParams, paginateArray } from '../contracts';
import { assertFound, assertNoActiveTorrents, parseBoolean, parseIdParam, sortByField } from '../routeUtils';
import { ValidationError } from '../../errors/domainErrors';
import type { ApiDependencies } from '../types';

// Calendar episode status type
type CalendarEpisodeStatus = 'downloaded' | 'missing' | 'airing' | 'unaired';

// Response type for calendar endpoint
interface CalendarEpisode {
  id: number;
  seriesId: number;
  seriesTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  episodeTitle: string;
  airDate: string;
  airTime?: string;
  status: CalendarEpisodeStatus;
  hasFile: boolean;
  monitored: boolean;
}

// Determine episode status based on air date and file presence
function determineEpisodeStatus(airDateUtc: Date | null, hasFile: boolean): CalendarEpisodeStatus {
  if (hasFile) {
    return 'downloaded';
  }

  if (!airDateUtc) {
    return 'unaired';
  }

  const now = new Date();
  const airDate = new Date(airDateUtc);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const airDay = new Date(airDate.getFullYear(), airDate.getMonth(), airDate.getDate());

  if (airDay.getTime() === today.getTime()) {
    return 'airing';
  }

  if (airDate < now) {
    return 'missing';
  }

  return 'unaired';
}

// Format date to ISO date string (YYYY-MM-DD)
function formatAirDate(date: Date | null): string {
  if (!date) return '';
  return date.toISOString().split('T')[0] ?? '';
}

// Format time to HH:mm string
function formatAirTime(date: Date | null): string | undefined {
  if (!date) return undefined;
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

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

  app.patch('/api/episodes/:id', {
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
    const id = parseIdParam((request.params as { id: string }).id, 'episode');
    const body = request.body as { monitored: boolean };

    const updated = deps.mediaService?.setEpisodeMonitored
      ? await deps.mediaService.setEpisodeMonitored(id, body.monitored)
      : await (deps.prisma as any).episode.update({
        where: { id },
        data: { monitored: body.monitored },
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

  /**
   * GET /api/calendar
   * Returns episodes airing within a specified date range.
   *
   * Query Parameters:
   * - start: ISO 8601 date string (YYYY-MM-DD) - Start of date range (required)
   * - end: ISO 8601 date string (YYYY-MM-DD) - End of date range (required)
   * - seriesId: number | string - Filter by specific series ID (optional)
   * - tags: string - Comma-separated list of tags to filter (optional)
   * - status: 'downloaded' | 'missing' | 'airing' | 'unaired' - Filter by episode status (optional)
   *
   * Returns: Array of CalendarEpisode objects
   */
  app.get('/api/calendar', {
    schema: {
      querystring: {
        type: 'object',
        required: ['start', 'end'],
        properties: {
          start: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
          end: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' },
          seriesId: { type: ['number', 'string'], description: 'Filter by series ID' },
          tags: { type: 'string', description: 'Comma-separated tag list' },
          status: { type: 'string', enum: ['downloaded', 'missing', 'airing', 'unaired'], description: 'Filter by status' },
        },
      },
    },
  }, async (request, reply) => {
    const prisma = deps.prisma as any;
    const prismaEpisode = prisma.episode;
    const prismaSeries = prisma.series;

    if (!prismaEpisode?.findMany || !prismaSeries?.findMany) {
      throw new ValidationError('Episode or Series data source is not configured');
    }

    const query = request.query as Record<string, unknown>;

    // Parse date range
    const startStr = typeof query.start === 'string' ? query.start : undefined;
    const endStr = typeof query.end === 'string' ? query.end : undefined;

    if (!startStr || !endStr) {
      throw new ValidationError('Both start and end date parameters are required');
    }

    const startDate = new Date(startStr);
    const endDate = new Date(endStr);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new ValidationError('Invalid date format for start or end parameter');
    }

    // Set time boundaries for the query
    const queryStartDate = new Date(startDate);
    queryStartDate.setHours(0, 0, 0, 0);
    const queryEndDate = new Date(endDate);
    queryEndDate.setHours(23, 59, 59, 999);

    // Parse optional filters
    const seriesIdFilter = typeof query.seriesId === 'number'
      ? query.seriesId
      : typeof query.seriesId === 'string'
        ? Number.parseInt(query.seriesId, 10)
        : undefined;

    const statusFilter = typeof query.status === 'string'
      ? (query.status as CalendarEpisodeStatus)
      : undefined;

    // Build where clause
    const whereClause: Record<string, unknown> = {
      airDateUtc: {
        gte: queryStartDate,
        lte: queryEndDate,
      },
    };

    if (seriesIdFilter !== undefined && !Number.isNaN(seriesIdFilter)) {
      whereClause.seriesId = seriesIdFilter;
    }

    // Query episodes with series and file variants
    const episodes = await prismaEpisode.findMany({
      where: whereClause,
      include: {
        series: {
          select: {
            id: true,
            title: true,
          },
        },
        fileVariants: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        airDateUtc: 'asc',
      },
    });

    // Transform to calendar episodes
    const calendarEpisodes: CalendarEpisode[] = episodes.map((ep: any) => {
      const hasFile = ep.fileVariants && ep.fileVariants.length > 0;
      const status = determineEpisodeStatus(ep.airDateUtc, hasFile);

      return {
        id: ep.id,
        seriesId: ep.seriesId,
        seriesTitle: ep.series?.title ?? 'Unknown Series',
        seasonNumber: ep.seasonNumber,
        episodeNumber: ep.episodeNumber,
        episodeTitle: ep.title ?? 'Untitled Episode',
        airDate: formatAirDate(ep.airDateUtc),
        airTime: formatAirTime(ep.airDateUtc),
        status,
        hasFile,
        monitored: ep.monitored ?? false,
      };
    });

    // Apply status filter in memory (after determining status)
    let filteredEpisodes = calendarEpisodes;
    if (statusFilter) {
      filteredEpisodes = calendarEpisodes.filter(ep => ep.status === statusFilter);
    }

    return sendSuccess(reply, filteredEpisodes);
  });
}
