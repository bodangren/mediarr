import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import type { ApiDependencies } from '../types';
import { registerMediaRoutes } from './mediaRoutes';

function createApp(autoSearchMovie: (id: number) => Promise<{ success: boolean; reason?: string }>) {
  const app = Fastify();
  registerMediaRoutes(app, { wantedSearchService: { autoSearchMovie } } as unknown as ApiDependencies);
  return app;
}

describe('POST /api/media/:id/auto-search error envelope', () => {
  it('returns the shared error envelope, not the legacy string, when no release is found', async () => {
    const app = createApp(async () => ({ success: false, reason: 'No releases found' }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/media/42/auto-search',
      payload: { type: 'movie' },
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body).toMatchObject({ ok: false, error: { code: 'NO_RELEASES', message: 'No releases found' } });
    await app.close();
  });

  it('keeps the success envelope when a release is grabbed', async () => {
    const app = createApp(async () => ({ success: true }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/media/42/auto-search',
      payload: { type: 'movie' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().ok).toBe(true);
    await app.close();
  });
});
