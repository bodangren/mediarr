import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { registerClientUpdateRoutes } from './clientUpdateRoutes';

describe('client update routes', () => {
  let dir: string;
  let app: FastifyInstance;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'client-update-'));
    process.env.CONFIG_DIR = dir;
    app = Fastify();
    registerClientUpdateRoutes(app);
  });

  afterEach(async () => {
    await app.close();
    delete process.env.CONFIG_DIR;
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('returns null when no update has been published', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/client/update' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, data: null });
  });

  it('returns the published manifest', async () => {
    await fs.mkdir(path.join(dir, 'client-updates'), { recursive: true });
    const manifest = { versionCode: 2, versionName: '1.0.1', file: 'mediarr-client-2.apk', sha256: 'abc', size: 123 };
    await fs.writeFile(path.join(dir, 'client-updates', 'manifest.json'), JSON.stringify(manifest));
    const response = await app.inject({ method: 'GET', url: '/api/client/update' });
    expect(response.json()).toEqual({ ok: true, data: manifest });
  });

  it('serves a published APK and rejects path traversal', async () => {
    await fs.mkdir(path.join(dir, 'client-updates'), { recursive: true });
    await fs.writeFile(path.join(dir, 'client-updates', 'client.apk'), 'apk-bytes');
    const ok = await app.inject({ method: 'GET', url: '/api/client/download?file=client.apk' });
    expect(ok.statusCode).toBe(200);
    expect(ok.body).toBe('apk-bytes');
    const bad = await app.inject({ method: 'GET', url: '/api/client/download?file=../secret' });
    expect(bad.statusCode).toBe(400);
  });
});
