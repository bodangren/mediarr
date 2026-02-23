import type { FastifyInstance } from 'fastify';
import { sendPaginatedSuccess, sendSuccess, parsePaginationParams, paginateArray } from '../contracts';
import { assertFound, assertNoActiveTorrents, parseBoolean, parseIdParam, sortByField } from '../routeUtils';
import { ValidationError } from '../../errors/domainErrors';
import type { ApiDependencies } from '../types';
import { SeriesRepository, type BulkSeriesChanges } from '../../repositories/SeriesRepository';
import { SeriesMonitoringService, type MonitoringType } from '../../services/SeriesMonitoringService';
import { SeriesOrganizeService, DEFAULT_SERIES_MANAGEMENT_SETTINGS } from '../../services/SeriesOrganizeService';
import { FilenameParsingService } from '../../services/FilenameParsingService';
import { FilterService, type FilterConditionsGroup } from '../../services/FilterService';
import fs from 'node:fs/promises';
import path from 'node:path';

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
  filterService: FilterService,
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
  const jump =
    typeof query.jump === 'string' && query.jump.trim().length > 0
      ? query.jump.trim().toUpperCase()
      : 'ALL';

  let filtered = items.filter(item => {
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

  if (jump !== 'ALL') {
    filtered = filtered.filter(item => {
      const firstChar = String(item.title ?? '').trim().charAt(0).toUpperCase();
      if (jump === '#') {
        return firstChar.length > 0 && !/[A-Z]/.test(firstChar);
      }

      return firstChar === jump;
    });
  }

  const customFilterPayload =
    typeof query.customFilter === 'string' && query.customFilter.trim().length > 0
      ? query.customFilter
      : undefined;

  if (customFilterPayload) {
    try {
      const parsed = JSON.parse(customFilterPayload) as FilterConditionsGroup;
      filtered = filterService.applyToSeries(filtered, parsed);
    } catch {
      // Ignore malformed customFilter payload and return base filtered list.
    }
  }

  return filtered;
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
          filterId: { type: ['number', 'string'] },
          customFilter: { type: 'string' },
          jump: { type: 'string' },
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
            episodes: {
              include: {
                fileVariants: {
                  select: {
                    fileSize: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const filterService = new FilterService(deps.prisma as any);
    let filtered = filterSeries(allItems, query, filterService);

    const rawFilterId = query.filterId;
    const filterId =
      typeof rawFilterId === 'number'
        ? rawFilterId
        : typeof rawFilterId === 'string' && rawFilterId.trim().length > 0
          ? Number.parseInt(rawFilterId, 10)
          : undefined;

    if (filterId !== undefined && Number.isFinite(filterId)) {
      const storedFilter = await (deps.prisma as any).customFilter.findUnique({
        where: { id: filterId },
      });

      if (storedFilter?.type === 'series') {
        filtered = filterService.applyToSeries(filtered, storedFilter.conditions as FilterConditionsGroup);
      }
    }

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

  // =====================
  // Bulk Update Routes
  // =====================

  // Bulk update multiple series
  app.put('/api/series/bulk', {
    schema: {
      body: {
        type: 'object',
        required: ['seriesIds', 'changes'],
        properties: {
          seriesIds: {
            type: 'array',
            items: { type: 'number' },
            minItems: 1,
          },
          changes: {
            type: 'object',
            properties: {
              qualityProfileId: { type: 'number' },
              monitored: { type: 'boolean' },
              rootFolderPath: { type: 'string' },
              seasonFolder: { type: 'boolean' },
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
      seriesIds: number[];
      changes: BulkSeriesChanges;
    };

    const seriesRepo = new SeriesRepository(deps.prisma as any);
    const result = await seriesRepo.bulkUpdate(body.seriesIds, body.changes);

    return sendSuccess(reply, result);
  });

  // Get root folders from existing series
  app.get('/api/series/root-folders', async (_request, reply) => {
    const seriesRepo = new SeriesRepository(deps.prisma as any);
    const rootFolders = await seriesRepo.getDistinctRootFolders();

    return sendSuccess(reply, { rootFolders });
  });

  // =====================
  // Monitoring Routes (Season Pass)
  // =====================

  /**
   * PUT /api/series/:id/monitoring
   * Apply a monitoring strategy to all episodes of a series.
   *
   * Body: { monitoringType: 'all' | 'none' | 'firstSeason' | 'lastSeason' | 'latestSeason' | 'pilotOnly' | 'monitored' | 'existing' }
   *
   * Response: { updatedEpisodes: number, totalEpisodes: number, seriesId: number }
   */
  app.put('/api/series/:id/monitoring', {
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
        required: ['monitoringType'],
        properties: {
          monitoringType: {
            type: 'string',
            enum: ['all', 'none', 'firstSeason', 'lastSeason', 'latestSeason', 'pilotOnly', 'monitored', 'existing'],
          },
        },
      },
    },
  }, async (request, reply) => {
    const id = parseIdParam((request.params as { id: string }).id, 'series');
    const body = request.body as { monitoringType: MonitoringType };

    const monitoringService = new SeriesMonitoringService(deps.prisma as any);
    const result = await monitoringService.applyMonitoringStrategy(id, body.monitoringType);

    return sendSuccess(reply, result);
  });

  /**
   * PUT /api/series/bulk/monitoring
   * Apply a monitoring strategy to multiple series at once.
   *
   * Body: { seriesIds: number[], monitoringType: MonitoringType }
   *
   * Response: { results: Array<{ seriesId: number, updatedEpisodes: number, totalEpisodes: number }> }
   */
  app.put('/api/series/bulk/monitoring', {
    schema: {
      body: {
        type: 'object',
        required: ['seriesIds', 'monitoringType'],
        properties: {
          seriesIds: {
            type: 'array',
            items: { type: 'number' },
            minItems: 1,
          },
          monitoringType: {
            type: 'string',
            enum: ['all', 'none', 'firstSeason', 'lastSeason', 'latestSeason', 'pilotOnly', 'monitored', 'existing'],
          },
        },
      },
    },
  }, async (request, reply) => {
    const body = request.body as {
      seriesIds: number[];
      monitoringType: MonitoringType;
    };

    const monitoringService = new SeriesMonitoringService(deps.prisma as any);
    const results = await Promise.all(
      body.seriesIds.map(seriesId =>
        monitoringService.applyMonitoringStrategy(seriesId, body.monitoringType),
      ),
    );

    return sendSuccess(reply, { results });
  });

  /**
   * PATCH /api/series/:seriesId/seasons/:seasonNumber/monitoring
   * Toggle monitoring for all episodes in a specific season.
   *
   * Body: { monitored: boolean }
   *
   * Response: { updatedEpisodes: number }
   */
  app.patch('/api/series/:seriesId/seasons/:seasonNumber/monitoring', {
    schema: {
      params: {
        type: 'object',
        required: ['seriesId', 'seasonNumber'],
        properties: {
          seriesId: { type: 'string' },
          seasonNumber: { type: 'string' },
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
    const seriesId = parseIdParam((request.params as { seriesId: string; seasonNumber: string }).seriesId, 'series');
    const seasonNumber = Number.parseInt((request.params as { seriesId: string; seasonNumber: string }).seasonNumber, 10);
    const body = request.body as { monitored: boolean };

    if (Number.isNaN(seasonNumber)) {
      throw new ValidationError('Invalid season number');
    }

    const result = await (deps.prisma as any).episode.updateMany({
      where: {
        seriesId,
        seasonNumber,
      },
      data: {
        monitored: body.monitored,
      },
    });

    return sendSuccess(reply, { updatedEpisodes: result.count });
  });

  // =====================
  // Organize/Rename Routes
  // =====================

  // Preview rename for selected series
  app.post('/api/series/organize/preview', {
    schema: {
      body: {
        type: 'object',
        required: ['seriesIds'],
        properties: {
          seriesIds: {
            type: 'array',
            items: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const body = request.body as { seriesIds: number[] };

    const organizeService = new SeriesOrganizeService(
      deps.prisma,
      DEFAULT_SERIES_MANAGEMENT_SETTINGS
    );

    const previews = await organizeService.previewRename(body.seriesIds);

    return sendSuccess(reply, { previews });
  });

  // Apply rename for selected series
  app.put('/api/series/organize/apply', {
    schema: {
      body: {
        type: 'object',
        required: ['seriesIds'],
        properties: {
          seriesIds: {
            type: 'array',
            items: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const body = request.body as { seriesIds: number[] };

    const organizeService = new SeriesOrganizeService(
      deps.prisma,
      DEFAULT_SERIES_MANAGEMENT_SETTINGS
    );

    const result = await organizeService.applyRename(body.seriesIds);

    return sendSuccess(reply, result);
  });

  // =====================
  // Episode Import Routes
  // =====================

  // Scan a directory for episode files
  app.post('/api/series/import/scan', {
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
    const files = await parsingService.scanAndMatchEpisodes(body.path);

    return sendSuccess(reply, { files });
  });

  // Apply import for selected files
  app.post('/api/series/import/apply', {
    schema: {
      body: {
        type: 'object',
        required: ['files'],
        properties: {
          files: {
            type: 'array',
            items: {
              type: 'object',
              required: ['path', 'seriesId', 'seasonId', 'episodeId'],
              properties: {
                path: { type: 'string' },
                seriesId: { type: 'number' },
                seasonId: { type: 'number' },
                episodeId: { type: 'number' },
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
        seriesId: number;
        seasonId: number;
        episodeId: number;
        quality?: string;
        language?: string;
      }>;
    };

    let imported = 0;
    let failed = 0;
    const errors: Array<{ path: string; error: string }> = [];

    for (const file of body.files) {
      try {
        // Get the episode and series to find the root path
        const series = await (deps.prisma as any).series.findUnique({
          where: { id: file.seriesId },
        });

        const episode = await (deps.prisma as any).episode.findUnique({
          where: { id: file.episodeId },
        });

        if (!series || !series.path || !episode) {
          failed++;
          errors.push({ path: file.path, error: 'Series or episode not found or series has no path' });
          continue;
        }

        // Build destination path
        const extension = path.extname(file.path);
        const seriesFolderName = series.title;
        const seasonFolderName = `Season ${String(episode.seasonNumber).padStart(2, '0')}`;
        const episodeFilename = `${series.title} - S${String(episode.seasonNumber).padStart(2, '0')}E${String(episode.episodeNumber).padStart(2, '0')}${extension}`;
        const destDir = path.join(series.path, seriesFolderName, seasonFolderName);
        const destPath = path.join(destDir, episodeFilename);

        // Ensure destination directory exists
        await fs.mkdir(destDir, { recursive: true });

        // Move the file
        await fs.rename(file.path, destPath);

        // Get file size
        const stat = await fs.stat(destPath);

        // Create file variant in database
        await (deps.prisma as any).mediaFileVariant.create({
          data: {
            mediaType: 'TV',
            episodeId: episode.id,
            path: destPath,
            fileSize: stat.size,
            quality: file.quality || null,
          },
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
