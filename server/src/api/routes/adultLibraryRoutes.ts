import { createReadStream } from 'node:fs';
import fsp from 'node:fs/promises';
import type { FastifyInstance } from 'fastify';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { runAdultLibraryImport } from '../../services/AdultLibraryScan';
import { sendSuccess } from '../contracts';
import { AdultThumbnailService } from '../../services/AdultThumbnailService';
import { executeQuarantine, planQuarantine, deleteQuarantined, restoreQuarantine } from '../../services/QuarantineService';
import { createFsQuarantineAdapter } from '../../services/QuarantineFs';
import {
  ADULT_RETENTION_RECEIPT_PATH,
  buildAdultRetentionReceipt,
  evaluateAdultRetentionDecision,
  serialiseAdultRetentionReceipt,
  type AdultRetentionDecision,
  type AdultRetentionReceipt,
  type AdultRetentionState,
  type AdultRetentionOutcome,
} from '../../services/AdultRetention';
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
        isWatched: schema.adultItems.isWatched,
        keep: schema.adultItems.keep,
        decidedAt: schema.adultItems.decidedAt,
        seriesKey: schema.adultItems.seriesKey,
        tags: schema.adultItems.tags,
      })
      .from(schema.adultItems)
      .orderBy(asc(schema.adultItems.id));

    const withThumbs = await Promise.all(rows.map(async (row: { id: number }) => ({
      ...row,
      thumbUrl: (await thumbnails.hasThumbnail(row.id)) ? `/api/adult/items/${row.id}/thumbnail` : null,
    })));

    const wantedTags = typeof query.tags === 'string' && query.tags.trim().length > 0
      ? query.tags.split(',').map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0)
      : [];
    const parseTags = (raw: unknown): string[] => {
      if (typeof raw !== 'string' || raw.length === 0) return [];
      try {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === 'string') : [];
      } catch {
        return [];
      }
    };
    const decorated: Array<Record<string, unknown> & { tags: string[] }> = withThumbs.map(
      (row: { tags?: unknown }) => ({ ...row, tags: parseTags(row.tags) }),
    );
    const filtered = decorated
      .filter((row) => {
        const searchable = row as { title?: unknown; fileName?: unknown; studio?: unknown };
        return q.length === 0
          || [searchable.title, searchable.fileName, searchable.studio]
            .filter((value): value is string => typeof value === 'string')
            .some((value) => value.toLowerCase().includes(q));
      })
      // AND semantics: every requested tag must be present.
      .filter((row) => wantedTags.every((tag) => row.tags.includes(tag)));
    const start = (page - 1) * pageSize;
    return sendSuccess(reply, {
      items: filtered.slice(start, start + pageSize),
      page,
      pageSize,
      totalCount: filtered.length,
      // Count within the current search filter: a global count read as "N need review" would lie when q is set.
      needsReview: filtered.filter((row) => Boolean(row.needsReview)).length,
    });
  });

  /** Distinct tags with counts: the TV renders these as filter chips. */
  app.get('/api/adult/tags', async (_request, reply) => {
    const rows = await drizzle
      .select({ tags: schema.adultItems.tags })
      .from(schema.adultItems);
    const counts = new Map<string, number>();
    for (const row of rows as Array<{ tags: string }>) {
      let tags: unknown;
      try {
        tags = JSON.parse(row.tags ?? '[]');
      } catch {
        tags = [];
      }
      if (!Array.isArray(tags)) continue;
      for (const tag of tags) {
        if (typeof tag !== 'string' || tag.length === 0) continue;
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return sendSuccess(reply, [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag)));
  });

  /** Series shelves: seriesKey with item counts, most populated first. */
  app.get('/api/adult/series', async (_request, reply) => {
    const rows = await drizzle
      .select({ seriesKey: schema.adultItems.seriesKey })
      .from(schema.adultItems);
    const counts = new Map<string, number>();
    let unshelved = 0;
    for (const row of rows as Array<{ seriesKey: string | null }>) {
      const key = row.seriesKey?.trim();
      if (!key) {
        unshelved += 1;
        continue;
      }
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return sendSuccess(reply, {
      series: [...counts.entries()]
        .map(([seriesKey, count]) => ({ seriesKey, count }))
        .sort((a, b) => b.count - a.count || a.seriesKey.localeCompare(b.seriesKey)),
      unshelved,
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

  /** Owner decision ledger (track feature_adult_retention_keep_delete_20261111). */
  const retentionReceiptPath = (): string => {
    const configured = process.env.ADULT_RETENTION_RECEIPT_PATH;
    return configured && configured.trim().length > 0 ? configured : ADULT_RETENTION_RECEIPT_PATH;
  };

  const recordRetentionReceipt = async (receipt: AdultRetentionReceipt): Promise<void> => {
    try {
      await fsp.appendFile(retentionReceiptPath(), `${serialiseAdultRetentionReceipt(receipt)}\n`, 'utf8');
    } catch (error) {
      // A completed decision must not be reported as failed because a log line could not be written,
      // but it also must not be silent: the server log is the fallback record.
      app.log.error({ err: error, receipt }, 'failed to append adult retention receipt');
    }
  };

  /**
   * Watched-but-undecided items, newest `lastPlayedAt` first. This is the prompt surface: it is
   * empty once every watched item has a durable keep/delete answer.
   */
  app.get('/api/adult/decisions', async (_request, reply) => {
    const rows = await drizzle
      .select({
        id: schema.adultItems.id,
        title: schema.adultItems.title,
        fileName: schema.adultItems.fileName,
        studio: schema.adultItems.studio,
        quality: schema.adultItems.quality,
        isWatched: schema.adultItems.isWatched,
        lastPlayedAt: schema.adultItems.lastPlayedAt,
        sizeBytes: schema.adultItems.sizeBytes,
        keep: schema.adultItems.keep,
        decidedAt: schema.adultItems.decidedAt,
      })
      .from(schema.adultItems)
      .where(and(
        eq(schema.adultItems.isWatched, true),
        eq(schema.adultItems.keep, false),
        isNull(schema.adultItems.decidedAt),
      ))
      .orderBy(desc(schema.adultItems.lastPlayedAt));
    return sendSuccess(reply, { items: rows, total: rows.length });
  });

  /**
   * Record exactly one keep/delete decision for a watched item.
   *
   * KEEP is a durable flag. DELETE reuses the quarantine engine unchanged: plan the single path,
   * move it, write the `QuarantineEntry`, then purge that entry and remove the `AdultItem` row. The
   * DELETED quarantine row is the tombstone that makes a repeat delete idempotent after a restart.
   */
  app.post('/api/adult/items/:id/decision', async (request, reply) => {
    const id = Number.parseInt(String((request.params as { id?: string }).id ?? ''), 10);
    if (!Number.isInteger(id) || id <= 0) {
      return reply.code(422).send({ ok: false, error: { code: 'INVALID_ID', message: 'id must be a positive integer' } });
    }
    const body = (request.body ?? {}) as { decision?: unknown };

    const item = (await drizzle.select().from(schema.adultItems).where(eq(schema.adultItems.id, id)).limit(1))[0];
    let state: AdultRetentionState;
    if (item) {
      state = { exists: true, deleted: false, keep: item.keep === true, decidedAt: item.decidedAt ?? null };
    } else {
      const tombstone = (await drizzle
        .select({ id: schema.quarantineEntries.id })
        .from(schema.quarantineEntries)
        .where(and(
          eq(schema.quarantineEntries.itemId, id),
          eq(schema.quarantineEntries.status, 'DELETED'),
        ))
        .limit(1))[0];
      state = { exists: false, deleted: Boolean(tombstone), keep: false, decidedAt: null };
    }

    const verdict = evaluateAdultRetentionDecision(body.decision, state);
    if (verdict.outcome === 'rejected') {
      const status = verdict.code === 'NOT_FOUND' ? 404 : verdict.code === 'INVALID_DECISION' ? 422 : 409;
      return reply.code(status).send({ ok: false, error: { code: verdict.code, message: verdict.message } });
    }
    if (verdict.outcome === 'already-decided') {
      return sendSuccess(reply, {
        id,
        decision: verdict.decision,
        ...(verdict.kept ? { kept: true } : {}),
        ...(verdict.deleted ? { deleted: true } : {}),
        alreadyDecided: true,
      });
    }
    if (!item) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Adult item not found' } });
    }

    const decidedAt = new Date();
    const receipt = (decision: AdultRetentionDecision, result: AdultRetentionOutcome) =>
      buildAdultRetentionReceipt({ at: decidedAt, itemId: id, path: item.path, decision, result });

    if (verdict.decision === 'keep') {
      await drizzle
        .update(schema.adultItems)
        .set({ keep: true, decidedAt })
        .where(eq(schema.adultItems.id, id));
      await recordRetentionReceipt(receipt('keep', 'kept'));
      return sendSuccess(reply, { id, decision: 'keep', kept: true });
    }

    const library = (await drizzle.select().from(schema.libraries).where(eq(schema.libraries.kind, 'ADULT')).limit(1))[0];
    if (!library || typeof library.rootFolder !== 'string' || library.rootFolder.trim().length === 0) {
      return reply.code(422).send({ ok: false, error: { code: 'NOT_CONFIGURED', message: 'Adult library root is not configured' } });
    }
    const mediaRoot = library.rootFolder;
    const quarantineRoot = quarantineRootFor(mediaRoot);

    const plan = planQuarantine([item.path], { mediaRoot, quarantineRoot });
    const planned = plan.entries[0];
    if (!planned) {
      await recordRetentionReceipt(receipt('delete', 'failed'));
      return reply.code(422).send({
        ok: false,
        error: {
          code: 'QUARANTINE_REJECTED',
          message: plan.skipped[0]?.reason ?? 'the file cannot be quarantined',
          details: plan.skipped,
        },
      });
    }

    const executed = await executeQuarantine(plan, { io: createFsQuarantineAdapter(), dryRun: false });
    if (executed.failed.length > 0 || executed.moved.length === 0) {
      await recordRetentionReceipt(receipt('delete', 'failed'));
      return reply.code(500).send({
        ok: false,
        error: {
          code: 'QUARANTINE_FAILED',
          message: executed.failed[0]?.error ?? 'the file was not moved to quarantine',
          details: executed.failed,
        },
      });
    }

    const [quarantineEntry] = await drizzle
      .insert(schema.quarantineEntries)
      .values({
        libraryKind: 'ADULT',
        itemId: id,
        originalPath: planned.originalPath,
        quarantinePath: planned.quarantinePath,
        status: 'QUARANTINED',
        reason: 'owner decided delete after watching',
      })
      .returning();
    if (!quarantineEntry) {
      await recordRetentionReceipt(receipt('delete', 'failed'));
      return reply.code(500).send({ ok: false, error: { code: 'QUARANTINE_FAILED', message: 'the quarantine record could not be written' } });
    }

    const purged = await deleteQuarantined([planned.quarantinePath], {
      io: createFsQuarantineAdapter(),
      quarantineRoot,
      dryRun: false,
    });
    if (purged.moved.length === 0) {
      // Out of the media tree but not purged: keep the QUARANTINED row so the normal purge endpoint
      // can retry, and mark the item decided so no automation proposes it again.
      await drizzle
        .update(schema.adultItems)
        .set({ keep: false, decidedAt })
        .where(eq(schema.adultItems.id, id));
      await recordRetentionReceipt(receipt('delete', 'failed'));
      return reply.code(500).send({
        ok: false,
        error: {
          code: 'PURGE_FAILED',
          message: purged.failed[0]?.error ?? 'the quarantined file was not purged',
          details: purged.failed,
        },
      });
    }

    await drizzle
      .update(schema.quarantineEntries)
      .set({ status: 'DELETED', deletedAt: new Date() })
      .where(eq(schema.quarantineEntries.id, quarantineEntry.id));
    await drizzle.delete(schema.adultItems).where(eq(schema.adultItems.id, id));
    await recordRetentionReceipt(receipt('delete', 'deleted'));
    return sendSuccess(reply, { id, decision: 'delete', deleted: true });
  });

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
      // A keep decision is durable: kept items and items already decided (including a delete whose
      // purge is retried separately) must never appear in a prune proposal.
      .where(and(
        eq(schema.adultItems.isWatched, true),
        eq(schema.adultItems.keep, false),
        isNull(schema.adultItems.decidedAt),
      ));
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

    const summary = await runAdultLibraryImport(drizzle);

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
