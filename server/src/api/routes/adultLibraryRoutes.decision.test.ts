import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as schema from '../../db/schema';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';

/**
 * The quarantine adapter is mocked at the module boundary: the route still runs the real
 * `planQuarantine` / `executeQuarantine` / `deleteQuarantined` functions, but no file is touched.
 */
const fakeIo = vi.hoisted(() => ({
  mkdir: vi.fn(async (_dir: string, _options?: { recursive?: boolean }) => undefined),
  rename: vi.fn(async (_from: string, _to: string) => undefined),
  copyFile: vi.fn(async (_from: string, _to: string) => undefined),
  unlink: vi.fn(async (_file: string) => undefined),
  stat: vi.fn(async (_file: string) => ({ size: 1024 })),
}));

vi.mock('../../services/QuarantineFs', () => ({
  createFsQuarantineAdapter: () => fakeIo,
}));

import { registerAdultLibraryRoutes } from './adultLibraryRoutes';

type Db = BetterSQLite3Database<typeof schema>;

const REPO_ROOT = path.resolve(import.meta.dirname, '../../../..');

function makeDb(): Db {
  const sqlite = new Database(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON;');
  const journal = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'drizzle', 'meta', '_journal.json'), 'utf8'),
  ) as { entries: Array<{ tag: string }> };
  for (const entry of journal.entries) {
    const sql = fs.readFileSync(path.join(REPO_ROOT, 'drizzle', `${entry.tag}.sql`), 'utf8');
    for (const statement of sql.split('--> statement-breakpoint')) {
      const trimmed = statement.trim();
      if (trimmed) sqlite.exec(trimmed);
    }
  }
  const db = drizzle(sqlite, { schema });
  db.insert(schema.libraries)
    .values({ kind: 'ADULT', name: 'Adult', rootFolder: '/data/Adult' })
    .run();
  return db;
}

function insertItem(
  db: Db,
  values: Partial<typeof schema.adultItems.$inferInsert> & { path: string; fileName: string },
): number {
  const row = db
    .insert(schema.adultItems)
    .values({
      libraryId: 1,
      title: values.fileName.replace(/\.mp4$/, ''),
      sizeBytes: 1_000,
      isWatched: true,
      ...values,
    })
    .returning({ id: schema.adultItems.id })
    .get();
  if (!row) throw new Error('insert failed');
  return row.id;
}

describe('adult keep/delete decision routes', () => {
  let db: Db;
  let app: FastifyInstance;
  let tmpDir: string;
  let receiptPath: string;

  beforeEach(() => {
    db = makeDb();
    app = Fastify({ logger: false });
    app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
    registerAdultLibraryRoutes(app, { prisma: { drizzle: db } } as unknown as ApiDependencies);

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mediarr-adult-retention-'));
    receiptPath = path.join(tmpDir, 'adult-retention-receipts.jsonl');
    process.env.ADULT_RETENTION_RECEIPT_PATH = receiptPath;

    fakeIo.mkdir.mockClear();
    fakeIo.rename.mockClear();
    fakeIo.copyFile.mockClear();
    fakeIo.unlink.mockClear();
    fakeIo.stat.mockClear();
  });

  afterEach(async () => {
    await app.close();
    delete process.env.ADULT_RETENTION_RECEIPT_PATH;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const readReceipts = (): Array<Record<string, unknown>> => {
    if (!fs.existsSync(receiptPath)) return [];
    return fs.readFileSync(receiptPath, 'utf8')
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  };

  const postDecision = (id: number, body: unknown) =>
    app.inject({ method: 'POST', url: `/api/adult/items/${id}/decision`, payload: body as never });

  it('keeps an item durably and excludes it from decisions and retention candidates', async () => {
    const id = insertItem(db, {
      path: '/data/Adult/kept.mp4',
      fileName: 'kept.mp4',
      lastPlayedAt: new Date('2026-10-01T10:00:00.000Z'),
    });

    const response = await postDecision(id, { decision: 'keep' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, data: { id, decision: 'keep', kept: true } });

    const row = db.select().from(schema.adultItems).where(eq(schema.adultItems.id, id)).get();
    expect(row?.keep).toBe(true);
    expect(row?.decidedAt).toBeInstanceOf(Date);

    const decisions = await app.inject({ method: 'GET', url: '/api/adult/decisions' });
    expect(decisions.json()).toEqual({ ok: true, data: { items: [], total: 0 } });

    const candidates = await app.inject({ method: 'GET', url: '/api/adult/automation/retention-candidates' });
    expect(candidates.json().data).toMatchObject({ candidates: [], count: 0 });

    expect(readReceipts()).toEqual([
      {
        at: expect.any(String),
        itemId: id,
        path: '/data/Adult/kept.mp4',
        decision: 'keep',
        result: 'kept',
      },
    ]);
  });

  it('deletes through the quarantine flow, removes the row, and is idempotent', async () => {
    const id = insertItem(db, {
      path: '/data/Adult/example.mp4',
      fileName: 'example.mp4',
      lastPlayedAt: new Date('2026-10-01T10:00:00.000Z'),
    });

    const response = await postDecision(id, { decision: 'delete' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, data: { id, decision: 'delete', deleted: true } });

    // Quarantine is a move, and only the quarantine engine's guarded unlink is allowed.
    expect(fakeIo.rename).toHaveBeenCalledWith('/data/Adult/example.mp4', '/data/Quarantine/example.mp4');
    expect(fakeIo.unlink).toHaveBeenCalledWith('/data/Quarantine/example.mp4');

    expect(db.select().from(schema.adultItems).where(eq(schema.adultItems.id, id)).get()).toBeUndefined();
    const entry = db.select().from(schema.quarantineEntries).where(eq(schema.quarantineEntries.itemId, id)).get();
    expect(entry?.status).toBe('DELETED');
    expect(entry?.originalPath).toBe('/data/Adult/example.mp4');
    expect(entry?.deletedAt).toBeInstanceOf(Date);

    expect(readReceipts()).toEqual([
      {
        at: expect.any(String),
        itemId: id,
        path: '/data/Adult/example.mp4',
        decision: 'delete',
        result: 'deleted',
      },
    ]);

    // A repeat delete is a no-op: the DELETED quarantine row is the tombstone.
    const repeat = await postDecision(id, { decision: 'delete' });
    expect(repeat.statusCode).toBe(200);
    expect(repeat.json()).toEqual({
      ok: true,
      data: { id, decision: 'delete', deleted: true, alreadyDecided: true },
    });
    expect(fakeIo.rename).toHaveBeenCalledTimes(1);
    expect(readReceipts()).toHaveLength(1);

    // delete -> keep is refused because the file is already purged.
    const refused = await postDecision(id, { decision: 'keep' });
    expect(refused.statusCode).toBe(409);
    expect(refused.json()).toMatchObject({ ok: false, error: { code: 'DECISION_CONFLICT' } });
  });

  it('treats a repeated keep as already-decided without a second receipt', async () => {
    const id = insertItem(db, {
      path: '/data/Adult/repeat.mp4',
      fileName: 'repeat.mp4',
      lastPlayedAt: new Date('2026-10-01T10:00:00.000Z'),
    });

    await postDecision(id, { decision: 'keep' });
    const repeat = await postDecision(id, { decision: 'keep' });

    expect(repeat.statusCode).toBe(200);
    expect(repeat.json()).toEqual({
      ok: true,
      data: { id, decision: 'keep', kept: true, alreadyDecided: true },
    });
    expect(readReceipts()).toHaveLength(1);
  });

  it('allows an explicit keep -> delete change of mind', async () => {
    const id = insertItem(db, {
      path: '/data/Adult/changed.mp4',
      fileName: 'changed.mp4',
      lastPlayedAt: new Date('2026-10-01T10:00:00.000Z'),
    });

    await postDecision(id, { decision: 'keep' });
    const changed = await postDecision(id, { decision: 'delete' });

    expect(changed.statusCode).toBe(200);
    expect(changed.json()).toEqual({ ok: true, data: { id, decision: 'delete', deleted: true } });
    expect(db.select().from(schema.adultItems).where(eq(schema.adultItems.id, id)).get()).toBeUndefined();
    expect(readReceipts().map((receipt) => receipt.decision)).toEqual(['keep', 'delete']);
  });

  it('lists watched-and-undecided items newest-watched first', async () => {
    insertItem(db, { path: '/data/Adult/old.mp4', fileName: 'old.mp4', lastPlayedAt: new Date('2026-09-01T10:00:00.000Z') });
    insertItem(db, { path: '/data/Adult/new.mp4', fileName: 'new.mp4', lastPlayedAt: new Date('2026-11-01T10:00:00.000Z') });
    insertItem(db, { path: '/data/Adult/unwatched.mp4', fileName: 'unwatched.mp4', isWatched: false, lastPlayedAt: null });
    insertItem(db, {
      path: '/data/Adult/kept.mp4',
      fileName: 'kept.mp4',
      keep: true,
      decidedAt: new Date('2026-10-15T10:00:00.000Z'),
      lastPlayedAt: new Date('2026-10-15T10:00:00.000Z'),
    });

    const response = await app.inject({ method: 'GET', url: '/api/adult/decisions' });

    expect(response.statusCode).toBe(200);
    const data = response.json().data as { items: Array<{ fileName: string; isWatched: boolean; keep: boolean }>; total: number };
    expect(data.total).toBe(2);
    expect(data.items.map((item) => item.fileName)).toEqual(['new.mp4', 'old.mp4']);
    expect(data.items[0]).toMatchObject({
      fileName: 'new.mp4',
      isWatched: true,
      keep: false,
      decidedAt: null,
    });
  });

  it('excludes kept items from retention candidates but leaves undecided watched items', async () => {
    insertItem(db, { path: '/data/Adult/candidate.mp4', fileName: 'candidate.mp4', lastPlayedAt: new Date('2026-01-01T10:00:00.000Z') });
    insertItem(db, {
      path: '/data/Adult/kept.mp4',
      fileName: 'kept.mp4',
      keep: true,
      decidedAt: new Date('2026-01-02T10:00:00.000Z'),
      lastPlayedAt: new Date('2026-01-01T10:00:00.000Z'),
    });

    const response = await app.inject({ method: 'GET', url: '/api/adult/automation/retention-candidates' });
    const candidates = response.json().data.candidates as Array<{ title: string }>;

    expect(candidates.map((candidate) => candidate.title)).toEqual(['candidate']);
  });

  it('includes keep in the library rows so the SPA can render a decided item', async () => {
    insertItem(db, { path: '/data/Adult/kept.mp4', fileName: 'kept.mp4', keep: true, decidedAt: new Date() });
    insertItem(db, { path: '/data/Adult/plain.mp4', fileName: 'plain.mp4' });

    const response = await app.inject({ method: 'GET', url: '/api/adult/items' });

    expect(response.statusCode).toBe(200);
    const items = response.json().data.items as Array<{ fileName: string; keep: boolean }>;
    expect(items.find((item) => item.fileName === 'kept.mp4')?.keep).toBe(true);
    expect(items.find((item) => item.fileName === 'plain.mp4')?.keep).toBe(false);
  });

  it('rejects an invalid decision and an unknown item without writing a receipt', async () => {
    const id = insertItem(db, { path: '/data/Adult/one.mp4', fileName: 'one.mp4' });

    const invalid = await postDecision(id, { decision: 'archive' });
    expect(invalid.statusCode).toBe(422);
    expect(invalid.json()).toMatchObject({ ok: false, error: { code: 'INVALID_DECISION' } });

    const missing = await postDecision(9999, { decision: 'keep' });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });

    expect(readReceipts()).toEqual([]);
  });

  it('reports a failed quarantine instead of marking a still-present file deleted', async () => {
    const id = insertItem(db, {
      path: '/data/Adult/failing.mp4',
      fileName: 'failing.mp4',
      lastPlayedAt: new Date('2026-10-01T10:00:00.000Z'),
    });
    fakeIo.rename.mockRejectedValueOnce(Object.assign(new Error('permission denied'), { code: 'EACCES' }));

    const response = await postDecision(id, { decision: 'delete' });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toMatchObject({ ok: false, error: { code: 'QUARANTINE_FAILED' } });
    expect(db.select().from(schema.adultItems).where(eq(schema.adultItems.id, id)).get()).toBeDefined();
    expect(readReceipts()).toEqual([
      expect.objectContaining({ itemId: id, decision: 'delete', result: 'failed' }),
    ]);
  });
});
