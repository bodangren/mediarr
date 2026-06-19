import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { DatabaseClient } from '../db/drizzleClient';
import * as schema from '../db/schema';
import { IndexerHealthRepository } from '../repositories/IndexerHealthRepository';
import { IndexerTester } from './IndexerTester';
import { TorznabIndexer } from './BaseIndexer';
import type { HttpClient } from './HttpClient';
import type { IndexerAutoDisable } from '../services/IndexerAutoDisable';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
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

const AUTO_DISABLE_THRESHOLD = 3;

function makeSettingsProvider(threshold: number) {
  return { getAutoDisableThreshold: vi.fn().mockResolvedValue(threshold) };
}

function makeTorznabIndexerRecord(id: number, name: string) {
  return {
    name,
    implementation: 'Torznab',
    configContract: 'TorznabSettings',
    settings: '{"url":"https://indexer.example","apiKey":"k"}',
    protocol: 'torrent',
    supportedMediaTypes: '["TV", "MOVIE"]',
    enabled: true,
    supportsRss: true,
    supportsSearch: true,
    priority: 25,
  };
}

function makeFailingHttpClient(): HttpClient {
  return {
    get: vi.fn().mockResolvedValue({ ok: false, status: 500, body: '' }),
    post: vi.fn().mockResolvedValue({ ok: false, status: 500, body: '' }),
    buildHeaders: vi.fn().mockReturnValue({}),
    setCookie: vi.fn(),
    getCookies: vi.fn().mockReturnValue(''),
  } as unknown as HttpClient;
}

function makeTorznabIndexer(id: number, name: string, httpClient: HttpClient) {
  return new TorznabIndexer({
    id,
    name,
    implementation: 'Torznab',
    protocol: 'torrent',
    enabled: true,
    priority: 25,
    supportsRss: true,
    supportsSearch: true,
    settings: { url: 'https://indexer.example', apiKey: 'k' },
    httpClient,
  });
}

describe('IndexerTester + IndexerAutoDisable (Phase 2 live proof)', () => {
  let client: DatabaseClient;
  let healthRepo: IndexerHealthRepository;
  let autoDisable: IndexerAutoDisable;
  let tester: IndexerTester;
  let httpClient: HttpClient;
  let seededIndexerId: number;

  beforeAll(async () => {
    client = new DatabaseClient({ datasources: { db: { url: ':memory:' } } });
    applyMigrations(client.sqlite);
    healthRepo = new IndexerHealthRepository(client);

    const { IndexerAutoDisable } = await import('../services/IndexerAutoDisable');
    const settings = makeSettingsProvider(AUTO_DISABLE_THRESHOLD);
    autoDisable = new IndexerAutoDisable(healthRepo, settings);
  });

  afterAll(async () => {
    await client.$disconnect();
  });

  beforeEach(async () => {
    await client.drizzle.delete(schema.indexerHealthSnapshots);
    await client.drizzle.delete(schema.indexers);
    httpClient = makeFailingHttpClient();
    const record = makeTorznabIndexerRecord(0, 'Live Proof Indexer');
    const [seeded] = await client.drizzle
      .insert(schema.indexers)
      .values(record)
      .returning();
    seededIndexerId = seeded!.id;
    tester = new IndexerTester(
      httpClient,
      healthRepo,
      undefined,
      autoDisable,
    );
  });

  it('flips indexers.enabled to false after N consecutive failures at the threshold (real Drizzle)', async () => {
    const indexer = makeTorznabIndexer(seededIndexerId, 'Live Proof Indexer', httpClient);

    for (let i = 0; i < AUTO_DISABLE_THRESHOLD; i += 1) {
      await tester.test(indexer);
    }

    const [reloaded] = await client.drizzle
      .select({ enabled: schema.indexers.enabled })
      .from(schema.indexers)
      .where(eq(schema.indexers.id, seededIndexerId));
    expect(reloaded!.enabled).toBe(false);
  });

  it('does NOT flip indexers.enabled to false when failure count is below the threshold', async () => {
    const indexer = makeTorznabIndexer(seededIndexerId, 'Live Proof Indexer', httpClient);

    for (let i = 0; i < AUTO_DISABLE_THRESHOLD - 1; i += 1) {
      await tester.test(indexer);
    }

    const [reloaded] = await client.drizzle
      .select({ enabled: schema.indexers.enabled })
      .from(schema.indexers)
      .where(eq(schema.indexers.id, seededIndexerId));
    expect(reloaded!.enabled).toBe(true);
  });

  it('persists each failure as a separate row in IndexerHealthSnapshot with incrementing failureCount', async () => {
    const indexer = makeTorznabIndexer(seededIndexerId, 'Live Proof Indexer', httpClient);

    for (let i = 0; i < AUTO_DISABLE_THRESHOLD; i += 1) {
      await tester.test(indexer);
    }

    const snapshots = await client.drizzle
      .select()
      .from(schema.indexerHealthSnapshots)
      .where(eq(schema.indexerHealthSnapshots.indexerId, seededIndexerId));
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]!.failureCount).toBe(AUTO_DISABLE_THRESHOLD);
  });

  it('handles N concurrent recordFailure calls without losing increments (atomic SQL update)', async () => {
    const CONCURRENCY = 10;
    const indexer = makeTorznabIndexer(seededIndexerId, 'Live Proof Indexer', httpClient);

    await Promise.all(
      Array.from({ length: CONCURRENCY }, () => healthRepo.recordFailure(seededIndexerId, 'race')),
    );

    const [snapshot] = await client.drizzle
      .select()
      .from(schema.indexerHealthSnapshots)
      .where(eq(schema.indexerHealthSnapshots.indexerId, seededIndexerId));
    expect(snapshot!.failureCount).toBe(CONCURRENCY);
  });
});
