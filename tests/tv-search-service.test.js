import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockParseBatch = vi.hoisted(() => vi.fn());

vi.mock('../server/src/services/ReleaseParser', () => ({
  releaseParser: { parse: vi.fn(), parseBatch: mockParseBatch },
}));

import { MediaSearchService } from '../server/src/services/MediaSearchService';

describe('MediaSearchService (legacy TV search alias coverage)', () => {
  let service;
  let indexerFactory;
  let indexerRepository;
  let torrentManager;

  beforeEach(() => {
    vi.clearAllMocks();
    indexerRepository = {
      findAllEnabled: vi.fn(),
    };
    indexerFactory = {
      fromDatabaseRecord: vi.fn(),
    };
    torrentManager = {
      addTorrent: vi.fn().mockResolvedValue({ infoHash: 'abc' }),
    };
    service = new MediaSearchService(indexerRepository, indexerFactory, torrentManager);
  });

  it('should search for an episode and add the best match to torrent manager', async () => {
    const series = { title: 'The Boys' };
    const episode = { seasonNumber: 1, episodeNumber: 1 };

    const mockIndexer = {
      search: vi.fn().mockResolvedValue([
        { title: 'The.Boys.S01E01.720p', guid: 'g1', magnetUrl: 'magnet:?1', size: 1000, seeders: 10, publishDate: new Date(), categories: [5000], protocol: 'torrent' },
        { title: 'The.Boys.S01E01.1080p', guid: 'g2', magnetUrl: 'magnet:?2', size: 2000, seeders: 20, publishDate: new Date(), categories: [5000], protocol: 'torrent' },
      ]),
      config: { name: 'Test Indexer' },
    };

    indexerRepository.findAllEnabled.mockResolvedValue([{
      id: 1,
      name: 'Test Indexer',
      implementation: 'Cardigann',
      protocol: 'torrent',
      enabled: true,
      priority: 1,
      supportsRss: true,
      supportsSearch: true,
      settings: {},
    }]);
    indexerFactory.fromDatabaseRecord.mockReturnValue(mockIndexer);

    const result = await service.searchEpisode(series, episode);

    expect(mockIndexer.search).toHaveBeenCalledWith(expect.objectContaining({
      q: 'The Boys S01E01',
    }));
    expect(torrentManager.addTorrent).toHaveBeenCalledWith(expect.objectContaining({
      magnetUrl: 'magnet:?2',
    }));
    expect(result.infoHash).toBe('abc');
  });
});
