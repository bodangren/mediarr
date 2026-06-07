import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockParse = vi.hoisted(() => vi.fn().mockReturnValue([]));
const mockBuildRssUrl = vi.hoisted(() => vi.fn().mockReturnValue('https://indexer.example.com/api'));

vi.mock('../indexers/TorznabParser', () => ({
  TorznabParser: class {
    parse = mockParse;
  },
}));

vi.mock('../indexers/BaseIndexer', () => ({
  TorznabIndexer: class {
    id: number;
    name: string;
    buildRssUrl = mockBuildRssUrl;
    constructor(config: any) {
      this.id = config.id;
      this.name = config.name;
    }
  },
}));

import { RssSyncService } from './RssSyncService';
import type { IndexerHealthRepository } from '../repositories/IndexerHealthRepository';

function makeDb(overrides: Record<string, any> = {}) {
  return {
    indexer: {
      findMany: vi.fn().mockResolvedValue(overrides.indexers ?? []),
    },
    indexerRelease: {
      upsert: vi.fn().mockResolvedValue({}),
    },
    ...overrides,
  };
}

function makeHttpClient(overrides: Record<string, any> = {}) {
  return {
    get: vi.fn().mockResolvedValue({ ok: true, status: 200, body: '<rss></rss>' }),
    ...overrides,
  };
}

function makeIndexerHealthRepo(): IndexerHealthRepository {
  return {
    recordSuccess: vi.fn().mockResolvedValue(undefined),
    recordFailure: vi.fn().mockResolvedValue(undefined),
  } as unknown as IndexerHealthRepository;
}

function makeDbIndexer(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    name: 'TestIndexer',
    implementation: 'Torznab',
    protocol: 'torrent',
    enabled: true,
    priority: 1,
    supportsRss: true,
    supportsSearch: true,
    settings: { url: 'https://indexer.example.com', apiKey: 'test' },
    ...overrides,
  };
}

const SAMPLE_RELEASE = {
  title: 'Breaking.Bad.S01E01.1080p.BluRay',
  guid: 'abc123',
  downloadUrl: 'https://indexer.example.com/download/abc123',
  magnetUrl: 'magnet:?xt=urn:btih:abc123',
  infoUrl: 'https://indexer.example.com/details/abc123',
  publishDate: new Date('2026-04-01T00:00:00Z'),
  size: BigInt(1000000000),
  seeders: 50,
  leechers: 5,
  categories: [5000],
  protocol: 'torrent',
};

describe('RssSyncService — corner cases', () => {
  let prisma: ReturnType<typeof makeDb>;
  let httpClient: ReturnType<typeof makeHttpClient>;
  let healthRepo: ReturnType<typeof makeIndexerHealthRepo>;

  beforeEach(() => {
    mockParse.mockReturnValue([]);
    mockBuildRssUrl.mockReturnValue('https://indexer.example.com/api');
    prisma = makeDb();
    httpClient = makeHttpClient();
    healthRepo = makeIndexerHealthRepo();
  });

  it('4.1 sync with no enabled indexers — returns empty summary', async () => {
    prisma.indexer.findMany.mockResolvedValue([]);

    const service = new RssSyncService(prisma as any, httpClient as any);
    const result = await service.sync();

    expect(result).toEqual({ indexersProcessed: 0, releasesStored: 0, errors: [] });
    expect(httpClient.get).not.toHaveBeenCalled();
  });

  it('4.2 one indexer fails — others continue, error recorded', async () => {
    const indexer1 = makeDbIndexer({ id: 1, name: 'GoodIndexer' });
    const indexer2 = makeDbIndexer({ id: 2, name: 'BadIndexer' });
    prisma.indexer.findMany.mockResolvedValue([indexer1, indexer2]);

    mockBuildRssUrl
      .mockReturnValueOnce('https://good.example.com/api')
      .mockReturnValueOnce('https://bad.example.com/api');

    httpClient.get
      .mockResolvedValueOnce({ ok: true, status: 200, body: '<rss></rss>' })
      .mockResolvedValueOnce({ ok: false, status: 500, body: 'Server Error' });

    mockParse.mockReturnValue([]);

    const service = new RssSyncService(prisma as any, httpClient as any, healthRepo);
    const result = await service.sync();

    expect(result.indexersProcessed).toBe(1);
    expect(result.releasesStored).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('BadIndexer');
    expect(healthRepo.recordSuccess).toHaveBeenCalledWith(1, expect.any(Date));
    expect(healthRepo.recordFailure).toHaveBeenCalledWith(2, expect.any(String), expect.any(Date));
  });

  it('4.3 non-Torznab indexer — silently returns 0 stored', async () => {
    const indexer = makeDbIndexer({ id: 1, name: 'ScrapingIndexer', implementation: 'Cardigann' });
    prisma.indexer.findMany.mockResolvedValue([indexer]);

    const service = new RssSyncService(prisma as any, httpClient as any, healthRepo);
    const result = await service.sync();

    expect(result.indexersProcessed).toBe(1);
    expect(result.releasesStored).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(httpClient.get).not.toHaveBeenCalled();
    expect(healthRepo.recordSuccess).toHaveBeenCalledWith(1, expect.any(Date));
  });

  it('4.4 settings as string vs object — both parsed correctly', async () => {
    const indexerStr = makeDbIndexer({
      id: 1,
      settings: JSON.stringify({ url: 'https://indexer.example.com', apiKey: 'test' }),
    });
    const indexerObj = makeDbIndexer({
      id: 2,
      name: 'ObjIndexer',
      settings: { url: 'https://indexer2.example.com', apiKey: 'test2' },
    });
    prisma.indexer.findMany.mockResolvedValue([indexerStr, indexerObj]);

    mockParse.mockReturnValue([]);

    const service = new RssSyncService(prisma as any, httpClient as any);
    const result = await service.sync();

    expect(result.indexersProcessed).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  it('4.5 HTTP error from indexer — error caught, failure recorded', async () => {
    const indexer = makeDbIndexer({ id: 1, name: 'ErrorIndexer' });
    prisma.indexer.findMany.mockResolvedValue([indexer]);

    httpClient.get.mockRejectedValue(new Error('Connection refused'));

    const service = new RssSyncService(prisma as any, httpClient as any, healthRepo);
    const result = await service.sync();

    expect(result.indexersProcessed).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('ErrorIndexer');
    expect(result.errors[0]).toContain('Connection refused');
    expect(healthRepo.recordFailure).toHaveBeenCalledWith(1, expect.any(String), expect.any(Date));
  });

  it('4.6 empty RSS feed (0 results) — 0 stored, no error', async () => {
    const indexer = makeDbIndexer();
    prisma.indexer.findMany.mockResolvedValue([indexer]);

    mockParse.mockReturnValue([]);

    const service = new RssSyncService(prisma as any, httpClient as any);
    const result = await service.sync();

    expect(result.indexersProcessed).toBe(1);
    expect(result.releasesStored).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('4.7 storeRelease emits release:stored event with indexerId', async () => {
    const indexer = makeDbIndexer();
    prisma.indexer.findMany.mockResolvedValue([indexer]);

    const release = { ...SAMPLE_RELEASE, guid: 'release-001' };
    mockParse.mockReturnValue([release]);

    const service = new RssSyncService(prisma as any, httpClient as any);
    const events: any[] = [];
    service.on('release:stored', (e: any) => events.push(e));

    await service.sync();

    expect(events).toHaveLength(1);
    expect(events[0].guid).toBe('release-001');
    expect(events[0].indexerId).toBe(1);
    expect(prisma.indexerRelease.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { guid: 'release-001' },
      }),
    );
  });

  it('4.8 IndexerHealthRepository success and failure recording', async () => {
    const indexer = makeDbIndexer({ id: 42, name: 'HealthTest' });
    prisma.indexer.findMany.mockResolvedValue([indexer]);
    mockParse.mockReturnValue([]);

    const service = new RssSyncService(prisma as any, httpClient as any, healthRepo);
    await service.sync();

    expect(healthRepo.recordSuccess).toHaveBeenCalledWith(42, expect.any(Date));
    expect(healthRepo.recordFailure).not.toHaveBeenCalled();
  });

  it('4.9 no IndexerHealthRepository — sync still works', async () => {
    const indexer = makeDbIndexer();
    prisma.indexer.findMany.mockResolvedValue([indexer]);
    mockParse.mockReturnValue([SAMPLE_RELEASE]);

    const service = new RssSyncService(prisma as any, httpClient as any);
    const result = await service.sync();

    expect(result.indexersProcessed).toBe(1);
    expect(result.releasesStored).toBe(1);
    expect(result.errors).toHaveLength(0);
  });
});
