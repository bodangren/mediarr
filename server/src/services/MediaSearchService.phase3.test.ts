import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaSearchService } from './MediaSearchService';
import { NotFoundError, ValidationError } from '../errors/domainErrors';

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

function makeCandidate(overrides: Partial<{
  magnetUrl: string | undefined;
  downloadUrl: string | undefined;
  title: string;
}> = {}) {
  return {
    indexer: 'TestIndexer',
    indexerId: 1,
    title: 'Show.S01E01.1080p',
    guid: 'guid-1',
    size: 1_000_000,
    seeders: 10,
    magnetUrl: 'magnet:?xt=urn:btih:aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111',
    ...overrides,
  };
}

function makeService(overrides: {
  indexerRecords?: unknown[];
  indexer?: { search: ReturnType<typeof vi.fn> };
  activityEventEmitter?: { emit: ReturnType<typeof vi.fn> };
  customFormatRepository?: { findByQualityProfileId: ReturnType<typeof vi.fn> };
  torrentManager?: { addTorrent: ReturnType<typeof vi.fn> };
} = {}) {
  const indexerRepository = {
    findAllEnabled: vi.fn().mockResolvedValue(overrides.indexerRecords ?? []),
  };
  const indexerFactory = { fromDatabaseRecord: vi.fn() };
  const torrentManager = overrides.torrentManager ?? { addTorrent: vi.fn() };
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

  return {
    service,
    indexerRepository,
    indexerFactory,
    torrentManager,
    activityEventEmitter,
    customFormatRepository,
  };
}

// ─── Phase 3: toSearchQuery edge cases ───────────────────────────────────────

describe('MediaSearchService.searchAllIndexers — toSearchQuery edge cases', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockParseBatch.mockResolvedValue([]);
  });

  it('includes tmdbId=0 in the query (0 is a valid value)', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
    });

    await service.searchAllIndexers({
      type: 'movie',
      title: 'Test Movie',
      tmdbId: 0,
    });

    const searchQuery = indexer.search.mock.calls[0][0];
    expect(searchQuery.tmdbid).toBe(0);
  });

  it('includes tvdbId=0 in the query', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
    });

    await service.searchAllIndexers({
      type: 'tvsearch',
      query: 'Test Show',
      tvdbId: 0,
    });

    const searchQuery = indexer.search.mock.calls[0][0];
    expect(searchQuery.tvdbid).toBe(0);
  });

  it('uses explicit categories over type-based defaults', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
    });

    await service.searchAllIndexers({
      type: 'movie',
      title: 'Test Movie',
      categories: [9999],
    });

    const searchQuery = indexer.search.mock.calls[0][0];
    expect(searchQuery.categories).toEqual([9999]);
  });

  it('adds "tt" prefix to imdbId when missing', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
    });

    await service.searchAllIndexers({
      type: 'movie',
      title: 'Test Movie',
      imdbId: '1234567',
    });

    const searchQuery = indexer.search.mock.calls[0][0];
    expect(searchQuery.imdbid).toBe('tt1234567');
  });

  it('preserves "tt" prefix when already present on imdbId', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
    });

    await service.searchAllIndexers({
      type: 'movie',
      title: 'Test Movie',
      imdbId: 'tt1234567',
    });

    const searchQuery = indexer.search.mock.calls[0][0];
    expect(searchQuery.imdbid).toBe('tt1234567');
  });

  it('does NOT include imdbid in query when imdbId is empty string', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
    });

    await service.searchAllIndexers({
      type: 'movie',
      title: 'Test Movie',
      imdbId: '',
    });

    const searchQuery = indexer.search.mock.calls[0][0];
    expect(searchQuery.imdbid).toBeUndefined();
  });
});

// ─── Phase 3: getSearchCandidates legacy API edge cases ──────────────────────

describe('MediaSearchService.getSearchCandidates — legacy API edge cases', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockParseBatch.mockResolvedValue([]);
  });

  it('converts non-numeric tmdbid string to NaN (Number("abc") === NaN)', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
    });

    await service.getSearchCandidates({ q: 'test', tmdbid: 'not-a-number' });

    const searchQuery = indexer.search.mock.calls[0][0];
    // NaN is passed through; indexer should handle it gracefully
    expect(Number.isNaN(searchQuery.tmdbid)).toBe(true);
  });

  it('converts numeric string tmdbid to number', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
    });

    await service.getSearchCandidates({ q: 'test', tmdbid: '12345' });

    const searchQuery = indexer.search.mock.calls[0][0];
    expect(searchQuery.tmdbid).toBe(12345);
  });

  it('passes categories array through from legacy query', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
    });

    await service.getSearchCandidates({ q: 'test', categories: [2000, 8000] });

    const searchQuery = indexer.search.mock.calls[0][0];
    expect(searchQuery.categories).toEqual([2000, 8000]);
  });
});

// ─── Phase 3: grabReleaseByGuid with downloadClientId ────────────────────────

describe('MediaSearchService.grabReleaseByGuid — downloadClientId ignored', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockParseBatch.mockResolvedValue([]);
  });

  it('ignores the downloadClientId parameter (passes through to grabRelease)', async () => {
    const torrentManager = {
      addTorrent: vi.fn().mockResolvedValue({
        infoHash: 'eeee5555eeee5555eeee5555eeee5555eeee5555',
        name: 'Movie.2024.1080p',
      }),
    };

    const indexer = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          title: 'Movie.2024.1080p.BluRay',
          guid: 'target-guid',
          seeders: 100,
          categories: [2000],
          magnetUrl: 'magnet:?xt=urn:btih:eeee5555eeee5555eeee5555eeee5555eeee5555',
        }),
      ]),
    };

    const { service, indexerFactory, torrentManager: tm } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
      torrentManager,
    });

    const result = await service.grabReleaseByGuid('target-guid', 1, 999);

    expect(result.infoHash).toBe('eeee5555eeee5555eeee5555eeee5555eeee5555');
    expect(tm.addTorrent).toHaveBeenCalledOnce();
    // downloadClientId is not forwarded to addTorrent
    const callArgs = tm.addTorrent.mock.calls[0][0];
    expect(callArgs).not.toHaveProperty('downloadClientId');
  });
});

// ─── Phase 3: Promise.allSettled rejection path ──────────────────────────────

describe('MediaSearchService.searchAllIndexers — Promise.allSettled rejection path', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockParseBatch.mockResolvedValue([]);
  });

  it('handles a rejected promise from allSettled (map callback throws)', async () => {
    const indexerRepository = {
      findAllEnabled: vi.fn().mockResolvedValue([makeIndexerRecord(1, 'CrashingIndexer')]),
    };
    const indexerFactory = {
      fromDatabaseRecord: vi.fn().mockImplementation(() => {
        throw new Error('Factory crash during instantiation');
      }),
    };
    const torrentManager = { addTorrent: vi.fn() };
    const activityEventEmitter = { emit: vi.fn().mockResolvedValue(undefined) };
    const customFormatRepository = {
      findByQualityProfileId: vi.fn().mockResolvedValue([]),
    };

    const service = new MediaSearchService(
      indexerRepository as any,
      indexerFactory as any,
      torrentManager as any,
      activityEventEmitter as any,
      customFormatRepository as any,
    );

    // The error is thrown inside the promise body, so it's caught and returned as error status
    const result = await service.searchAllIndexers({ query: 'test' });

    expect(result.indexerResults).toHaveLength(1);
    expect(result.indexerResults[0]!.status).toBe('error');
    expect(result.indexerResults[0]!.errorMessage).toContain('Factory crash');
  });
});
