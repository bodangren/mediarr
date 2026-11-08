import { createReadStream } from 'node:fs';
import fsp from 'node:fs/promises';
import type { FastifyInstance } from 'fastify';
import { asc, eq } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { importAdultLibrary } from '../../services/AdultLibraryService';
import { sendSuccess } from '../contracts';
import type { ApiDependencies } from '../types';

/**
 * Adult library surface (track feature_adult_library_20261107, Phase 1/2).
 *
 * Kept in its own route module so the section is visibly separate from Movies/TV: the queries touch
 * `AdultItem`/`Library` only, and Movies/TV handlers cannot see these rows.
 */
export function registerAdultLibraryRoutes(app: FastifyInstance, deps: ApiDependencies): void {
  const drizzle = (deps.prisma as unknown as { drizzle: any }).drizzle;

  app.get('/api/libraries', async (_request, reply) => {
    const rows = await drizzle.select().from(schema.libraries).orderBy(asc(schema.libraries.id));
    return sendSuccess(reply, rows);
  });

  app.get('/api/adult/items', async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const q = typeof query.q === 'string' ? query.q.trim().toLowerCase() : '';
    const page = Math.max(1, Number.parseInt(String(query.page ?? '1'), 10) || 1);
    const pageSize = Math.min(200, Math.max(1, Number.parseInt(String(query.pageSize ?? '50'), 10) || 50));
    const rows = await drizzle
      .select({
        id: schema.adultItems.id,
        title: schema.adultItems.title,
        fileName: schema.adultItems.fileName,
        studio: schema.adultItems.studio,
        quality: schema.adultItems.quality,
        releaseDate: schema.adultItems.releaseDate,
        needsReview: schema.adultItems.needsReview,
        path: schema.adultItems.path,
        sizeBytes: schema.adultItems.sizeBytes,
      })
      .from(schema.adultItems)
      .orderBy(asc(schema.adultItems.id));

    const filtered = q.length === 0
      ? rows
      : rows.filter((row: { title: string | null; fileName: string; studio: string | null }) =>
          [row.title, row.fileName, row.studio]
            .filter((value): value is string => typeof value === 'string')
            .some((value) => value.toLowerCase().includes(q)));
    const start = (page - 1) * pageSize;
    return sendSuccess(reply, {
      items: filtered.slice(start, start + pageSize),
      page,
      pageSize,
      totalCount: filtered.length,
      needsReview: rows.filter((row: { needsReview: boolean }) => row.needsReview).length,
    });
  });

  // Range/206 streaming over AdultItem.path, scoped to this library only: no movie/episode route can
  // serve an adult file, and this route cannot serve anything else.
  app.get('/api/adult/items/:id/stream', async (request, reply) => {
    const id = Number.parseInt(String((request.params as { id?: string }).id ?? ''), 10);
    if (!Number.isInteger(id) || id <= 0) {
      return reply.code(422).send({ ok: false, error: { code: 'INVALID_ID', message: 'id must be a positive integer' } });
    }
    const rows = await drizzle
      .select({ path: schema.adultItems.path })
      .from(schema.adultItems)
      .where(eq(schema.adultItems.id, id))
      .limit(1);
    const item = rows[0];
    if (!item) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Adult item not found' } });
    }

    let size: number;
    try {
      size = (await fsp.stat(item.path)).size;
    } catch {
      return reply.code(404).send({ ok: false, error: { code: 'FILE_MISSING', message: 'File is missing on disk' } });
    }

    const range = request.headers.range;
    const mime = 'video/mp4';
    if (typeof range === 'string') {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      if (match) {
        const start = match[1] === '' ? Math.max(0, size - Number(match[2])) : Number(match[1]);
        const end = match[2] === '' || match[1] === '' ? size - 1 : Math.min(Number(match[2]), size - 1);
        if (start >= size || start > end) {
          return reply.code(416).header('Content-Range', `bytes */${size}`).send();
        }
        reply.code(206);
        reply.header('Content-Type', mime);
        reply.header('Accept-Ranges', 'bytes');
        reply.header('Content-Range', `bytes ${start}-${end}/${size}`);
        reply.header('Content-Length', String(end - start + 1));
        return reply.send(createReadStream(item.path, { start, end }));
      }
    }

    reply.header('Content-Type', mime);
    reply.header('Accept-Ranges', 'bytes');
    reply.header('Content-Length', String(size));
    return reply.send(createReadStream(item.path));
  });

  /** Progress for this library only; there is no path from here to movie/episode progress. */
  app.post('/api/adult/items/:id/progress', async (request, reply) => {
    const id = Number.parseInt(String((request.params as { id?: string }).id ?? ''), 10);
    const body = (request.body ?? {}) as { position?: number; duration?: number };
    if (!Number.isInteger(id) || id <= 0) {
      return reply.code(422).send({ ok: false, error: { code: 'INVALID_ID', message: 'id must be a positive integer' } });
    }
    const position = Math.max(0, Math.trunc(Number(body.position ?? 0)));
    const duration = Math.max(0, Math.trunc(Number(body.duration ?? 0)));
    const isWatched = duration > 0 && position / duration >= 0.9;
    await drizzle
      .update(schema.adultItems)
      .set({ position: duration > 0 ? Math.min(position, duration) : position, duration, isWatched, lastPlayedAt: new Date() })
      .where(eq(schema.adultItems.id, id));
    return sendSuccess(reply, { id, position, duration, isWatched });
  });

  /**
   * Automation contract (track feature_adult_library_20261107, Phase 2 last item).
   *
   * The weekly agent run reads this contract instead of scraping or touching the database: what is
   * in the library, what has been watched, and which watched items are old enough to prune. Pruning
   * itself belongs to the quarantine engine (Phase 4); these endpoints only propose.
   */
  app.get('/api/adult/automation/list', async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const limit = Math.min(500, Math.max(1, Number.parseInt(String(query.limit ?? '200'), 10) || 200));
    const rows = await drizzle
      .select({
        id: schema.adultItems.id,
        title: schema.adultItems.title,
        fileName: schema.adultItems.fileName,
        studio: schema.adultItems.studio,
        needsReview: schema.adultItems.needsReview,
        isWatched: schema.adultItems.isWatched,
        position: schema.adultItems.position,
        duration: schema.adultItems.duration,
        lastPlayedAt: schema.adultItems.lastPlayedAt,
        sizeBytes: schema.adultItems.sizeBytes,
      })
      .from(schema.adultItems)
      .orderBy(asc(schema.adultItems.id))
      .limit(limit);
    return sendSuccess(reply, { items: rows, count: rows.length });
  });

  app.get('/api/adult/automation/retention-candidates', async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const parsedDays = Number.parseInt(String(query.days ?? '30'), 10);
    const days = Number.isFinite(parsedDays) && parsedDays >= 0 ? parsedDays : 30;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await drizzle
      .select()
      .from(schema.adultItems)
      .where(eq(schema.adultItems.isWatched, true));
    const candidates = rows
      .filter((row: { lastPlayedAt: Date | null }) => row.lastPlayedAt == null || row.lastPlayedAt < cutoff)
      .map((row: { id: number; title: string | null; fileName: string; sizeBytes: number; lastPlayedAt: Date | null }) => ({
        id: row.id,
        title: row.title ?? row.fileName,
        sizeBytes: row.sizeBytes,
        lastPlayedAt: row.lastPlayedAt,
      }));
    return sendSuccess(reply, {
      days,
      cutoff: cutoff.toISOString(),
      candidates,
      count: candidates.length,
      // Explicitly a proposal: the quarantine engine performs moves/deletes.
      destructive: false,
    });
  });

  app.post('/api/adult/automation/watched/:id', async (request, reply) => {
    const id = Number.parseInt(String((request.params as { id?: string }).id ?? ''), 10);
    if (!Number.isInteger(id) || id <= 0) {
      return reply.code(422).send({ ok: false, error: { code: 'INVALID_ID', message: 'id must be a positive integer' } });
    }
    await drizzle
      .update(schema.adultItems)
      .set({ isWatched: true, lastPlayedAt: new Date() })
      .where(eq(schema.adultItems.id, id));
    return sendSuccess(reply, { id, isWatched: true });
  });

  app.post('/api/libraries/adult/import', async (_request, reply) => {
    const library = await drizzle
      .select()
      .from(schema.libraries)
      .where(eq(schema.libraries.kind, 'ADULT'))
      .limit(1);
    const adult = library[0];
    if (!adult) {
      return reply.code(422).send({ ok: false, error: { code: 'NOT_CONFIGURED', message: 'Adult library is not registered' } });
    }
    if (typeof adult.rootFolder !== 'string' || adult.rootFolder.trim().length === 0) {
      return reply.code(422).send({ ok: false, error: { code: 'NOT_CONFIGURED', message: 'adultRootFolder is empty' } });
    }

    const summary = await importAdultLibrary(
      {
        library: {
          findFirst: async () => ({ id: adult.id }),
          update: async ({ where, data }) => {
            await drizzle.update(schema.libraries).set(data).where(eq(schema.libraries.id, where.id));
          },
        },
        adultItem: {
          findMany: () => drizzle.select({ id: schema.adultItems.id, path: schema.adultItems.path }).from(schema.adultItems),
          upsert: async ({ where, create, update }) => {
            await drizzle
              .insert(schema.adultItems)
              .values(create)
              .onConflictDoUpdate({ target: schema.adultItems.path, set: update });
          },
        },
      },
      { root: adult.rootFolder, libraryId: adult.id },
    );

    return sendSuccess(reply, {
      root: summary.root,
      scanned: summary.scanned,
      created: summary.created,
      updated: summary.updated,
      needsReview: summary.needsReview,
      unreadableDirectories: summary.unreadableDirectories,
      notSeen: summary.notSeen,
    });
  });
}
