import { describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerIndexerRoutes } from './indexerRoutes';

function createApp(): FastifyInstance {
  const app = Fastify();

  const deps: ApiDependencies = {
    prisma: {},
    indexerRepository: {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    indexerTester: {
      test: vi.fn(),
    },
    indexerFactory: {
      fromDatabaseRecord: vi.fn(),
      getDefinition: vi.fn().mockReturnValue({
        id: '1337x',
        name: '1337x',
        type: 'public',
        links: ['https://1337x.to'],
        settings: [
          { name: 'sitelink', type: 'text', label: 'Site Link', default: 'https://1337x.to' },
          { name: 'cookie', type: 'text', label: 'Cookie', optional: true },
        ],
        search: {
          paths: [{ path: '/search' }],
          rows: { selector: 'tr' },
          fields: { title: { selector: '.title' } },
        },
      }),
      getCompatibilityReport: vi.fn().mockReturnValue({
        definitionId: '1337x',
        status: 'compatible',
        issues: [],
      }),
    },
  };

  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerIndexerRoutes(app, deps);
  return app;
}

describe('indexerRoutes schema endpoint', () => {
  it('returns Cardigann schema from definition settings', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/indexers/schema/CardigannSettings?definitionId=1337x',
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload.ok).toBe(true);
    expect(payload.data.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'definitionId', required: true }),
        expect.objectContaining({ name: 'sitelink' }),
      ]),
    );
    expect(payload.data.compatibility.status).toBe('compatible');
  });

  it('requires definitionId when requesting CardigannSettings schema', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/indexers/schema/CardigannSettings',
    });

    expect(response.statusCode).toBe(422);
  });

  it('returns static schema for TorznabSettings', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/indexers/schema/TorznabSettings',
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload.ok).toBe(true);
    expect(payload.data.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'url', required: true }),
        expect.objectContaining({ name: 'apiKey', required: true }),
      ]),
    );
  });
});
