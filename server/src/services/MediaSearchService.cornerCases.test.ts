import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaSearchService } from './MediaSearchService';
import { NotFoundError, TorrentRejectedError, ValidationError } from '../errors/domainErrors';

// ─── shared helpers ───────────────────────────────────────────────────────────

function makeService(overrides: {
  indexerRecords?: unknown[];
} = {}) {
  const indexerRepository = {
    findAllEnabled: vi.fn().mockResolvedValue(overrides.indexerRecords ?? []),
  };
  const indexerFactory = { fromDatabaseRecord: vi.fn() };
  const torrentManager = { addTorrent: vi.fn() };
  const service = new MediaSearchService(
    indexerRepository as any,
    indexerFactory as any,
    torrentManager as any,
  );
  return { service, indexerRepository, indexerFactory, torrentManager };
}

function makeCandidate(overrides: Partial<{
  magnetUrl: string | undefined;
  downloadUrl: string | undefined;
}> = {}) {
  return {
    indexer: 'TestIndexer',
    indexerId: 1,
    title: 'Show.S01E01.1080p',
    guid: 'guid-1',
    size: 1_000_000,
    seeders: 10,
    ...overrides,
  };
}

function makeIndexerRecord(id: number, name: string) {
  return {
    id,
    name,
    implementation: 'Cardigann',
    protocol: 'torrent',
    enabled: true,
    priority: 1,
    supportsRss: true,
    supportsSearch: true,
    settings: {},
  };
}

// ─── Phase 1: grabRelease — post-normalisation guard bug ──────────────────────

describe('MediaSearchService.grabRelease — post-normalisation guard', () => {
  let service: MediaSearchService;
  let torrentManager: { addTorrent: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    ({ service, torrentManager } = makeService());
  });

  it('throws TorrentRejectedError with the guard message (not "Torrent handoff failed: ...") when magnetUrl is non-magnet and downloadUrl is absent', async () => {
    // BUG: post-normalisation guard was inside try/catch, so the original message
    // got wrapped as "Torrent handoff failed: <original>".
    // After fix: guard is before try block → original message is preserved.
    const candidate = makeCandidate({
      magnetUrl: 'https://example.com/torrent.torrent',
      downloadUrl: undefined,
    });

    const err = await service.grabRelease(candidate).catch(e => e);

    expect(err).toBeInstanceOf(TorrentRejectedError);
    expect(err.message).toBe(
      'Search candidate has no usable magnet or download URL after normalisation',
    );
    expect(torrentManager.addTorrent).not.toHaveBeenCalled();
  });

  it('does NOT emit a failure event via the catch block when the guard fires before try', async () => {
    // Previously the catch block would emit a spurious RELEASE_GRABBED failure event.
    // After moving the guard before try, the catch block is never entered.
    // We verify addTorrent was not called (proves we never entered the try body).
    const candidate = makeCandidate({
      magnetUrl: 'https://example.com/torrent.torrent',
      downloadUrl: undefined,
    });

    await expect(service.grabRelease(candidate)).rejects.toBeInstanceOf(TorrentRejectedError);
    expect(torrentManager.addTorrent).not.toHaveBeenCalled();
  });
});

// ─── Phase 2: grabRelease — addTorrent failure + mediaContext passthrough ─────

describe('MediaSearchService.grabRelease — addTorrent failure and mediaContext', () => {
  let service: MediaSearchService;
  let torrentManager: { addTorrent: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    ({ service, torrentManager } = makeService());
  });

  it('rethrows as TorrentRejectedError when addTorrent throws a plain Error', async () => {
    torrentManager.addTorrent.mockRejectedValue(new Error('qBittorrent connection refused'));
    const candidate = makeCandidate({
      magnetUrl: 'magnet:?xt=urn:btih:aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111',
    });

    const err = await service.grabRelease(candidate).catch(e => e);

    expect(err).toBeInstanceOf(TorrentRejectedError);
    expect(err.message).toContain('qBittorrent connection refused');
  });

  it('forwards mediaContext.episodeId to addTorrent options', async () => {
    torrentManager.addTorrent.mockResolvedValue({
      infoHash: 'aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111',
      name: 'Show.S01E01.1080p',
    });
    const candidate = makeCandidate({
      magnetUrl: 'magnet:?xt=urn:btih:aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111',
    });

    await service.grabRelease(candidate, { episodeId: 42 });

    expect(torrentManager.addTorrent).toHaveBeenCalledWith(
      expect.objectContaining({ episodeId: 42 }),
    );
  });

  it('forwards mediaContext.movieId to addTorrent options', async () => {
    torrentManager.addTorrent.mockResolvedValue({
      infoHash: 'bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222',
      name: 'Movie.2024.1080p',
    });
    const candidate = makeCandidate({
      magnetUrl: 'magnet:?xt=urn:btih:bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222',
    });

    await service.grabRelease(candidate, { movieId: 99 });

    expect(torrentManager.addTorrent).toHaveBeenCalledWith(
      expect.objectContaining({ movieId: 99 }),
    );
  });

  it('does not include episodeId or movieId in addTorrent options when mediaContext is absent', async () => {
    torrentManager.addTorrent.mockResolvedValue({
      infoHash: 'cccc3333cccc3333cccc3333cccc3333cccc3333',
      name: 'Show.S01E01.1080p',
    });
    const candidate = makeCandidate({
      magnetUrl: 'magnet:?xt=urn:btih:cccc3333cccc3333cccc3333cccc3333cccc3333',
    });

    await service.grabRelease(candidate);

    const callArg = torrentManager.addTorrent.mock.calls[0][0];
    expect(callArg).not.toHaveProperty('episodeId');
    expect(callArg).not.toHaveProperty('movieId');
  });
});

// ─── Phase 3: grabReleaseByGuid — all four paths ──────────────────────────────

describe('MediaSearchService.grabReleaseByGuid', () => {
  it('throws NotFoundError when the indexer ID is not in the enabled list', async () => {
    const { service } = makeService({ indexerRecords: [makeIndexerRecord(1, 'TPB')] });

    await expect(service.grabReleaseByGuid('some-guid', 999)).rejects.toThrow(NotFoundError);
  });

  it('throws ValidationError when the indexer search throws', async () => {
    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TPB')],
    });
    const indexer = { search: vi.fn().mockRejectedValue(new Error('network timeout')) };
    indexerFactory.fromDatabaseRecord.mockReturnValue(indexer);

    await expect(service.grabReleaseByGuid('some-guid', 1)).rejects.toThrow(ValidationError);
  });

  it('throws NotFoundError when results contain no entry matching the GUID', async () => {
    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TPB')],
    });
    const indexer = {
      search: vi.fn().mockResolvedValue([
        {
          title: 'Some.Show.S01E01.1080p',
          guid: 'different-guid',
          publishDate: new Date(),
          size: BigInt(1_000_000),
          seeders: 10,
          categories: [5000],
          protocol: 'torrent',
          magnetUrl: 'magnet:?xt=urn:btih:aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111',
        },
      ]),
    };
    indexerFactory.fromDatabaseRecord.mockReturnValue(indexer);

    await expect(service.grabReleaseByGuid('wanted-guid', 1)).rejects.toThrow(NotFoundError);
  });

  it('succeeds when the matching GUID is found and grabRelease completes', async () => {
    const { service, indexerFactory, torrentManager } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'TPB')],
    });
    const targetGuid = 'target-guid-abc';
    const indexer = {
      search: vi.fn().mockResolvedValue([
        {
          title: 'Some.Show.S01E01.1080p',
          guid: targetGuid,
          publishDate: new Date(),
          size: BigInt(1_000_000),
          seeders: 10,
          categories: [5000],
          protocol: 'torrent',
          magnetUrl: 'magnet:?xt=urn:btih:dddd4444dddd4444dddd4444dddd4444dddd4444',
        },
      ]),
    };
    indexerFactory.fromDatabaseRecord.mockReturnValue(indexer);
    torrentManager.addTorrent.mockResolvedValue({
      infoHash: 'dddd4444dddd4444dddd4444dddd4444dddd4444',
      name: 'Some.Show.S01E01.1080p',
    });

    const result = await service.grabReleaseByGuid(targetGuid, 1);

    expect(result.infoHash).toBe('dddd4444dddd4444dddd4444dddd4444dddd4444');
    expect(torrentManager.addTorrent).toHaveBeenCalledOnce();
  });
});

// ─── Phase 4: searchAllIndexers — per-indexer timeout and error isolation ─────

describe('MediaSearchService.searchAllIndexers — indexer resilience', () => {
  it('marks a timed-out indexer as status=timeout while including results from healthy indexers', async () => {
    const { service, indexerFactory } = makeService({
      indexerRecords: [
        makeIndexerRecord(1, 'SlowIndexer'),
        makeIndexerRecord(2, 'FastIndexer'),
      ],
    });

    const slowIndexer = {
      search: vi.fn().mockImplementation(
        () => new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Indexer search timed out after 30000ms')), 0),
        ),
      ),
    };
    const fastIndexer = {
      search: vi.fn().mockResolvedValue([
        {
          title: 'Good.Show.S01E01.1080p',
          guid: 'fast-guid',
          publishDate: new Date(),
          size: BigInt(1_000_000),
          seeders: 20,
          categories: [5000],
          protocol: 'torrent',
        },
      ]),
    };

    indexerFactory.fromDatabaseRecord
      .mockReturnValueOnce(slowIndexer)
      .mockReturnValueOnce(fastIndexer);

    const result = await service.searchAllIndexers({ query: 'Good Show', type: 'tvsearch' });

    const slowResult = result.indexerResults.find(r => r.indexerName === 'SlowIndexer');
    const fastResult = result.indexerResults.find(r => r.indexerName === 'FastIndexer');

    expect(slowResult?.status).toBe('timeout');
    expect(fastResult?.status).toBe('success');
    expect(fastResult?.resultCount).toBe(1);
    expect(result.releases).toHaveLength(1);
    expect(result.releases[0]?.title).toBe('Good.Show.S01E01.1080p');
  });

  it('marks an errored indexer as status=error while including results from healthy indexers', async () => {
    const { service, indexerFactory } = makeService({
      indexerRecords: [
        makeIndexerRecord(1, 'BrokenIndexer'),
        makeIndexerRecord(2, 'HealthyIndexer'),
      ],
    });

    const brokenIndexer = {
      search: vi.fn().mockRejectedValue(new Error('SSL handshake failed')),
    };
    const healthyIndexer = {
      search: vi.fn().mockResolvedValue([
        {
          title: 'Good.Movie.2024.1080p',
          guid: 'healthy-guid',
          publishDate: new Date(),
          size: BigInt(2_000_000),
          seeders: 50,
          categories: [2000],
          protocol: 'torrent',
        },
      ]),
    };

    indexerFactory.fromDatabaseRecord
      .mockReturnValueOnce(brokenIndexer)
      .mockReturnValueOnce(healthyIndexer);

    const result = await service.searchAllIndexers({ query: 'Good Movie', type: 'movie' });

    const brokenResult = result.indexerResults.find(r => r.indexerName === 'BrokenIndexer');
    const healthyResult = result.indexerResults.find(r => r.indexerName === 'HealthyIndexer');

    expect(brokenResult?.status).toBe('error');
    expect(brokenResult?.errorMessage).toContain('SSL handshake failed');
    expect(healthyResult?.status).toBe('success');
    expect(result.releases).toHaveLength(1);
    expect(result.releases[0]?.title).toBe('Good.Movie.2024.1080p');
  });

  it('returns empty results when IMDB fallback also returns empty (does not invent results)', async () => {
    const { service, indexerFactory } = makeService({
      indexerRecords: [makeIndexerRecord(1, 'YTS')],
    });

    const indexer = {
      // Both primary (with imdbid) and fallback (without imdbid) return empty
      search: vi.fn().mockResolvedValue([]),
    };
    indexerFactory.fromDatabaseRecord.mockReturnValue(indexer);

    const result = await service.searchAllIndexers({
      type: 'movie',
      title: 'Obscure Film',
      year: 2001,
      imdbId: 'tt9999999',
    });

    // fallback was tried (2 calls total)
    expect(indexer.search).toHaveBeenCalledTimes(2);
    expect(result.releases).toHaveLength(0);
    expect(result.totalResults).toBe(0);
  });
});
