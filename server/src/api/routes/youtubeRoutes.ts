import { createReadStream } from 'node:fs';
import fsp from 'node:fs/promises';
import pathPosix from 'node:path/posix';
import type { FastifyInstance } from 'fastify';
import { and, asc, desc, eq } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { applyYoutubeProgress, parseSubscriptionUrl, retentionEligible } from '../../services/YoutubeLibrary';
import { restoreYoutubeRetention } from '../../services/YoutubeRetentionService';
import { readRetentionReceipts, runRetention } from '../../services/YoutubeAutomation';
import { YoutubeFeedPoller } from '../../services/YoutubeFeedPoller';
import { YoutubeDownloadService } from '../../services/YoutubeDownloadService';
import { sendSuccess } from '../contracts';
import type { ApiDependencies } from '../types';

/**
 * YouTube library subscriptions (track feature_youtube_library_20261107, Phase 1).
 *
 * Own route module under `/api/youtube/*`: the poller and retention logic read from these
 * subscriptions, and Movies/TV handlers never touch these tables.
 */
export function registerYoutubeRoutes(app: FastifyInstance, deps: ApiDependencies): void {
  const drizzle = (deps.prisma as unknown as { drizzle: any }).drizzle;
  const poller = new YoutubeFeedPoller();

  app.get('/api/youtube/subscriptions', async (_request, reply) => {
    const rows = await drizzle
      .select()
      .from(schema.youtubeSubscriptions)
      .orderBy(asc(schema.youtubeSubscriptions.added));
    return sendSuccess(reply, rows);
  });

  app.post('/api/youtube/subscriptions', async (request, reply) => {
    const body = (request.body ?? {}) as { url?: string; title?: string; kind?: string };
    const url = typeof body.url === 'string' ? body.url.trim() : '';
    const parsed = parseSubscriptionUrl(url);
    if (!parsed) {
      return reply.code(422).send({
        ok: false,
        error: {
          code: 'INVALID_SUBSCRIPTION',
          message: 'url must be a YouTube channel (UC… or @handle) or playlist URL, not a video',
        },
      });
    }
    if (body.kind !== undefined && body.kind !== parsed.kind) {
      return reply.code(422).send({
        ok: false,
        error: { code: 'KIND_MISMATCH', message: `url is a ${parsed.kind}, not ${String(body.kind)}` },
      });
    }

    const existing = await drizzle
      .select()
      .from(schema.youtubeSubscriptions)
      .where(eq(schema.youtubeSubscriptions.url, url))
      .limit(1);
    if (existing[0]) {
      return sendSuccess(reply, existing[0]);
    }

    const row = (await drizzle
      .insert(schema.youtubeSubscriptions)
      .values({
        kind: parsed.kind,
        url,
        externalId: parsed.externalId,
        title: typeof body.title === 'string' && body.title.trim().length > 0 ? body.title.trim() : null,
        enabled: true,
        options: {},
      })
      .returning())[0];
    return reply.code(201).send({ ok: true, data: row });
  });

  /** Poll one subscription now; the scheduled task will call the same service. */
  app.post('/api/youtube/subscriptions/:id/poll', async (request, reply) => {
    const id = Number.parseInt(String((request.params as { id?: string }).id ?? ''), 10);
    if (!Number.isInteger(id) || id <= 0) {
      return reply.code(422).send({ ok: false, error: { code: 'INVALID_ID', message: 'id must be a positive integer' } });
    }
    const row = (await drizzle
      .select()
      .from(schema.youtubeSubscriptions)
      .where(eq(schema.youtubeSubscriptions.id, id))
      .limit(1))[0];
    if (!row) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Subscription not found' } });
    }

    const result = await poller.poll(
      { id: row.id, url: row.url, title: row.title },
      {
        videos: {
          existingVideoIds: async () => new Set(
            (await drizzle.select({ videoId: schema.youtubeVideos.videoId }).from(schema.youtubeVideos))
              .map((video: { videoId: string }) => video.videoId),
          ),
          findByVideoId: async (videoId: string) => (await drizzle
            .select({ id: schema.youtubeVideos.id })
            .from(schema.youtubeVideos)
            .where(eq(schema.youtubeVideos.videoId, videoId))
            .limit(1))[0] ?? null,
          insert: async (entry) => (await drizzle
            .insert(schema.youtubeVideos)
            .values({
              subscriptionId: entry.subscriptionId,
              videoId: entry.videoId,
              source: 'SUBSCRIPTION',
              title: entry.title,
              channel: entry.channel ?? null,
              durationSeconds: entry.durationSeconds ?? null,
              publishedAt: entry.publishedAt ?? null,
              status: 'PENDING',
            })
            .returning({ id: schema.youtubeVideos.id }))[0],
        },
        recordPoll: async (subscriptionId, outcome) => {
          await drizzle.update(schema.youtubeSubscriptions)
            .set({ lastPolledAt: outcome.at, lastError: outcome.error ?? null })
            .where(eq(schema.youtubeSubscriptions.id, subscriptionId));
        },
      },
    );

    return sendSuccess(reply, result);
  });

  /** Playback progress; watched is monotonic and drives Phase 3 retention. */
  app.post('/api/youtube/videos/:id/progress', async (request, reply) => {
    const id = Number.parseInt(String((request.params as { id?: string }).id ?? ''), 10);
    if (!Number.isInteger(id) || id <= 0) {
      return reply.code(422).send({ ok: false, error: { code: 'INVALID_ID', message: 'id must be a positive integer' } });
    }
    const body = (request.body ?? {}) as { position?: number; duration?: number };
    const current = (await drizzle
      .select({ position: schema.youtubeVideos.position, isWatched: schema.youtubeVideos.isWatched })
      .from(schema.youtubeVideos)
      .where(eq(schema.youtubeVideos.id, id))
      .limit(1))[0];
    if (!current) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Video not found' } });
    }
    const update = applyYoutubeProgress(current, {
      positionSeconds: Number(body.position ?? 0),
      durationSeconds: typeof body.duration === 'number' ? body.duration : null,
    });
    const patch: Record<string, unknown> = {
      position: update.position,
      lastPlayedAt: new Date(),
    };
    if (update.isWatched && !current.isWatched) {
      patch.isWatched = true;
      patch.watchedAt = new Date();
    }
    await drizzle.update(schema.youtubeVideos).set(patch).where(eq(schema.youtubeVideos.id, id));
    return sendSuccess(reply, { id, ...update });
  });

  /** Run retention now (scheduled job uses the same function) and write a receipt. */
  app.post('/api/youtube/retention/run', async (request, reply) => {
    const body = (request.body ?? {}) as { days?: number; dryRun?: boolean };
    const days = Math.max(1, Math.min(365, Number.parseInt(String(body.days ?? '7'), 10) || 7));
    const mediaRoot = process.env.YOUTUBE_DIR ?? '/data/Youtube';
    const receipt = await runRetention(drizzle, {
      configDir: process.env.CONFIG_DIR ?? '/config',
      mediaRoot,
      quarantineRoot: process.env.QUARANTINE_DIR ?? pathPosix.join(mediaRoot, '_quarantine'),
      retentionDays: days,
      dryRun: body.dryRun !== false,
    });
    return sendSuccess(reply, receipt);
  });

  /** Recent retention receipts, newest last: proof the nightly job fired and what it did. */
  app.get('/api/youtube/retention/receipts', async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const limit = Math.max(1, Math.min(200, Number.parseInt(String(query.limit ?? '20'), 10) || 20));
    const receipts = await readRetentionReceipts(process.env.CONFIG_DIR ?? '/config', limit);
    return sendSuccess(reply, { receipts, count: receipts.length });
  });

  /** Restore one quarantined video back to its original path. */
  app.post('/api/youtube/retention/restore', async (request, reply) => {
    const body = (request.body ?? {}) as { id?: number; dryRun?: boolean };
    const id = Number.parseInt(String(body.id ?? ''), 10);
    const mediaRoot = process.env.YOUTUBE_DIR ?? '/data/Youtube';
    const quarantineRoot = process.env.QUARANTINE_DIR ?? pathPosix.join(mediaRoot, '_quarantine');
    const row = (await drizzle
      .select({ id: schema.youtubeVideos.id, path: schema.youtubeVideos.path, status: schema.youtubeVideos.status })
      .from(schema.youtubeVideos)
      .where(eq(schema.youtubeVideos.id, id))
      .limit(1))[0];
    if (!row?.path) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'No quarantined path for this video' } });
    }
    if (row.status !== 'QUARANTINED') {
      return reply.code(422).send({ ok: false, error: { code: 'NOT_QUARANTINED', message: 'Video is not quarantined' } });
    }
    const relative = pathPosix.relative(quarantineRoot, row.path);
    if (relative.startsWith('..') || pathPosix.isAbsolute(relative)) {
      return reply.code(422).send({ ok: false, error: { code: 'OUTSIDE_QUARANTINE', message: 'Path is outside the quarantine root' } });
    }
    const originalPath = pathPosix.join(mediaRoot, relative);
    const dryRun = body.dryRun !== false;
    const result = await restoreYoutubeRetention(
      { originalPath, quarantinePath: row.path },
      {
        io: {
          mkdir: (dir, options) => fsp.mkdir(dir, options),
          rename: (from, to) => fsp.rename(from, to),
          copyFile: (from, to) => fsp.copyFile(from, to),
          unlink: (file) => fsp.unlink(file),
          stat: async (file) => ({ size: (await fsp.stat(file)).size }),
        },
        dryRun,
      },
    );
    if (!dryRun && result.restored) {
      await drizzle.update(schema.youtubeVideos).set({
        status: 'AVAILABLE',
        path: originalPath,
      }).where(eq(schema.youtubeVideos.id, id));
    }
    return sendSuccess(reply, { id, originalPath, dryRun, ...result });
  });

  /** Permanently delete one quarantined file (guarded: only inside the quarantine root). */
  app.post('/api/youtube/retention/purge', async (request, reply) => {
    const body = (request.body ?? {}) as { id?: number; dryRun?: boolean };
    const id = Number.parseInt(String(body.id ?? ''), 10);
    const mediaRoot = process.env.YOUTUBE_DIR ?? '/data/Youtube';
    const quarantineRoot = process.env.QUARANTINE_DIR ?? pathPosix.join(mediaRoot, '_quarantine');
    const row = (await drizzle
      .select({ id: schema.youtubeVideos.id, path: schema.youtubeVideos.path, status: schema.youtubeVideos.status })
      .from(schema.youtubeVideos)
      .where(eq(schema.youtubeVideos.id, id))
      .limit(1))[0];
    if (!row?.path || row.status !== 'QUARANTINED') {
      return reply.code(422).send({ ok: false, error: { code: 'NOT_QUARANTINED', message: 'Video is not quarantined' } });
    }
    const relative = pathPosix.relative(quarantineRoot, row.path);
    if (relative.startsWith('..') || pathPosix.isAbsolute(relative)) {
      return reply.code(422).send({ ok: false, error: { code: 'OUTSIDE_QUARANTINE', message: 'Refusing to delete outside the quarantine root' } });
    }
    const dryRun = body.dryRun !== false;
    if (!dryRun) {
      await fsp.unlink(row.path).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error;
      });
      await drizzle.update(schema.youtubeVideos).set({
        status: 'DELETED',
        path: null,
      }).where(eq(schema.youtubeVideos.id, id));
    }
    return sendSuccess(reply, { id, dryRun, deleted: !dryRun });
  });

  /** Dry-run retention list: watched subscription videos older than 7 days. Read-only. */
  app.get('/api/youtube/retention/candidates', async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const days = Math.max(1, Math.min(365, Number.parseInt(String(query.days ?? '7'), 10) || 7));
    const rows = await drizzle
      .select({
        id: schema.youtubeVideos.id,
        videoId: schema.youtubeVideos.videoId,
        title: schema.youtubeVideos.title,
        source: schema.youtubeVideos.source,
        isWatched: schema.youtubeVideos.isWatched,
        watchedAt: schema.youtubeVideos.watchedAt,
        path: schema.youtubeVideos.path,
      })
      .from(schema.youtubeVideos)
      .where(eq(schema.youtubeVideos.status, 'AVAILABLE'));
    const now = new Date();
    const candidates = rows.filter((row: Record<string, unknown>) =>
      retentionEligible(
        {
          isWatched: Boolean(row.isWatched),
          watchedAt: row.watchedAt instanceof Date ? row.watchedAt : null,
          source: String(row.source),
        },
        now,
        days,
      ),
    );
    return sendSuccess(reply, { retentionDays: days, candidates, count: candidates.length });
  });

  /** Download queued videos now; the scheduled task will call the same service. */
  /** Library listing: playable videos with their channel; the SPA/TV render from this. */
  app.get('/api/youtube/videos', async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const limit = Math.min(500, Math.max(1, Number.parseInt(String(query.limit ?? '200'), 10) || 200));
    const rows = await drizzle
      .select({
        id: schema.youtubeVideos.id,
        videoId: schema.youtubeVideos.videoId,
        title: schema.youtubeVideos.title,
        channel: schema.youtubeVideos.channel,
        durationSeconds: schema.youtubeVideos.durationSeconds,
        publishedAt: schema.youtubeVideos.publishedAt,
        isWatched: schema.youtubeVideos.isWatched,
        position: schema.youtubeVideos.position,
        added: schema.youtubeVideos.added,
      })
      .from(schema.youtubeVideos)
      .where(and(eq(schema.youtubeVideos.status, 'AVAILABLE'), eq(schema.youtubeVideos.source, 'SUBSCRIPTION')))
      .orderBy(desc(schema.youtubeVideos.added))
      .limit(limit);
    return sendSuccess(reply, {
      items: rows.map((row: Record<string, unknown>) => ({
        ...row,
        streamUrl: `/api/youtube/videos/${row.id}/stream`,
        thumbUrl: `/api/youtube/videos/${row.id}/thumbnail`,
      })),
      count: rows.length,
    });
  });

  app.get('/api/youtube/videos/:id/stream', async (request, reply) => {
    const id = Number.parseInt(String((request.params as { id?: string }).id ?? ''), 10);
    if (!Number.isInteger(id) || id <= 0) {
      return reply.code(422).send({ ok: false, error: { code: 'INVALID_ID', message: 'id must be a positive integer' } });
    }
    const row = (await drizzle
      .select({ path: schema.youtubeVideos.path })
      .from(schema.youtubeVideos)
      .where(eq(schema.youtubeVideos.id, id))
      .limit(1))[0];
    if (!row?.path) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'No downloaded file for this video' } });
    }
    let size: number;
    try {
      size = (await fsp.stat(row.path)).size;
    } catch {
      return reply.code(404).send({ ok: false, error: { code: 'FILE_MISSING', message: 'File is missing on disk' } });
    }
    const range = request.headers.range;
    if (typeof range === 'string') {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      if (match) {
        const start = match[1] === '' ? Math.max(0, size - Number(match[2])) : Number(match[1]);
        const end = match[2] === '' || match[1] === '' ? size - 1 : Math.min(Number(match[2]), size - 1);
        if (start >= size || start > end) {
          return reply.code(416).header('Content-Range', `bytes */${size}`).send();
        }
        reply.code(206);
        reply.header('Content-Type', 'video/mp4');
        reply.header('Accept-Ranges', 'bytes');
        reply.header('Content-Range', `bytes ${start}-${end}/${size}`);
        reply.header('Content-Length', String(end - start + 1));
        return reply.send(createReadStream(row.path, { start, end }));
      }
    }
    reply.header('Content-Type', 'video/mp4');
    reply.header('Accept-Ranges', 'bytes');
    reply.header('Content-Length', String(size));
    return reply.send(createReadStream(row.path));
  });

  app.get('/api/youtube/videos/:id/thumbnail', async (request, reply) => {
    const id = Number.parseInt(String((request.params as { id?: string }).id ?? ''), 10);
    const row = (await drizzle
      .select({ thumbPath: schema.youtubeVideos.thumbPath })
      .from(schema.youtubeVideos)
      .where(eq(schema.youtubeVideos.id, id))
      .limit(1))[0];
    if (!row?.thumbPath) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'No thumbnail for this video' } });
    }
    try {
      const file = await fsp.readFile(row.thumbPath);
      reply.header('Content-Type', 'image/jpeg');
      reply.header('Cache-Control', 'public, max-age=86400, immutable');
      return reply.send(file);
    } catch {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Thumbnail file is missing' } });
    }
  });

  app.post('/api/youtube/download', async (request, reply) => {
    const body = (request.body ?? {}) as { limit?: number };
    const limit = Math.min(5, Math.max(1, Number.parseInt(String(body.limit ?? 1), 10) || 1));
    const pending = await drizzle
      .select({
        id: schema.youtubeVideos.id,
        videoId: schema.youtubeVideos.videoId,
        title: schema.youtubeVideos.title,
        channel: schema.youtubeVideos.channel,
      })
      .from(schema.youtubeVideos)
      .where(eq(schema.youtubeVideos.status, 'PENDING'))
      .orderBy(asc(schema.youtubeVideos.added))
      .limit(limit);
    if (pending.length === 0) {
      return sendSuccess(reply, { attempted: 0, downloaded: 0, failed: [] });
    }

    const service = new YoutubeDownloadService({ root: process.env.YOUTUBE_DIR ?? '/data/Youtube' });
    const result = await service.run(limit, pending, {
      claim: async (id) => {
        await drizzle.update(schema.youtubeVideos).set({ status: 'DOWNLOADING' }).where(eq(schema.youtubeVideos.id, id));
      },
      markAvailable: async (id, outcome) => {
        await drizzle.update(schema.youtubeVideos).set({
          status: 'AVAILABLE',
          path: outcome.path,
          thumbPath: outcome.thumbPath,
          durationSeconds: outcome.durationSeconds ?? undefined,
          channel: outcome.channel ?? undefined,
          error: null,
          lastSeenAt: new Date(),
        }).where(eq(schema.youtubeVideos.id, id));
      },
      markFailed: async (id, error) => {
        await drizzle.update(schema.youtubeVideos).set({ status: 'FAILED', error }).where(eq(schema.youtubeVideos.id, id));
      },
    });
    return sendSuccess(reply, result);
  });

  app.patch('/api/youtube/subscriptions/:id', async (request, reply) => {
    const id = Number.parseInt(String((request.params as { id?: string }).id ?? ''), 10);
    if (!Number.isInteger(id) || id <= 0) {
      return reply.code(422).send({ ok: false, error: { code: 'INVALID_ID', message: 'id must be a positive integer' } });
    }
    const body = (request.body ?? {}) as { enabled?: boolean; title?: string | null };
    const patch: Record<string, unknown> = {};
    if (typeof body.enabled === 'boolean') patch.enabled = body.enabled;
    if (body.title === null) patch.title = null;
    else if (typeof body.title === 'string') patch.title = body.title.trim();
    if (Object.keys(patch).length === 0) {
      return reply.code(422).send({ ok: false, error: { code: 'EMPTY_PATCH', message: 'nothing to update' } });
    }
    await drizzle.update(schema.youtubeSubscriptions).set(patch).where(eq(schema.youtubeSubscriptions.id, id));
    const row = (await drizzle
      .select()
      .from(schema.youtubeSubscriptions)
      .where(eq(schema.youtubeSubscriptions.id, id))
      .limit(1))[0];
    return sendSuccess(reply, row);
  });

  app.delete('/api/youtube/subscriptions/:id', async (request, reply) => {
    const id = Number.parseInt(String((request.params as { id?: string }).id ?? ''), 10);
    if (!Number.isInteger(id) || id <= 0) {
      return reply.code(422).send({ ok: false, error: { code: 'INVALID_ID', message: 'id must be a positive integer' } });
    }
    await drizzle.delete(schema.youtubeSubscriptions).where(eq(schema.youtubeSubscriptions.id, id));
    return sendSuccess(reply, { id, deleted: true });
  });
}
