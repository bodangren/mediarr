import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaSearchService } from '../server/src/services/MediaSearchService';

describe('MediaSearchService', () => {
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
      addTorrent: vi.fn().mockResolvedValue({ infoHash: 'moviehash' }),
    };

    service = new MediaSearchService(indexerRepository, indexerFactory, torrentManager);
  });

  it('should search for a movie using title/year/id query hints and grab best match', async () => {
    const movie = {
      title: 'Forrest Gump',
      year: 1994,
      tmdbId: 13,
      imdbId: 'tt0109830',
    };

    const mockIndexer = {
      search: vi.fn().mockResolvedValue([
        { title: 'Forrest.Gump.1994.720p', magnetUrl: 'magnet:?1', size: 1000, seeders: 4 },
        { title: 'Forrest.Gump.1994.1080p', magnetUrl: 'magnet:?2', size: 2000, seeders: 30 },
      ]),
      config: { name: 'Test Indexer' },
    };

    indexerRepository.findAllEnabled.mockResolvedValue([{ id: 1 }]);
    indexerFactory.fromDatabaseRecord.mockReturnValue(mockIndexer);

    const result = await service.searchMovie(movie);

    expect(mockIndexer.search).toHaveBeenCalledWith(expect.objectContaining({
      q: 'Forrest Gump 1994',
      tmdbid: 13,
      imdbid: 'tt0109830',
    }));
    expect(torrentManager.addTorrent).toHaveBeenCalledWith({
      magnetUrl: 'magnet:?2',
    });
    expect(result.infoHash).toBe('moviehash');
  });
});
