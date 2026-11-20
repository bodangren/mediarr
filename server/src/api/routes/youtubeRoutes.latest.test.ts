import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as schema from '../../db/schema';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerYoutubeRoutes } from './youtubeRoutes';

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
  return drizzle(sqlite, { schema });
}

let counter = 0;
function insertVideo(
  db: Db,
  values: Partial<typeof schema.youtubeVideos.$inferInsert> & { title: string },
): number {
  counter += 1;
  const row = db.insert(schema.youtubeVideos).values({
    videoId: `latest-${counter}`,
    source: 'SUBSCRIPTION',
    status: 'AVAILABLE',
    path: `/data/Youtube/latest-${counter}.mp4`,
    ...values,
  }).returning({ id: schema.youtubeVideos.id }).get();
  if (!row) throw new Error('insert failed');
  return row.id;
}

describe('GET /api/youtube/latest', () => {
  let db: Db;
  let app: FastifyInstance;

  const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000);

  beforeEach(() => {
    db = makeDb();
    app = Fastify({ logger: false });
    app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
    registerYoutubeRoutes(app, { prisma: { drizzle: db } } as unknown as ApiDependencies);
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns the newest playable videos across sources, with age labels', async () => {
    insertVideo(db, { title: 'Two hours ago', channel: 'Pod A', publishedAt: hoursAgo(2) });
    insertVideo(db, { title: 'Yesterday', channel: 'Pod B', publishedAt: hoursAgo(30) });
    insertVideo(db, { title: 'Old', channel: 'Pod A', publishedAt: hoursAgo(24 * 20) });
    insertVideo(db, { title: 'Undated archive', channel: 'Pod C', publishedAt: null });
    insertVideo(db, { title: 'Not downloaded yet', status: 'PENDING', publishedAt: hoursAgo(1) });

    const response = await app.inject({ method: 'GET', url: '/api/youtube/latest?limit=10' });
    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      data: { items: Array<{ title: string; ageLabel: string; isNew: boolean }>; count: number; newCount: number };
    };

    expect(body.data.items.map((item) => item.title)).toEqual([
      'Two hours ago',
      'Yesterday',
      'Old',
      'Undated archive',
    ]);
    expect(body.data.items[0]).toMatchObject({ ageLabel: 'today', isNew: true });
    expect(body.data.items[1]).toMatchObject({ ageLabel: 'yesterday', isNew: false });
    expect(body.data.items[3]).toMatchObject({ ageLabel: 'archive', isNew: false });
    expect(body.data.newCount).toBe(1);
  });

  it('honours the limit and reports an empty library honestly', async () => {
    for (let index = 0; index < 5; index += 1) {
      insertVideo(db, { title: `Episode ${index}`, publishedAt: hoursAgo(index) });
    }
    const limited = await app.inject({ method: 'GET', url: '/api/youtube/latest?limit=2' });
    expect((limited.json() as { data: { items: unknown[] } }).data.items).toHaveLength(2);

    const emptyDb = makeDb();
    const emptyApp = Fastify({ logger: false });
    emptyApp.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
    registerYoutubeRoutes(emptyApp, { prisma: { drizzle: emptyDb } } as unknown as ApiDependencies);
    const empty = await emptyApp.inject({ method: 'GET', url: '/api/youtube/latest' });
    expect(empty.statusCode).toBe(200);
    expect((empty.json() as { data: { items: unknown[]; count: number; newCount: number } }).data).toMatchObject({
      items: [],
      count: 0,
      newCount: 0,
    });
    await emptyApp.close();
  });
});
