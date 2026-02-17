import type { FastifyInstance } from 'fastify';
import { ValidationError, NotFoundError } from '../../errors/domainErrors';
import { sendSuccess, sendPaginatedSuccess, parsePaginationParams, paginateArray } from '../contracts';
import type { ApiDependencies } from '../types';
import type { SearchParams } from '../../services/MediaSearchService';

interface ReleaseSearchBody {
  query?: string;
  type?: 'generic' | 'tvsearch' | 'movie' | 'music' | 'book';
  season?: number;
  episode?: number;
  tvdbId?: number;
  imdbId?: string;
  tmdbId?: number;
  year?: number;
  artist?: string;
  album?: string;
  author?: string;
  title?: string;
  categories?: number[];
}

interface ReleaseGrabBody {
  guid: string;
  indexerId: number;
  downloadClientId?: number;
}

export function registerReleaseRoutes(
  app: FastifyInstance,
  deps: ApiDependencies,
): void {
  /**
   * POST /api/releases/search
   * Search all enabled indexers for releases matching the query.
   */
  app.post('/api/releases/search', {
    schema: {
      body: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          type: { type: 'string', enum: ['generic', 'tvsearch', 'movie', 'music', 'book'] },
          season: { type: 'number', minimum: 1 },
          episode: { type: 'number', minimum: 1 },
          tvdbId: { type: 'number' },
          imdbId: { type: 'string' },
          tmdbId: { type: 'number' },
          year: { type: 'number', minimum: 1900, maximum: 2100 },
          artist: { type: 'string' },
          album: { type: 'string' },
          author: { type: 'string' },
          title: { type: 'string' },
          categories: { type: 'array', items: { type: 'number' } },
        },
        additionalProperties: true,
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
    if (!deps.mediaSearchService?.searchAllIndexers) {
      throw new ValidationError('Media search service is not configured');
    }

    const body = (request.body ?? {}) as ReleaseSearchBody;
    const pagination = parsePaginationParams(request.query as Record<string, unknown>);

    // Build search params, only including defined values
    const searchParams: SearchParams = {};
    if (body.query) searchParams.query = body.query;
    if (body.type) searchParams.type = body.type;
    if (body.season !== undefined) searchParams.season = body.season;
    if (body.episode !== undefined) searchParams.episode = body.episode;
    if (body.tvdbId !== undefined) searchParams.tvdbId = body.tvdbId;
    if (body.imdbId) searchParams.imdbId = body.imdbId;
    if (body.tmdbId !== undefined) searchParams.tmdbId = body.tmdbId;
    if (body.year !== undefined) searchParams.year = body.year;
    if (body.artist) searchParams.artist = body.artist;
    if (body.album) searchParams.album = body.album;
    if (body.author) searchParams.author = body.author;
    if (body.title) searchParams.title = body.title;
    if (body.categories && body.categories.length > 0) searchParams.categories = body.categories;

    const result = await deps.mediaSearchService.searchAllIndexers(searchParams);

    // Apply pagination to releases
    const { items: paginatedReleases, totalCount } = paginateArray(
      result.releases,
      pagination.page,
      pagination.pageSize,
    );

    return sendPaginatedSuccess(reply, paginatedReleases, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalCount,
    });
  });

  /**
   * POST /api/releases/grab
   * Grab a specific release by GUID and indexer ID.
   */
  app.post('/api/releases/grab', {
    schema: {
      body: {
        type: 'object',
        required: ['guid', 'indexerId'],
        properties: {
          guid: { type: 'string' },
          indexerId: { type: 'number', minimum: 1 },
          downloadClientId: { type: 'number', minimum: 1 },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.mediaSearchService?.grabReleaseByGuid) {
      throw new ValidationError('Media search service is not configured');
    }

    const body = request.body as ReleaseGrabBody;

    if (!body.guid) {
      throw new ValidationError('Release GUID is required');
    }

    if (!body.indexerId) {
      throw new ValidationError('Indexer ID is required');
    }

    const result = await deps.mediaSearchService.grabReleaseByGuid(
      body.guid,
      body.indexerId,
      body.downloadClientId,
    );

    return sendSuccess(reply, {
      success: true,
      downloadId: result.infoHash,
      message: `Release successfully added to download client (infoHash: ${result.infoHash})`,
    });
  });

  /**
   * POST /api/releases/grab-candidate
   * Grab a release directly from a search candidate (for backward compatibility).
   * This accepts the full candidate object from search results.
   */
  app.post('/api/releases/grab-candidate', {
    schema: {
      body: {
        type: 'object',
        required: ['title'],
        properties: {
          indexer: { type: 'string' },
          indexerId: { type: 'number' },
          title: { type: 'string' },
          guid: { type: 'string' },
          size: { type: 'number' },
          seeders: { type: 'number' },
          leechers: { type: 'number' },
          indexerFlags: { type: 'string' },
          quality: { type: 'string' },
          age: { type: 'number' },
          magnetUrl: { type: 'string' },
          downloadUrl: { type: 'string' },
          infoHash: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.mediaSearchService?.grabRelease) {
      throw new ValidationError('Media search service is not configured');
    }

    const candidate = request.body as {
      indexer: string;
      indexerId: number;
      title: string;
      guid: string;
      size: number;
      seeders: number;
      leechers?: number;
      indexerFlags?: string;
      quality?: string;
      age?: number;
      magnetUrl?: string;
      downloadUrl?: string;
      infoHash?: string;
    };

    const result = await deps.mediaSearchService.grabRelease(candidate);

    return sendSuccess(reply, {
      success: true,
      downloadId: result.infoHash,
      message: `Release successfully added to download client (infoHash: ${result.infoHash})`,
    });
  });
}
