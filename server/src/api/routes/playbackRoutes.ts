import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { PlaybackMediaType } from '@prisma/client';
import { ValidationError } from '../../errors/domainErrors';
import { sendSuccess } from '../contracts';
import { parseIdParam } from '../routeUtils';
import type { ApiDependencies } from '../types';

interface ByteRange {
  start: number;
  end: number;
}

const STREAM_MIME_TYPES: Record<string, string> = {
  '.mkv': 'video/x-matroska',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
};

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

function parseRangeHeader(rangeHeader: string, fileSize: number): ByteRange | null {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!match) {
    return null;
  }

  const rawStart = match[1] ?? '';
  const rawEnd = match[2] ?? '';

  if (rawStart.length === 0 && rawEnd.length === 0) {
    return null;
  }

  if (rawStart.length === 0) {
    const suffixLength = Number.parseInt(rawEnd, 10);
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) {
      return null;
    }

    const start = Math.max(fileSize - suffixLength, 0);
    return {
      start,
      end: fileSize - 1,
    };
  }

  const start = Number.parseInt(rawStart, 10);
  if (!Number.isInteger(start) || start < 0 || start >= fileSize) {
    return null;
  }

  if (rawEnd.length === 0) {
    return {
      start,
      end: fileSize - 1,
    };
  }

  const parsedEnd = Number.parseInt(rawEnd, 10);
  if (!Number.isInteger(parsedEnd) || parsedEnd < start) {
    return null;
  }

  return {
    start,
    end: Math.min(parsedEnd, fileSize - 1),
  };
}

function getStreamMimeType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  return STREAM_MIME_TYPES[extension] ?? 'application/octet-stream';
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

    const stats = await fs.stat(source.filePath);
    const fileSize = stats.size;
    const rangeHeader = request.headers.range;

    reply.header('Content-Type', getStreamMimeType(source.filePath));
    reply.header('Accept-Ranges', 'bytes');

    if (typeof rangeHeader !== 'string' || rangeHeader.trim().length === 0) {
      reply.header('Content-Length', fileSize);
      return reply.code(200).send(createReadStream(source.filePath));
    }

    const range = parseRangeHeader(rangeHeader, fileSize);
    if (!range) {
      reply.header('Content-Range', `bytes */${fileSize}`);
      return reply.code(416).send();
    }

    const chunkSize = range.end - range.start + 1;
    reply.header('Content-Range', `bytes ${range.start}-${range.end}/${fileSize}`);
    reply.header('Content-Length', chunkSize);

    return reply.code(206).send(createReadStream(source.filePath, {
      start: range.start,
      end: range.end,
    }));
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
