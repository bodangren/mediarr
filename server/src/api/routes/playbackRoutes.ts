import { sql } from 'drizzle-orm';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { PlaybackMediaType } from '../../db/schema';
import { ValidationError } from '../../errors/domainErrors';
import { sendSuccess } from '../contracts';
import { parseIdParam } from '../routeUtils';
import { sendByteRangeStream } from '../utils/byteRangeStreaming';
import type { ApiDependencies } from '../types';
import { auditSubtitles, coverageStatus } from '../../services/SubtitleAuditService';
import { normalizeSubtitleScript } from '../../services/SubtitleScriptNormalizer';
import { readCoverageReceipts, snapshotCoverage } from '../../services/SubtitleCoverageAutomation';
import { queuePriorityWanted } from '../../services/SubtitleCoverageWanted';

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

  /**
   * EN+ZH coverage for what the owner is actually watching: recent progress rows (last N days or
   * in progress), resolved through their media variants to the downloaded subtitle languages.
   */
  app.get('/api/subtitles/priority-coverage', async (request, reply) => {
    const query = request.query as { days?: string | number; limit?: string | number };
    const days = Math.max(1, Math.min(90, Number.parseInt(String(query.days ?? '14'), 10) || 14));
    const limit = Math.max(1, Math.min(100, Number.parseInt(String(query.limit ?? '50'), 10) || 50));
    const drizzle = (deps.prisma as unknown as { drizzle: any }).drizzle;
    const schema = await import('../../db/schema');

    const since = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;
    const recent = await drizzle
      .select({
        mediaType: schema.playbackProgress.mediaType,
        mediaId: schema.playbackProgress.mediaId,
        position: schema.playbackProgress.position,
        isWatched: schema.playbackProgress.isWatched,
        updatedAt: schema.playbackProgress.updatedAt,
      })
      .from(schema.playbackProgress)
      .orderBy(sql`${schema.playbackProgress.updatedAt} DESC`)
      .limit(200);
    const wanted = recent.filter((row: { updatedAt: Date; isWatched: boolean; position: number }) =>
      (row.updatedAt.getTime() >= since * 1000) || (!row.isWatched && row.position > 0));

    const items = [];
    const counts = { dual: 0, 'zho-only': 0, 'en-only': 0, none: 0 };
    for (const row of wanted.slice(0, limit)) {
      const mediaType = row.mediaType === 'MOVIE' ? 'MOVIE' : 'EPISODE';
      const variants = await drizzle
        .select({ id: schema.mediaFileVariants.id })
        .from(schema.mediaFileVariants)
        .where(mediaType === 'MOVIE'
          ? sql`${schema.mediaFileVariants.mediaType} = 'MOVIE' AND ${schema.mediaFileVariants.movieId} = ${row.mediaId}`
          : sql`${schema.mediaFileVariants.mediaType} = 'EPISODE' AND ${schema.mediaFileVariants.episodeId} = ${row.mediaId}`);
      const languageCodes: string[] = [];
      for (const variant of variants) {
        const tracks = await drizzle
          .select({ languageCode: schema.variantSubtitleTracks.languageCode })
          .from(schema.variantSubtitleTracks)
          .where(sql`${schema.variantSubtitleTracks.variantId} = ${variant.id}`);
        for (const track of tracks) languageCodes.push(track.languageCode ?? '');
      }
      const status = coverageStatus(languageCodes);
      counts[status] += 1;
      let title: string | null = null;
      if (mediaType === 'MOVIE') {
        title = (await drizzle.select({ title: schema.movies.title }).from(schema.movies).where(sql`${schema.movies.id} = ${row.mediaId}`).limit(1))[0]?.title ?? null;
      } else {
        title = (await drizzle.select({ title: schema.episodes.title }).from(schema.episodes).where(sql`${schema.episodes.id} = ${row.mediaId}`).limit(1))[0]?.title ?? null;
      }
      items.push({ mediaType, mediaId: row.mediaId, title, status, languages: Array.from(new Set(languageCodes)).filter((code) => code.length > 0) });
    }

    return sendSuccess(reply, { days, items, counts, total: items.length });
  });

  /**
   * Honest status of subtitle fetching: queue state, how many failures carry a real error, how many
   * are stale rows from before error capture, and the latest watched-coverage counts.
   */
  /**
   * Traditional -> Simplified normalisation of Chinese subtitle files (owner request). Dry-run by
   * default; `live:true` writes a dated `.hant-YYYY-MM-DD` backup before the atomic replace.
   */
  app.post('/api/subtitles/normalize-script', async (request, reply) => {
    const body = (request.body ?? {}) as { live?: boolean; limit?: number };
    const live = body.live === true;
    const limit = Math.max(1, Math.min(3000, body.limit ?? 500));
    const drizzle = (deps.prisma as unknown as { drizzle: any }).drizzle;
    const schema = await import('../../db/schema');
    const rows = await drizzle
      .select({ filePath: schema.variantSubtitleTracks.filePath, languageCode: schema.variantSubtitleTracks.languageCode })
      .from(schema.variantSubtitleTracks)
      .where(sql`${schema.variantSubtitleTracks.filePath} IS NOT NULL AND ${schema.variantSubtitleTracks.filePath} != '' AND lower(${schema.variantSubtitleTracks.languageCode}) IN ('zho','chi','zh','cmn')`)
      .limit(limit);

    const results = [];
    for (const row of rows as Array<{ filePath: string | null }>) {
      if (!row.filePath) continue;
      results.push(await normalizeSubtitleScript(row.filePath, { live }));
    }
    const wouldConvert = results.filter((result) => result.action === 'would-convert').length;
    const converted = results.filter((result) => result.action === 'converted').length;
    const skipped = results.filter((result) => result.action === 'skipped').length;
    return sendSuccess(reply, {
      live,
      scanned: results.length,
      wouldConvert,
      converted,
      skipped,
      samples: results.filter((result) => result.action !== 'skipped').slice(0, 10),
    });
  });

  app.get('/api/subtitles/wanted/status', async (_request, reply) => {
    const drizzle = (deps.prisma as unknown as { drizzle: any }).drizzle;
    const schema = await import('../../db/schema');
    const rows = await drizzle
      .select({ state: schema.wantedSubtitles.state, attempts: schema.wantedSubtitles.attempts, lastError: schema.wantedSubtitles.lastError })
      .from(schema.wantedSubtitles);
    const counts: Record<string, number> = {};
    let staleFailures = 0;
    const errors: Record<string, number> = {};
    for (const row of rows as Array<{ state: string; attempts: number; lastError: string | null }>) {
      counts[row.state] = (counts[row.state] ?? 0) + 1;
      if (row.state === 'FAILED' && row.attempts === 0) staleFailures += 1;
      if (row.state === 'FAILED' && row.lastError) {
        errors[row.lastError] = (errors[row.lastError] ?? 0) + 1;
      }
    }
    const receipts = await readCoverageReceipts(process.env.CONFIG_DIR ?? '/config', 1);
    const latest = receipts.length > 0 ? receipts[receipts.length - 1]!.counts : null;

    return sendSuccess(reply, {
      counts,
      staleFailures,
      errors,
      latestCoverage: latest,
      retryBlockedReason: staleFailures > 0
        ? `${staleFailures} FAILED wanted rows predate error capture; retrying them requires an enabled subtitle provider`
        : null,
    });
  });

  /** Queue the missing languages for watched variants into WantedSubtitle. */
  app.post('/api/subtitles/priority-wanted', async (request, reply) => {
    const body = (request.body ?? {}) as { days?: number; limit?: number };
    const drizzle = (deps.prisma as unknown as { drizzle: any }).drizzle;
    const result = await queuePriorityWanted(drizzle, {
      configDir: process.env.CONFIG_DIR ?? '/config',
      days: typeof body.days === 'number' ? body.days : 14,
      limit: typeof body.limit === 'number' ? body.limit : 200,
    });
    return sendSuccess(reply, result);
  });

  /** Manual trigger for the daily priority-coverage snapshot (same function the scheduler calls). */
  app.post('/api/subtitles/coverage-snapshot', async (request, reply) => {
    const body = (request.body ?? {}) as { days?: number; limit?: number };
    const drizzle = (deps.prisma as unknown as { drizzle: any }).drizzle;
    const snapshot = await snapshotCoverage(drizzle, {
      configDir: process.env.CONFIG_DIR ?? '/config',
      days: typeof body.days === 'number' ? body.days : 14,
      limit: typeof body.limit === 'number' ? body.limit : 100,
    });
    return sendSuccess(reply, snapshot);
  });

  /** Recent coverage snapshots: proves the scheduled audit fired and how the gap changed. */
  app.get('/api/subtitles/coverage-receipts', async (request, reply) => {
    const query = request.query as { limit?: string | number };
    const limit = Math.max(1, Math.min(100, Number.parseInt(String(query.limit ?? '20'), 10) || 20));
    const receipts = await readCoverageReceipts(process.env.CONFIG_DIR ?? '/config', limit);
    return sendSuccess(reply, { receipts, count: receipts.length });
  });

  /** Subtitle health audit: encoding and script problems, one actionable record per file. */
  app.get('/api/subtitles/audit', async (request, reply) => {
    const query = request.query as { limit?: string | number };
    const limit = Math.max(1, Math.min(5000, Number.parseInt(String(query.limit ?? '500'), 10) || 500));
    const prisma = deps.prisma as unknown as {
      variantSubtitleTrack?: {
        findMany(args: { select: Record<string, boolean>; take: number; where: unknown }): Promise<Array<{ filePath: string | null; languageCode: string | null; variantId: number | null }>>;
      };
    };
    if (!prisma.variantSubtitleTrack) {
      throw new ValidationError('Subtitle table is not available');
    }
    // Most rows are DB records without a downloaded file; the audit is about files on disk.
    const rows = await prisma.variantSubtitleTrack.findMany({
      select: { filePath: true, languageCode: true, variantId: true },
      take: limit,
      where: { AND: [{ filePath: { not: null } }, { filePath: { not: '' } }] },
    });
    const summary = await auditSubtitles(rows, { limit });
    return sendSuccess(reply, summary);
  });

  /**
   * Marks every downloaded episode matching [episodeWhere] watched/unwatched.
   *
   * Shared by the series- and season-level actions so both write the same
   * playback_progress shape: a watched row is at the end of the episode with
   * progress 1, an unwatched row is at 0 with progress 0.
   */
  async function markEpisodesWatched(
    drizzle: any,
    episodeWhere: unknown,
    watched: boolean,
  ): Promise<number> {
    const schema = await import('../../db/schema');

    const episodes = await drizzle
      .select({ id: schema.episodes.id })
      .from(schema.episodes)
      .innerJoin(schema.mediaFileVariants, sql`${schema.mediaFileVariants.episodeId} = ${schema.episodes.id} AND ${schema.mediaFileVariants.mediaType} = 'EPISODE'`)
      .where(episodeWhere);
    const ids = Array.from(new Set((episodes as Array<{ id: number }>).map((episode) => episode.id)));

    let changed = 0;
    for (const mediaId of ids) {
      const existing = (await drizzle
        .select({ position: schema.playbackProgress.position, duration: schema.playbackProgress.duration })
        .from(schema.playbackProgress)
        .where(sql`${schema.playbackProgress.mediaType} = 'EPISODE' AND ${schema.playbackProgress.mediaId} = ${mediaId}`)
        .limit(1))[0];
      const duration = existing?.duration ?? 0;
      const values = {
        mediaType: 'EPISODE' as const,
        mediaId,
        userId: 'lan-default',
        position: watched ? duration : 0,
        duration,
        progress: watched ? 1 : 0,
        isWatched: watched,
        lastWatched: new Date(),
      };
      await drizzle
        .insert(schema.playbackProgress)
        .values(values)
        .onConflictDoUpdate({
          target: [schema.playbackProgress.mediaType, schema.playbackProgress.mediaId, schema.playbackProgress.userId],
          set: values,
        });
      changed += 1;
    }
    return changed;
  }

  /** Marks every downloaded episode of a series watched/unwatched in one action (TV context menu). */
  app.post('/api/playback/series/:id/watched', async (request, reply) => {
    const seriesId = Number.parseInt(String((request.params as { id?: string }).id ?? ''), 10);
    if (!Number.isInteger(seriesId) || seriesId <= 0) {
      throw new ValidationError('id must be a positive integer');
    }
    const body = (request.body ?? {}) as { watched?: boolean };
    const watched = body.watched !== false;
    const drizzle = (deps.prisma as unknown as { drizzle: any }).drizzle;
    const schema = await import('../../db/schema');
    const changed = await markEpisodesWatched(
      drizzle,
      sql`${schema.episodes.seriesId} = ${seriesId}`,
      watched,
    );
    return sendSuccess(reply, { seriesId, watched, episodes: changed });
  });

  /** Marks every downloaded episode of one season watched/unwatched (TV season chip menu). */
  app.post('/api/playback/season/:id/watched', async (request, reply) => {
    const seasonId = Number.parseInt(String((request.params as { id?: string }).id ?? ''), 10);
    if (!Number.isInteger(seasonId) || seasonId <= 0) {
      throw new ValidationError('id must be a positive integer');
    }
    const body = (request.body ?? {}) as { watched?: boolean };
    const watched = body.watched !== false;
    const drizzle = (deps.prisma as unknown as { drizzle: any }).drizzle;
    const schema = await import('../../db/schema');
    const changed = await markEpisodesWatched(
      drizzle,
      sql`${schema.episodes.seasonId} = ${seasonId}`,
      watched,
    );
    return sendSuccess(reply, { seasonId, watched, episodes: changed });
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

  /**
   * Explicit playback-session signal from the TV client (owner request 2026-11-21).
   *
   * `state: playing|paused` with `action: update|stop`. The engine keeps only an in-memory
   * set: while a client is PLAYING, heavy jobs (downloads, transcodes, thumbnails) stand
   * down so they cannot starve the stream on the shared USB volume. Paused sessions do not
   * count, so downloads resume the moment the owner pauses.
   */
  /** Diagnostics: which playback signals the engine currently holds. */
  app.get('/api/playback/session', async (_request, reply) => {
    const registry = deps.playbackSessionRegistry;
    if (!registry) return sendSuccess(reply, { playing: false, sessions: [] });
    return sendSuccess(reply, { playing: registry.isPlaying(), sessions: registry.active() });
  });

  app.post('/api/playback/session', {
    schema: {
      body: {
        type: 'object',
        required: ['type', 'mediaId', 'state'],
        properties: {
          type: { type: 'string', enum: ['movie', 'episode', 'youtube', 'adult'] },
          mediaId: { type: 'number', minimum: 1 },
          state: { type: 'string', enum: ['playing', 'paused'] },
          action: { type: 'string', enum: ['update', 'stop'] },
          sessionId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const registry = deps.playbackSessionRegistry;
    if (!registry) {
      throw new ValidationError('Playback sessions are not configured');
    }
    const body = request.body as {
      type: string;
      mediaId: number;
      state: 'playing' | 'paused';
      action?: 'update' | 'stop';
      sessionId?: string;
    };
    registry.update(
      {
        mediaType: body.type,
        mediaId: body.mediaId,
        state: body.state,
        sessionId: body.sessionId ?? null,
      },
      body.action === 'stop' ? 'stop' : 'update',
    );
    return sendSuccess(reply, { active: registry.isPlaying(), sessions: registry.active().length });
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
