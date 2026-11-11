import { createReadStream } from 'node:fs';
import fsp from 'node:fs/promises';
import pathPosix from 'node:path/posix';
import type { FastifyInstance } from 'fastify';
import { and, asc, desc, eq, gte, like, or, sql } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { applyYoutubeProgress, parseSubscriptionUrl, retentionEligible } from '../../services/YoutubeLibrary';
import { restoreYoutubeRetention } from '../../services/YoutubeRetentionService';
import { downloadPending, pollAllSubscriptions, readRetentionReceipts, retryDelayMs, runRetention } from '../../services/YoutubeAutomation';
import { importYoutubeArchive } from '../../services/YoutubeArchiveImporter';
import { YoutubeFeedPoller } from '../../services/YoutubeFeedPoller';
import { YoutubeDownloadService } from '../../services/YoutubeDownloadService';
import { summarizeYoutubeQueue } from '../../services/youtubeQueueSummary';
import { parseYoutubeDownloadReceipts, summarizeYoutubeThroughput } from '../../services/youtubeThroughput';
import { parseYoutubeLibraryQuery } from '../utils/youtubeQuery';
import { sendSuccess } from '../contracts';
import type { ApiDependencies } from '../types';

/** Size on disk for a path the DB knows about; a missing file is reported as null, never an error. */
async function sizeOf(file: string | null): Promise<number | null> {
  if (!file) return null;
  try {
    return (await fsp.stat(file)).size;
  } catch {
    return null;
  }
}

/** True when `file` is inside `root`; guards destructive file operations against a stale path. */
function isInsideRoot(root: string, file: string): boolean {
  const relative = pathPosix.relative(root, file);
  return relative.length > 0 && !relative.startsWith('..') && !pathPosix.isAbsolute(relative);
}

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

  /** Manual trigger for the hourly poll job (same function the scheduler calls). */
  app.post('/api/youtube/automation/poll', async (_request, reply) => {
    const receipt = await pollAllSubscriptions(drizzle, { configDir: process.env.CONFIG_DIR ?? '/config' });
    return sendSuccess(reply, receipt);
  });

  /** Manual trigger for the download job (bounded batch, same function the scheduler calls). */
  app.post('/api/youtube/automation/download', async (request, reply) => {
    const body = (request.body ?? {}) as { limit?: number };
    const limit = Math.min(5, Math.max(1, Number.parseInt(String(body.limit ?? 1), 10) || 1));
    const receipt = await downloadPending(drizzle, {
      configDir: process.env.CONFIG_DIR ?? '/config',
      mediaRoot: process.env.YOUTUBE_DIR ?? '/data/Youtube',
      limit,
    });
    return sendSuccess(reply, receipt);
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

  /** Import the pre-existing /data/Youtube archive as unmanaged history (never retention-eligible). */
  app.post('/api/libraries/youtube/import', async (request, reply) => {
    const body = (request.body ?? {}) as { dryRun?: boolean };
    const result = await importYoutubeArchive(drizzle, {
      root: process.env.YOUTUBE_DIR ?? '/data/Youtube',
      dryRun: body.dryRun === true,
    });
    return sendSuccess(reply, result);
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
        channel: schema.youtubeVideos.channel,
        source: schema.youtubeVideos.source,
        isWatched: schema.youtubeVideos.isWatched,
        watchedAt: schema.youtubeVideos.watchedAt,
        path: schema.youtubeVideos.path,
      })
      .from(schema.youtubeVideos)
      .where(eq(schema.youtubeVideos.status, 'AVAILABLE'));
    const now = new Date();
    const eligible = rows.filter((row: Record<string, unknown>) =>
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
    const candidates = await Promise.all(eligible.map(async (row: Record<string, unknown>) => ({
      ...row,
      sizeBytes: await sizeOf(row.path as string | null),
    })));
    return sendSuccess(reply, { retentionDays: days, candidates, count: candidates.length });
  });

  /** Quarantined videos the owner can restore or purge from the retention surface. */
  app.get('/api/youtube/retention/quarantined', async (_request, reply) => {
    const rows = await drizzle
      .select({
        id: schema.youtubeVideos.id,
        videoId: schema.youtubeVideos.videoId,
        title: schema.youtubeVideos.title,
        channel: schema.youtubeVideos.channel,
        source: schema.youtubeVideos.source,
        isWatched: schema.youtubeVideos.isWatched,
        watchedAt: schema.youtubeVideos.watchedAt,
        path: schema.youtubeVideos.path,
      })
      .from(schema.youtubeVideos)
      .where(eq(schema.youtubeVideos.status, 'QUARANTINED'))
      .orderBy(desc(schema.youtubeVideos.watchedAt));
    const items = await Promise.all(rows.map(async (row: Record<string, unknown>) => ({
      ...row,
      sizeBytes: await sizeOf(row.path as string | null),
    })));
    return sendSuccess(reply, { items, count: items.length });
  });

  /** Download queued videos now; the scheduled task will call the same service. */
  /** Library listing: playable videos with their channel; the SPA/TV render from this. */
  /**
   * TV YouTube library: server-side search (title/channel), watched filter, channel filter, sort and
   * pagination. The client cannot search/play-all a 500-item cap, so the query lives here.
   */
  app.get('/api/youtube/videos', async (request, reply) => {
    const parsed = parseYoutubeLibraryQuery(request.query as Record<string, unknown>);
    const conditions: any[] = [eq(schema.youtubeVideos.status, 'AVAILABLE')];
    const pattern = `%${parsed.term.replace(/[%_]/g, '')}%`;
    if (parsed.term) {
      conditions.push(or(
        like(schema.youtubeVideos.title, pattern),
        like(schema.youtubeVideos.channel, pattern),
      ));
    }
    if (parsed.channel) conditions.push(eq(schema.youtubeVideos.channel, parsed.channel));
    if (parsed.watched === 'watched') conditions.push(eq(schema.youtubeVideos.isWatched, true));
    if (parsed.watched === 'unwatched') conditions.push(eq(schema.youtubeVideos.isWatched, false));
    const where = and(...conditions);
    const orderBy = parsed.sort === 'title'
      ? asc(schema.youtubeVideos.title)
      : parsed.sort === 'published'
        ? desc(schema.youtubeVideos.publishedAt)
        : desc(schema.youtubeVideos.added);
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
        path: schema.youtubeVideos.path,
        added: schema.youtubeVideos.added,
      })
      .from(schema.youtubeVideos)
      .where(where)
      .orderBy(orderBy)
      .limit(parsed.limit)
      .offset(parsed.offset);
    const totalRows = await drizzle
      .select({ total: sql<number>`count(*)` })
      .from(schema.youtubeVideos)
      .where(where);
    return sendSuccess(reply, {
      items: rows.map((row: Record<string, unknown>) => ({
        ...row,
        streamUrl: `/api/youtube/videos/${row.id}/stream`,
        thumbUrl: `/api/youtube/videos/${row.id}/thumbnail`,
      })),
      count: rows.length,
      total: Number(totalRows[0]?.total ?? rows.length),
      offset: parsed.offset,
      limit: parsed.limit,
      query: parsed.term,
    });
  });

  app.get('/api/youtube/queue', async (_request, reply) => {
    const rows = await drizzle
      .select({
        status: schema.youtubeVideos.status,
        attempts: schema.youtubeVideos.attempts,
        count: sql<number>`count(*)`,
      })
      .from(schema.youtubeVideos)
      .groupBy(schema.youtubeVideos.status, schema.youtubeVideos.attempts);
    const summary = summarizeYoutubeQueue(rows.map((row: { status: string; attempts: number | null; count: number }) => ({
      status: row.status,
      attempts: row.attempts,
      count: Number(row.count),
    })));

    // Measured throughput from the append-only download receipts: answers "when does the backlog end?"
    // with an observation instead of a promise (this host is CPU-bound).
    let receipts = '';
    try {
      receipts = await fsp.readFile(
        `${process.env.CONFIG_DIR ?? '/config'}/youtube-download-receipts.jsonl`,
        'utf-8',
      );
    } catch {
      receipts = '';
    }
    const throughput = summarizeYoutubeThroughput(
      parseYoutubeDownloadReceipts(receipts),
      summary.pending,
    );

    return sendSuccess(reply, { ...summary, throughput });
  });

  /**
   * Rows behind the summary buckets, for the SPA queue surface. `EXHAUSTED` is derived from FAILED
   * rows whose retry budget is spent (attempts >= 3), matching `summarizeYoutubeQueue`.
   */
  app.get('/api/youtube/queue/videos', async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const allowed = ['PENDING', 'DOWNLOADING', 'FAILED', 'EXHAUSTED', 'QUARANTINED'] as const;
    type QueueStatus = (typeof allowed)[number] | (typeof schema.YoutubeVideoStatusEnum)[number];
    const raw = String(query.status ?? 'PENDING').toUpperCase();
    if (!(allowed as readonly string[]).includes(raw)) {
      return reply.code(422).send({
        ok: false,
        error: { code: 'INVALID_STATUS', message: `status must be one of ${allowed.join(', ')}` },
      });
    }
    const status = raw as QueueStatus;
    const limit = Math.max(1, Math.min(100, Number.parseInt(String(query.limit ?? '50'), 10) || 50));
    const where = status === 'EXHAUSTED'
      ? and(eq(schema.youtubeVideos.status, 'FAILED'), gte(schema.youtubeVideos.attempts, 3))
      : eq(schema.youtubeVideos.status, status);
    const order = status === 'PENDING' || status === 'DOWNLOADING'
      ? asc(schema.youtubeVideos.added)
      : desc(schema.youtubeVideos.added);
    const rows = await drizzle
      .select({
        id: schema.youtubeVideos.id,
        videoId: schema.youtubeVideos.videoId,
        title: schema.youtubeVideos.title,
        channel: schema.youtubeVideos.channel,
        status: schema.youtubeVideos.status,
        attempts: schema.youtubeVideos.attempts,
        retryAt: schema.youtubeVideos.retryAt,
        error: schema.youtubeVideos.error,
        path: schema.youtubeVideos.path,
        isWatched: schema.youtubeVideos.isWatched,
        watchedAt: schema.youtubeVideos.watchedAt,
        added: schema.youtubeVideos.added,
      })
      .from(schema.youtubeVideos)
      .where(where)
      .orderBy(order)
      .limit(limit);
    const items = await Promise.all(rows.map(async (row: Record<string, unknown>) => ({
      ...row,
      sizeBytes: await sizeOf(row.path as string | null),
    })));
    return sendSuccess(reply, { items, count: items.length, status, limit });
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

  /** Put one FAILED (or exhausted) video back in the queue now, bypassing the retry backoff. */
  app.post('/api/youtube/videos/:id/retry', async (request, reply) => {
    const id = Number.parseInt(String((request.params as { id?: string }).id ?? ''), 10);
    if (!Number.isInteger(id) || id <= 0) {
      return reply.code(422).send({ ok: false, error: { code: 'INVALID_ID', message: 'id must be a positive integer' } });
    }
    const row = (await drizzle
      .select({ id: schema.youtubeVideos.id, status: schema.youtubeVideos.status })
      .from(schema.youtubeVideos)
      .where(eq(schema.youtubeVideos.id, id))
      .limit(1))[0];
    if (!row) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Video not found' } });
    }
    if (row.status !== 'FAILED') {
      return reply.code(422).send({
        ok: false,
        error: { code: 'NOT_RETRYABLE', message: `Video is ${row.status}; only FAILED videos can be retried` },
      });
    }
    await drizzle.update(schema.youtubeVideos)
      .set({ status: 'PENDING', attempts: 0, retryAt: null, error: null })
      .where(eq(schema.youtubeVideos.id, id));
    const updated = (await drizzle
      .select()
      .from(schema.youtubeVideos)
      .where(eq(schema.youtubeVideos.id, id))
      .limit(1))[0];
    return sendSuccess(reply, updated);
  });

  /** Download one specific queued video now (the batch routes only take the oldest rows). */
  app.post('/api/youtube/videos/:id/download', async (request, reply) => {
    const id = Number.parseInt(String((request.params as { id?: string }).id ?? ''), 10);
    if (!Number.isInteger(id) || id <= 0) {
      return reply.code(422).send({ ok: false, error: { code: 'INVALID_ID', message: 'id must be a positive integer' } });
    }
    const row = (await drizzle
      .select({
        id: schema.youtubeVideos.id,
        videoId: schema.youtubeVideos.videoId,
        title: schema.youtubeVideos.title,
        channel: schema.youtubeVideos.channel,
        status: schema.youtubeVideos.status,
      })
      .from(schema.youtubeVideos)
      .where(eq(schema.youtubeVideos.id, id))
      .limit(1))[0];
    if (!row) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Video not found' } });
    }
    if (row.status !== 'PENDING' && row.status !== 'FAILED') {
      return reply.code(422).send({
        ok: false,
        error: { code: 'NOT_QUEUED', message: `Video is ${row.status}; only PENDING or FAILED videos can be downloaded` },
      });
    }
    const service = new YoutubeDownloadService({ root: process.env.YOUTUBE_DIR ?? '/data/Youtube' });
    const result = await service.run(1, [row], {
      claim: async (videoId) => {
        await drizzle.update(schema.youtubeVideos)
          .set({ status: 'DOWNLOADING', lastSeenAt: new Date() })
          .where(eq(schema.youtubeVideos.id, videoId));
      },
      markAvailable: async (videoId, outcome) => {
        await drizzle.update(schema.youtubeVideos).set({
          status: 'AVAILABLE',
          path: outcome.path,
          thumbPath: outcome.thumbPath,
          durationSeconds: outcome.durationSeconds ?? undefined,
          channel: outcome.channel ?? undefined,
          error: null,
          lastSeenAt: new Date(),
        }).where(eq(schema.youtubeVideos.id, videoId));
      },
      markFailed: async (videoId, error) => {
        const current = (await drizzle
          .select({ attempts: schema.youtubeVideos.attempts })
          .from(schema.youtubeVideos)
          .where(eq(schema.youtubeVideos.id, videoId))
          .limit(1))[0] as { attempts?: number } | undefined;
        const attempts = (current?.attempts ?? 0) + 1;
        await drizzle.update(schema.youtubeVideos).set({
          status: 'FAILED',
          error,
          attempts,
          retryAt: new Date(Date.now() + retryDelayMs(attempts)),
        }).where(eq(schema.youtubeVideos.id, videoId));
      },
    });
    return sendSuccess(reply, { ...result, id, videoId: row.videoId });
  });

  /**
   * Retire a queued/failed row without touching disk. DELETED is a tombstone: the poller dedupes on
   * every YoutubeVideo row, so the same upload is not re-queued on the next subscription poll.
   */
  app.delete('/api/youtube/videos/:id', async (request, reply) => {
    const id = Number.parseInt(String((request.params as { id?: string }).id ?? ''), 10);
    if (!Number.isInteger(id) || id <= 0) {
      return reply.code(422).send({ ok: false, error: { code: 'INVALID_ID', message: 'id must be a positive integer' } });
    }
    const row = (await drizzle
      .select({ id: schema.youtubeVideos.id, status: schema.youtubeVideos.status, path: schema.youtubeVideos.path })
      .from(schema.youtubeVideos)
      .where(eq(schema.youtubeVideos.id, id))
      .limit(1))[0];
    if (!row) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Video not found' } });
    }
    if (row.status === 'DOWNLOADING') {
      return reply.code(409).send({
        ok: false,
        error: { code: 'DOWNLOAD_IN_PROGRESS', message: 'Video is downloading; wait for it to finish before removing it' },
      });
    }
    if (row.status === 'AVAILABLE' || row.status === 'QUARANTINED') {
      return reply.code(422).send({
        ok: false,
        error: {
          code: 'NOT_REMOVABLE',
          message: row.status === 'AVAILABLE'
            ? 'Video is AVAILABLE; delete its file instead of removing the queue row'
            : 'Video is QUARANTINED; restore or purge it under Retention',
        },
      });
    }
    await drizzle.update(schema.youtubeVideos).set({
      status: 'DELETED',
      error: null,
      retryAt: null,
      path: null,
    }).where(eq(schema.youtubeVideos.id, id));
    return sendSuccess(reply, { id, deleted: true });
  });

  /** Delete the downloaded file (and thumbnail) for an available video; the row stays as a tombstone. */
  app.delete('/api/youtube/videos/:id/file', async (request, reply) => {
    const id = Number.parseInt(String((request.params as { id?: string }).id ?? ''), 10);
    if (!Number.isInteger(id) || id <= 0) {
      return reply.code(422).send({ ok: false, error: { code: 'INVALID_ID', message: 'id must be a positive integer' } });
    }
    const mediaRoot = process.env.YOUTUBE_DIR ?? '/data/Youtube';
    const row = (await drizzle
      .select({
        id: schema.youtubeVideos.id,
        status: schema.youtubeVideos.status,
        path: schema.youtubeVideos.path,
        thumbPath: schema.youtubeVideos.thumbPath,
      })
      .from(schema.youtubeVideos)
      .where(eq(schema.youtubeVideos.id, id))
      .limit(1))[0];
    if (!row) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Video not found' } });
    }
    if (!row.path) {
      return reply.code(422).send({ ok: false, error: { code: 'NO_FILE', message: 'No downloaded file for this video' } });
    }
    if (row.status === 'QUARANTINED') {
      return reply.code(422).send({
        ok: false,
        error: { code: 'QUARANTINED', message: 'Video is QUARANTINED; purge it under Retention instead' },
      });
    }
    if (!isInsideRoot(mediaRoot, row.path)) {
      return reply.code(422).send({
        ok: false,
        error: { code: 'OUTSIDE_LIBRARY', message: 'Refusing to delete a file outside the YouTube library root' },
      });
    }
    await fsp.unlink(row.path).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
    if (row.thumbPath && isInsideRoot(mediaRoot, row.thumbPath)) {
      await fsp.unlink(row.thumbPath).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
    await drizzle.update(schema.youtubeVideos).set({
      status: 'DELETED',
      path: null,
      thumbPath: null,
    }).where(eq(schema.youtubeVideos.id, id));
    return sendSuccess(reply, { id, deleted: true, path: row.path });
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
