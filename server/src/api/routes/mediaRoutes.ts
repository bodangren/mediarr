import type { FastifyInstance } from 'fastify';
import { ConflictError, ValidationError } from '../../errors/domainErrors';
import { paginateArray, parsePaginationParams, sendPaginatedSuccess, sendSuccess } from '../contracts';
import { sortByField } from '../routeUtils';
import type { ApiDependencies } from '../types';

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
        },
      },
    },
  }, async (request, reply) => {
    const body = request.body as CreateMediaBody;
    const mediaType = normalizeMediaType(body.mediaType);
    const monitored = body.monitored ?? true;
    const qualityProfileId = body.qualityProfileId ?? 1;

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

      const created = deps.mediaRepository?.upsertMovie
        ? await deps.mediaRepository.upsertMovie({
          tmdbId: body.tmdbId,
          imdbId: body.imdbId,
          title: body.title,
          cleanTitle: body.title.toLowerCase().replace(/\W+/g, ''),
          sortTitle: body.title.toLowerCase(),
          status: body.status ?? 'announced',
          overview: body.overview,
          monitored,
          qualityProfileId,
          year: body.year,
        })
        : await (deps.prisma as any).movie.create({
          data: {
            tmdbId: body.tmdbId,
            imdbId: body.imdbId,
            title: body.title,
            cleanTitle: body.title.toLowerCase().replace(/\W+/g, ''),
            sortTitle: body.title.toLowerCase(),
            status: body.status ?? 'announced',
            overview: body.overview,
            monitored,
            qualityProfileId,
            year: body.year,
          },
        });

      if (body.searchNow && deps.mediaSearchService?.searchMovie) {
        await deps.mediaSearchService.searchMovie(created);
      }

      return sendSuccess(reply, created, 201);
    }

    if (!body.tvdbId || !body.title || !body.year) {
      throw new ValidationError('tvdbId, title, and year are required for TV');
    }

    const duplicate = await (deps.prisma as any).series.findUnique({
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

    const created = deps.mediaRepository?.upsertSeries
      ? await deps.mediaRepository.upsertSeries({
        tvdbId: body.tvdbId,
        tmdbId: body.tmdbId,
        imdbId: body.imdbId,
        title: body.title,
        cleanTitle: body.title.toLowerCase().replace(/\W+/g, ''),
        sortTitle: body.title.toLowerCase(),
        status: body.status ?? 'continuing',
        overview: body.overview,
        monitored,
        qualityProfileId,
        year: body.year,
        network: body.network,
      })
      : await (deps.prisma as any).series.create({
        data: {
          tvdbId: body.tvdbId,
          tmdbId: body.tmdbId,
          imdbId: body.imdbId,
          title: body.title,
          cleanTitle: body.title.toLowerCase().replace(/\W+/g, ''),
          sortTitle: body.title.toLowerCase(),
          status: body.status ?? 'continuing',
          overview: body.overview,
          monitored,
          qualityProfileId,
          year: body.year,
          network: body.network,
        },
      });

    if (body.searchNow && deps.mediaSearchService?.getSearchCandidates) {
      await deps.mediaSearchService.getSearchCandidates({
        q: body.title,
      });
    }

    return sendSuccess(reply, created, 201);
  });
}
