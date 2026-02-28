import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaSearchService } from './MediaSearchService';

describe('MediaSearchService candidate enrichment', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-28T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('enriches search candidates with parsed quality and computed age hours', async () => {
    const indexerRepository = {
      findAllEnabled: vi.fn().mockResolvedValue([
        {
          id: 1,
          name: 'TPB',
          implementation: 'Cardigann',
          protocol: 'torrent',
          enabled: true,
          priority: 1,
          supportsRss: true,
          supportsSearch: true,
          settings: {},
        },
      ]),
    };

    const indexer = {
      search: vi.fn().mockResolvedValue([
        {
          title: 'The.Sopranos.S01E01.1080p.BluRay.x265',
          guid: 'release-1',
          publishDate: new Date('2026-02-28T10:00:00.000Z'),
          size: BigInt(1_073_741_824),
          seeders: 125,
          categories: [5000],
          protocol: 'torrent',
        },
      ]),
    };

    const indexerFactory = {
      fromDatabaseRecord: vi.fn().mockReturnValue(indexer),
    };

    const torrentManager = {
      addTorrent: vi.fn(),
    };

    const service = new MediaSearchService(
      indexerRepository as unknown as ConstructorParameters<typeof MediaSearchService>[0],
      indexerFactory as unknown as ConstructorParameters<typeof MediaSearchService>[1],
      torrentManager as unknown as ConstructorParameters<typeof MediaSearchService>[2],
    );

    const result = await service.searchAllIndexers({
      query: 'The Sopranos',
      type: 'tvsearch',
    });

    expect(result.releases).toHaveLength(1);
    expect(result.releases[0]?.quality).toBe('1080p BluRay');
    expect(result.releases[0]?.age).toBeCloseTo(2, 2);
  });

  it('ignores invalid publishDate values from indexers', async () => {
    const indexerRepository = {
      findAllEnabled: vi.fn().mockResolvedValue([
        {
          id: 1,
          name: 'TPB',
          implementation: 'Cardigann',
          protocol: 'torrent',
          enabled: true,
          priority: 1,
          supportsRss: true,
          supportsSearch: true,
          settings: {},
        },
      ]),
    };

    const indexer = {
      search: vi.fn().mockResolvedValue([
        {
          title: 'Some.Movie.2024.1080p.WEB-DL',
          guid: 'release-2',
          publishDate: new Date('invalid'),
          size: BigInt(1_073_741_824),
          seeders: 25,
        },
      ]),
    };

    const indexerFactory = {
      fromDatabaseRecord: vi.fn().mockReturnValue(indexer),
    };

    const torrentManager = {
      addTorrent: vi.fn(),
    };

    const service = new MediaSearchService(
      indexerRepository as unknown as ConstructorParameters<typeof MediaSearchService>[0],
      indexerFactory as unknown as ConstructorParameters<typeof MediaSearchService>[1],
      torrentManager as unknown as ConstructorParameters<typeof MediaSearchService>[2],
    );

    const result = await service.searchAllIndexers({
      query: 'Some Movie 2024',
      type: 'movie',
    });

    expect(result.releases).toHaveLength(1);
    expect(result.releases[0]?.publishDate).toBeUndefined();
    expect(result.releases[0]?.age).toBeUndefined();
  });

  it('retries movie search without imdbId when primary imdb search returns no results', async () => {
    const indexerRepository = {
      findAllEnabled: vi.fn().mockResolvedValue([
        {
          id: 1,
          name: 'YTS',
          implementation: 'Cardigann',
          protocol: 'torrent',
          enabled: true,
          priority: 1,
          supportsRss: true,
          supportsSearch: true,
          settings: {},
        },
      ]),
    };

    const indexer = {
      search: vi.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            title: 'The Matrix (1999) 1080p BluRay x264',
            guid: 'release-fallback',
            size: BigInt(1_073_741_824),
            seeders: 100,
          },
        ]),
    };

    const indexerFactory = {
      fromDatabaseRecord: vi.fn().mockReturnValue(indexer),
    };

    const torrentManager = {
      addTorrent: vi.fn(),
    };

    const service = new MediaSearchService(
      indexerRepository as unknown as ConstructorParameters<typeof MediaSearchService>[0],
      indexerFactory as unknown as ConstructorParameters<typeof MediaSearchService>[1],
      torrentManager as unknown as ConstructorParameters<typeof MediaSearchService>[2],
    );

    const result = await service.searchAllIndexers({
      type: 'movie',
      title: 'The Matrix',
      year: 1999,
      imdbId: 'tt0133093',
    });

    expect(indexer.search).toHaveBeenCalledTimes(2);
    expect(indexer.search).toHaveBeenNthCalledWith(1, expect.objectContaining({
      q: 'The Matrix 1999',
      imdbid: 'tt0133093',
    }));
    expect(indexer.search).toHaveBeenNthCalledWith(2, expect.objectContaining({
      q: 'The Matrix 1999',
    }));
    expect(indexer.search.mock.calls[1]?.[0]).not.toHaveProperty('imdbid');

    expect(result.indexerResults).toEqual([
      expect.objectContaining({
        indexerName: 'YTS',
        status: 'success',
        resultCount: 1,
      }),
    ]);
    expect(result.releases).toHaveLength(1);
    expect(result.releases[0]?.title).toContain('The Matrix');
  });
});
