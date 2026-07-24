import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createApiServer } from '../createApiServer';
import { LogReaderService } from '../../services/LogReaderService';

describe('logs routes real-source contract', () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map(app => app.close()));
  });

  function createApp(logReaderService: LogReaderService): FastifyInstance {
    const app = createApiServer({
      prisma: {},
      logReaderService,
    } as never, {
      torrentStatsIntervalMs: 60_000,
      activityPollIntervalMs: 60_000,
      healthPollIntervalMs: 60_000,
    });
    apps.push(app);
    return app;
  }

  it('uses one real buffer for list, detail, clear, delete, and download', async () => {
    const logReaderService = new LogReaderService();
    logReaderService.push('info', 'real startup message');
    logReaderService.push('error', 'real database failure');
    const app = createApp(logReaderService);

    const listResponse = await app.inject({ method: 'GET', url: '/api/logs/files' });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().data).toEqual([
      expect.objectContaining({
        filename: 'mediarr.log',
        size: expect.any(Number),
        lastModified: expect.any(String),
      }),
    ]);

    const detailResponse = await app.inject({
      method: 'GET',
      url: '/api/logs/files/mediarr.log?limit=1',
    });
    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json().data).toEqual({
      filename: 'mediarr.log',
      contents: expect.stringContaining('real database failure'),
      totalLines: 2,
    });
    expect(detailResponse.json().data.contents).not.toContain('real startup message');
    expect(detailResponse.json().data.contents).not.toContain('2024-02-15');

    const downloadResponse = await app.inject({
      method: 'GET',
      url: '/api/logs/files/mediarr.log/download',
    });
    const rawResponse = await app.inject({
      method: 'GET',
      url: downloadResponse.json().data.downloadUrl,
    });
    expect(rawResponse.statusCode).toBe(200);
    expect(rawResponse.headers['content-disposition']).toBe('attachment; filename="mediarr.log"');
    expect(rawResponse.body).toContain('real startup message');
    expect(rawResponse.body).toContain('real database failure');

    const clearResponse = await app.inject({
      method: 'POST',
      url: '/api/logs/files/mediarr.log/clear',
    });
    expect(clearResponse.statusCode).toBe(200);
    const clearedDetail = await app.inject({
      method: 'GET',
      url: '/api/logs/files/mediarr.log',
    });
    expect(clearedDetail.json().data).toEqual({
      filename: 'mediarr.log',
      contents: '',
      totalLines: 0,
    });

    logReaderService.push('warn', 'log after clear');
    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: '/api/logs/files/mediarr.log',
    });
    expect(deleteResponse.statusCode).toBe(200);
    const deletedList = await app.inject({ method: 'GET', url: '/api/logs/files' });
    expect(deletedList.json().data).toEqual([]);
    expect((await app.inject({
      method: 'GET',
      url: '/api/logs/files/mediarr.log',
    })).statusCode).toBe(404);

    logReaderService.push('info', 'log after delete');
    const recreatedList = await app.inject({ method: 'GET', url: '/api/logs/files' });
    expect(recreatedList.json().data).toHaveLength(1);
  });

  it('returns 404 for every operation on an unknown log source', async () => {
    const app = createApp(new LogReaderService());

    for (const request of [
      { method: 'GET', url: '/api/logs/files/unknown.log' },
      { method: 'DELETE', url: '/api/logs/files/unknown.log' },
      { method: 'POST', url: '/api/logs/files/unknown.log/clear' },
      { method: 'GET', url: '/api/logs/files/unknown.log/download' },
      { method: 'GET', url: '/api/logs/files/unknown.log/raw' },
    ] as const) {
      const response = await app.inject(request);
      expect(response.statusCode).toBe(404);
      expect(response.json().ok).toBe(false);
    }
  });

  it('fails explicitly when the real log source is not composed', async () => {
    const app = createApiServer({ prisma: {} } as never, {
      torrentStatsIntervalMs: 60_000,
      activityPollIntervalMs: 60_000,
      healthPollIntervalMs: 60_000,
    });
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/api/logs/files' });

    expect(response.statusCode).toBe(500);
    expect(response.json().ok).toBe(false);
  });
});
