import { createReadStream } from 'node:fs';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { PlaybackMediaType } from '../../db/schema';
import { ValidationError } from '../../errors/domainErrors';
import { sendSuccess } from '../contracts';
import { parseIdParam } from '../routeUtils';
import { sendByteRangeStream } from '../utils/byteRangeStreaming';
import type { ApiDependencies } from '../types';
import { auditSubtitles } from '../../services/SubtitleAuditService';

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
  if (extension === '.ass') {
    return 'text/x-ssa; charset=utf-8';
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

  /** Subtitle health audit: encoding and script problems, one actionable record per file. */
  app.get('/api/subtitles/audit', async (request, reply) => {
    const query = request.query as { limit?: string | number };
    const limit = Math.max(1, Math.min(5000, Number.parseInt(String(query.limit ?? '500'), 10) || 500));
    const prisma = deps.prisma as unknown as {
      variantSubtitleTrack?: {
        findMany(args: { select: Record<string, boolean>; take: number; where: unknown }): Promise<Array<{ filePath: string | null; languageCode: string | null }>>;
      };
    };
    if (!prisma.variantSubtitleTrack) {
      throw new ValidationError('Subtitle table is not available');
    }
    // Most rows are DB records without a downloaded file; the audit is about files on disk.
    const rows = await prisma.variantSubtitleTrack.findMany({
      select: { filePath: true, languageCode: true },
      take: limit,
      where: { AND: [{ filePath: { not: null } }, { filePath: { not: '' } }] },
    });
    const summary = await auditSubtitles(rows, { limit });
    return sendSuccess(reply, summary);
  });

  app.post('/api/playback/:id/watched', {
    schema: {
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      querystring: {
        type: 'object',
        required: ['type'],
        properties: {
          type: { type: 'string', enum: ['movie', 'episode'] },
          userId: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: { watched: { type: 'boolean' } },
      },
    },
  }, async (request, reply) => {
    if (!deps.playbackService?.markWatched || !deps.playbackService.markUnwatched) {
      throw new ValidationError('Playback service is not configured');
    }
    const mediaId = parseIdParam((request.params as { id: string }).id, 'playback media');
    const query = request.query as { type: string; userId?: string };
    const body = (request.body ?? {}) as { watched?: boolean };
    const mediaType = parsePlaybackType(query.type);
    const input = { mediaType, mediaId, ...(query.userId === undefined ? {} : { userId: query.userId }) };
    const state = body.watched === false
      ? await deps.playbackService.markUnwatched(input)
      : await deps.playbackService.markWatched(input);
    return sendSuccess(reply, state);
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
