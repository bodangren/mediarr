import type { FastifyInstance } from 'fastify';
import { ConflictError, InternalError, ValidationError } from '../../errors/domainErrors';
import { paginateArray, parsePaginationParams, sendPaginatedSuccess, sendSuccess } from '../contracts';
import { sortByField } from '../routeUtils';
import type { ApiDependencies } from '../types';
import { toSortTitle } from '../../utils/stringUtils';

interface CreateMediaBody {
  mediaType: 'TV' | 'MOVIE' | 'movie' | 'series';
  qualityProfileId?: number;
  monitored?: boolean;
  searchNow?: boolean;
  tmdbId?: number;
  tvdbId?: number;
  imdbId?: string;
  title?: string;
  year?: number;
  status?: string;
  overview?: string;
  network?: string;
  posterUrl?: string;
  tmdbCollectionId?: number;
}

function normalizeMediaType(mediaType: string): 'TV' | 'MOVIE' {
  const normalized = mediaType.toUpperCase();
  if (normalized === 'TV' || normalized === 'SERIES') {
    return 'TV';
  }

  if (normalized === 'MOVIE') {
    return 'MOVIE';
  }

  throw new ValidationError('mediaType must be TV or MOVIE');
}

function sanitizeSort(
  sortBy: string | undefined,
  fallback: string,
  allowed: string[],
): string {
  if (!sortBy) {
    return fallback;
  }

  return allowed.includes(sortBy) ? sortBy : fallback;
}

export function registerMediaRoutes(
  app: FastifyInstance,
  deps: ApiDependencies,
): void {
  app.get('/api/media/wanted', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: ['number', 'string'] },
          pageSize: { type: ['number', 'string'] },
          sortBy: { type: 'string' },
          sortDir: { type: 'string' },
          type: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const pagination = parsePaginationParams(query);

    const missingEpisodes = deps.wantedService?.getMissingEpisodes
      ? await deps.wantedService.getMissingEpisodes()
      : [];

    const wantedMovies = deps.mediaService?.getMovieCandidatesForSearch
      ? await deps.mediaService.getMovieCandidatesForSearch()
      : await (deps.prisma as any).movie?.findMany?.({
        where: {
          monitored: true,
          path: null,
        },
      }) ?? [];

    const combined = [
      ...missingEpisodes.map((episode: any) => ({
        type: 'episode',
        id: episode.id,
        seriesId: episode.seriesId,
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
        title: episode.title,
        monitored: episode.monitored,
        airDateUtc: episode.airDateUtc,
        seriesTitle: episode.series?.title,
      })),
      ...wantedMovies.map((movie: any) => ({
        type: 'movie',
        id: movie.id,
        tmdbId: movie.tmdbId,
        title: movie.title,
        year: movie.year,
        monitored: movie.monitored,
        status: movie.status,
      })),
    ];

    const typeFilter =
      typeof query.type === 'string' && query.type.trim().length > 0
        ? query.type.toLowerCase()
        : undefined;

    const filtered =
      typeFilter === 'movie' || typeFilter === 'episode'
        ? combined.filter(item => item.type === typeFilter)
        : combined;

    const sorted = sortByField(
      filtered,
      sanitizeSort(
        pagination.sortBy,
        'title',
        ['title', 'type', 'year', 'seasonNumber', 'episodeNumber'],
      ),
      pagination.sortDir ?? 'asc',
    );

    const paged = paginateArray(sorted, pagination.page, pagination.pageSize);

    return sendPaginatedSuccess(reply, paged.items, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalCount: paged.totalCount,
    });
  });

  app.post('/api/media/search', {
    schema: {
      body: {
        type: 'object',
        required: ['term', 'mediaType'],
        properties: {
          term: { type: 'string' },
          mediaType: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const body = request.body as { term: string; mediaType: string };
    if (!deps.metadataProvider?.searchMedia) {
      throw new ValidationError('Metadata provider is not configured');
    }

    const results = await deps.metadataProvider.searchMedia({
      term: body.term,
      mediaType: normalizeMediaType(body.mediaType),
    });

    return sendSuccess(reply, results);
  });

  app.get('/api/search', {
    schema: {
      querystring: {
        type: 'object',
        required: ['term'],
        properties: {
          term: { type: 'string', minLength: 1 },
          mediaType: { type: 'string', enum: ['TV', 'MOVIE', 'tv', 'movie', 'series'] },
        },
      },
    },
  }, async (request, reply) => {
    const query = request.query as { term: string; mediaType?: string };
    if (!deps.metadataProvider?.searchMedia) {
      throw new ValidationError('Metadata provider is not configured');
    }

    try {
      const results = await deps.metadataProvider.searchMedia({
        term: query.term,
        mediaType: query.mediaType ? normalizeMediaType(query.mediaType) : undefined,
      });

      return sendSuccess(reply, results);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new InternalError(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  async function resolveRootFolders(): Promise<{ movieRootFolder: string; tvRootFolder: string }> {
    if (!deps.settingsService?.get) {
      return { movieRootFolder: '', tvRootFolder: '' };
    }
    const settings = await deps.settingsService.get();
    return {
      movieRootFolder: settings.mediaManagement?.movieRootFolder ?? '',
      tvRootFolder: settings.mediaManagement?.tvRootFolder ?? '',
    };
  }

  function buildMediaPath(rootFolder: string, title: string, year: number): string | null {
    if (!rootFolder) return null;
    return `${rootFolder}/${title} (${year})`;
  }

  async function handleCreateMedia(request: any, reply: any) {
    const body = request.body as CreateMediaBody;
    const mediaType = normalizeMediaType(body.mediaType);
    const monitored = body.monitored ?? true;
    const qualityProfileId = body.qualityProfileId ?? 1;
    const { movieRootFolder, tvRootFolder } = await resolveRootFolders();

    if (mediaType === 'MOVIE') {
      if (!body.tmdbId || !body.title || !body.year) {
        throw new ValidationError('tmdbId, title, and year are required for MOVIE');
      }

      const duplicate = deps.mediaRepository?.findMovieByTmdbId
        ? await deps.mediaRepository.findMovieByTmdbId(body.tmdbId)
        : await (deps.prisma as any).movie.findUnique({
          where: {
            tmdbId: body.tmdbId,
          },
        });

      if (duplicate) {
        throw new ConflictError('Movie already exists', {
          existingId: duplicate.id,
          tmdbId: body.tmdbId,
        });
      }

      const moviePath = buildMediaPath(movieRootFolder, body.title, body.year);

      const created = deps.mediaRepository?.upsertMovie
        ? await deps.mediaRepository.upsertMovie({
          tmdbId: body.tmdbId,
          imdbId: body.imdbId,
          title: body.title,
          cleanTitle: body.title.toLowerCase().replace(/\W+/g, ''),
          sortTitle: toSortTitle(body.title),
          status: body.status ?? 'announced',
          overview: body.overview,
          monitored,
          qualityProfileId,
          year: body.year,
          posterUrl: body.posterUrl,
          path: moviePath,
        })
        : await (deps.prisma as any).movie.create({
          data: {
            tmdbId: body.tmdbId,
            imdbId: body.imdbId,
            title: body.title,
            cleanTitle: body.title.toLowerCase().replace(/\W+/g, ''),
            sortTitle: toSortTitle(body.title),
            status: body.status ?? 'announced',
            overview: body.overview,
            monitored,
            qualityProfileId,
            year: body.year,
            posterUrl: body.posterUrl,
            path: moviePath,
          },
        });

      if (body.searchNow && deps.mediaSearchService?.searchMovie) {
        await deps.mediaSearchService.searchMovie(created);
      }

      if (body.tmdbCollectionId && deps.collectionService?.linkMovieToCollection) {
        // Fire-and-forget: link movie to its TMDB collection asynchronously
        void deps.collectionService.linkMovieToCollection(body.tmdbCollectionId, created.id);
      }

      return sendSuccess(reply, created, 201);
    }

    if (!body.tvdbId || !body.title || !body.year) {
      throw new ValidationError('tvdbId, title, and year are required for TV');
    }

    const duplicate = deps.mediaRepository?.findSeriesByTvdbId
      ? await deps.mediaRepository.findSeriesByTvdbId(body.tvdbId)
      : await (deps.prisma as any).series.findUnique({
        where: {
          tvdbId: body.tvdbId,
        },
      });

    if (duplicate) {
      throw new ConflictError('Series already exists', {
        existingId: duplicate.id,
        tvdbId: body.tvdbId,
      });
    }

    const seriesPath = buildMediaPath(tvRootFolder, body.title, body.year);

    const created = deps.mediaRepository?.upsertSeries
      ? await deps.mediaRepository.upsertSeries({
        tvdbId: body.tvdbId,
        tmdbId: body.tmdbId,
        imdbId: body.imdbId,
        title: body.title,
        cleanTitle: body.title.toLowerCase().replace(/\W+/g, ''),
        sortTitle: toSortTitle(body.title),
        status: body.status ?? 'continuing',
        overview: body.overview,
        monitored,
        qualityProfileId,
        year: body.year,
        network: body.network,
        posterUrl: body.posterUrl,
        path: seriesPath,
      })
      : await (deps.prisma as any).series.create({
        data: {
          tvdbId: body.tvdbId,
          tmdbId: body.tmdbId,
          imdbId: body.imdbId,
          title: body.title,
          cleanTitle: body.title.toLowerCase().replace(/\W+/g, ''),
          sortTitle: toSortTitle(body.title),
          status: body.status ?? 'continuing',
          overview: body.overview,
          monitored,
          qualityProfileId,
          year: body.year,
          network: body.network,
          posterUrl: body.posterUrl,
          path: seriesPath,
        },
      });

    if (body.searchNow && deps.mediaSearchService?.getSearchCandidates) {
      await deps.mediaSearchService.getSearchCandidates({
        q: body.title,
      });
    }

    return sendSuccess(reply, created, 201);
  }

  app.post('/api/wanted/search-all', async (request, reply) => {
    if (!deps.wantedSearchService?.autoSearchAll) {
      throw new InternalError('Wanted search service is not available');
    }
    
    // Fire and forget, don't wait for completion
    void deps.wantedSearchService.autoSearchAll();
    
    return sendSuccess(reply, { message: 'Background search triggered for all wanted media' });
  });

  app.post('/api/media/:id/auto-search', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: ['number', 'string'] },
        },
      },
      body: {
        type: 'object',
        required: ['type'],
        properties: {
          type: { type: 'string', enum: ['movie', 'episode'] },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.wantedSearchService?.autoSearchMovie || !deps.wantedSearchService?.autoSearchEpisode) {
      throw new InternalError('Wanted search service is not available');
    }

    const { id } = request.params as { id: string | number };
    const { type } = request.body as { type: 'movie' | 'episode' };
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;

    if (isNaN(numericId)) {
      throw new ValidationError('Invalid ID');
    }

    let result;
    if (type === 'movie') {
      result = await deps.wantedSearchService.autoSearchMovie(numericId);
    } else {
      result = await deps.wantedSearchService.autoSearchEpisode(numericId);
    }

    if (!result.success) {
      return reply.status(404).send({ success: false, error: result.reason });
    }

    return sendSuccess(reply, result);
  });

  app.post('/api/media', {
    schema: {
      body: {
        type: 'object',
        required: ['mediaType'],
        properties: {
          mediaType: { type: 'string' },
          qualityProfileId: { type: 'number' },
          monitored: { type: 'boolean' },
          searchNow: { type: 'boolean' },
          tmdbId: { type: 'number' },
          tvdbId: { type: 'number' },
          imdbId: { type: 'string' },
          title: { type: 'string' },
          year: { type: 'number' },
          status: { type: 'string' },
          overview: { type: 'string' },
          network: { type: 'string' },
          posterUrl: { type: 'string' },
        },
      },
    },
  }, handleCreateMedia);

  app.post('/api/wanted', {
    schema: {
      body: {
        type: 'object',
        required: ['mediaType'],
        properties: {
          mediaType: { type: 'string' },
          qualityProfileId: { type: 'number' },
          monitored: { type: 'boolean' },
          searchNow: { type: 'boolean' },
          tmdbId: { type: 'number' },
          tvdbId: { type: 'number' },
          imdbId: { type: 'string' },
          title: { type: 'string' },
          year: { type: 'number' },
          status: { type: 'string' },
          overview: { type: 'string' },
          network: { type: 'string' },
          posterUrl: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const body = request.body as CreateMediaBody;
    const mediaType = normalizeMediaType(body.mediaType);

    // Delegate to the shared handler to create the record and send the response.
    await handleCreateMedia(request, reply);

    // After the response is sent (or queued), fire background episode population
    // for TV series only.
    if (mediaType === 'TV' && body.tvdbId) {
      const tvdbId = body.tvdbId;

      // Resolve the series id from the just-created record so we can associate
      // seasons/episodes correctly.
      const resolveSeriesId = async (): Promise<number | null> => {
        if (deps.mediaRepository?.findSeriesByTvdbId) {
          const s = await deps.mediaRepository.findSeriesByTvdbId(tvdbId);
          return s?.id ?? null;
        }

        const s = await (deps.prisma as any).series?.findUnique?.({ where: { tvdbId } });
        return s?.id ?? null;
      };

      Promise.resolve().then(async () => {
        try {
          const seriesId = await resolveSeriesId();
          if (seriesId == null) {
            return;
          }

          if (!deps.metadataProvider?.getSeriesDetails || !deps.mediaRepository?.upsertSeasonsAndEpisodes) {
            return;
          }

          const details = await deps.metadataProvider.getSeriesDetails(tvdbId);
          await deps.mediaRepository.upsertSeasonsAndEpisodes(seriesId, details);
        } catch (err) {
          console.error('[wanted] Failed to populate episodes:', err);
        }
      });
    }
  });
}
