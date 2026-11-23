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
 * The download service is mocked at the module boundary: the route still runs its real
 * claim/markAvailable/markFailed callbacks, but no yt-dlp process is started.
 */
const downloadRun = vi.hoisted(() => vi.fn());

vi.mock('../../services/YoutubeDownloadService', () => ({
  YoutubeDownloadService: class {
    run = downloadRun;
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

let videoCounter = 0;

function insertVideo(
  db: Db,
  values: Partial<typeof schema.youtubeVideos.$inferInsert> & { title: string },
): number {
  videoCounter += 1;
  const row = db
    .insert(schema.youtubeVideos)
    .values({
      videoId: `vid-${videoCounter}`,
      source: 'SUBSCRIPTION',
      status: 'PENDING',
      attempts: 0,
      ...values,
    })
    .returning({ id: schema.youtubeVideos.id })
    .get();
  if (!row) throw new Error('insert failed');
  return row.id;
}

describe('YouTube management routes', () => {
  let db: Db;
  let app: FastifyInstance;
  let tmpDir: string;
  let mediaRoot: string;

  beforeEach(() => {
    db = makeDb();
    app = Fastify({ logger: false });
    app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
    registerYoutubeRoutes(app, { prisma: { drizzle: db } } as unknown as ApiDependencies);

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mediarr-youtube-manage-'));
    mediaRoot = path.join(tmpDir, 'Youtube');
    fs.mkdirSync(mediaRoot, { recursive: true });
    process.env.YOUTUBE_DIR = mediaRoot;
    process.env.CONFIG_DIR = tmpDir;
    downloadRun.mockReset();
    downloadRun.mockImplementation(async (_limit: number, videos: Array<{ id: number }>, store: {
      claim(id: number): Promise<void>;
      markAvailable(id: number, result: { path: string; thumbPath: string | null; durationSeconds: number | null; channel?: string | null }): Promise<void>;
    }) => {
      for (const video of videos) {
        await store.claim(video.id);
        await store.markAvailable(video.id, {
          path: path.join(mediaRoot, 'downloaded.mp4'),
          thumbPath: null,
          durationSeconds: 42,
          channel: 'CodeStoic',
        });
      }
      return { attempted: videos.length, downloaded: videos.length, failed: [] };
    });
  });

  afterEach(async () => {
    await app.close();
    delete process.env.YOUTUBE_DIR;
    delete process.env.CONFIG_DIR;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates a playlist podcast source with a keep window and patches it later', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/youtube/subscriptions',
      payload: {
        url: 'https://www.youtube.com/playlist?list=PLpodcast123',
        title: 'Weekly Podcast',
        options: { podcast: true },
      },
    });
    expect(created.statusCode).toBe(201);
    const row = (created.json() as { data: { id: number; kind: string; options: { podcast: boolean; keepLatest: number } } }).data;
    expect(row.kind).toBe('PLAYLIST');
    expect(row.options).toMatchObject({ podcast: true, keepLatest: 3 });

    const patched = await app.inject({
      method: 'PATCH',
      url: `/api/youtube/subscriptions/${row.id}`,
      payload: { options: { keepLatest: 5 } },
    });
    expect(patched.statusCode).toBe(200);
    expect((patched.json() as { data: { options: { podcast: boolean; keepLatest: number } } }).data.options)
      .toMatchObject({ podcast: true, keepLatest: 5 });
  });

  it('rejects an invalid keep window', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/youtube/subscriptions',
      payload: { url: 'https://www.youtube.com/playlist?list=PLbad', options: { keepLatest: 0 } },
    });
    expect(response.statusCode).toBe(422);
    expect((response.json() as { error: { code: string } }).error.code).toBe('INVALID_OPTIONS');
  });

  it('retires the queue rows of a deleted subscription and keeps finished files', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/youtube/subscriptions',
      payload: { url: 'https://www.youtube.com/playlist?list=PLgonegonegone', title: 'Gone' },
    });
    const removalTarget = (created.json() as { data: { id: number } }).data.id;
    const queued = insertVideo(db, { title: 'Queued episode', subscriptionId: removalTarget });
    const failed = insertVideo(db, { title: 'Failed episode', status: 'FAILED', attempts: 2, subscriptionId: removalTarget });
    const finished = insertVideo(db, {
      title: 'Finished episode',
      status: 'AVAILABLE',
      path: path.join(mediaRoot, 'finished.mp4'),
      subscriptionId: removalTarget,
    });

    const removed = await app.inject({ method: 'DELETE', url: `/api/youtube/subscriptions/${removalTarget}` });
    expect(removed.statusCode).toBe(200);

    const byId = new Map(db.select().from(schema.youtubeVideos).all().map((row) => [row.id, row]));
    expect(byId.get(queued)?.status).toBe('DELETED');
    expect(byId.get(queued)?.error).toContain('source-removed');
    expect(byId.get(failed)?.status).toBe('DELETED');
    expect(byId.get(finished)?.status).toBe('AVAILABLE');
  });

  it('lists queue rows with sizes and separates exhausted failures', async () => {
    const pendingPath = path.join(mediaRoot, 'pending.mp4');
    fs.writeFileSync(pendingPath, '0123456789');
    const pendingId = insertVideo(db, { title: 'Pending one', channel: 'Chan', path: pendingPath });
    insertVideo(db, {
      title: 'Exhausted one',
      status: 'FAILED',
      attempts: 4,
      error: 'Sign in to confirm you are not a bot',
      retryAt: new Date(Date.now() + 60_000),
    });
    insertVideo(db, {
      title: 'Retrying one',
      status: 'FAILED',
      attempts: 1,
      error: 'network timeout',
    });

    const pending = await app.inject({ method: 'GET', url: '/api/youtube/queue/videos?status=PENDING' });
    expect(pending.statusCode).toBe(200);
    expect(pending.json().data.items).toEqual([
      expect.objectContaining({ id: pendingId, title: 'Pending one', status: 'PENDING', sizeBytes: 10 }),
    ]);

    const failed = await app.inject({ method: 'GET', url: '/api/youtube/queue/videos?status=FAILED' });
    expect(failed.json().data.items).toHaveLength(2);
    expect(failed.json().data.items.map((item: { title: string }) => item.title)).toEqual(
      expect.arrayContaining(['Exhausted one', 'Retrying one']),
    );

    const exhausted = await app.inject({ method: 'GET', url: '/api/youtube/queue/videos?status=EXHAUSTED' });
    expect(exhausted.json().data.items).toHaveLength(1);
    expect(exhausted.json().data.items[0]).toMatchObject({
      title: 'Exhausted one',
      attempts: 4,
      error: 'Sign in to confirm you are not a bot',
    });

    const invalid = await app.inject({ method: 'GET', url: '/api/youtube/queue/videos?status=NOPE' });
    expect(invalid.statusCode).toBe(422);
    expect(invalid.json().error.message).toBe(
      'status must be one of PENDING, DOWNLOADING, FAILED, EXHAUSTED, QUARANTINED',
    );
  });

  it('retries a failed video without waiting for the backoff', async () => {
    const id = insertVideo(db, {
      title: 'Bot checked',
      status: 'FAILED',
      attempts: 3,
      error: 'Sign in to confirm',
      retryAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const response = await app.inject({ method: 'POST', url: `/api/youtube/videos/${id}/retry` });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({
      id,
      status: 'PENDING',
      attempts: 0,
      retryAt: null,
      error: null,
    });
  });

  it('refuses to retry a video that is not failed', async () => {
    const id = insertVideo(db, { title: 'Playable', status: 'AVAILABLE', path: '/data/Youtube/a.mp4' });

    const response = await app.inject({ method: 'POST', url: `/api/youtube/videos/${id}/retry` });

    expect(response.statusCode).toBe(422);
    expect(response.json().error.message).toBe('Video is AVAILABLE; only FAILED videos can be retried');
  });

  it('downloads one specific pending video now', async () => {
    const id = insertVideo(db, { title: 'Download me' });

    const response = await app.inject({ method: 'POST', url: `/api/youtube/videos/${id}/download` });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({ id, attempted: 1, downloaded: 1 });
    const row = db.select().from(schema.youtubeVideos).where(eq(schema.youtubeVideos.id, id)).get();
    expect(row).toMatchObject({ status: 'AVAILABLE', durationSeconds: 42, channel: 'CodeStoic' });

    const notQueued = await app.inject({ method: 'POST', url: `/api/youtube/videos/${id}/download` });
    expect(notQueued.statusCode).toBe(422);
    expect(notQueued.json().error.message).toBe(
      'Video is AVAILABLE; only PENDING or FAILED videos can be downloaded',
    );
  });

  it('removes a queued row but refuses to remove a playable file', async () => {
    const pending = insertVideo(db, { title: 'Remove me' });
    const response = await app.inject({ method: 'DELETE', url: `/api/youtube/videos/${pending}` });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, data: { id: pending, deleted: true } });
    // DELETED is the tombstone that keeps the next subscription poll from re-queueing the upload.
    expect(db.select().from(schema.youtubeVideos).where(eq(schema.youtubeVideos.id, pending)).get())
      .toMatchObject({ status: 'DELETED' });

    const available = insertVideo(db, { title: 'Keep file', status: 'AVAILABLE', path: path.join(mediaRoot, 'k.mp4') });
    const refused = await app.inject({ method: 'DELETE', url: `/api/youtube/videos/${available}` });
    expect(refused.statusCode).toBe(422);
    expect(refused.json().error.message).toBe(
      'Video is AVAILABLE; delete its file instead of removing the queue row',
    );
  });

  it('deletes an available video file inside the library root', async () => {
    const file = path.join(mediaRoot, 'gone.mp4');
    const thumb = path.join(mediaRoot, 'gone.jpg');
    fs.writeFileSync(file, 'video');
    fs.writeFileSync(thumb, 'thumb');
    const id = insertVideo(db, { title: 'Delete file', status: 'AVAILABLE', path: file, thumbPath: thumb });

    const response = await app.inject({ method: 'DELETE', url: `/api/youtube/videos/${id}/file` });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual({ id, deleted: true, path: file });
    expect(fs.existsSync(file)).toBe(false);
    expect(fs.existsSync(thumb)).toBe(false);
    expect(db.select().from(schema.youtubeVideos).where(eq(schema.youtubeVideos.id, id)).get())
      .toMatchObject({ status: 'DELETED', path: null, thumbPath: null });
  });

  it('refuses to delete a file outside the library root', async () => {
    const outside = path.join(tmpDir, 'outside.mp4');
    fs.writeFileSync(outside, 'video');
    const id = insertVideo(db, { title: 'Outside', status: 'AVAILABLE', path: outside });

    const response = await app.inject({ method: 'DELETE', url: `/api/youtube/videos/${id}/file` });

    expect(response.statusCode).toBe(422);
    expect(response.json().error.message).toBe(
      'Refusing to delete a file outside the YouTube library root',
    );
    expect(fs.existsSync(outside)).toBe(true);
  });

  it('lists quarantined videos and sizes retention candidates', async () => {
    const watchedAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const quarantinePath = path.join(tmpDir, 'quarantine', 'old.mp4');
    fs.mkdirSync(path.dirname(quarantinePath), { recursive: true });
    fs.writeFileSync(quarantinePath, '1234567');
    insertVideo(db, {
      title: 'Quarantined old',
      status: 'QUARANTINED',
      path: quarantinePath,
      watchedAt,
      isWatched: true,
    });
    const candidatePath = path.join(mediaRoot, 'watched.mp4');
    fs.writeFileSync(candidatePath, '123456789');
    insertVideo(db, {
      title: 'Watched candidate',
      channel: 'Chan',
      status: 'AVAILABLE',
      path: candidatePath,
      watchedAt,
      isWatched: true,
    });

    const quarantined = await app.inject({ method: 'GET', url: '/api/youtube/retention/quarantined' });
    expect(quarantined.statusCode).toBe(200);
    expect(quarantined.json().data.count).toBe(1);
    expect(quarantined.json().data.items[0]).toMatchObject({
      title: 'Quarantined old',
      path: quarantinePath,
      sizeBytes: 7,
    });

    const candidates = await app.inject({ method: 'GET', url: '/api/youtube/retention/candidates?days=7' });
    expect(candidates.statusCode).toBe(200);
    expect(candidates.json().data.candidates).toEqual([
      expect.objectContaining({ title: 'Watched candidate', channel: 'Chan', sizeBytes: 9 }),
    ]);
  });

  it('exposes the downloaded path on library videos for an exact delete confirmation', async () => {
    const file = path.join(mediaRoot, 'library.mp4');
    fs.writeFileSync(file, 'video');
    insertVideo(db, { title: 'Library video', channel: 'Chan', status: 'AVAILABLE', path: file });

    const response = await app.inject({ method: 'GET', url: '/api/youtube/videos?limit=10' });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.items).toEqual([
      expect.objectContaining({ title: 'Library video', path: file }),
    ]);
  });
});
