import fs from 'node:fs';
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
 * yt-dlp is mocked at the module boundary: the route still builds the real subscription
 * descriptor and poll store, but no process starts.
 */
const pollMock = vi.hoisted(() => vi.fn());

vi.mock('../../services/YoutubeFeedPoller', () => ({
  YoutubeFeedPoller: class {
    poll = pollMock;
  },
}));

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

const EMPTY_RESULT = {
  subscriptionId: 0,
  seen: 0,
  queued: 0,
  duplicates: 0,
  skipped: 0,
  failures: [],
  error: null,
};

describe('YouTube subscription poll route', () => {
  let db: Db;
  let app: FastifyInstance;

  function insertSubscription(values: {
    url: string;
    externalId: string;
    title?: string;
    options?: Record<string, unknown>;
  }): number {
    const row = db
      .insert(schema.youtubeSubscriptions)
      .values({
        kind: 'CHANNEL',
        url: values.url,
        externalId: values.externalId,
        title: values.title ?? null,
        enabled: true,
        options: values.options ?? {},
      })
      .returning({ id: schema.youtubeSubscriptions.id })
      .get();
    if (!row) throw new Error('insert failed');
    return row.id;
  }

  beforeEach(() => {
    db = makeDb();
    app = Fastify({ logger: false });
    app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
    registerYoutubeRoutes(app, { prisma: { drizzle: db } } as unknown as ApiDependencies);
    pollMock.mockReset();
    pollMock.mockResolvedValue(EMPTY_RESULT);
  });

  afterEach(async () => {
    await app.close();
  });

  it('caps a podcast poll to the newest few, matching the scheduled poller', async () => {
    const id = insertSubscription({
      url: 'https://www.youtube.com/@RealClearPoliticsYT',
      externalId: '@RealClearPoliticsYT',
      title: 'RealClear Politics',
      options: { podcast: true, keepLatest: 3 },
    });

    const response = await app.inject({ method: 'POST', url: `/api/youtube/subscriptions/${id}/poll` });

    expect(response.statusCode).toBe(200);
    expect(pollMock).toHaveBeenCalledTimes(1);
    const [polled] = pollMock.mock.calls[0] as [{ id: number; url: string; queueCap: number | null }];
    expect(polled).toMatchObject({
      id,
      url: 'https://www.youtube.com/@RealClearPoliticsYT',
      queueCap: 5,
    });
  });

  it('passes no queue cap for a plain channel', async () => {
    const id = insertSubscription({
      url: 'https://www.youtube.com/@plainchannel',
      externalId: '@plainchannel',
      options: {},
    });

    await app.inject({ method: 'POST', url: `/api/youtube/subscriptions/${id}/poll` });

    const [polled] = pollMock.mock.calls[0] as [{ queueCap: number | null }];
    expect(polled.queueCap).toBeNull();
  });

  it('polls inside the seven-day retention window by default', async () => {
    const id = insertSubscription({
      url: 'https://www.youtube.com/@windowed',
      externalId: '@windowed',
      options: {},
    });

    await app.inject({ method: 'POST', url: `/api/youtube/subscriptions/${id}/poll` });

    const [polled] = pollMock.mock.calls[0] as [{ windowDays: number }];
    expect(polled.windowDays).toBe(7);
  });

  it('records the poll outcome on the subscription row', async () => {
    const id = insertSubscription({
      url: 'https://www.youtube.com/@failing',
      externalId: '@failing',
      options: { podcast: true, keepLatest: 3 },
    });
    pollMock.mockImplementation(async (_subscription: unknown, store: {
      recordPoll(id: number, outcome: { at: Date; error?: string | null }): Promise<void>;
    }) => {
      await store.recordPoll(id, { at: new Date(0), error: 'Command failed: yt-dlp' });
      return { ...EMPTY_RESULT, subscriptionId: id, error: 'Command failed: yt-dlp' };
    });

    await app.inject({ method: 'POST', url: `/api/youtube/subscriptions/${id}/poll` });

    const row = db.select().from(schema.youtubeSubscriptions)
      .where(eq(schema.youtubeSubscriptions.id, id)).get();
    expect(row?.lastError).toBe('Command failed: yt-dlp');
    expect(row?.lastPolledAt).toEqual(new Date(0));
  });
});
