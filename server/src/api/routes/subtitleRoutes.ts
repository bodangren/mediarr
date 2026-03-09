import type { FastifyInstance } from 'fastify';
import { ValidationError } from '../../errors/domainErrors';
import {
  paginateArray,
  parsePaginationParams,
  sendPaginatedSuccess,
  sendSuccess,
} from '../contracts';
import { parseIdParam } from '../routeUtils';
import type { ApiDependencies } from '../types';
import { ALLOWED_SUBTITLE_EXTENSIONS } from '../../services/providers/providerUtils';

interface SubtitleBlacklistEntry {
  id: number;
  type: 'series' | 'movie';
  seriesId?: number;
  seriesTitle?: string;
  episodeId?: number;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
  movieId?: number;
  movieTitle?: string;
  languageCode: string;
  provider: string;
  reason: string;
  timestamp: string;
  subtitlePath?: string;
}

const subtitleBlacklistStore: {
  series: SubtitleBlacklistEntry[];
  movies: SubtitleBlacklistEntry[];
} = {
  series: [],
  movies: [],
};

function parseBooleanFlag(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
}

function readFieldValue(fields: Record<string, unknown> | undefined, key: string): string | undefined {
  if (!fields) {
    return undefined;
  }

  const value = fields[key] as { value?: unknown } | undefined;
  if (!value || typeof value.value !== 'string') {
    return undefined;
  }

  return value.value;
}

function normalizeProviderId(raw: string): string {
  return raw.trim().toLowerCase();
}

function formatProviderName(providerId: string): string {
  if (providerId === 'opensubtitles') return 'OpenSubtitles';
  if (providerId === 'assrt') return 'ASSRT';
  if (providerId === 'subdl') return 'SubDL';
  if (providerId === 'embedded') return 'Embedded';
  return providerId;
}

type ProviderCredentialKey = 'openSubtitlesApiKey' | 'assrtApiToken' | 'subdlApiKey';

function providerCredentialKey(providerId: string): ProviderCredentialKey | null {
  if (providerId === 'opensubtitles') return 'openSubtitlesApiKey';
  if (providerId === 'assrt') return 'assrtApiToken';
  if (providerId === 'subdl') return 'subdlApiKey';
  return null;
}

function toLanguageFilter(query: Record<string, unknown>): string | null {
  if (typeof query.languageCode !== 'string') {
    return null;
  }

  const trimmed = query.languageCode.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function parseDateInput(value: unknown): Date | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isFetchableState(state: unknown): state is 'PENDING' | 'FAILED' {
  return state === 'PENDING' || state === 'FAILED';
}

export function registerSubtitleRoutes(
  app: FastifyInstance,
  deps: ApiDependencies,
): void {
  app.get('/api/subtitles/movie/:id/variants', {
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
    if (!deps.subtitleInventoryApiService?.listMovieVariantInventory) {
      throw new ValidationError('Subtitle inventory API service is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'movie');
    const inventory = await deps.subtitleInventoryApiService.listMovieVariantInventory(id);

    return sendSuccess(reply, inventory);
  });

  app.get('/api/subtitles/episode/:id/variants', {
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
    if (!deps.subtitleInventoryApiService?.listEpisodeVariantInventory) {
      throw new ValidationError('Subtitle inventory API service is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'episode');
    const inventory = await deps.subtitleInventoryApiService.listEpisodeVariantInventory(id);

    return sendSuccess(reply, inventory);
  });

  app.post('/api/subtitles/search', {
    schema: {
      body: {
        type: 'object',
        properties: {
          movieId: { type: 'number' },
          episodeId: { type: 'number' },
          variantId: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.subtitleInventoryApiService?.manualSearch) {
      throw new ValidationError('Subtitle inventory API service is not configured');
    }

    const body = request.body as {
      movieId?: number;
      episodeId?: number;
      variantId?: number;
    };

    if (!body.variantId && !body.movieId && !body.episodeId) {
      throw new ValidationError('variantId, movieId, or episodeId is required');
    }

    const candidates = await deps.subtitleInventoryApiService.manualSearch(body);
    return sendSuccess(reply, candidates);
  });

  app.post('/api/subtitles/download', {
    schema: {
      body: {
        type: 'object',
        required: ['candidate'],
        properties: {
          movieId: { type: 'number' },
          episodeId: { type: 'number' },
          variantId: { type: 'number' },
          candidate: {
            type: 'object',
            required: ['languageCode', 'isForced', 'isHi', 'provider', 'score'],
            properties: {
              languageCode: { type: 'string' },
              isForced: { type: 'boolean' },
              isHi: { type: 'boolean' },
              provider: { type: 'string' },
              score: { type: 'number' },
              extension: { type: 'string' },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.subtitleInventoryApiService?.manualDownload) {
      throw new ValidationError('Subtitle inventory API service is not configured');
    }

    const body = request.body as {
      movieId?: number;
      episodeId?: number;
      variantId?: number;
      candidate: {
        languageCode: string;
        isForced: boolean;
        isHi: boolean;
        provider: string;
        score: number;
        extension?: string;
      };
    };

    if (!body.variantId && !body.movieId && !body.episodeId) {
      throw new ValidationError('variantId, movieId, or episodeId is required');
    }

    const result = await deps.subtitleInventoryApiService.manualDownload(body);
    return sendSuccess(reply, result);
  });

  app.post('/api/subtitles/upload', async (request, reply) => {
    if (!deps.subtitleInventoryApiService?.uploadSubtitle) {
      throw new ValidationError('Subtitle inventory API service is not configured');
    }

    const filePart = await request.file();
    if (!filePart) {
      throw new ValidationError('Subtitle file is required');
    }

    const extension = `.${filePart.filename.split('.').pop()?.toLowerCase() ?? ''}`;
    if (!ALLOWED_SUBTITLE_EXTENSIONS.has(extension)) {
      throw new ValidationError('Only subtitle files are supported (.srt, .ass, .ssa, .sub, .vtt)');
    }

    const language = readFieldValue(filePart.fields as Record<string, unknown>, 'language');
    if (!language) {
      throw new ValidationError('language is required');
    }

    const mediaIdRaw = readFieldValue(filePart.fields as Record<string, unknown>, 'mediaId');
    const mediaId = Number.parseInt(mediaIdRaw ?? '', 10);
    if (!Number.isFinite(mediaId) || mediaId <= 0) {
      throw new ValidationError('mediaId must be a positive number');
    }

    const mediaType = readFieldValue(filePart.fields as Record<string, unknown>, 'mediaType');
    if (mediaType !== 'movie' && mediaType !== 'episode') {
      throw new ValidationError("mediaType must be 'movie' or 'episode'");
    }

    const content = await filePart.toBuffer();
    const subtitle = await deps.subtitleInventoryApiService.uploadSubtitle({
      originalFilename: filePart.filename,
      content,
      language,
      forced: parseBooleanFlag(readFieldValue(filePart.fields as Record<string, unknown>, 'forced')),
      hearingImpaired: parseBooleanFlag(readFieldValue(filePart.fields as Record<string, unknown>, 'hearingImpaired')),
      mediaId,
      mediaType,
    });

    return sendSuccess(reply, subtitle, 201);
  });

  app.put('/api/subtitles/movies/bulk', {
    schema: {
      body: {
        type: 'object',
        required: ['movieIds', 'languageProfileId'],
        properties: {
          movieIds: {
            type: 'array',
            items: { type: 'number' },
            minItems: 1,
          },
          languageProfileId: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    const prismaMovie = (deps.prisma as Record<string, unknown>).movie as { updateMany?: unknown } | undefined;
    if (!prismaMovie?.updateMany) {
      throw new ValidationError('Movie data source is not configured');
    }

    const body = request.body as {
      movieIds: number[];
      languageProfileId: number;
    };

    if (!Array.isArray(body.movieIds) || body.movieIds.length === 0) {
      throw new ValidationError('movieIds must be a non-empty array');
    }

    if (typeof body.languageProfileId !== 'number' || body.languageProfileId <= 0) {
      throw new ValidationError('languageProfileId must be a positive number');
    }

    const prisma = deps.prisma as any;
    const result = await prisma.$transaction(async (tx: any) => {
      return tx.movie.updateMany({
        where: {
          id: { in: body.movieIds },
        },
        data: {
          languageProfileId: body.languageProfileId,
        },
      });
    });

    return sendSuccess(reply, {
      success: true,
      message: 'Bulk subtitle profile update completed',
      updatedCount: result.count,
      failedCount: 0,
    });
  });

  app.get('/api/subtitles/providers', async (_request, reply) => {
    if (!deps.subtitleProviderFactory?.getProviderNames || !deps.settingsService?.get) {
      throw new ValidationError('Subtitle provider dependencies are not configured');
    }

    const settings = await deps.settingsService.get();
    const apiKeys = settings.apiKeys as Record<string, unknown>;

    const providers = deps.subtitleProviderFactory.getProviderNames().map(name => {
      const keyName = providerCredentialKey(name);
      const configuredValue = keyName && typeof apiKeys[keyName] === 'string'
        ? (apiKeys[keyName] as string)
        : null;
      const enabled = name === 'embedded' ? true : Boolean(configuredValue && configuredValue.trim().length > 0);

      return {
        id: name,
        name: formatProviderName(name),
        enabled,
        type: name === 'embedded' ? 'embedded' : 'api',
        settings: {
          apiKey: configuredValue,
        },
        status: enabled ? 'active' : 'disabled',
      };
    });

    return sendSuccess(reply, providers);
  });

  app.get('/api/subtitles/providers/:id', async (request, reply) => {
    if (!deps.subtitleProviderFactory?.getProviderNames || !deps.settingsService?.get) {
      throw new ValidationError('Subtitle provider dependencies are not configured');
    }

    const id = normalizeProviderId((request.params as { id?: string }).id ?? '');
    if (!deps.subtitleProviderFactory.getProviderNames().includes(id)) {
      throw new ValidationError(`Subtitle provider '${id}' not found`);
    }

    const settings = await deps.settingsService.get();
    const keyName = providerCredentialKey(id);
    const apiKeys = settings.apiKeys as Record<string, unknown>;
    const configuredValue = keyName && typeof apiKeys[keyName] === 'string'
      ? (apiKeys[keyName] as string)
      : null;

    return sendSuccess(reply, {
      id,
      name: formatProviderName(id),
      enabled: id === 'embedded' ? true : Boolean(configuredValue && configuredValue.trim().length > 0),
      type: id === 'embedded' ? 'embedded' : 'api',
      settings: {
        apiKey: configuredValue,
      },
      status: id === 'embedded' || configuredValue ? 'active' : 'disabled',
    });
  });

  app.put('/api/subtitles/providers/:id', async (request, reply) => {
    if (!deps.subtitleProviderFactory?.getProviderNames || !deps.settingsService?.get || !deps.settingsService?.update) {
      throw new ValidationError('Subtitle provider dependencies are not configured');
    }

    const id = normalizeProviderId((request.params as { id?: string }).id ?? '');
    if (!deps.subtitleProviderFactory.getProviderNames().includes(id)) {
      throw new ValidationError(`Subtitle provider '${id}' not found`);
    }

    if (id === 'embedded') {
      return sendSuccess(reply, {
        id,
        name: formatProviderName(id),
        enabled: true,
        type: 'embedded',
        settings: {},
        status: 'active',
      });
    }

    const body = (request.body ?? {}) as Record<string, unknown>;
    const keyName = providerCredentialKey(id);
    if (!keyName) {
      throw new ValidationError(`Subtitle provider '${id}' does not support credential updates`);
    }

    const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : null;
    await deps.settingsService.update({
      apiKeys: {
        [keyName]: apiKey && apiKey.length > 0 ? apiKey : null,
      } as Record<string, string | null>,
    } as any);

    return sendSuccess(reply, {
      id,
      name: formatProviderName(id),
      enabled: Boolean(apiKey && apiKey.length > 0),
      type: 'api',
      settings: {
        apiKey: apiKey && apiKey.length > 0 ? apiKey : null,
      },
      status: apiKey && apiKey.length > 0 ? 'active' : 'disabled',
    });
  });

  app.post('/api/subtitles/providers/:id/test', async (request, reply) => {
    if (!deps.subtitleProviderFactory?.resolveManualProvider) {
      throw new ValidationError('Subtitle provider factory is not configured');
    }

    const id = normalizeProviderId((request.params as { id?: string }).id ?? '');

    try {
      const provider = deps.subtitleProviderFactory.resolveManualProvider(id);
      const result = await provider.search({
        variant: {
          id: 0,
          path: '/tmp/test.mkv',
          releaseName: 'Interstellar 2014',
        },
        audioTracks: [],
      });

      return sendSuccess(reply, {
        success: true,
        message: `Provider test succeeded (${result.length} candidates)`,
      });
    } catch (error) {
      return sendSuccess(reply, {
        success: false,
        message: error instanceof Error ? error.message : 'Provider test failed',
      });
    }
  });

  app.post('/api/subtitles/providers/:id/reset', async (request, reply) => {
    if (!deps.settingsService?.update || !deps.subtitleProviderFactory?.getProviderNames) {
      throw new ValidationError('Subtitle provider dependencies are not configured');
    }

    const id = normalizeProviderId((request.params as { id?: string }).id ?? '');
    if (!deps.subtitleProviderFactory.getProviderNames().includes(id)) {
      throw new ValidationError(`Subtitle provider '${id}' not found`);
    }

    const keyName = providerCredentialKey(id);
    if (!keyName) {
      return sendSuccess(reply, {
        id,
        name: formatProviderName(id),
        enabled: id === 'embedded',
        type: id === 'embedded' ? 'embedded' : 'api',
        settings: {},
        status: id === 'embedded' ? 'active' : 'disabled',
      });
    }

    await deps.settingsService.update({
      apiKeys: {
        [keyName]: null,
      } as Record<string, null>,
    } as any);

    return sendSuccess(reply, {
      id,
      name: formatProviderName(id),
      enabled: false,
      type: 'api',
      settings: {
        apiKey: null,
      },
      status: 'disabled',
    });
  });

  app.get('/api/subtitles/wanted/series', async (request, reply) => {
    const prisma = deps.prisma as any;
    const query = request.query as Record<string, unknown>;
    const pagination = parsePaginationParams(query);
    const languageFilter = toLanguageFilter(query);

    const missing = await prisma.variantMissingSubtitle.findMany({
      include: {
        variant: {
          include: {
            episode: {
              include: {
                season: {
                  include: {
                    series: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    const grouped = new Map<number, {
      seriesId: number;
      seriesTitle: string;
      seasonNumber: number;
      episodeNumber: number;
      episodeId: number;
      episodeTitle: string;
      missingLanguages: Set<string>;
      lastSearch?: string;
    }>();

    for (const item of missing) {
      const episode = item.variant?.episode;
      const season = episode?.season;
      const series = season?.series;
      if (!episode || !season || !series) {
        continue;
      }
      if (languageFilter && item.languageCode !== languageFilter) {
        continue;
      }

      const existing = grouped.get(episode.id) ?? {
        seriesId: series.id,
        seriesTitle: series.title,
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
        episodeId: episode.id,
        episodeTitle: episode.title,
        missingLanguages: new Set<string>(),
      };

      existing.missingLanguages.add(item.languageCode);
      grouped.set(episode.id, existing);
    }

    const entries = [...grouped.values()].map(entry => ({
      seriesId: entry.seriesId,
      seriesTitle: entry.seriesTitle,
      seasonNumber: entry.seasonNumber,
      episodeNumber: entry.episodeNumber,
      episodeId: entry.episodeId,
      episodeTitle: entry.episodeTitle,
      missingLanguages: [...entry.missingLanguages].sort(),
      lastSearch: entry.lastSearch,
    }));

    const paged = paginateArray(entries, pagination.page, pagination.pageSize);
    return sendPaginatedSuccess(reply, paged.items, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalCount: paged.totalCount,
    });
  });

  app.get('/api/subtitles/wanted/movies', async (request, reply) => {
    const prisma = deps.prisma as any;
    const query = request.query as Record<string, unknown>;
    const pagination = parsePaginationParams(query);
    const languageFilter = toLanguageFilter(query);

    const missing = await prisma.variantMissingSubtitle.findMany({
      include: {
        variant: {
          include: {
            movie: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    const grouped = new Map<number, {
      movieId: number;
      movieTitle: string;
      year?: number;
      missingLanguages: Set<string>;
      lastSearch?: string;
    }>();

    for (const item of missing) {
      const movie = item.variant?.movie;
      if (!movie) {
        continue;
      }
      if (languageFilter && item.languageCode !== languageFilter) {
        continue;
      }

      const existing = grouped.get(movie.id) ?? {
        movieId: movie.id,
        movieTitle: movie.title,
        year: movie.year,
        missingLanguages: new Set<string>(),
      };

      existing.missingLanguages.add(item.languageCode);
      grouped.set(movie.id, existing);
    }

    const entries = [...grouped.values()].map(entry => ({
      movieId: entry.movieId,
      movieTitle: entry.movieTitle,
      year: entry.year,
      missingLanguages: [...entry.missingLanguages].sort(),
      lastSearch: entry.lastSearch,
    }));

    const paged = paginateArray(entries, pagination.page, pagination.pageSize);
    return sendPaginatedSuccess(reply, paged.items, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalCount: paged.totalCount,
    });
  });

  app.get('/api/subtitles/wanted/count', async (_request, reply) => {
    const prisma = deps.prisma as any;

    const missing = await prisma.variantMissingSubtitle.findMany({
      include: {
        variant: {
          select: {
            movieId: true,
            episodeId: true,
          },
        },
      },
    });

    const seriesEpisodeIds = new Set<number>();
    const movieIds = new Set<number>();

    for (const item of missing) {
      const episodeId = item.variant?.episodeId as number | null | undefined;
      const movieId = item.variant?.movieId as number | null | undefined;

      if (episodeId) {
        seriesEpisodeIds.add(episodeId);
      }
      if (movieId) {
        movieIds.add(movieId);
      }
    }

    const seriesCount = seriesEpisodeIds.size;
    const moviesCount = movieIds.size;

    return sendSuccess(reply, {
      seriesCount,
      moviesCount,
      totalCount: seriesCount + moviesCount,
    });
  });

  app.post('/api/subtitles/wanted/series/search', async (_request, reply) => {
    if (!deps.subtitleAutomationService?.runAutomationCycle) {
      throw new ValidationError('Subtitle automation service is not configured');
    }

    const stats = await deps.subtitleAutomationService.runAutomationCycle();
    return sendSuccess(reply, {
      triggered: true,
      count: stats.wantedQueued,
    });
  });

  app.post('/api/subtitles/wanted/movies/search', async (_request, reply) => {
    if (!deps.subtitleAutomationService?.runAutomationCycle) {
      throw new ValidationError('Subtitle automation service is not configured');
    }

    const stats = await deps.subtitleAutomationService.runAutomationCycle();
    return sendSuccess(reply, {
      triggered: true,
      count: stats.wantedQueued,
    });
  });

  app.post('/api/subtitles/wanted/series/:id/search', async (request, reply) => {
    const seriesId = parseIdParam((request.params as { id?: string }).id ?? '', 'series');
    const body = (request.body ?? {}) as { languageCode?: string };

    const prisma = deps.prisma as any;
    const episodes = await prisma.episode.findMany({
      where: { seriesId },
      select: { id: true },
    });

    if (deps.subtitleAutomationService?.onEpisodeImported) {
      for (const episode of episodes) {
        await deps.subtitleAutomationService.onEpisodeImported(episode.id);
      }
    }

    return sendSuccess(reply, {
      triggered: true,
      seriesId,
      languageCode: body.languageCode ?? 'any',
    });
  });

  app.post('/api/subtitles/wanted/movies/:id/search', async (request, reply) => {
    if (!deps.subtitleAutomationService?.onMovieImported) {
      throw new ValidationError('Subtitle automation service is not configured');
    }

    const movieId = parseIdParam((request.params as { id?: string }).id ?? '', 'movie');
    const body = (request.body ?? {}) as { languageCode?: string };

    await deps.subtitleAutomationService.onMovieImported(movieId);
    return sendSuccess(reply, {
      triggered: true,
      movieId,
      languageCode: body.languageCode ?? 'any',
    });
  });

  app.get('/api/subtitles/history', async (request, reply) => {
    const prisma = deps.prisma as any;
    const query = request.query as Record<string, unknown>;
    const pagination = parsePaginationParams(query);
    const typeFilter = typeof query.type === 'string' ? query.type : null;
    const actionFilter = typeof query.action === 'string' ? query.action.toLowerCase() : null;
    const providerFilter = typeof query.provider === 'string' ? query.provider.toLowerCase() : null;
    const languageFilter = typeof query.languageCode === 'string' ? query.languageCode.toLowerCase() : null;

    const rows = await prisma.subtitleHistory.findMany({
      include: {
        variant: {
          include: {
            movie: true,
            episode: {
              include: {
                season: {
                  include: {
                    series: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const startDate = parseDateInput(query.startDate);
    const endDate = parseDateInput(query.endDate);

    const items = rows
      .map((row: any) => {
        const variant = row.variant;
        const movie = variant?.movie;
        const episode = variant?.episode;
        const season = episode?.season;
        const series = season?.series;

        const type = movie ? 'movie' : 'series';
        const message = String(row.message ?? '').toLowerCase();
        const action = message.includes('manual')
          ? 'manual'
          : message.includes('upload')
            ? 'upload'
            : message.includes('upgrade')
              ? 'upgrade'
              : 'download';

        return {
          id: row.id,
          type,
          seriesId: series?.id,
          movieId: movie?.id,
          episodeId: episode?.id,
          seriesTitle: series?.title,
          movieTitle: movie?.title,
          seasonNumber: episode?.seasonNumber,
          episodeNumber: episode?.episodeNumber,
          episodeTitle: episode?.title,
          languageCode: row.languageCode,
          provider: row.provider ?? 'unknown',
          score: row.score ?? 0,
          action,
          timestamp: row.createdAt.toISOString(),
          filePath: row.storedPath ?? undefined,
        };
      })
      .filter(item => {
        if (typeFilter === 'series' && item.type !== 'series') return false;
        if (typeFilter === 'movies' && item.type !== 'movie') return false;
        if (actionFilter && item.action !== actionFilter) return false;
        if (providerFilter && item.provider.toLowerCase() !== providerFilter) return false;
        if (languageFilter && item.languageCode.toLowerCase() !== languageFilter) return false;

        if (startDate || endDate) {
          const timestamp = new Date(item.timestamp);
          if (startDate && timestamp < startDate) return false;
          if (endDate && timestamp > endDate) return false;
        }

        return true;
      });

    const paged = paginateArray(items, pagination.page, pagination.pageSize);
    return sendPaginatedSuccess(reply, paged.items, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalCount: paged.totalCount,
    });
  });

  app.delete('/api/subtitles/history', async (request, reply) => {
    const prisma = deps.prisma as any;
    const query = request.query as Record<string, unknown>;
    const typeFilter = typeof query.type === 'string' ? query.type : null;

    if (!typeFilter) {
      const result = await prisma.subtitleHistory.deleteMany({ where: {} });
      return sendSuccess(reply, { deletedCount: result.count });
    }

    const rows = await prisma.subtitleHistory.findMany({
      select: {
        id: true,
        variant: {
          select: {
            movieId: true,
            episodeId: true,
          },
        },
      },
    });

    const ids = rows
      .filter((row: any) => {
        if (typeFilter === 'series') {
          return Boolean(row.variant?.episodeId);
        }
        if (typeFilter === 'movies') {
          return Boolean(row.variant?.movieId);
        }
        return true;
      })
      .map((row: any) => row.id);

    if (ids.length === 0) {
      return sendSuccess(reply, { deletedCount: 0 });
    }

    const result = await prisma.subtitleHistory.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    return sendSuccess(reply, { deletedCount: result.count });
  });

  app.get('/api/subtitles/history/stats', async (request, reply) => {
    const prisma = deps.prisma as any;
    const query = request.query as Record<string, unknown>;
    const periodRaw = typeof query.period === 'string' ? query.period : 'month';
    const period = ['day', 'week', 'month', 'year'].includes(periodRaw) ? periodRaw : 'month';
    const providerFilter = typeof query.provider === 'string' ? query.provider.toLowerCase() : null;
    const languageFilter = typeof query.languageCode === 'string' ? query.languageCode.toLowerCase() : null;
    const actionFilter = typeof query.action === 'string' ? query.action.toLowerCase() : null;

    const now = new Date();
    const start = new Date(now);
    if (period === 'day') {
      start.setDate(start.getDate() - 1);
    } else if (period === 'week') {
      start.setDate(start.getDate() - 7);
    } else if (period === 'month') {
      start.setMonth(start.getMonth() - 1);
    } else {
      start.setFullYear(start.getFullYear() - 1);
    }

    const rows = await prisma.subtitleHistory.findMany({
      include: {
        variant: {
          select: {
            movieId: true,
            episodeId: true,
          },
        },
      },
      where: {
        createdAt: {
          gte: start,
        },
      },
    });

    const byDay = new Map<string, { series: number; movies: number }>();
    const byProvider = new Map<string, number>();
    const byLanguage = new Map<string, number>();

    for (const row of rows) {
      const provider = row.provider ?? 'unknown';
      const language = row.languageCode;
      const message = String(row.message ?? '').toLowerCase();
      const action = message.includes('manual')
        ? 'manual'
        : message.includes('upload')
          ? 'upload'
          : message.includes('upgrade')
            ? 'upgrade'
            : 'download';

      if (providerFilter && provider.toLowerCase() !== providerFilter) {
        continue;
      }
      if (languageFilter && language.toLowerCase() !== languageFilter) {
        continue;
      }
      if (actionFilter && action !== actionFilter) {
        continue;
      }

      const day = row.createdAt.toISOString().slice(0, 10);
      const current = byDay.get(day) ?? { series: 0, movies: 0 };
      if (row.variant?.episodeId) {
        current.series += 1;
      } else {
        current.movies += 1;
      }
      byDay.set(day, current);

      byProvider.set(provider, (byProvider.get(provider) ?? 0) + 1);

      byLanguage.set(language, (byLanguage.get(language) ?? 0) + 1);
    }

    const downloads = [...byDay.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, value]) => ({
        date,
        series: value.series,
        movies: value.movies,
      }));

    const byProviderItems = [...byProvider.entries()]
      .map(([provider, count]) => ({ provider, count }))
      .sort((left, right) => right.count - left.count);

    const byLanguageItems = [...byLanguage.entries()]
      .map(([language, count]) => ({ language, count }))
      .sort((left, right) => right.count - left.count);

    return sendSuccess(reply, {
      period,
      downloads,
      byProvider: byProviderItems,
      byLanguage: byLanguageItems,
    });
  });

  app.get('/api/subtitles/blacklist/series', async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const pagination = parsePaginationParams(query);
    const providerFilter = typeof query.provider === 'string' ? query.provider.toLowerCase() : null;
    const languageFilter = typeof query.languageCode === 'string' ? query.languageCode.toLowerCase() : null;
    const filtered = subtitleBlacklistStore.series.filter(item => {
      if (providerFilter && item.provider.toLowerCase() !== providerFilter) {
        return false;
      }
      if (languageFilter && item.languageCode.toLowerCase() !== languageFilter) {
        return false;
      }
      return true;
    });

    const paged = paginateArray(filtered, pagination.page, pagination.pageSize);
    return sendPaginatedSuccess(reply, paged.items, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalCount: paged.totalCount,
    });
  });

  app.get('/api/subtitles/blacklist/movies', async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const pagination = parsePaginationParams(query);
    const providerFilter = typeof query.provider === 'string' ? query.provider.toLowerCase() : null;
    const languageFilter = typeof query.languageCode === 'string' ? query.languageCode.toLowerCase() : null;
    const filtered = subtitleBlacklistStore.movies.filter(item => {
      if (providerFilter && item.provider.toLowerCase() !== providerFilter) {
        return false;
      }
      if (languageFilter && item.languageCode.toLowerCase() !== languageFilter) {
        return false;
      }
      return true;
    });

    const paged = paginateArray(filtered, pagination.page, pagination.pageSize);
    return sendPaginatedSuccess(reply, paged.items, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalCount: paged.totalCount,
    });
  });

  app.delete('/api/subtitles/blacklist/:id', async (request, reply) => {
    const id = parseIdParam((request.params as { id?: string }).id ?? '', 'subtitle blacklist');

    const before = subtitleBlacklistStore.series.length + subtitleBlacklistStore.movies.length;
    subtitleBlacklistStore.series = subtitleBlacklistStore.series.filter(item => item.id !== id);
    subtitleBlacklistStore.movies = subtitleBlacklistStore.movies.filter(item => item.id !== id);
    const after = subtitleBlacklistStore.series.length + subtitleBlacklistStore.movies.length;

    return sendSuccess(reply, { deletedCount: before - after });
  });

  app.delete('/api/subtitles/blacklist/series', async (_request, reply) => {
    const deletedCount = subtitleBlacklistStore.series.length;
    subtitleBlacklistStore.series = [];
    return sendSuccess(reply, { deletedCount });
  });

  app.delete('/api/subtitles/blacklist/movies', async (_request, reply) => {
    const deletedCount = subtitleBlacklistStore.movies.length;
    subtitleBlacklistStore.movies = [];
    return sendSuccess(reply, { deletedCount });
  });

  app.get('/api/subtitles/series/:id/variants', async (request, reply) => {
    if (!deps.subtitleInventoryApiService?.listEpisodeVariantInventory) {
      throw new ValidationError('Subtitle inventory API service is not configured');
    }

    const prisma = deps.prisma as any;
    const seriesId = parseIdParam((request.params as { id?: string }).id ?? '', 'series');

    const episodes = await prisma.episode.findMany({
      where: { seriesId },
      orderBy: [{ seasonNumber: 'asc' }, { episodeNumber: 'asc' }],
      select: {
        id: true,
        seasonNumber: true,
        episodeNumber: true,
      },
    });

    const results = [] as Array<{
      seriesId: number;
      seasonNumber: number;
      episodes: Array<{
        episodeId: number;
        seasonNumber: number;
        episodeNumber: number;
        subtitleTracks: Array<{
          languageCode: string;
          isForced: boolean;
          isHi: boolean;
          path: string;
          provider: string;
        }>;
        missingSubtitles: string[];
      }>;
    }>;

    for (const episode of episodes) {
      const inventory = await deps.subtitleInventoryApiService.listEpisodeVariantInventory(episode.id);
      const subtitleTracks = inventory.flatMap(variant =>
        variant.subtitleTracks
          .filter(track => Boolean(track.languageCode) && Boolean(track.filePath))
          .map(track => ({
            languageCode: track.languageCode ?? 'unknown',
            isForced: track.isForced,
            isHi: track.isHi,
            path: track.filePath ?? '',
            provider: track.source.toLowerCase(),
          })),
      );

      const missingLanguages = Array.from(
        new Set(
          inventory.flatMap(variant => variant.missingSubtitles.map(item => item.languageCode)),
        ),
      ).sort();

      let seasonBucket = results.find(item => item.seasonNumber === episode.seasonNumber);
      if (!seasonBucket) {
        seasonBucket = {
          seriesId,
          seasonNumber: episode.seasonNumber,
          episodes: [],
        };
        results.push(seasonBucket);
      }

      seasonBucket.episodes.push({
        episodeId: episode.id,
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
        subtitleTracks,
        missingSubtitles: missingLanguages,
      });
    }

    return sendSuccess(reply, results.sort((left, right) => left.seasonNumber - right.seasonNumber));
  });

  app.get('/api/subtitles/episodes/:id', async (request, reply) => {
    if (!deps.subtitleInventoryApiService?.listEpisodeVariantInventory) {
      throw new ValidationError('Subtitle inventory API service is not configured');
    }

    const episodeId = parseIdParam((request.params as { id?: string }).id ?? '', 'episode');
    const prisma = deps.prisma as any;
    const episode = await prisma.episode.findUnique({
      where: { id: episodeId },
      select: {
        id: true,
        seasonNumber: true,
        episodeNumber: true,
      },
    });

    if (!episode) {
      throw new ValidationError('Episode not found');
    }

    const inventory = await deps.subtitleInventoryApiService.listEpisodeVariantInventory(episodeId);
    const subtitleTracks = inventory.flatMap(variant =>
      variant.subtitleTracks
        .filter(track => Boolean(track.languageCode) && Boolean(track.filePath))
        .map(track => ({
          languageCode: track.languageCode ?? 'unknown',
          isForced: track.isForced,
          isHi: track.isHi,
          path: track.filePath ?? '',
          provider: track.source.toLowerCase(),
        })),
    );

    const missingSubtitles = Array.from(
      new Set(inventory.flatMap(variant => variant.missingSubtitles.map(item => item.languageCode))),
    ).sort();

    return sendSuccess(reply, {
      episodeId,
      seasonNumber: episode.seasonNumber,
      episodeNumber: episode.episodeNumber,
      subtitleTracks,
      missingSubtitles,
    });
  });

  app.post('/api/subtitles/movie/:id/sync', async (request, reply) => {
    if (!deps.subtitleAutomationService?.onMovieImported) {
      throw new ValidationError('Subtitle automation service is not configured');
    }

    const movieId = parseIdParam((request.params as { id?: string }).id ?? '', 'movie');
    const stats = await deps.subtitleAutomationService.onMovieImported(movieId);

    return sendSuccess(reply, {
      success: true,
      message: 'Movie subtitle sync completed',
      episodesUpdated: stats.variantsScanned,
    });
  });

  app.post('/api/subtitles/movie/:id/scan', async (request, reply) => {
    if (!deps.subtitleInventoryApiService?.scanMovieDisk) {
      throw new ValidationError('Subtitle inventory API service is not configured');
    }

    const movieId = parseIdParam((request.params as { id?: string }).id ?? '', 'movie');
    const result = await deps.subtitleInventoryApiService.scanMovieDisk(movieId);

    return sendSuccess(reply, {
      success: true,
      message: 'Movie subtitle scan completed',
      subtitlesFound: result.subtitlesFound,
      newSubtitles: result.newSubtitles,
    });
  });

  app.post('/api/subtitles/movie/:id/search', async (request, reply) => {
    if (!deps.subtitleAutomationService?.onMovieImported) {
      throw new ValidationError('Subtitle automation service is not configured');
    }

    const movieId = parseIdParam((request.params as { id?: string }).id ?? '', 'movie');
    const stats = await deps.subtitleAutomationService.onMovieImported(movieId);

    return sendSuccess(reply, {
      success: true,
      message: 'Movie subtitle search completed',
      episodesSearched: stats.variantsScanned,
      subtitlesDownloaded: stats.downloaded,
    });
  });

  app.post('/api/subtitles/series/:id/sync', async (request, reply) => {
    if (!deps.subtitleAutomationService?.onEpisodeImported) {
      throw new ValidationError('Subtitle automation service is not configured');
    }

    const seriesId = parseIdParam((request.params as { id?: string }).id ?? '', 'series');
    const prisma = deps.prisma as any;
    const episodes = await prisma.episode.findMany({
      where: { seriesId },
      select: { id: true },
    });

    let episodesUpdated = 0;
    for (const episode of episodes) {
      const stats = await deps.subtitleAutomationService.onEpisodeImported(episode.id);
      episodesUpdated += stats.variantsScanned;
    }

    return sendSuccess(reply, {
      success: true,
      message: 'Series subtitle sync completed',
      episodesUpdated,
    });
  });

  app.post('/api/subtitles/series/:id/scan', async (request, reply) => {
    if (!deps.subtitleInventoryApiService?.scanEpisodeDisk) {
      throw new ValidationError('Subtitle inventory API service is not configured');
    }

    const seriesId = parseIdParam((request.params as { id?: string }).id ?? '', 'series');
    const prisma = deps.prisma as any;
    const episodes = await prisma.episode.findMany({
      where: { seriesId },
      select: { id: true },
    });

    let subtitlesFound = 0;
    let newSubtitles = 0;
    for (const episode of episodes) {
      const result = await deps.subtitleInventoryApiService.scanEpisodeDisk(episode.id);
      subtitlesFound += result.subtitlesFound;
      newSubtitles += result.newSubtitles;
    }

    return sendSuccess(reply, {
      success: true,
      message: 'Series subtitle scan completed',
      subtitlesFound,
      newSubtitles,
    });
  });

  app.post('/api/subtitles/series/:id/search', async (request, reply) => {
    if (!deps.subtitleAutomationService?.onEpisodeImported) {
      throw new ValidationError('Subtitle automation service is not configured');
    }

    const seriesId = parseIdParam((request.params as { id?: string }).id ?? '', 'series');
    const prisma = deps.prisma as any;
    const episodes = await prisma.episode.findMany({
      where: { seriesId },
      select: { id: true },
    });

    let episodesSearched = 0;
    let subtitlesDownloaded = 0;
    for (const episode of episodes) {
      const stats = await deps.subtitleAutomationService.onEpisodeImported(episode.id);
      episodesSearched += stats.variantsScanned;
      subtitlesDownloaded += stats.downloaded;
    }

    return sendSuccess(reply, {
      success: true,
      message: 'Series subtitle search completed',
      episodesSearched,
      subtitlesDownloaded,
    });
  });

  app.post<{ Params: { id: string; season: string } }>('/api/subtitles/series/:id/season/:season/search', {
    schema: {
      params: {
        type: 'object',
        required: ['id', 'season'],
        properties: {
          id: { type: 'string' },
          season: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.subtitleAutomationService?.onEpisodeImported) {
      throw new ValidationError('Subtitle automation service is not configured');
    }

    const seriesId = parseIdParam((request.params as { id?: string }).id ?? '', 'series');
    const seasonNumber = parseInt((request.params as { season?: string }).season ?? '', 10);
    if (isNaN(seasonNumber)) throw new ValidationError('Invalid season number');

    const prisma = deps.prisma as any;
    const episodes = await prisma.episode.findMany({
      where: { seriesId, seasonNumber },
      select: { id: true },
    });

    let episodesSearched = 0;
    let subtitlesDownloaded = 0;
    for (const episode of episodes) {
      const stats = await deps.subtitleAutomationService.onEpisodeImported(episode.id);
      episodesSearched += stats.variantsScanned;
      subtitlesDownloaded += stats.downloaded;
    }

    return sendSuccess(reply, {
      success: true,
      message: `Season ${seasonNumber} subtitle search completed`,
      episodesSearched,
      subtitlesDownloaded,
    });
  });
}
