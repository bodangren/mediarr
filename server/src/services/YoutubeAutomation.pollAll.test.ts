import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import * as schema from '../db/schema';
import { pollAllSubscriptions } from './YoutubeAutomation';
import type { YoutubeFeedPoller } from './YoutubeFeedPoller';

type Db = BetterSQLite3Database<typeof schema>;

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');

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

const tempDirs: string[] = [];
afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('pollAllSubscriptions window trim', () => {
  it('retires queued rows the poll proved outside the retention window, keeping the in-window ones', async () => {
    const db = makeDb();
    const subscription = db.insert(schema.youtubeSubscriptions).values({
      kind: 'CHANNEL',
      url: 'https://www.youtube.com/@windowed',
      externalId: '@windowed',
      options: { retentionDays: 7 },
    }).returning({ id: schema.youtubeSubscriptions.id }).get();
    if (!subscription) throw new Error('subscription insert failed');

    const insert = (values: { videoId: string; status: string; attempts?: number }) => {
      const row = db.insert(schema.youtubeVideos).values({
        subscriptionId: subscription.id,
        videoId: values.videoId,
        source: 'SUBSCRIPTION',
        title: values.videoId,
        status: values.status,
        attempts: values.attempts ?? 0,
      }).returning({ id: schema.youtubeVideos.id }).get();
      if (!row) throw new Error('video insert failed');
      return row.id;
    };

    const inWindowPending = insert({ videoId: 'inwindowaaa', status: 'PENDING' });
    const inWindowFailed = insert({ videoId: 'inwindowbbb', status: 'FAILED', attempts: 2 });
    const outsidePending = insert({ videoId: 'outsideaaa1', status: 'PENDING' });
    const outsideFailed = insert({ videoId: 'outsidebbb1', status: 'FAILED', attempts: 4 });
    const outsideAvailable = insert({ videoId: 'outsideccc1', status: 'AVAILABLE' });
    const outsideDeleted = insert({ videoId: 'outsideddd1', status: 'DELETED' });

    const poller = {
      poll: async (polled: { id: number; windowDays?: number }) => ({
        subscriptionId: polled.id,
        seen: 3,
        queued: 0,
        duplicates: 0,
        skipped: 0,
        failures: [],
        error: null,
        windowDays: polled.windowDays ?? 7,
        windowEntries: 2,
        windowVideoIds: ['inwindowaaa', 'inwindowbbb'],
        outsideVideoIds: ['outsideaaa1', 'outsidebbb1'],
        windowComplete: true,
      }),
    } as unknown as YoutubeFeedPoller;

    const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mediarr-youtube-poll-'));
    tempDirs.push(configDir);
    const receipt = await pollAllSubscriptions(db, { configDir, poller });

    const byId = new Map(db.select().from(schema.youtubeVideos).all().map((row) => [row.id, row]));
    expect(byId.get(inWindowPending)?.status).toBe('PENDING');
    expect(byId.get(inWindowFailed)?.status).toBe('FAILED');
    expect(byId.get(outsidePending)?.status).toBe('DELETED');
    expect(byId.get(outsidePending)?.error).toContain('pull-window');
    expect(byId.get(outsideFailed)?.status).toBe('DELETED');
    expect(byId.get(outsideAvailable)?.status).toBe('AVAILABLE');
    expect(byId.get(outsideDeleted)?.status).toBe('DELETED');
    expect(receipt.subscriptions).toBe(1);
    // The poll result carries the window it applied, so the caller can report it later.
    expect(receipt.results[0]?.windowDays).toBe(7);
    const receiptLine = fs.readFileSync(path.join(configDir, 'youtube-poll-receipts.jsonl'), 'utf8').trim();
    expect(JSON.parse(receiptLine)).toMatchObject({ subscriptions: 1 });
  });
});
