import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerIndexerRoutes } from './indexerRoutes';
import { DatabaseClient } from '../../db/drizzleClient';
import * as schema from '../../db/schema';
import { IndexerHealthRepository } from '../../repositories/IndexerHealthRepository';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'drizzle');

function applyMigrations(sqlite: { exec: (sql: string) => void }): void {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const statements = content.split('--> statement-breakpoint');
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (trimmed) {
        sqlite.exec(trimmed);
      }
    }
  }
}

function createIndexerRepositoryMock() {
  return {
    findAll: vi.fn(),
    findById: vi.fn(),
    findAllEnabled: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

describe('indexerRoutes — GET /api/indexers/:id/health (Phase 1)', () => {
  let client: DatabaseClient;
  let healthRepo: IndexerHealthRepository;
  let indexerRepository: ReturnType<typeof createIndexerRepositoryMock>;
  let app: FastifyInstance;
  let seededIndexerId: number;

  beforeAll(async () => {
    client = new DatabaseClient({ datasources: { db: { url: ':memory:' } } });
    applyMigrations(client.sqlite);
    healthRepo = new IndexerHealthRepository(client);
    indexerRepository = createIndexerRepositoryMock();

    const [seeded] = await client.drizzle.insert(schema.indexers).values({
      name: 'Real Drizzle Indexer',
      implementation: 'Torznab',
      configContract: 'TorznabSettings',
      settings: '{"url":"https://indexer.example","apiKey":"k"}',
      protocol: 'torrent',
      supportedMediaTypes: '[]',
      enabled: true,
      supportsRss: true,
      supportsSearch: true,
      priority: 25,
    }).returning();
    seededIndexerId = seeded!.id;

    const deps: ApiDependencies = {
      prisma: client,
      indexerRepository,
      indexerHealthRepository: healthRepo,
      indexerTester: { test: vi.fn() },
      indexerFactory: { fromDatabaseRecord: vi.fn(), getDefinition: vi.fn(), getCompatibilityReport: vi.fn() },
    };

    app = Fastify();
    app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
    registerIndexerRoutes(app, deps);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await client.$disconnect();
  });

  beforeEach(async () => {
    await client.drizzle.delete(schema.indexerHealthSnapshots);
    indexerRepository.findById.mockImplementation(async (id: number) => {
      const [row] = await client.drizzle
        .select()
        .from(schema.indexers)
        .where(eq(schema.indexers.id, id))
        .limit(1);
      return row ?? null;
    });
  });

  it('returns 200 with snapshot=null when no health snapshot exists for the indexer', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/indexers/${seededIndexerId}/health`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.snapshot).toBeNull();
    expect(body.data.indexerId).toBe(seededIndexerId);
  });

  it('persists a real failure to the in-memory DB and returns the snapshot on the next GET', async () => {
    await healthRepo.recordFailure(seededIndexerId, 'real drizzle failure', new Date('2026-05-09T10:00:00Z'));

    const response = await app.inject({
      method: 'GET',
      url: `/api/indexers/${seededIndexerId}/health`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.snapshot).not.toBeNull();
    expect(body.data.snapshot.failureCount).toBe(1);
    expect(body.data.snapshot.lastErrorMessage).toBe('real drizzle failure');
  });

  it('returns 404 when the indexer does not exist', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/indexers/99999/health',
    });

    expect(response.statusCode).toBe(404);
  });
});
