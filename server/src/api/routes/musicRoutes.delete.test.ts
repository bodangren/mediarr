import Fastify from 'fastify';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ApiDependencies } from '../types';
import { registerMusicRoutes } from './musicRoutes';

type TrackRow = { id: number; path: string; title: string };

function createApp(tracks: TrackRow[]) {
  const deleted: number[] = [];
  const drizzle = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => tracks,
        }),
      }),
    }),
    delete: () => ({
      where: async () => {
        deleted.push(tracks[0]?.id ?? 0);
      },
    }),
  };
  const app = Fastify();
  registerMusicRoutes(app, { prisma: { drizzle } } as unknown as ApiDependencies);
  return { app, deleted };
}

describe('DELETE /api/music/tracks/:id', () => {
  let root: string;
  const previous = process.env.MUSIC_DIR;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'music-delete-'));
    process.env.MUSIC_DIR = root;
  });

  afterEach(() => {
    process.env.MUSIC_DIR = previous;
    rmSync(root, { recursive: true, force: true });
  });

  it('unlinks a file inside MUSIC_DIR and drops the row', async () => {
    mkdirSync(path.join(root, 'Artist', 'Album'), { recursive: true });
    const file = path.join(root, 'Artist', 'Album', 'track.m4a');
    writeFileSync(file, 'audio');
    const { app, deleted } = createApp([{ id: 7, path: file, title: 'Song' }]);

    const response = await app.inject({ method: 'DELETE', url: '/api/music/tracks/7' });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({ trackId: 7, fileDeleted: true });
    expect(deleted).toEqual([7]);
    await app.close();
  });

  it('refuses a path outside MUSIC_DIR and does not touch the row', async () => {
    const outside = path.join(root, '..', 'elsewhere.m4a');
    const { app, deleted } = createApp([{ id: 8, path: outside, title: 'Escape' }]);

    const response = await app.inject({ method: 'DELETE', url: '/api/music/tracks/8' });

    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe('OUTSIDE_MUSIC_ROOT');
    expect(deleted).toEqual([]);
    await app.close();
  });

  it('treats a missing file as already gone and still drops the row', async () => {
    const ghost = path.join(root, 'Artist', 'missing.m4a');
    const { app, deleted } = createApp([{ id: 9, path: ghost, title: 'Ghost' }]);

    const response = await app.inject({ method: 'DELETE', url: '/api/music/tracks/9' });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.fileDeleted).toBe(false);
    expect(deleted).toEqual([9]);
    await app.close();
  });

  it('404s an unknown track and 422s a bad id', async () => {
    const { app } = createApp([]);
    const missing = await app.inject({ method: 'DELETE', url: '/api/music/tracks/404' });
    expect(missing.statusCode).toBe(404);
    const bad = await app.inject({ method: 'DELETE', url: '/api/music/tracks/abc' });
    expect(bad.statusCode).toBe(422);
    await app.close();
  });
});
