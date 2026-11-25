import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { describe, expect, it } from 'vitest';
import * as schema from '../db/schema';
import { downloadPending } from './YoutubeAutomation';
import type { YoutubeDownloadService } from './YoutubeDownloadService';

type Db = BetterSQLite3Database<typeof schema>;

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');
const MIN = 60 * 1000;

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

function insertVideo(db: Db, values: Partial<typeof schema.youtubeVideos.$inferInsert> & {
  videoId: string;
  title: string;
}): number {
  const row = db.insert(schema.youtubeVideos).values({
    source: 'SUBSCRIPTION',
    status: 'PENDING',
    attempts: 0,
    ...values,
  }).returning({ id: schema.youtubeVideos.id }).get();
  if (!row) throw new Error('insert failed');
  return row.id;
}

/** A subscription whose queue rows are wanted while it exists. */
function insertSubscription(db: Db, url: string): number {
  const row = db.insert(schema.youtubeSubscriptions).values({
    kind: 'CHANNEL',
    url,
    externalId: url.replace('https://www.youtube.com/', ''),
    options: {},
  }).returning({ id: schema.youtubeSubscriptions.id }).get();
  if (!row) throw new Error('subscription insert failed');
  return row.id;
}

/** Records the queue order the worker would attempt, without starting yt-dlp. */
function captureService(captured: string[]): YoutubeDownloadService {
  return {
    run: async (limit: number, videos: Array<{ id: number; videoId: string }>) => {
      captured.push(...videos.slice(0, limit).map((video) => video.videoId));
      return { attempted: videos.length, downloaded: 0, failed: [] };
    },
  } as unknown as YoutubeDownloadService;
}

describe('downloadPending queue discipline', () => {
  it('attempts fresh episodes newest-first, then the oldest due retry, and skips future retries', async () => {
    const db = makeDb();
    const now = Date.now();
    const source = insertSubscription(db, 'https://www.youtube.com/@source');
    insertVideo(db, { videoId: 'newestaaaaa', title: 'newest', subscriptionId: source, added: new Date(now - 5 * MIN) });
    insertVideo(db, { videoId: 'olderbbbbbb', title: 'older pending', subscriptionId: source, added: new Date(now - 50 * MIN) });
    // A pending row from a source that still exists always beats a due retry.
    insertVideo(db, { videoId: 'retrydueaaa', title: 'retry due', subscriptionId: source, status: 'FAILED', attempts: 2, added: new Date(now - 300 * MIN), retryAt: new Date(now - MIN) });
    insertVideo(db, { videoId: 'retrylatera', title: 'retry later', subscriptionId: source, status: 'FAILED', attempts: 2, added: new Date(now - 400 * MIN), retryAt: new Date(now + 60 * MIN) });

    const captured: string[] = [];
    await downloadPending(db, {
      configDir: '/tmp',
      mediaRoot: '/tmp',
      limit: 3,
      service: captureService(captured),
    });

    expect(captured).toEqual(['newestaaaaa', 'olderbbbbbb', 'retrydueaaa']);
  });

  it('retires orphaned queue rows whose subscription no longer exists, but never the imported archive', async () => {
    const db = makeDb();
    const now = Date.now();
    insertVideo(db, { videoId: 'orphannewaa', title: 'orphan pending', subscriptionId: null });
    insertVideo(db, { videoId: 'orphanoldaa', title: 'orphan failed', status: 'FAILED', attempts: 3, subscriptionId: null, retryAt: new Date(now - MIN) });
    // The archive import is not a subscription and must keep its queue row.
    insertVideo(db, { videoId: 'importedaaa', title: 'imported', source: 'IMPORT', subscriptionId: null });

    const captured: string[] = [];
    await downloadPending(db, {
      configDir: '/tmp',
      mediaRoot: '/tmp',
      limit: 2,
      service: captureService(captured),
    });

    expect(captured).toEqual(['importedaaa']);
    const rows = db.select().from(schema.youtubeVideos).all();
    const byId = new Map(rows.map((row) => [row.videoId, row]));
    expect(byId.get('orphannewaa')?.status).toBe('DELETED');
    expect(byId.get('orphannewaa')?.error).toContain('source-removed');
    expect(byId.get('orphanoldaa')?.status).toBe('DELETED');
    expect(byId.get('importedaaa')?.status).toBe('PENDING');
  });

  it('returns format-flake rows parked on the old week-long retry to the queue', async () => {
    const db = makeDb();
    const now = Date.now();
    const source = insertSubscription(db, 'https://www.youtube.com/@source');
    insertVideo(db, {
      videoId: 'parkedformat',
      title: 'parked format flake',
      subscriptionId: source,
      status: 'FAILED',
      attempts: 27,
      retryAt: new Date(now + 6 * 24 * 60 * MIN),
      error: 'Command failed: yt-dlp ...\nERROR: [youtube] abc123: Requested format is not available',
    });
    insertVideo(db, {
      videoId: 'parkednetwor',
      title: 'parked network failure',
      subscriptionId: source,
      status: 'FAILED',
      attempts: 4,
      retryAt: new Date(now + 6 * 24 * 60 * MIN),
      error: 'Read timed out after 10 retries',
    });

    const captured: string[] = [];
    await downloadPending(db, {
      configDir: '/tmp',
      mediaRoot: '/tmp',
      limit: 2,
      service: captureService(captured),
    });

    expect(captured).toEqual(['parkedformat']);
    const rows = db.select().from(schema.youtubeVideos).all();
    const byId = new Map(rows.map((row) => [row.videoId, row]));
    expect(byId.get('parkedformat')?.status).toBe('PENDING');
    expect(byId.get('parkedformat')?.retryAt).toBeNull();
    expect(byId.get('parkedformat')?.attempts).toBe(0);
    expect(byId.get('parkednetwor')?.status).toBe('FAILED');
  });

  it('keeps an enabled subscription queue row when the source still exists', async () => {
    const db = makeDb();
    const subscription = db.insert(schema.youtubeSubscriptions).values({
      kind: 'CHANNEL',
      url: 'https://www.youtube.com/@example',
      externalId: '@example',
      options: {},
    }).returning({ id: schema.youtubeSubscriptions.id }).get();
    if (!subscription) throw new Error('subscription insert failed');
    insertVideo(db, { videoId: 'keptrowaaaa', title: 'kept', subscriptionId: subscription.id });

    const captured: string[] = [];
    await downloadPending(db, {
      configDir: '/tmp',
      mediaRoot: '/tmp',
      limit: 2,
      service: captureService(captured),
    });

    expect(captured).toEqual(['keptrowaaaa']);
    const row = db.select().from(schema.youtubeVideos).where(eq(schema.youtubeVideos.videoId, 'keptrowaaaa')).get();
    expect(row?.status).toBe('PENDING');
  });
});
