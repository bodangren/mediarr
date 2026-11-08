import type { FastifyInstance } from 'fastify';
import { asc, eq } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { parseSubscriptionUrl } from '../../services/YoutubeLibrary';
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
