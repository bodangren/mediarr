import { createReadStream } from 'node:fs';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { PlaybackMediaType } from '../../db/schema';
import { ValidationError } from '../../errors/domainErrors';
import { sendSuccess } from '../contracts';
import { parseIdParam } from '../routeUtils';
import { sendByteRangeStream } from '../utils/byteRangeStreaming';
import type { ApiDependencies } from '../types';

function parsePlaybackType(rawType: unknown): PlaybackMediaType {
  if (typeof rawType !== 'string') {
    throw new ValidationError('Query parameter "type" is required (movie|episode)');
  }

  const normalized = rawType.trim().toLowerCase();
  if (normalized === 'movie') {
    return 'MOVIE';
  }

  if (normalized === 'episode') {
    return 'EPISODE';
  }

  throw new ValidationError('Query parameter "type" must be "movie" or "episode"');
}

function parseContinueWatchingLimit(rawLimit: unknown): number {
  if (rawLimit === undefined || rawLimit === null || rawLimit === '') {
    return 20;
  }

  const parsed = typeof rawLimit === 'number'
    ? rawLimit
    : Number.parseInt(String(rawLimit), 10);

  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 50) {
    throw new ValidationError('Query parameter "limit" must be an integer between 1 and 50');
  }

  return Math.trunc(parsed);
}

function getSubtitleMimeType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.vtt') {
    return 'text/vtt; charset=utf-8';
  }

  return 'application/x-subrip; charset=utf-8';
}

export function registerPlaybackRoutes(
  app: FastifyInstance,
  deps: ApiDependencies,
): void {
  app.get('/api/stream/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      querystring: {
        type: 'object',
        required: ['type'],
        properties: {
          type: { type: 'string', enum: ['movie', 'episode'] },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.playbackService?.resolveStreamSource) {
      throw new ValidationError('Playback service is not configured');
    }

    const mediaId = parseIdParam((request.params as { id: string }).id, 'playback media');
    const query = request.query as { type: string };
    const mediaType = parsePlaybackType(query.type);

    const source = await deps.playbackService.resolveStreamSource({
      mediaType,
      mediaId,
    });
    return sendByteRangeStream(reply, source.filePath, request.headers.range);
  });

  app.get('/api/playback/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      querystring: {
        type: 'object',
        required: ['type'],
        properties: {
          type: { type: 'string', enum: ['movie', 'episode'] },
          userId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.playbackService?.buildManifest) {
      throw new ValidationError('Playback service is not configured');
    }

    const mediaId = parseIdParam((request.params as { id: string }).id, 'playback media');
    const query = request.query as { type: string; userId?: string };
    const mediaType = parsePlaybackType(query.type);

    const manifest = await deps.playbackService.buildManifest({
      mediaType,
      mediaId,
      userId: query.userId,
    });

    return sendSuccess(reply, manifest);
  });

  app.get('/api/playback/continue-watching', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', minimum: 1, maximum: 50 },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.playbackService?.getContinueWatching) {
      throw new ValidationError('Playback service is not configured');
    }

    const query = request.query as { limit?: number | string };
    const limit = parseContinueWatchingLimit(query.limit);
    const items = await deps.playbackService.getContinueWatching(limit);
    return sendSuccess(reply, items);
  });

  app.post('/api/playback/progress', {
    schema: {
      body: {
        type: 'object',
        required: ['type', 'mediaId', 'position', 'duration'],
        properties: {
          type: { type: 'string', enum: ['movie', 'episode'] },
          mediaId: { type: 'number', minimum: 1 },
          userId: { type: 'string' },
          position: { type: 'number', minimum: 0 },
          duration: { type: 'number', minimum: 0 },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.playbackService?.recordHeartbeat) {
      throw new ValidationError('Playback service is not configured');
    }

    const body = request.body as {
      type: string;
      mediaId: number;
      userId?: string;
      position: number;
      duration: number;
    };

    const result = await deps.playbackService.recordHeartbeat({
      mediaType: parsePlaybackType(body.type),
      mediaId: body.mediaId,
      userId: body.userId,
      position: body.position,
      duration: body.duration,
    });

    return sendSuccess(reply, result);
  });

  app.get('/api/playback/subtitles/:trackId', {
    schema: {
      params: {
        type: 'object',
        required: ['trackId'],
        properties: {
          trackId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.playbackService?.resolveSubtitleTrack) {
      throw new ValidationError('Playback service is not configured');
    }

    const trackId = parseIdParam((request.params as { trackId: string }).trackId, 'subtitle track');
    const subtitle = await deps.playbackService.resolveSubtitleTrack(trackId);

    reply.header('Content-Type', getSubtitleMimeType(subtitle.filePath));
    return reply.code(200).send(createReadStream(subtitle.filePath));
  });
}
