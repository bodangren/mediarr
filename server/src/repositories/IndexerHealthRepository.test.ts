import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { DatabaseClient } from '../db/drizzleClient';
import * as schema from '../db/schema';
import { IndexerHealthRepository } from './IndexerHealthRepository';

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

function makeIndexerHealthRepo(
  overrides: Partial<{
    getByIndexerId: ReturnType<typeof vi.fn>;
    recordSuccess: ReturnType<typeof vi.fn>;
    recordFailure: ReturnType<typeof vi.fn>;
  }> = {},
): IndexerHealthRepository {
  return {
    getByIndexerId: overrides.getByIndexerId ?? vi.fn(),
    recordSuccess: overrides.recordSuccess ?? vi.fn().mockResolvedValue(undefined),
    recordFailure: overrides.recordFailure ?? vi.fn().mockResolvedValue(undefined),
  } as unknown as IndexerHealthRepository;
}

describe('IndexerHealthRepository (Phase 1 extensions)', () => {
  describe('Artifact contract — public surface compatibility with shared fake', () => {
    it('exposes the three baseline public methods on the production class', () => {
      expect(typeof IndexerHealthRepository.prototype.getByIndexerId).toBe('function');
      expect(typeof IndexerHealthRepository.prototype.recordSuccess).toBe('function');
      expect(typeof IndexerHealthRepository.prototype.recordFailure).toBe('function');
    });

    it('fake repo provides the same baseline method names as the production class', () => {
      const fake = makeIndexerHealthRepo();
      const fakeKeys = Object.keys(fake).sort();
      const productionKeys = ['getByIndexerId', 'recordSuccess', 'recordFailure'].sort();
      expect(fakeKeys).toEqual(expect.arrayContaining(productionKeys));
    });
  });

  describe('extends snapshot with threshold context', () => {
    let client: DatabaseClient;
    let repo: IndexerHealthRepository;

    beforeAll(async () => {
      client = new DatabaseClient({ datasources: { db: { url: ':memory:' } } });
      applyMigrations(client.sqlite);
      repo = new IndexerHealthRepository(client);
      await client.drizzle.insert(schema.indexers).values({
        name: 'Probe Torznab',
        implementation: 'Torznab',
        configContract: 'TorznabSettings',
        settings: '{"url":"https://indexer.example","apiKey":"k"}',
        protocol: 'torrent',
        supportedMediaTypes: '[]',
        enabled: true,
        supportsRss: true,
        supportsSearch: true,
        priority: 25,
      });
    });

    afterAll(async () => {
      await client.$disconnect();
    });

    beforeEach(async () => {
      await client.drizzle.delete(schema.indexerHealthSnapshots);
    });

    it('returns null plus a thresholdContext block when no snapshot exists for the indexer', async () => {
      const result = await repo.getByIndexerIdWithThresholdContext(9999, { autoDisableThreshold: 3 });
      expect(result).not.toBeNull();
      expect(result!.snapshot).toBeNull();
      expect(result!.thresholdContext.threshold).toBe(3);
      expect(result!.thresholdContext.failureCount).toBe(0);
      expect(result!.thresholdContext.isCritical).toBe(false);
      expect(result!.thresholdContext.shouldAutoDisable).toBe(false);
    });

    it('reports isCritical=false and shouldAutoDisable=false when failureCount is one below threshold', async () => {
      const [indexer] = await client.drizzle.select().from(schema.indexers).limit(1);
      await client.drizzle.insert(schema.indexerHealthSnapshots).values({
        indexerId: indexer!.id,
        failureCount: 2,
        lastErrorMessage: 'previous error',
      });

      const result = await repo.getByIndexerIdWithThresholdContext(indexer!.id, { autoDisableThreshold: 3 });

      expect(result).not.toBeNull();
      expect(result!.snapshot).not.toBeNull();
      expect(result!.snapshot!.failureCount).toBe(2);
      expect(result!.thresholdContext.isCritical).toBe(false);
      expect(result!.thresholdContext.shouldAutoDisable).toBe(false);
    });

    it('reports isCritical=true and shouldAutoDisable=true at the threshold boundary', async () => {
      const [indexer] = await client.drizzle.select().from(schema.indexers).limit(1);
      await client.drizzle.insert(schema.indexerHealthSnapshots).values({
        indexerId: indexer!.id,
        failureCount: 3,
        lastErrorMessage: 'repeated failure',
      });

      const result = await repo.getByIndexerIdWithThresholdContext(indexer!.id, { autoDisableThreshold: 3 });

      expect(result).not.toBeNull();
      expect(result!.snapshot!.failureCount).toBe(3);
      expect(result!.thresholdContext.isCritical).toBe(true);
      expect(result!.thresholdContext.shouldAutoDisable).toBe(true);
    });

    it('reads the threshold from a settings-style provider rather than a constant', async () => {
      const [indexer] = await client.drizzle.select().from(schema.indexers).limit(1);
      await client.drizzle.insert(schema.indexerHealthSnapshots).values({
        indexerId: indexer!.id,
        failureCount: 5,
      });

      const result = await repo.getByIndexerIdWithThresholdContext(indexer!.id, {
        autoDisableThreshold: 10,
      });

      expect(result!.thresholdContext.threshold).toBe(10);
      expect(result!.thresholdContext.shouldAutoDisable).toBe(false);
    });
  });

  describe('list() — returns all snapshots keyed by indexer', () => {
    let client: DatabaseClient;
    let repo: IndexerHealthRepository;

    beforeAll(async () => {
      client = new DatabaseClient({ datasources: { db: { url: ':memory:' } } });
      applyMigrations(client.sqlite);
      repo = new IndexerHealthRepository(client);
    });

    afterAll(async () => {
      await client.$disconnect();
    });

    beforeEach(async () => {
      await client.drizzle.delete(schema.indexerHealthSnapshots);
      await client.drizzle.delete(schema.indexers);
    });

    it('returns an empty array when no snapshots exist', async () => {
      const all = await repo.list();
      expect(all).toEqual([]);
    });

    it('returns every snapshot with its indexer id and failure count', async () => {
      const seeded = await client.drizzle.insert(schema.indexers).values([
        { name: 'A', implementation: 'Torznab', configContract: 'TorznabSettings', settings: '{}', protocol: 'torrent', supportedMediaTypes: '[]', enabled: true, supportsRss: true, supportsSearch: true, priority: 25 },
        { name: 'B', implementation: 'Newznab', configContract: 'NewznabSettings', settings: '{}', protocol: 'nzb', supportedMediaTypes: '[]', enabled: true, supportsRss: true, supportsSearch: true, priority: 25 },
      ]).returning();
      await client.drizzle.insert(schema.indexerHealthSnapshots).values([
        { indexerId: seeded[0]!.id, failureCount: 1, lastErrorMessage: 'a-error' },
        { indexerId: seeded[1]!.id, failureCount: 4, lastErrorMessage: 'b-error' },
      ]);

      const all = await repo.list();

      expect(all).toHaveLength(2);
      const byId = new Map(all.map((row) => [row.indexerId, row]));
      expect(byId.get(seeded[0]!.id)?.failureCount).toBe(1);
      expect(byId.get(seeded[1]!.id)?.failureCount).toBe(4);
    });
  });

  describe('disable(indexerId) — flips the indexer.enabled flag', () => {
    let client: DatabaseClient;
    let repo: IndexerHealthRepository;

    beforeAll(async () => {
      client = new DatabaseClient({ datasources: { db: { url: ':memory:' } } });
      applyMigrations(client.sqlite);
      repo = new IndexerHealthRepository(client);
    });

    afterAll(async () => {
      await client.$disconnect();
    });

    beforeEach(async () => {
      await client.drizzle.delete(schema.indexerHealthSnapshots);
      await client.drizzle.delete(schema.indexers);
    });

    it('flips indexers.enabled to false without resetting failureCount', async () => {
      const [indexer] = await client.drizzle.insert(schema.indexers).values({
        name: 'Auto Disable Me',
        implementation: 'Torznab',
        configContract: 'TorznabSettings',
        settings: '{}',
        protocol: 'torrent',
        supportedMediaTypes: '[]',
        enabled: true,
        supportsRss: true,
        supportsSearch: true,
        priority: 25,
      }).returning();
      await client.drizzle.insert(schema.indexerHealthSnapshots).values({
        indexerId: indexer!.id,
        failureCount: 5,
        lastErrorMessage: 'too many',
      });

      await repo.disable(indexer!.id);

      const [reloaded] = await client.drizzle
        .select({ enabled: schema.indexers.enabled })
        .from(schema.indexers)
        .where(eq(schema.indexers.id, indexer!.id));
      expect(reloaded!.enabled).toBe(false);

      const [snapshot] = await client.drizzle
        .select()
        .from(schema.indexerHealthSnapshots)
        .where(eq(schema.indexerHealthSnapshots.indexerId, indexer!.id));
      expect(snapshot!.failureCount).toBe(5);
    });

    it('is a no-op when the indexer id does not exist', async () => {
      await expect(repo.disable(99999)).resolves.toBeUndefined();
    });
  });
});
