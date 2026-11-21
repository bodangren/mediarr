import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Fastify, { type FastifyInstance } from 'fastify';
import { beforeEach, describe, expect, it } from 'vitest';
import * as schema from '../../db/schema';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerAdultLibraryRoutes } from './adultLibraryRoutes';

/**
 * Adult sections + tag filters (owner request 2026-11-21). The in-memory database is
 * built from the real migration files, which also proves 0019_adult_series_tags applies.
 */
type Db = BetterSQLite3Database<typeof schema>;

const REPO_ROOT = path.resolve(import.meta.dirname, '../../../..');

function makeDb(): Db {
  const sqlite = new Database(':memory:');
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
  const row = db.insert(schema.adultItems)
    .values({ libraryId: 1, sizeBytes: 1_000, ...values })
    .returning({ id: schema.adultItems.id })
    .get();
  if (!row) throw new Error('insert failed');
  return row.id;
}

describe('adult series + tag routes', () => {
  let db: Db;
  let app: FastifyInstance;

  beforeEach(() => {
    db = makeDb();
    app = Fastify({ logger: false });
    app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
    registerAdultLibraryRoutes(app, { prisma: { drizzle: db } } as unknown as ApiDependencies);

    insertItem(db, {
      path: '/data/Adult/a.mp4',
      fileName: 'Blacked - Scene 1.mp4',
      title: 'Blacked - Scene 1',
      seriesKey: 'Blacked',
      tags: JSON.stringify(['quality:1080p', 'studio:blacked', 'unwatched']),
    });
    insertItem(db, {
      path: '/data/Adult/b.mp4',
      fileName: 'Blacked - Scene 2.mp4',
      title: 'Blacked - Scene 2',
      seriesKey: 'Blacked',
      tags: JSON.stringify(['quality:1080p', 'studio:blacked', 'watched']),
    });
    insertItem(db, {
      path: '/data/Adult/c.mp4',
      fileName: 'Unrelated.mp4',
      title: 'Unrelated',
      seriesKey: null,
      tags: JSON.stringify(['quality:4k', 'studio:other', 'unwatched']),
    });
  });

  it('lists series with counts and reports items without a shelf', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/adult/series' });
    expect(response.statusCode).toBe(200);
    const data = (response.json() as { data: { series: Array<{ seriesKey: string; count: number }>; unshelved: number } }).data;
    expect(data.series).toEqual([{ seriesKey: 'Blacked', count: 2 }]);
    expect(data.unshelved).toBe(1);
  });

  it('lists tags with counts, most used first', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/adult/tags' });
    const data = (response.json() as { data: Array<{ tag: string; count: number }> }).data;
    // Ties sort by tag name, so the list is stable between requests.
    expect(data.find((row) => row.tag === 'studio:blacked')?.count).toBe(2);
    expect(data[0]!.count).toBe(2);
    expect(data.map((row) => row.tag)).toContain('quality:1080p');
    expect(data.map((row) => row.tag)).toContain('watched');
  });

  it('filters items by tags with AND semantics', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/adult/items?tags=studio:blacked,watched' });
    const data = (response.json() as { data: { items: Array<{ title: string }>; totalCount: number } }).data;
    expect(data.totalCount).toBe(1);
    expect(data.items[0]!.title).toBe('Blacked - Scene 2');
  });

  it('returns parsed tags and the series key on every item', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/adult/items?pageSize=10' });
    const data = (response.json() as { data: { items: Array<{ seriesKey: string | null; tags: string[] }> } }).data;
    expect(data.items[0]!.seriesKey).toBe('Blacked');
    expect(data.items[0]!.tags).toContain('studio:blacked');
  });
});
