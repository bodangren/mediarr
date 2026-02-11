import type { FastifyInstance } from 'fastify';
import { ValidationError } from '../../errors/domainErrors';
import { sendSuccess } from '../contracts';
import { parseIdParam } from '../routeUtils';
import type { ApiDependencies } from '../types';

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
}
