import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createTestPrismaClient } from './helpers/test-prisma-client';

const prisma = createTestPrismaClient();

describe('Indexer Schema', () => {
  beforeEach(async () => {
    await prisma.indexerRelease.deleteMany();
    await prisma.indexer.deleteMany();
    await prisma.category.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should persist indexers with expected fields', async () => {
    const indexer = await prisma.indexer.create({
      data: {
        name: 'Schema Indexer',
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

    expect(indexer.id).toBeDefined();
    expect(indexer.name).toBe('Schema Indexer');
    expect(indexer.implementation).toBe('Torznab');
    expect(indexer.settings).toBe('{}');
    expect(indexer.protocol).toBe('torrent');
  });

  it('should persist indexer releases linked to indexers', async () => {
    const indexer = await prisma.indexer.create({
      data: {
        name: 'Release Indexer',
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

    await prisma.indexerRelease.create({
      data: {
        guid: 'release-guid-1',
        indexerId: indexer.id,
        title: 'Release 1',
        size: 1000,
        protocol: 'torrent',
        categories: '[]',
        publishDate: new Date('2026-04-01T00:00:00.000Z'),
      },
    });

    const release = await prisma.indexerRelease.findFirst({
      where: { guid: 'release-guid-1' },
      include: { indexer: true },
    });

    expect(release).not.toBeNull();
    expect(release?.title).toBe('Release 1');
    expect(release?.indexerId).toBe(indexer.id);
    expect(release?.indexer?.name).toBe('Release Indexer');
  });

  it('should persist categories with id and name', async () => {
    await prisma.category.create({
      data: {
        id: 2999,
        name: 'Movies/Test',
        parent_id: 2000,
      },
    });

    const category = await prisma.category.findUnique({ where: { id: 2999 } });
    expect(category).not.toBeNull();
    expect(category?.id).toBe(2999);
    expect(category?.name).toBe('Movies/Test');
  });
});
