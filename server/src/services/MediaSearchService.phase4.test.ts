import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaSearchService } from './MediaSearchService';

const mockParseBatch = vi.hoisted(() => vi.fn());

vi.mock('./ReleaseParser', () => ({
  releaseParser: { parse: vi.fn(), parseBatch: mockParseBatch },
}));

// ─── shared helpers ───────────────────────────────────────────────────────────

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
  indexer?: { search: ReturnType<typeof vi.fn> };
  eventHub?: { publish: ReturnType<typeof vi.fn> };
  activityEventEmitter?: { emit: ReturnType<typeof vi.fn> };
  customFormatRepository?: { findByQualityProfileId: ReturnType<typeof vi.fn> };
} = {}) {
  const indexerRepository = {
    findAllEnabled: vi.fn().mockResolvedValue(overrides.indexerRecords ?? []),
  };
  const indexerFactory = { fromDatabaseRecord: vi.fn() };
  const torrentManager = { addTorrent: vi.fn() };
  const eventHub = overrides.eventHub ?? { publish: vi.fn() };
  const activityEventEmitter = overrides.activityEventEmitter ?? { emit: vi.fn().mockResolvedValue(undefined) };
  const customFormatRepository = overrides.customFormatRepository ?? {
    findByQualityProfileId: vi.fn().mockResolvedValue([]),
  };

  if (overrides.indexer) {
    indexerFactory.fromDatabaseRecord.mockReturnValue(overrides.indexer);
  }

  const service = new MediaSearchService(
    indexerRepository as any,
    indexerFactory as any,
    torrentManager as any,
    activityEventEmitter as any,
    customFormatRepository as any,
  );
  (service as any).eventHub = eventHub;

  return {
    service,
    indexerRepository,
    indexerFactory,
    torrentManager,
    eventHub,
    activityEventEmitter,
    customFormatRepository,
  };
}

// ─── Phase 4: Concurrent searchAllIndexers calls ─────────────────────────────

describe('MediaSearchService.searchAllIndexers — concurrent calls', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockParseBatch.mockResolvedValue([]);
  });

  it('completes both concurrent searches without interference', async () => {
    const indexer = {
      search: vi.fn().mockImplementation(async () => {
        await new Promise(r => setTimeout(r, 10));
        return [
          makeIndexerResult({
            title: 'First.Search.Result.1080p',
            guid: 'guid-first',
            seeders: 50,
          }),
        ];
      }),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
    });

    const [resultA, resultB] = await Promise.all([
      service.searchAllIndexers({ query: 'First Search', type: 'tvsearch' }),
      service.searchAllIndexers({ query: 'Second Search', type: 'movie' }),
    ]);

    expect(resultA.releases).toHaveLength(1);
    expect(resultB.releases).toHaveLength(1);
    expect(resultA.releases[0]!.title).toBe('First.Search.Result.1080p');
    expect(resultB.releases[0]!.title).toBe('First.Search.Result.1080p');
  });

  it('publishes separate search:querying events for each concurrent call', async () => {
    const eventHub = { publish: vi.fn() };
    const indexer = {
      search: vi.fn().mockImplementation(async () => {
        await new Promise(r => setTimeout(r, 5));
        return [makeIndexerResult({ seeders: 50 })];
      }),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
      eventHub,
    });

    await Promise.all([
      service.searchAllIndexers({ query: 'A' }),
      service.searchAllIndexers({ query: 'B' }),
    ]);

    const queryingEvents = eventHub.publish.mock.calls.filter(
      (call: any) => call[0] === 'search:querying',
    );
    expect(queryingEvents.length).toBe(2);
  });

  it('publishes separate search:done events for each concurrent call', async () => {
    const eventHub = { publish: vi.fn() };
    const indexer = {
      search: vi.fn().mockImplementation(async () => {
        await new Promise(r => setTimeout(r, 5));
        return [makeIndexerResult({ seeders: 50 })];
      }),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
      eventHub,
    });

    await Promise.all([
      service.searchAllIndexers({ query: 'A' }),
      service.searchAllIndexers({ query: 'B' }),
    ]);

    const doneEvents = eventHub.publish.mock.calls.filter(
      (call: any) => call[0] === 'search:done',
    );
    expect(doneEvents.length).toBe(2);
  });
});

// ─── Phase 4: searchAllIndexers with no seeded releases ──────────────────────

describe('MediaSearchService.searchAllIndexers — no seeded releases', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('skips AI batch parsing when all releases have seeders <= 2', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          title: 'Low.Seed.Release.1080p',
          guid: 'guid-lowseed',
          seeders: 1,
          magnetUrl: 'magnet:?xt=urn:btih:ffff6666ffff6666ffff6666ffff6666ffff6666',
        }),
      ]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
    });

    const result = await service.searchAllIndexers({ query: 'test' });

    expect(result.releases).toHaveLength(1);
    expect(mockParseBatch).not.toHaveBeenCalled();
  });

  it('skips AI batch parsing when all releases have seeders = 0', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          title: 'Zero.Seed.Release.1080p',
          guid: 'guid-zeroseed',
          seeders: 0,
          magnetUrl: 'magnet:?xt=urn:btih:aaaa7777aaaa7777aaaa7777aaaa7777aaaa7777',
        }),
      ]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
    });

    const result = await service.searchAllIndexers({ query: 'test' });

    expect(result.releases).toHaveLength(1);
    expect(mockParseBatch).not.toHaveBeenCalled();
  });
});

// ─── Phase 4: searchAllIndexers with mixed seeded/unseeded releases ──────────

describe('MediaSearchService.searchAllIndexers — mixed seeding', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockParseBatch.mockResolvedValue([]);
  });

  it('only AI parses high-seeded releases but includes all in final results', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          title: 'High.Seed.Release.1080p',
          guid: 'guid-high',
          seeders: 100,
          magnetUrl: 'magnet:?xt=urn:btih:aaaa8888aaaa8888aaaa8888aaaa8888aaaa8888',
        }),
        makeIndexerResult({
          title: 'Low.Seed.Release.720p',
          guid: 'guid-low',
          seeders: 1,
          magnetUrl: 'magnet:?xt=urn:btih:bbbb9999bbbb9999bbbb9999bbbb9999bbbb9999',
        }),
      ]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
    });

    const result = await service.searchAllIndexers({ query: 'test', type: 'tvsearch' });

    expect(result.releases).toHaveLength(2);
    expect(mockParseBatch).toHaveBeenCalledWith(
      ['High.Seed.Release.1080p'],
      expect.objectContaining({ seriesTitle: 'test' }),
    );
  });
});
