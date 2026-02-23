import type { FastifyInstance } from 'fastify';
import { ValidationError } from '../../errors/domainErrors';
import { sendSuccess } from '../contracts';
import { parseIdParam } from '../routeUtils';
import type { ApiDependencies } from '../types';

const ALLOWED_UPLOAD_EXTENSIONS = new Set(['.srt', '.ass', '.ssa', '.sub', '.vtt']);

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
    if (!ALLOWED_UPLOAD_EXTENSIONS.has(extension)) {
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

  /**
   * PUT /api/subtitles/movies/bulk
   * Bulk update language profile for multiple movies
   *
   * Body:
   * - movieIds: number[] - Array of movie IDs to update
   * - languageProfileId: number - Language profile ID to assign
   *
   * Returns: { updatedCount: number }
   */
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
    const prismaMovie = (deps.prisma as any).movie;
    if (!prismaMovie?.updateMany) {
      throw new ValidationError('Movie data source is not configured');
    }

    const body = request.body as {
      movieIds: number[];
      languageProfileId: number;
    };

    // Validate movieIds is a non-empty array
    if (!Array.isArray(body.movieIds) || body.movieIds.length === 0) {
      throw new ValidationError('movieIds must be a non-empty array');
    }

    // Validate languageProfileId is a positive number
    if (typeof body.languageProfileId !== 'number' || body.languageProfileId <= 0) {
      throw new ValidationError('languageProfileId must be a positive number');
    }

    // Perform bulk update in a transaction
    const result = await deps.prisma.$transaction(async (tx: any) => {
      return tx.movie.updateMany({
        where: {
          id: { in: body.movieIds },
        },
        data: {
          languageProfileId: body.languageProfileId,
        },
      });
    });

    return sendSuccess(reply, { updatedCount: result.count });
  });
}
