import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'events';
import { MediaService } from '../server/src/services/MediaService';
import { MediaSearchService } from '../server/src/services/MediaSearchService';
import { ImportManager } from '../server/src/services/ImportManager';
import { VariantSubtitleFetchService } from '../server/src/services/VariantSubtitleFetchService';
import { IndexerTester } from '../server/src/indexers/IndexerTester';
import { TorznabIndexer } from '../server/src/indexers/BaseIndexer';
import { HttpClient } from '../server/src/indexers/HttpClient';

vi.mock('node:fs/promises', () => ({
  default: {
    stat: vi.fn().mockResolvedValue({ isDirectory: () => false }),
    readdir: vi.fn().mockResolvedValue([]),
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
  stat: vi.fn().mockResolvedValue({ isDirectory: () => false }),
  readdir: vi.fn().mockResolvedValue([]),
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

describe('activity event emission adapters', () => {
  it('should emit MEDIA_ADDED when media is added via MediaService', async () => {
    const prisma = {
      movie: {
        create: vi.fn().mockResolvedValue({ id: 44, title: 'Arrival' }),
      },
    };
    const emitter = { emit: vi.fn().mockResolvedValue(undefined) };
    const service = new MediaService(prisma, null, emitter);

    await service.addMovie({ title: 'Arrival' });

    expect(emitter.emit).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'MEDIA_ADDED',
      sourceModule: 'media-service',
      success: true,
    }));
  });

  it('should emit SEARCH_EXECUTED and RELEASE_GRABBED from MediaSearchService', async () => {
    const indexerRepository = {
      findAllEnabled: vi.fn().mockResolvedValue([{ id: 1 }]),
    };
    const indexerFactory = {
      fromDatabaseRecord: vi.fn().mockReturnValue({
        config: { name: 'IndexerA' },
        search: vi.fn().mockResolvedValue([
          { title: 'Result', seeders: 2, size: 3, magnetUrl: 'magnet:?ok' },
        ]),
      }),
    };
    const torrentManager = {
      addTorrent: vi.fn().mockResolvedValue({ infoHash: 'hash' }),
    };
    const emitter = { emit: vi.fn().mockResolvedValue(undefined) };

    const service = new MediaSearchService(
      indexerRepository,
      indexerFactory,
      torrentManager,
      emitter,
    );

    const candidates = await service.getSearchCandidates({ q: 'Result' });
    await service.grabRelease(candidates[0]);

    expect(emitter.emit).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'SEARCH_EXECUTED',
      success: true,
    }));
    expect(emitter.emit).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'RELEASE_GRABBED',
      success: true,
    }));

    torrentManager.addTorrent.mockRejectedValueOnce(new Error('queue-full'));
    await expect(service.grabRelease(candidates[0])).rejects.toMatchObject({
      code: 'TORRENT_REJECTED',
    });

    expect(emitter.emit).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'RELEASE_GRABBED',
      success: false,
    }));
  });

  it('should emit IMPORT_COMPLETED when import succeeds', async () => {
    const torrentManager = new EventEmitter();
    const organizer = {
      organizeFile: vi.fn().mockResolvedValue('/media/TV/The Boys/Season 01/The Boys - S01E01 - Pilot.mkv'),
    };
    const prisma = {
      series: {
        findFirst: vi.fn().mockResolvedValue({ id: 1, title: 'The Boys', path: '/media/TV/The Boys' }),
      },
      episode: {
        findFirst: vi.fn().mockResolvedValue({ id: 101, seasonNumber: 1, episodeNumber: 1 }),
        update: vi.fn().mockResolvedValue({ id: 101 }),
      },
      mediaFileVariant: {
        upsert: vi.fn().mockResolvedValue({}),
      },
    };
    const emitter = { emit: vi.fn().mockResolvedValue(undefined) };

    new ImportManager(torrentManager, organizer, prisma, emitter);

    torrentManager.emit('torrent:completed', {
      infoHash: 'abc',
      name: 'The.Boys.S01E01.1080p.WEBRip.x264-GRP',
      path: '/data/downloads/complete/The.Boys.S01E01.1080p.WEBRip.x264-GRP',
    });

    await new Promise(resolve => setTimeout(resolve, 20));

    expect(emitter.emit).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'SERIES_IMPORTED',
      sourceModule: 'import-manager',
      success: true,
    }));
  });

  it('should emit SUBTITLE_DOWNLOADED when subtitle fetch succeeds', async () => {
    const repository = {
      getWantedSubtitleById: vi.fn().mockResolvedValue({
        id: 9,
        variantId: 11,
        languageCode: 'en',
        isForced: false,
        isHi: false,
      }),
      updateWantedSubtitleState: vi.fn().mockResolvedValue(undefined),
      getVariantInventory: vi.fn().mockResolvedValue({
        variant: {
          id: 11,
          path: '/data/media/movie.mp4',
          releaseName: 'Movie.Release',
          fileSize: BigInt(100),
        },
        audioTracks: [],
        subtitleTracks: [],
      }),
      listSiblingSubtitlePaths: vi.fn().mockResolvedValue([]),
      createSubtitleTrack: vi.fn().mockResolvedValue(undefined),
      createSubtitleHistory: vi.fn().mockResolvedValue(undefined),
    };
    const provider = {
      searchBestSubtitle: vi.fn().mockResolvedValue({
        languageCode: 'en',
        isForced: false,
        isHi: false,
        provider: 'opensubtitles',
        score: 99,
      }),
    };
    const emitter = { emit: vi.fn().mockResolvedValue(undefined) };

    const service = new VariantSubtitleFetchService(repository, undefined, emitter);
    await service.fetchWantedSubtitle(9, provider);

    expect(emitter.emit).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'SUBTITLE_DOWNLOADED',
      success: true,
    }));
  });

  it('should emit INDEXER_TESTED from IndexerTester', async () => {
    const indexer = new TorznabIndexer({
      id: 1,
      name: 'Indexer One',
      implementation: 'Torznab',
      protocol: 'torrent',
      enabled: true,
      priority: 25,
      supportsRss: true,
      supportsSearch: true,
      settings: { apiKey: 'a', url: 'https://idx.example.com' },
    });

    const emitter = { emit: vi.fn().mockResolvedValue(undefined) };
    const tester = new IndexerTester(new HttpClient(), undefined, emitter);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '<caps><searching/></caps>',
      headers: new Headers(),
    });

    const result = await tester.test(indexer, mockFetch);

    expect(result.success).toBe(true);
    expect(emitter.emit).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'INDEXER_TESTED',
      sourceModule: 'indexer-tester',
      success: true,
    }));
  });
});
