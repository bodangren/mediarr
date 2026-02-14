import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaSearchService } from '../server/src/services/MediaSearchService';
import { TorrentRejectedError } from '../server/src/errors/domainErrors';

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

  it('should return ranked search candidates without queue side effects', async () => {
    const mockIndexer = {
      search: vi.fn().mockResolvedValue([
        {
          title: 'Forrest.Gump.1994.720p',
          magnetUrl: 'magnet:?1',
          size: 1000,
          seeders: 4,
          age: 100,
          quality: '720p',
        },
        {
          title: 'Forrest.Gump.1994.1080p',
          magnetUrl: 'magnet:?2',
          size: 2000,
          seeders: 30,
          age: 20,
          quality: '1080p',
        },
      ]),
      config: { name: 'Test Indexer' },
    };

    indexerRepository.findAllEnabled.mockResolvedValue([{ id: 1 }]);
    indexerFactory.fromDatabaseRecord.mockReturnValue(mockIndexer);

    const candidates = await service.getSearchCandidates({ q: 'Forrest Gump 1994' });

    expect(candidates).toHaveLength(2);
    expect(candidates[0].title).toContain('1080p');
    expect(candidates[0].indexer).toBe('Test Indexer');
    expect(torrentManager.addTorrent).not.toHaveBeenCalled();
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

  it('should throw TORRENT_REJECTED when trying to grab a candidate without magnet', async () => {
    await expect(
      service.grabRelease({
        indexer: 'Test Indexer',
        title: 'No magnet candidate',
        size: 100,
        seeders: 1,
        quality: '720p',
        age: 1,
      }),
    ).rejects.toBeInstanceOf(TorrentRejectedError);
  });

  it('should throw TORRENT_REJECTED when torrent manager rejects add request', async () => {
    torrentManager.addTorrent.mockRejectedValueOnce(new Error('queue-full'));

    await expect(
      service.grabRelease({
        indexer: 'Test Indexer',
        title: 'Candidate',
        size: 100,
        seeders: 1,
        quality: '720p',
        age: 1,
        magnetUrl: 'magnet:?ok',
      }),
    ).rejects.toMatchObject({ code: 'TORRENT_REJECTED' });
  });

  it('should keep compatibility for searchEpisode composition', async () => {
    const mockIndexer = {
      search: vi.fn().mockResolvedValue([
        { title: 'The.Boys.S01E01.1080p', magnetUrl: 'magnet:?ep1', size: 1000, seeders: 50 },
      ]),
      config: { name: 'Episode Indexer' },
    };

    indexerRepository.findAllEnabled.mockResolvedValue([{ id: 2 }]);
    indexerFactory.fromDatabaseRecord.mockReturnValue(mockIndexer);

    const result = await service.searchEpisode(
      { title: 'The Boys' },
      { seasonNumber: 1, episodeNumber: 1 },
    );

    expect(result).toEqual({ infoHash: 'moviehash' });
    expect(torrentManager.addTorrent).toHaveBeenCalledWith({ magnetUrl: 'magnet:?ep1' });
  });

  it('should include indexer flags in mapped candidates', async () => {
    const mockIndexer = {
      search: vi.fn().mockResolvedValue([
        {
          title: 'Flagged.Result.1080p',
          magnetUrl: 'magnet:?flagged',
          size: 1234,
          seeders: 12,
          indexerFlags: 'freeleech',
        },
      ]),
      config: { name: 'Flag Indexer' },
    };

    indexerRepository.findAllEnabled.mockResolvedValue([{ id: 3 }]);
    indexerFactory.fromDatabaseRecord.mockReturnValue(mockIndexer);

    const candidates = await service.getSearchCandidates({ q: 'Flagged Result' });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      title: 'Flagged.Result.1080p',
      indexer: 'Flag Indexer',
      indexerFlags: 'freeleech',
    });
  });
});
