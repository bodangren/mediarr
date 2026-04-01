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

  return { service, indexerRepository, indexerFactory, torrentManager, activityEventEmitter };
}

// ─── Phase 3: searchEpisode, searchMovie, getSearchCandidates ────────────

describe('MediaSearchService.searchEpisode', () => {
  beforeEach(() => {
    mockParseBatch.mockResolvedValue([]);
  });

  it('returns null when no candidates are found', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TVIndexer')],
    });
    indexerFactory.fromDatabaseRecord.mockReturnValue(indexer);

    const result = await service.searchEpisode(
      { title: 'Unknown Show' },
      { seasonNumber: 1, episodeNumber: 1 },
    );

    expect(result).toBeNull();
  });

  it('grabs the best candidate when results exist', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          title: 'Breaking.Bad.S01E01.1080p.BluRay',
          guid: 'ep-guid',
          seeders: 50,
          magnetUrl: 'magnet:?xt=urn:btih:eeee5555eeee5555eeee5555eeee5555eeee5555',
        }),
      ]),
    };

    const { service, indexerFactory, torrentManager } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TVIndexer')],
    });
    indexerFactory.fromDatabaseRecord.mockReturnValue(indexer);
    torrentManager.addTorrent.mockResolvedValue({
      infoHash: 'eeee5555eeee5555eeee5555eeee5555eeee5555',
      name: 'Breaking.Bad.S01E01.1080p.BluRay',
    });

    const result = await service.searchEpisode(
      { title: 'Breaking Bad' },
      { seasonNumber: 1, episodeNumber: 1 },
    );

    expect(result).not.toBeNull();
    expect(result!.infoHash).toBe('eeee5555eeee5555eeee5555eeee5555eeee5555');
    expect(torrentManager.addTorrent).toHaveBeenCalled();

    const addTorrentCall = torrentManager.addTorrent.mock.calls[0][0];
    expect(addTorrentCall.magnetUrl).toContain('eeee5555eeee5555eeee5555eeee5555eeee5555');
  });
});

describe('MediaSearchService.searchMovie', () => {
  beforeEach(() => {
    mockParseBatch.mockResolvedValue([]);
  });

  it('returns null when no candidates are found', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'MovieIndexer')],
    });
    indexerFactory.fromDatabaseRecord.mockReturnValue(indexer);

    const result = await service.searchMovie({ title: 'Unknown Movie', year: 2024 });

    expect(result).toBeNull();
  });

  it('grabs the best candidate when results exist', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          title: 'Inception.2010.1080p.BluRay',
          guid: 'movie-guid',
          seeders: 100,
          categories: [2000],
          magnetUrl: 'magnet:?xt=urn:btih:ffff6666ffff6666ffff6666ffff6666ffff6666',
        }),
      ]),
    };

    const { service, indexerFactory, torrentManager } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'MovieIndexer')],
    });
    indexerFactory.fromDatabaseRecord.mockReturnValue(indexer);
    torrentManager.addTorrent.mockResolvedValue({
      infoHash: 'ffff6666ffff6666ffff6666ffff6666ffff6666',
      name: 'Inception.2010.1080p.BluRay',
    });

    const result = await service.searchMovie({ title: 'Inception', year: 2010 });

    expect(result).not.toBeNull();
    expect(result!.infoHash).toBe('ffff6666ffff6666ffff6666ffff6666ffff6666');
    expect(torrentManager.addTorrent).toHaveBeenCalled();
  });

  it('includes year in query when provided', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'MovieIndexer')],
    });
    indexerFactory.fromDatabaseRecord.mockReturnValue(indexer);

    await service.searchMovie({ title: 'Dune', year: 2024 });

    const searchCall = indexer.search.mock.calls[0][0];
    expect(searchCall.q).toContain('2024');
    expect(searchCall.q).toContain('Dune');
  });
});

describe('MediaSearchService.getSearchCandidates', () => {
  beforeEach(() => {
    mockParseBatch.mockResolvedValue([]);
  });

  it('converts legacy query format with q, season, episode, imdbid', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([
        makeIndexerResult({
          title: 'Legacy.Query.S02E05.720p',
          guid: 'legacy-guid',
          seeders: 8,
          magnetUrl: 'magnet:?xt=urn:btih:aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111',
        }),
      ]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'LegacyIndexer')],
    });
    indexerFactory.fromDatabaseRecord.mockReturnValue(indexer);

    const candidates = await service.getSearchCandidates({
      q: 'Legacy Query',
      season: 2,
      ep: 5,
      imdbid: 'tt11223344',
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]!.title).toBe('Legacy.Query.S02E05.720p');

    const searchCall = indexer.search.mock.calls[0][0];
    expect(searchCall.season).toBe(2);
    expect(searchCall.ep).toBe(5);
    expect(searchCall.imdbid).toBe('tt11223344');
  });

  it('converts legacy query format with tmdbid', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TmdbIndexer')],
    });
    indexerFactory.fromDatabaseRecord.mockReturnValue(indexer);

    await service.getSearchCandidates({ q: 'Test', tmdbid: '12345' });

    const searchCall = indexer.search.mock.calls[0][0];
    expect(searchCall.tmdbid).toBe(12345);
  });

  it('returns empty array when no results found', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([]),
    };

    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'EmptyIndexer')],
    });
    indexerFactory.fromDatabaseRecord.mockReturnValue(indexer);

    const candidates = await service.getSearchCandidates({ q: 'Nothing Here' });

    expect(candidates).toHaveLength(0);
  });
});
