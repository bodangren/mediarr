import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { registerApiErrorHandler } from '../../api/errors';
import { registerReleaseRoutes } from '../../api/routes/releaseRoutes';
import type { ApiDependencies } from '../../api/types';
import { IndexerFactory } from '../IndexerFactory';
import { DefinitionLoader } from '../DefinitionLoader';
import { HttpClient } from '../HttpClient';
import { MediaSearchService } from '../../services/MediaSearchService';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const definitionsDirectory = path.resolve(__dirname, '../../../definitions');
const runLive = process.env.CARDIGANN_LIVE_TESTS === 'true';

async function createLiveReleaseSearchApp(): Promise<FastifyInstance> {
  const loader = new DefinitionLoader();
  const definitions = await loader.loadFromDirectory(definitionsDirectory);
  const factory = new IndexerFactory(
    definitions,
    new HttpClient({ timeout: 25_000, userAgent: 'Mediarr-ReleaseSearch-LiveTest/1.0' }),
  );

  const mediaSearchService = new MediaSearchService(
    {
      findAllEnabled: async () => [{
        id: 901001,
        name: 'TPB (Live Smoke)',
        implementation: 'Cardigann',
        protocol: 'torrent',
        enabled: true,
        priority: 1,
        supportsRss: true,
        supportsSearch: true,
        settings: {
          definitionId: 'thepiratebay',
        },
      }],
    },
    factory as unknown as { fromDatabaseRecord: (record: unknown) => import('../BaseIndexer').BaseIndexer },
    {
      addTorrent: async () => ({ infoHash: 'not-used', name: 'not-used', path: '' }),
    },
  );

  const deps: ApiDependencies = {
    prisma: {},
    mediaSearchService,
  };

  const app = Fastify();
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerReleaseRoutes(app, deps);
  await app.ready();
  return app;
}

const liveDescribe = runLive ? describe : describe.skip;
liveDescribe('Live release search smoke tests (TPB)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createLiveReleaseSearchApp();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns movie results for Big Buck Bunny', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/releases/search',
      payload: {
        query: 'Big Buck Bunny 2008',
        type: 'movie',
      },
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json() as {
      ok: boolean;
      data: Array<{ title: string }>;
      meta: { totalCount: number };
    };
    expect(payload.ok).toBe(true);
    expect(payload.meta.totalCount).toBeGreaterThan(0);
    expect(payload.data.some(item => item.title.toLowerCase().includes('big buck'))).toBe(true);
  }, 90_000);

  it('returns TV results for The Sopranos', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/releases/search',
      payload: {
        query: 'The Sopranos',
        type: 'tvsearch',
      },
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json() as {
      ok: boolean;
      data: Array<{ title: string }>;
      meta: { totalCount: number };
    };
    expect(payload.ok).toBe(true);
    expect(payload.meta.totalCount).toBeGreaterThan(0);
    expect(payload.data.some(item => item.title.toLowerCase().includes('sopranos'))).toBe(true);
  }, 90_000);
});

describe('Live release search smoke tests (gating)', () => {
  it('is env-gated by CARDIGANN_LIVE_TESTS=true', () => {
    expect(typeof runLive).toBe('boolean');
  });
});
