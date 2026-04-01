import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaSearchService } from './MediaSearchService';

const mockParseBatch = vi.hoisted(() => vi.fn());

vi.mock('./ReleaseParser', () => ({
  releaseParser: { parse: vi.fn(), parseBatch: mockParseBatch },
}));

function makeIndexerRecord(id: number, name: string, priority = 1) {
  return {
    id,
    name,
    implementation: 'Cardigann',
    protocol: 'torrent',
    enabled: true,
    priority,
    supportsRss: true,
    supportsSearch: true,
    settings: {},
  };
}

function makeIndexerResult(overrides: Partial<{
  title: string;
  guid: string;
  seeders: number;
  size: bigint;
  magnetUrl: string;
  publishDate: Date;
  categories: number[];
  protocol: string;
}> = {}) {
  return {
    title: 'Show.S01E01.1080p.WEB-DL',
    guid: 'guid-1',
    publishDate: new Date('2026-03-01T00:00:00.000Z'),
    size: BigInt(1_000_000_000),
    seeders: 10,
    categories: [5000],
    protocol: 'torrent',
    magnetUrl: 'magnet:?xt=urn:btih:aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111',
    ...overrides,
  };
}

function makeService(overrides: {
  indexerRecords?: unknown[];
  activityEventEmitter?: { emit: ReturnType<typeof vi.fn> };
  customFormatRepository?: { findByQualityProfileId: ReturnType<typeof vi.fn> };
} = {}) {
  const indexerRepository = {
    findAllEnabled: vi.fn().mockResolvedValue(overrides.indexerRecords ?? []),
  };
  const indexerFactory = { fromDatabaseRecord: vi.fn() };
  const torrentManager = { addTorrent: vi.fn() };
  const activityEventEmitter = overrides.activityEventEmitter ?? { emit: vi.fn().mockResolvedValue(undefined) };
  const customFormatRepository = overrides.customFormatRepository ?? {
    findByQualityProfileId: vi.fn().mockResolvedValue([]),
  };

  const service = new MediaSearchService(
    indexerRepository as any,
    indexerFactory as any,
    torrentManager as any,
    activityEventEmitter as any,
    customFormatRepository as any,
  );

  return { service, indexerRepository, indexerFactory, torrentManager, activityEventEmitter, customFormatRepository };
}

// ─── Phase 1: searchAllIndexers — empty state, dedup, ranking ──────────────

describe('MediaSearchService.searchAllIndexers — empty state', () => {
  it('returns empty result without querying when no indexers are enabled', async () => {
    const { service, indexerFactory } = makeService({ indexerRecords: [] });

    const result = await service.searchAllIndexers({ query: 'test' });

    expect(result.releases).toHaveLength(0);
    expect(result.totalResults).toBe(0);
    expect(result.deduplicatedCount).toBe(0);
    expect(result.indexerResults).toHaveLength(0);
    expect(indexerFactory.fromDatabaseRecord).not.toHaveBeenCalled();
  });
});

describe('MediaSearchService.searchAllIndexers — deduplication', () => {
  beforeEach(() => {
    mockParseBatch.mockResolvedValue([]);
  });

  it('deduplicates releases with the same infoHash, keeping the higher-ranked one', async () => {
    const sharedHash = 'aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111';
    const indexer1 = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          title: 'Show.S01E01.720p.WEB-DL',
          guid: 'guid-indexer1',
          seeders: 5,
          size: BigInt(500_000_000),
          magnetUrl: `magnet:?xt=urn:btih:${sharedHash}`,
        }),
      ]),
    };
    const indexer2 = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          title: 'Show.S01E01.1080p.BluRay',
          guid: 'guid-indexer2',
          seeders: 20,
          size: BigInt(2_000_000_000),
          magnetUrl: `magnet:?xt=urn:btih:${sharedHash}`,
        }),
      ]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [
        makeIndexerRecord(1, 'Indexer1'),
        makeIndexerRecord(2, 'Indexer2'),
      ],
    });
    indexerFactory.fromDatabaseRecord
      .mockReturnValueOnce(indexer1)
      .mockReturnValueOnce(indexer2);

    const result = await service.searchAllIndexers({ query: 'test' });

    expect(result.deduplicatedCount).toBe(1);
    expect(result.releases).toHaveLength(1);
    expect(result.releases[0]!.seeders).toBe(20);
  });

  it('preserves releases without infoHash (no dedup applied)', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          title: 'Release.NoHash.1080p',
          guid: 'guid-nohash',
          magnetUrl: undefined as any,
        }),
      ]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'NoHashIndexer')],
    });
    indexerFactory.fromDatabaseRecord.mockReturnValue(indexer);

    const result = await service.searchAllIndexers({ query: 'test' });

    expect(result.releases).toHaveLength(1);
    expect(result.releases[0]!.infoHash).toBeUndefined();
  });

  it('keeps releases without infoHash separate from deduplicated set', async () => {
    const sharedHash = 'bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222';
    const indexer = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          title: 'With.Hash.1080p',
          guid: 'guid-hash',
          magnetUrl: `magnet:?xt=urn:btih:${sharedHash}`,
        }),
        makeIndexerResult({
          title: 'Without.Hash.720p',
          guid: 'guid-nohash',
          magnetUrl: undefined as any,
        }),
        makeIndexerResult({
          title: 'With.Hash.1080p',
          guid: 'guid-hash2',
          seeders: 30,
          size: BigInt(3_000_000_000),
          magnetUrl: `magnet:?xt=urn:btih:${sharedHash}`,
        }),
      ]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'MixedIndexer')],
    });
    indexerFactory.fromDatabaseRecord.mockReturnValue(indexer);

    const result = await service.searchAllIndexers({ query: 'test' });

    expect(result.deduplicatedCount).toBe(2);
    expect(result.releases).toHaveLength(2);
    const hashRelease = result.releases.find(r => r.infoHash === sharedHash);
    expect(hashRelease).toBeDefined();
    expect(hashRelease!.seeders).toBe(30);
  });
});

describe('MediaSearchService.searchAllIndexers — ranking', () => {
  beforeEach(() => {
    mockParseBatch.mockResolvedValue([]);
  });

  it('sorts releases by customFormatScore descending', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          title: 'Low.Score.720p',
          guid: 'guid-low',
          seeders: 50,
          size: BigInt(2_000_000_000),
          magnetUrl: 'magnet:?xt=urn:btih:aaa0001aaa0001aaa0001aaa0001aaa0001aaa0',
        }),
        makeIndexerResult({
          title: 'High.Score.1080p',
          guid: 'guid-high',
          seeders: 50,
          size: BigInt(2_000_000_000),
          magnetUrl: 'magnet:?xt=urn:btih:bbb0002bbb0002bbb0002bbb0002bbb0002bbb0',
        }),
      ]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
    });
    indexerFactory.fromDatabaseRecord.mockReturnValue(indexer);

    const result = await service.searchAllIndexers({ query: 'test' });

    expect(result.releases).toHaveLength(2);
    expect(result.releases[0]!.customFormatScore).toBeGreaterThanOrEqual(
      result.releases[1]!.customFormatScore ?? 0,
    );
  });

  it('sorts by seeders descending when customFormatScore is equal', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          title: 'Few.Seeders',
          guid: 'guid-few',
          seeders: 3,
          size: BigInt(1_000_000_000),
          magnetUrl: 'magnet:?xt=urn:btih:ccc0003ccc0003ccc0003ccc0003ccc0003ccc0',
        }),
        makeIndexerResult({
          title: 'Many.Seeders',
          guid: 'guid-many',
          seeders: 100,
          size: BigInt(1_000_000_000),
          magnetUrl: 'magnet:?xt=urn:btih:ddd0004ddd0004ddd0004ddd0004ddd0004ddd0',
        }),
      ]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
    });
    indexerFactory.fromDatabaseRecord.mockReturnValue(indexer);

    const result = await service.searchAllIndexers({ query: 'test' });

    expect(result.releases).toHaveLength(2);
    expect(result.releases[0]!.seeders).toBeGreaterThanOrEqual(result.releases[1]!.seeders);
  });
});
