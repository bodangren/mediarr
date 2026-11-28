import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import type { ApiDependencies } from '../types';
import { registerMusicRoutes } from './musicRoutes';

type CurrentRow = {
  id: number;
  skipCount: number;
  earlySkipCount: number;
  lastSkippedAt: Date | null;
};

function createApp(rows: CurrentRow[]) {
  const updates: Array<Record<string, unknown>> = [];
  const drizzle = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => rows,
        }),
      }),
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: async () => {
          updates.push(values);
        },
      }),
    }),
  };
  const app = Fastify();
  registerMusicRoutes(app, { prisma: { drizzle } } as unknown as ApiDependencies);
  return { app, updates };
}

describe('POST /api/music/tracks/:id/skip', () => {
  it('records an early skip and returns the counts', async () => {
    const { app, updates } = createApp([
      { id: 7, skipCount: 1, earlySkipCount: 0, lastSkippedAt: null },
    ]);

    const response = await app.inject({
      method: 'POST',
      url: '/api/music/tracks/7/skip',
      payload: { position: 25, duration: 240 },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({
      trackId: 7,
      recorded: true,
      early: true,
      skipCount: 2,
      earlySkipCount: 1,
    });
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({ skipCount: 2, earlySkipCount: 1 });
    expect(updates[0]!.lastSkippedAt).toBeInstanceOf(Date);
    await app.close();
  });

  it('records a late skip without flagging it early', async () => {
    const { app, updates } = createApp([
      { id: 8, skipCount: 0, earlySkipCount: 0, lastSkippedAt: null },
    ]);

    const response = await app.inject({
      method: 'POST',
      url: '/api/music/tracks/8/skip',
      payload: { position: 180, duration: 240 },
    });

    expect(response.json().data).toMatchObject({ recorded: true, early: false, skipCount: 1, earlySkipCount: 0 });
    expect(updates[0]).toMatchObject({ skipCount: 1, earlySkipCount: 0 });
    await app.close();
  });

  it('ignores a completed listen (no update, recorded false)', async () => {
    const { app, updates } = createApp([
      { id: 9, skipCount: 2, earlySkipCount: 1, lastSkippedAt: null },
    ]);

    const response = await app.inject({
      method: 'POST',
      url: '/api/music/tracks/9/skip',
      payload: { position: 235, duration: 240 },
    });

    expect(response.json().data).toMatchObject({ recorded: false, skipCount: 2, earlySkipCount: 1 });
    expect(updates).toHaveLength(0);
    await app.close();
  });

  it('returns 404 for an unknown track and 422 for invalid numbers', async () => {
    const { app } = createApp([]);
    const missing = await app.inject({
      method: 'POST', url: '/api/music/tracks/404/skip', payload: { position: 1, duration: 10 },
    });
    expect(missing.statusCode).toBe(404);

    const invalid = await app.inject({
      method: 'POST', url: '/api/music/tracks/7/skip', payload: { position: 'x', duration: -1 },
    });
    expect(invalid.statusCode).toBe(422);
    expect(invalid.json().error.code).toBe('INVALID_SKIP');
    await app.close();
  });
});
