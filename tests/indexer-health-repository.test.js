import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import 'dotenv/config';
import { IndexerHealthRepository } from '../server/src/repositories/IndexerHealthRepository';

const adapter = new PrismaBetterSqlite3({ url: 'file:prisma/dev.db' });
const prisma = new PrismaClient({ adapter });
const repository = new IndexerHealthRepository(prisma);

describe('IndexerHealthRepository', () => {
  beforeEach(async () => {
    await prisma.indexerHealthSnapshot.deleteMany();
    await prisma.indexer.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function createIndexer() {
    return prisma.indexer.create({
      data: {
        name: `HealthIndex_${Date.now()}_${Math.random()}`,
        implementation: 'Torznab',
        configContract: 'TorznabSettings',
        settings: '{}',
        protocol: 'torrent',
        enabled: true,
        supportsRss: true,
        supportsSearch: true,
        priority: 25,
      },
    });
  }

  it('should create and update health snapshot for success/failure flows', async () => {
    const indexer = await createIndexer();

    await repository.recordSuccess(indexer.id, new Date('2026-02-11T09:00:00.000Z'));
    await repository.recordFailure(indexer.id, 'timeout', new Date('2026-02-11T09:05:00.000Z'));

    const snapshot = await repository.getByIndexerId(indexer.id);
    expect(snapshot).not.toBeNull();
    expect(snapshot.failureCount).toBe(1);
    expect(snapshot.lastErrorMessage).toBe('timeout');
    expect(snapshot.lastSuccessAt?.toISOString()).toBe('2026-02-11T09:00:00.000Z');
    expect(snapshot.lastFailureAt?.toISOString()).toBe('2026-02-11T09:05:00.000Z');
  });

  it('should increment failure counter on repeated failures', async () => {
    const indexer = await createIndexer();

    await repository.recordFailure(indexer.id, 'first');
    await repository.recordFailure(indexer.id, 'second');

    const snapshot = await repository.getByIndexerId(indexer.id);
    expect(snapshot.failureCount).toBe(2);
    expect(snapshot.lastErrorMessage).toBe('second');
  });
});
