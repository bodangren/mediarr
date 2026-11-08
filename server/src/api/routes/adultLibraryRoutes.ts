import { createReadStream } from 'node:fs';
import fsp from 'node:fs/promises';
import type { FastifyInstance } from 'fastify';
import { asc, eq } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { importAdultLibrary } from '../../services/AdultLibraryService';
import { sendSuccess } from '../contracts';
import { AdultThumbnailService } from '../../services/AdultThumbnailService';
import { executeQuarantine, planQuarantine, deleteQuarantined, restoreQuarantine } from '../../services/QuarantineService';
import { createFsQuarantineAdapter } from '../../services/QuarantineFs';
import type { ApiDependencies } from '../types';

/**
 * Adult library surface (track feature_adult_library_20261107, Phase 1/2).
 *
 * Kept in its own route module so the section is visibly separate from Movies/TV: the queries touch
 * `AdultItem`/`Library` only, and Movies/TV handlers cannot see these rows.
 */
export function registerAdultLibraryRoutes(app: FastifyInstance, deps: ApiDependencies): void {
  const drizzle = (deps.prisma as unknown as { drizzle: any }).drizzle;
  const thumbnails = new AdultThumbnailService();
  // Generation is heavy (one ffmpeg per item): only one batch at a time, and each item yields so the
  // TV's health probes and playback requests are never starved.
  let thumbnailGenerationRunning = false;

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

    const withThumbs = await Promise.all(rows.map(async (row: { id: number }) => ({
      ...row,
      thumbUrl: (await thumbnails.hasThumbnail(row.id)) ? `/api/adult/items/${row.id}/thumbnail` : null,
    })));

    const filtered = q.length === 0
      ? withThumbs
      : withThumbs.filter((row: { title: string | null; fileName: string; studio: string | null }) =>
          [row.title, row.fileName, row.studio]
            .filter((value): value is string => typeof value === 'string')
            .some((value) => value.toLowerCase().includes(q)));
    const start = (page - 1) * pageSize;
    return sendSuccess(reply, {
      items: filtered.slice(start, start + pageSize),
      page,
      pageSize,
      totalCount: filtered.length,
      needsReview: withThumbs.filter((row: { needsReview: boolean }) => row.needsReview).length,
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
  app.get('/api/adult/items/:id/thumbnail', async (request, reply) => {
    const id = Number.parseInt(String((request.params as { id?: string }).id ?? ''), 10);
    if (!Number.isInteger(id) || id <= 0) {
      return reply.code(422).send({ ok: false, error: { code: 'INVALID_ID', message: 'id must be a positive integer' } });
    }
    try {
      const file = await import('node:fs/promises').then((fs) => fs.readFile(thumbnails.thumbnailPath(id)));
      reply.header('Content-Type', 'image/jpeg');
      reply.header('Cache-Control', 'public, max-age=86400, immutable');
      return reply.send(file);
    } catch {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'No thumbnail cached for this item' } });
    }
  });

  /** Bounded generation pass for the TV/SPA (covers missing stills only; never blocks a list request). */
  app.post('/api/adult/thumbnails/generate', async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const limit = Math.min(40, Math.max(1, Number.parseInt(String(query.limit ?? '8'), 10) || 8));
    if (thumbnailGenerationRunning) {
      return sendSuccess(reply, { generated: 0, failures: [], scanned: 0, skipped: 'a batch is already running' });
    }
    thumbnailGenerationRunning = true;
    try {
    const rows = await drizzle
      .select({ id: schema.adultItems.id, path: schema.adultItems.path })
      .from(schema.adultItems)
      .orderBy(asc(schema.adultItems.id));
    let generated = 0;
    const failures: Array<{ id: number; error: string }> = [];
    for (const row of rows) {
      if (generated >= limit) break;
      if (await thumbnails.hasThumbnail(row.id)) continue;
      try {
        await thumbnails.generate(row.id, row.path);
        generated += 1;
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        failures.push({ id: row.id, error: error instanceof Error ? error.message : String(error) });
      }
    }
    return sendSuccess(reply, { generated, failures, scanned: rows.length });
    } finally {
      thumbnailGenerationRunning = false;
    }
  });

  const quarantineRootFor = (mediaRoot: string) => {
    const configured = process.env.QUARANTINE_DIR;
    if (configured && configured.trim().length > 0) return configured;
    // Same filesystem as the media by construction: a sibling of the media root.
    return `${mediaRoot.replace(/\/+$/, '')}/../Quarantine`;
  };

  app.get('/api/adult/automation/quarantine', async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const limit = Math.min(100, Math.max(1, Number.parseInt(String(query.limit ?? '50'), 10) || 50));
    const rows = await drizzle
      .select()
      .from(schema.quarantineEntries)
      .orderBy(asc(schema.quarantineEntries.movedAt))
      .limit(limit);
    return sendSuccess(reply, rows);
  });

  /** Move watched-and-old adult files into quarantine (dry run unless dryRun=false). */
  app.post('/api/adult/automation/quarantine', async (request, reply) => {
    const body = (request.body ?? {}) as { itemIds?: number[]; days?: number; dryRun?: boolean };
    const adult = (await drizzle.select().from(schema.libraries).where(eq(schema.libraries.kind, 'ADULT')).limit(1))[0];
    if (!adult || !adult.rootFolder) {
      return reply.code(422).send({ ok: false, error: { code: 'NOT_CONFIGURED', message: 'Adult library root is not configured' } });
    }
    const daysParsed = Number.parseInt(String(body.days ?? 30), 10);
    const days = Number.isFinite(daysParsed) && daysParsed >= 0 ? daysParsed : 30;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const all = await drizzle.select().from(schema.adultItems);
    const wanted = body.itemIds && body.itemIds.length > 0
      ? all.filter((row: { id: number }) => body.itemIds!.includes(row.id))
      : all.filter((row: { isWatched: boolean; lastPlayedAt: Date | null }) =>
          row.isWatched && (row.lastPlayedAt == null || row.lastPlayedAt < cutoff));

    const plan = planQuarantine(
      wanted.map((row: { path: string }) => row.path),
      { mediaRoot: adult.rootFolder, quarantineRoot: quarantineRootFor(adult.rootFolder) },
    );
    const result = await executeQuarantine(plan, { io: createFsQuarantineAdapter(), dryRun: body.dryRun !== false });

    if (body.dryRun === false && result.manifestLines.length > 0) {
      const byPath = new Map(wanted.map((row: { path: string; id: number }) => [row.path, row.id]));
      await drizzle.insert(schema.quarantineEntries).values(
        plan.entries
          .filter((entry: { originalPath: string }) => result.manifestLines.some((line) => line.includes(entry.originalPath)))
          .map((entry: { originalPath: string; quarantinePath: string }) => ({
            libraryKind: 'ADULT',
            itemId: byPath.get(entry.originalPath) ?? null,
            originalPath: entry.originalPath,
            quarantinePath: entry.quarantinePath,
            status: 'QUARANTINED',
            reason: `watched and idle for ${days}+ days`,
          })),
      );
    }

    return sendSuccess(reply, {
      root: quarantineRootFor(adult.rootFolder),
      candidates: plan.entries.length,
      skipped: plan.skipped,
      moved: result.moved.length,
      failed: result.failed,
      dryRun: result.dryRun,
    });
  });

  const adultMediaRoot = async (): Promise<string> => {
    const rows = await drizzle.select().from(schema.libraries).where(eq(schema.libraries.kind, 'ADULT')).limit(1);
    return rows[0]?.rootFolder ?? '/data/Porn';
  };

  app.post('/api/adult/automation/quarantine/restore', async (request, reply) => {
    const body = (request.body ?? {}) as { ids?: number[]; dryRun?: boolean };
    const entries = await drizzle.select().from(schema.quarantineEntries).where(eq(schema.quarantineEntries.status, 'QUARANTINED'));
    const selected = (entries as Array<{ id: number; originalPath: string; quarantinePath: string }>)
      .filter((entry) => !body.ids || body.ids.length === 0 || body.ids.includes(entry.id));
    const result = await restoreQuarantine(selected, {
      io: createFsQuarantineAdapter(),
      quarantineRoot: quarantineRootFor(await adultMediaRoot()),
      dryRun: body.dryRun !== false,
    });
    if (body.dryRun === false && result.moved.length > 0) {
      for (const entry of selected) {
        if (result.moved.includes(entry.quarantinePath)) {
          await drizzle.update(schema.quarantineEntries)
            .set({ status: 'RESTORED', restoredAt: new Date() })
            .where(eq(schema.quarantineEntries.id, entry.id));
        }
      }
    }
    return sendSuccess(reply, { restored: result.moved.length, failed: result.failed, dryRun: result.dryRun });
  });

  app.post('/api/adult/automation/quarantine/purge', async (request, reply) => {
    const body = (request.body ?? {}) as { ids?: number[]; dryRun?: boolean };
    const entries = await drizzle.select().from(schema.quarantineEntries).where(eq(schema.quarantineEntries.status, 'QUARANTINED'));
    const selected = (entries as Array<{ id: number; quarantinePath: string }>)
      .filter((entry) => !body.ids || body.ids.length === 0 || body.ids.includes(entry.id));
    const result = await deleteQuarantined(selected.map((entry) => entry.quarantinePath), {
      io: createFsQuarantineAdapter(),
      quarantineRoot: quarantineRootFor(await adultMediaRoot()),
      dryRun: body.dryRun !== false,
    });
    if (body.dryRun === false && result.moved.length > 0) {
      for (const entry of selected) {
        if (result.moved.includes(entry.quarantinePath)) {
          await drizzle.update(schema.quarantineEntries)
            .set({ status: 'DELETED', deletedAt: new Date() })
            .where(eq(schema.quarantineEntries.id, entry.id));
        }
      }
    }
    return sendSuccess(reply, { deleted: result.moved.length, failed: result.failed, dryRun: result.dryRun });
  });

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

  /**
   * Queue one discovery pick, refusing duplicates server-side.
   *
   * The agent proposes a magnet + info hash; the server is the only place a torrent can enter the
   * system, and it checks the existing Torrent table first so a repeated pick (or a careless retry)
   * cannot queue twice. `dryRun` defaults to true: a run must opt in explicitly to actually download.
   */
  /**
   * Discovery receipts (Phase 3). A run must leave a receipt even when it picked nothing - decision D4
   * is "never silently wrong", and an unrecorded weekly run is indistinguishable from a dead one.
   */
  app.post('/api/adult/automation/receipt', async (request, reply) => {
    const body = (request.body ?? {}) as {
      sources?: unknown;
      picks?: unknown;
      duplicates?: unknown;
      failures?: unknown;
      note?: string;
    };
    const row = (await drizzle
      .insert(schema.adultDiscoveryReceipts)
      .values({
        sources: Array.isArray(body.sources) ? body.sources : [],
        picks: Array.isArray(body.picks) ? body.picks : [],
        duplicates: Array.isArray(body.duplicates) ? body.duplicates : [],
        failures: Array.isArray(body.failures) ? body.failures : [],
        note: typeof body.note === 'string' ? body.note : null,
      })
      .returning())[0];
    return sendSuccess(reply, row);
  });

  app.get('/api/adult/automation/receipts', async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const limit = Math.min(50, Math.max(1, Number.parseInt(String(query.limit ?? '10'), 10) || 10));
    const rows = await drizzle
      .select()
      .from(schema.adultDiscoveryReceipts)
      .orderBy(asc(schema.adultDiscoveryReceipts.runAt))
      .limit(limit);
    return sendSuccess(reply, rows);
  });

  app.post('/api/adult/automation/queue', async (request, reply) => {
    const body = (request.body ?? {}) as {
      title?: string;
      magnetUrl?: string;
      infoHash?: string;
      size?: number;
      quality?: string;
      dryRun?: boolean;
    };
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const infoHash = typeof body.infoHash === 'string' ? body.infoHash.trim().toLowerCase() : '';
    if (title.length === 0) {
      return reply.code(422).send({ ok: false, error: { code: 'INVALID_TITLE', message: 'title is required' } });
    }
    if (!/^[0-9a-f]{40}$/.test(infoHash)) {
      return reply.code(422).send({ ok: false, error: { code: 'INVALID_INFOHASH', message: 'infoHash must be 40 hex characters' } });
    }
    if (typeof body.magnetUrl !== 'string' || !body.magnetUrl.startsWith('magnet:')) {
      return reply.code(422).send({ ok: false, error: { code: 'INVALID_MAGNET', message: 'magnetUrl must be a magnet link' } });
    }

    const existing = await drizzle
      .select({ id: schema.torrents.id })
      .from(schema.torrents)
      .where(eq(schema.torrents.infoHash, infoHash))
      .limit(1);
    if (existing.length > 0) {
      return sendSuccess(reply, { queued: false, reason: 'duplicate', infoHash, dryRun: body.dryRun !== false });
    }

    if (body.dryRun !== false) {
      return sendSuccess(reply, { queued: false, reason: 'dry-run', infoHash, dryRun: true });
    }

    if (!deps.mediaSearchService?.grabRelease) {
      return reply.code(422).send({ ok: false, error: { code: 'NOT_CONFIGURED', message: 'Media search service is not configured' } });
    }

    const grabbed = await deps.mediaSearchService.grabRelease({
      indexer: 'browser-agent',
      indexerId: 0,
      title,
      guid: infoHash,
      size: Math.max(0, Math.trunc(Number(body.size ?? 0))),
      seeders: 0,
      magnetUrl: body.magnetUrl,
      infoHash,
      quality: typeof body.quality === 'string' ? body.quality : undefined,
    } as never);

    return sendSuccess(reply, { queued: true, infoHash: grabbed.infoHash, name: grabbed.name, dryRun: false });
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
