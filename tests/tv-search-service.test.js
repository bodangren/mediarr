import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TvSearchService } from '../server/src/services/TvSearchService';

describe('TvSearchService', () => {
  let service;
  let indexerFactory;
  let indexerRepository;
  let torrentManager;

  beforeEach(() => {
    indexerRepository = {
      findAllEnabled: vi.fn(),
    };
    indexerFactory = {
      fromDatabaseRecord: vi.fn(),
    };
    torrentManager = {
      addTorrent: vi.fn().mockResolvedValue({ infoHash: 'abc' }),
    };
    service = new TvSearchService(indexerRepository, indexerFactory, torrentManager);
  });

  it('should search for an episode and add the best match to torrent manager', async () => {
    const series = { title: 'The Boys' };
    const episode = { seasonNumber: 1, episodeNumber: 1 };

    const mockIndexer = {
      search: vi.fn().mockResolvedValue([
        { title: 'The.Boys.S01E01.720p', magnetUrl: 'magnet:?1', size: 1000, seeders: 10 },
        { title: 'The.Boys.S01E01.1080p', magnetUrl: 'magnet:?2', size: 2000, seeders: 20 },
      ]),
      config: { name: 'Test Indexer' }
    };

    indexerRepository.findAllEnabled.mockResolvedValue([{ id: 1 }]);
    indexerFactory.fromDatabaseRecord.mockReturnValue(mockIndexer);

    const result = await service.searchEpisode(series, episode);

    expect(mockIndexer.search).toHaveBeenCalledWith(expect.objectContaining({
      q: 'The Boys S01E01'
    }));
    expect(torrentManager.addTorrent).toHaveBeenCalledWith(expect.objectContaining({
      magnetUrl: 'magnet:?2',
    }));
    expect(result.infoHash).toBe('abc');
  });
});
