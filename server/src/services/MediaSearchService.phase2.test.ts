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
  indexerFlags?: string;
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

// ─── Phase 2: extractInfoHash via toSearchCandidate ──────────────────────────

describe('MediaSearchService — extractInfoHash edge cases (via toSearchCandidate)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockParseBatch.mockResolvedValue([]);
  });

  it('extracts hex infoHash from a well-formed magnet URL', async () => {
    const hexHash = 'aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111';
    const indexer = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          magnetUrl: `magnet:?xt=urn:btih:${hexHash}`,
        }),
      ]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
    });

    const result = await service.searchAllIndexers({ query: 'test' });

    expect(result.releases).toHaveLength(1);
    expect(result.releases[0]!.infoHash).toBe(hexHash);
  });

  it('returns undefined infoHash for a magnet URL with a short (malformed) hash', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          title: 'Release.ShortHash.1080p',
          guid: 'guid-shorthash',
          magnetUrl: 'magnet:?xt=urn:btih:SHORT',
        }),
      ]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
    });

    const result = await service.searchAllIndexers({ query: 'test' });

    expect(result.releases).toHaveLength(1);
    expect(result.releases[0]!.infoHash).toBeUndefined();
  });

  it('returns undefined infoHash when magnet URL has no btih parameter', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          title: 'Release.NoBtih.1080p',
          guid: 'guid-nobtih',
          magnetUrl: 'magnet:?dn=Some+Release&tr=udp://tracker.example.com',
        }),
      ]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
    });

    const result = await service.searchAllIndexers({ query: 'test' });

    expect(result.releases).toHaveLength(1);
    expect(result.releases[0]!.infoHash).toBeUndefined();
  });

  it('extracts base32 infoHash from magnet URL (32-char base32 string)', async () => {
    const base32Hash = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; // 32 chars
    const indexer = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          title: 'Release.Base32.1080p',
          guid: 'guid-base32',
          magnetUrl: `magnet:?xt=urn:btih:${base32Hash}`,
        }),
      ]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
    });

    const result = await service.searchAllIndexers({ query: 'test' });

    expect(result.releases).toHaveLength(1);
    // Base32 is NOT converted to hex (simplified implementation just lowercases)
    expect(result.releases[0]!.infoHash).toBe(base32Hash.toLowerCase());
  });
});

// ─── Phase 2: inferQualityFromTitle via toSearchCandidate ────────────────────

describe('MediaSearchService — inferQualityFromTitle edge cases (via toSearchCandidate)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockParseBatch.mockResolvedValue([]);
  });

  it('infers quality when both resolution and source are present', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          title: 'Show.S01E01.1080p.WEB-DL.Group',
          guid: 'guid-quality',
        }),
      ]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
    });

    const result = await service.searchAllIndexers({ query: 'test' });

    expect(result.releases[0]!.quality).toBe('1080p WEB-DL');
  });

  it('infers resolution-only quality when source is absent', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          title: 'Show.S01E01.720p.Group',
          guid: 'guid-resonly',
        }),
      ]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
    });

    const result = await service.searchAllIndexers({ query: 'test' });

    expect(result.releases[0]!.quality).toBe('720p');
  });

  it('infers source-only quality when resolution is absent', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          title: 'Show.S01E01.BluRay.Group',
          guid: 'guid-sourceonly',
        }),
      ]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
    });

    const result = await service.searchAllIndexers({ query: 'test' });

    expect(result.releases[0]!.quality).toBe('BluRay');
  });

  it('returns undefined quality when neither resolution nor source is present', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          title: 'Show.S01E01.XviD',
          guid: 'guid-noquality',
        }),
      ]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
    });

    const result = await service.searchAllIndexers({ query: 'test' });

    expect(result.releases[0]!.quality).toBeUndefined();
  });

  it('uses the first resolution marker when title has multiple resolutions', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          title: 'Show.S01E01.720p.1080p.BluRay',
          guid: 'guid-multires',
        }),
      ]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
    });

    const result = await service.searchAllIndexers({ query: 'test' });

    // extractResolution matches the first occurrence in the regex
    expect(result.releases[0]!.quality).toBe('720p BluRay');
  });

  it('recognizes WEBRip as a distinct source from WEB-DL', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          title: 'Show.S01E01.1080p.WEBRip',
          guid: 'guid-webrip',
        }),
      ]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
    });

    const result = await service.searchAllIndexers({ query: 'test' });

    expect(result.releases[0]!.quality).toBe('1080p WEBRip');
  });
});

// ─── Phase 2: normalizeIndexerFlags via toSearchCandidate ────────────────────

describe('MediaSearchService — normalizeIndexerFlags edge cases (via toSearchCandidate)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockParseBatch.mockResolvedValue([]);
  });

  it('passes raw indexerFlags string through toSearchCandidate (normalized only in toScoringCandidate)', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          title: 'Show.S01E01.1080p',
          guid: 'guid-flags',
          indexerFlags: 'FREEHD|Internal, Proper',
        }),
      ]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
    });

    const result = await service.searchAllIndexers({ query: 'test' });

    // toSearchCandidate passes flags through raw; normalization happens in toScoringCandidate
    expect(result.releases[0]!.indexerFlags).toBe('FREEHD|Internal, Proper');
  });

  it('passes through indexerFlags with consecutive delimiters as-is', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          title: 'Show.S01E01.1080p',
          guid: 'guid-emptyflags',
          indexerFlags: 'FREEHD,,Internal',
        }),
      ]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
    });

    const result = await service.searchAllIndexers({ query: 'test' });

    expect(result.releases[0]!.indexerFlags).toBe('FREEHD,,Internal');
  });

  it('passes through whitespace-only indexerFlags as-is', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          title: 'Show.S01E01.1080p',
          guid: 'guid-wsflags',
          indexerFlags: '   ',
        }),
      ]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TestIndexer')],
      indexer,
    });

    const result = await service.searchAllIndexers({ query: 'test' });

    expect(result.releases[0]!.indexerFlags).toBe('   ');
  });
});
