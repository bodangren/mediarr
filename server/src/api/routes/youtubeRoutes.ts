import type { FastifyInstance } from 'fastify';
import { asc, eq } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { parseSubscriptionUrl } from '../../services/YoutubeLibrary';
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

  /** Download queued videos now; the scheduled task will call the same service. */
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
