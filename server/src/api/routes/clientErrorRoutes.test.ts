import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerClientErrorRoutes } from './clientErrorRoutes';

describe('client error ingestion', () => {
  let app: FastifyInstance;
  let tempDir: string;
  const originalConfigDir = process.env.CONFIG_DIR;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mediarr-client-errors-'));
    process.env.CONFIG_DIR = tempDir;
    app = Fastify();
    registerClientErrorRoutes(app);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    process.env.CONFIG_DIR = originalConfigDir;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('accepts a client error and exposes it for triage', async () => {
    const post = await app.inject({
      method: 'POST',
      url: '/api/client-errors',
      payload: {
        message: 'Failed to open http://host:5174/api/stream/948?type=episode',
        stack: 'at play (playback_service.dart:1)',
        appVersion: '1.0.9',
        versionCode: 9,
        platform: 'android',
        route: '/playback',
        severity: 'error',
        context: { mediaId: 948, mediaType: 'episode' },
      },
    });
    expect(post.statusCode).toBe(202);

    const get = await app.inject({ method: 'GET', url: '/api/client-errors' });
    expect(get.statusCode).toBe(200);
    const body = get.json();
    expect(body.data.total).toBe(1);
    expect(body.data.items[0].message).toContain('Failed to open');
    expect(body.data.items[0].context).toEqual({ mediaId: 948, mediaType: 'episode' });
    expect(body.data.items[0].versionCode).toBe(9);
  });

  it('rejects a payload with no message', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/client-errors',
      payload: { stack: 'only a stack' },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('filters by since and caps the returned batch', async () => {
    for (const message of ['first', 'second', 'third']) {
      await app.inject({
        method: 'POST',
        url: '/api/client-errors',
        payload: { message },
      });
    }
    const all = await app.inject({ method: 'GET', url: '/api/client-errors' });
    expect(all.json().data.total).toBe(3);

    const capped = await app.inject({ method: 'GET', url: '/api/client-errors?limit=2' });
    expect(capped.json().data.items).toHaveLength(2);
    expect(capped.json().data.items.at(-1).message).toBe('third');

    const future = new Date(Date.now() + 60_000).toISOString();
    const since = await app.inject({
      method: 'GET',
      url: `/api/client-errors?since=${encodeURIComponent(future)}`,
    });
    expect(since.json().data.items).toHaveLength(0);
  });

  it('survives a torn log line', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'client-errors.jsonl'),
      '{"id":"a","receivedAt":"2026-01-01T00:00:00.000Z","severity":"error","message":"good"}\n{not json\n',
      'utf-8',
    );
    const res = await app.inject({ method: 'GET', url: '/api/client-errors' });
    expect(res.json().data.items).toHaveLength(1);
    expect(res.json().data.items[0].message).toBe('good');
  });
});
