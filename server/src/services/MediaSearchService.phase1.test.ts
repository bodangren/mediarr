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
  notificationDispatchService?: { notifyGrab: ReturnType<typeof vi.fn> };
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
  const notificationDispatchService = overrides.notificationDispatchService ?? {
    notifyGrab: vi.fn().mockResolvedValue(undefined),
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
    notificationDispatchService as any,
  );

  return {
    service,
    indexerRepository,
    indexerFactory,
    torrentManager,
    activityEventEmitter,
    customFormatRepository,
    notificationDispatchService,
  };
}

// ─── Phase 1: AI batch parsing failure ────────────────────────────────────────

describe('MediaSearchService.searchAllIndexers — AI batch parsing failure', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('does NOT crash when releaseParser.parseBatch throws', async () => {
    mockParseBatch.mockRejectedValue(new Error('AI service unavailable'));

    const indexer = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          title: 'Show.S01E01.1080p.WEB-DL',
          guid: 'guid-1',
          seeders: 50,
          magnetUrl: 'magnet:?xt=urn:btih:aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111',
        }),
      ]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
    });

    // Should NOT throw — must fall back gracefully
    const result = await service.searchAllIndexers({ query: 'Show', type: 'tvsearch' });

    expect(result.releases).toHaveLength(1);
    expect(result.releases[0]!.title).toBe('Show.S01E01.1080p.WEB-DL');
    // parsedRelease should be undefined since AI parsing failed
    expect(result.releases[0]!.parsedRelease).toBeUndefined();
  });

  it('still applies scoring (confidence + indexer + seed) when AI parsing fails', async () => {
    mockParseBatch.mockRejectedValue(new Error('AI timeout'));

    const indexer = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          title: 'Show.S01E01.1080p',
          guid: 'guid-1',
          seeders: 50,
          magnetUrl: 'magnet:?xt=urn:btih:aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111',
        }),
        makeIndexerResult({
          title: 'Show.S01E01.720p',
          guid: 'guid-2',
          seeders: 20,
          magnetUrl: 'magnet:?xt=urn:btih:bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222',
        }),
      ]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
    });

    const result = await service.searchAllIndexers({ query: 'Show', type: 'tvsearch' });

    // Both releases should still be scored and returned
    expect(result.releases).toHaveLength(2);
    expect(result.releases[0]!.customFormatScore).toBeDefined();
    expect(result.releases[0]!.customFormatScore).toBeGreaterThan(0);
  });

  it('emits search:done event even when AI parsing fails', async () => {
    mockParseBatch.mockRejectedValue(new Error('AI error'));

    const eventHub = { publish: vi.fn() };
    const activityEventEmitter = { emit: vi.fn().mockResolvedValue(undefined) };
    const indexer = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({ seeders: 50 }),
      ]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
      activityEventEmitter,
    });

    // Inject eventHub manually since makeService doesn't pass it
    (service as any).eventHub = eventHub;
    (service as any).activityEventEmitter = activityEventEmitter;

    await service.searchAllIndexers({ query: 'test' });

    expect(eventHub.publish).toHaveBeenCalledWith('search:done', expect.any(Object));
  });
});

// ─── Phase 1: Custom format repository errors ────────────────────────────────

describe('MediaSearchService.searchAllIndexers — custom format repository errors', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockParseBatch.mockResolvedValue([]);
  });

  it('proceeds with scoring when customFormatRepository.findByQualityProfileId throws', async () => {
    const customFormatRepository = {
      findByQualityProfileId: vi.fn().mockRejectedValue(new Error('DB connection lost')),
    };

    const indexer = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          title: 'Show.S01E01.1080p',
          guid: 'guid-1',
          seeders: 50,
          magnetUrl: 'magnet:?xt=urn:btih:aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111',
        }),
      ]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
      customFormatRepository,
    });

    const result = await service.searchAllIndexers({
      query: 'Show',
      type: 'tvsearch',
      qualityProfileId: 1,
    });

    // Should still return results with default scoring
    expect(result.releases).toHaveLength(1);
    expect(result.releases[0]!.customFormatScore).toBeDefined();
    expect(result.releases[0]!.customFormatScore).toBeGreaterThan(0);
  });

  it('scores without custom format rules when repository throws (confidence + indexer + seed only)', async () => {
    const customFormatRepository = {
      findByQualityProfileId: vi.fn().mockRejectedValue(new Error('table not found')),
    };

    const indexer = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          title: 'Show.S01E01.1080p.WEB-DL',
          guid: 'guid-1',
          seeders: 100,
          magnetUrl: 'magnet:?xt=urn:btih:aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111',
        }),
        makeIndexerResult({
          title: 'Show.S01E01.720p.HDTV',
          guid: 'guid-2',
          seeders: 10,
          magnetUrl: 'magnet:?xt=urn:btih:bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222',
        }),
      ]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
      customFormatRepository,
    });

    const result = await service.searchAllIndexers({
      query: 'Show',
      type: 'tvsearch',
      qualityProfileId: 1,
    });

    // Higher-seeded release should rank first (seed score dominates without custom formats)
    expect(result.releases).toHaveLength(2);
    expect(result.releases[0]!.seeders).toBe(100);
    expect(result.releases[1]!.seeders).toBe(10);
  });
});

// ─── Phase 1: Notification failure during grab ───────────────────────────────

describe('MediaSearchService.grabRelease — notification failure isolation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('succeeds when notifyGrab throws', async () => {
    const notificationDispatchService = {
      notifyGrab: vi.fn().mockRejectedValue(new Error('Notification service down')),
    };
    const torrentManager = {
      addTorrent: vi.fn().mockResolvedValue({
        infoHash: 'aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111',
        name: 'Show.S01E01.1080p',
      }),
    };
    const activityEventEmitter = { emit: vi.fn().mockResolvedValue(undefined) };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      notificationDispatchService,
      torrentManager,
      activityEventEmitter,
    });

    const candidate = makeCandidate({
      magnetUrl: 'magnet:?xt=urn:btih:aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111',
    });

    // Grab should succeed despite notification failure
    const result = await service.grabRelease(candidate);

    expect(result.infoHash).toBe('aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111');
    expect(torrentManager.addTorrent).toHaveBeenCalledOnce();
  });

  it('emits RELEASE_GRABBED success event even when notifyGrab throws', async () => {
    const notificationDispatchService = {
      notifyGrab: vi.fn().mockRejectedValue(new Error('SMTP down')),
    };
    const torrentManager = {
      addTorrent: vi.fn().mockResolvedValue({
        infoHash: 'bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222',
        name: 'Movie.2024.1080p',
      }),
    };
    const activityEventEmitter = { emit: vi.fn().mockResolvedValue(undefined) };

    const { service } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      notificationDispatchService,
      torrentManager,
      activityEventEmitter,
    });

    const candidate = makeCandidate({
      title: 'Movie.2024.1080p',
      magnetUrl: 'magnet:?xt=urn:btih:bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222',
    });

    await service.grabRelease(candidate);

    const grabEvents = activityEventEmitter.emit.mock.calls.filter(
      (call: any) => call[0].eventType === 'RELEASE_GRABBED' && call[0].success === true,
    );
    expect(grabEvents.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Phase 1: searchEpisode and searchMovie without qualityProfileId ──────────

describe('MediaSearchService.searchEpisode — scoring without qualityProfileId', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockParseBatch.mockResolvedValue([]);
  });

  it('returns null when no candidates are found', async () => {
    const indexer = { search: vi.fn().mockResolvedValue([]) };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
    });

    const result = await service.searchEpisode(
      { title: 'Nonexistent Show' },
      { seasonNumber: 1, episodeNumber: 1 },
    );

    expect(result).toBeNull();
  });

  it('grabs the best candidate when results exist', async () => {
    const torrentManager = {
      addTorrent: vi.fn().mockResolvedValue({
        infoHash: 'cccc3333cccc3333cccc3333cccc3333cccc3333',
        name: 'Show.S01E01.1080p',
      }),
    };

    const indexer = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          title: 'Show.S01E01.1080p.WEB-DL',
          guid: 'guid-1',
          seeders: 50,
          magnetUrl: 'magnet:?xt=urn:btih:cccc3333cccc3333cccc3333cccc3333cccc3333',
        }),
      ]),
    };

    const { service, indexerFactory, torrentManager: tm } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
      torrentManager,
    });

    const result = await service.searchEpisode(
      { title: 'Show' },
      { seasonNumber: 1, episodeNumber: 1 },
    );

    expect(result).not.toBeNull();
    expect(result!.infoHash).toBe('cccc3333cccc3333cccc3333cccc3333cccc3333');
    expect(tm.addTorrent).toHaveBeenCalledOnce();
  });
});

describe('MediaSearchService.searchMovie — scoring without qualityProfileId', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockParseBatch.mockResolvedValue([]);
  });

  it('returns null when no candidates are found', async () => {
    const indexer = { search: vi.fn().mockResolvedValue([]) };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
    });

    const result = await service.searchMovie({ title: 'Nonexistent Movie' });

    expect(result).toBeNull();
  });

  it('grabs the best candidate when results exist', async () => {
    const torrentManager = {
      addTorrent: vi.fn().mockResolvedValue({
        infoHash: 'dddd4444dddd4444dddd4444dddd4444dddd4444',
        name: 'Movie.2024.1080p',
      }),
    };

    const indexer = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          title: 'Movie.2024.1080p.BluRay',
          guid: 'guid-1',
          seeders: 100,
          categories: [2000],
          magnetUrl: 'magnet:?xt=urn:btih:dddd4444dddd4444dddd4444dddd4444dddd4444',
        }),
      ]),
    };

    const { service, indexerFactory, torrentManager: tm } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
      torrentManager,
    });

    const result = await service.searchMovie({ title: 'Movie', year: 2024 });

    expect(result).not.toBeNull();
    expect(result!.infoHash).toBe('dddd4444dddd4444dddd4444dddd4444dddd4444');
    expect(tm.addTorrent).toHaveBeenCalledOnce();
  });

  it('includes year in search query when provided', async () => {
    const indexer = { search: vi.fn().mockResolvedValue([]) };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
    });

    await service.searchMovie({ title: 'The Matrix', year: 1999 });

    // Verify the search was called (query construction includes year)
    expect(indexer.search).toHaveBeenCalledOnce();
    const searchQuery = indexer.search.mock.calls[0][0];
    expect(searchQuery.q).toContain('The Matrix');
    expect(searchQuery.q).toContain('1999');
  });
});
