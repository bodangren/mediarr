import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RssMediaMonitor } from '../server/src/services/RssMediaMonitor';
import { EventEmitter } from 'events';

// Mock the CustomFormatScoringEngine
vi.mock('../server/src/services/CustomFormatScoringEngine', () => {
  return {
    CustomFormatScoringEngine: class {
      scoreCandidateUnified(candidate) {
        // If the candidate title contains 'LowScore', return a low score
        if (candidate.title.includes('LowScore')) {
          return { totalScore: 10 };
        }
        // Otherwise return a score above the 50 threshold
        return { totalScore: 100 };
      }
    }
  };
});

describe('RssMediaMonitor', () => {
  let monitor;
  let rssSyncService;
  let torrentManager;
  let prisma;
  let metadataProvider;
  let customFormatRepository;

  beforeEach(() => {
    rssSyncService = new EventEmitter();
    torrentManager = {
      addTorrent: vi.fn().mockResolvedValue({ infoHash: 'abc' }),
    };
    metadataProvider = {
      getMovieAvailability: vi.fn(),
    };
    customFormatRepository = {
      findByQualityProfileId: vi.fn().mockResolvedValue([]),
    };

    prisma = {
      series: {
        findFirst: vi.fn(),
      },
      episode: {
        findFirst: vi.fn(),
      },
      movie: {
        findFirst: vi.fn(),
      },
      indexer: {
        findUnique: vi.fn().mockResolvedValue({ priority: 10 }),
      }
    };

    monitor = new RssMediaMonitor(rssSyncService, torrentManager, prisma, metadataProvider, customFormatRepository);
  });

  it('should trigger download for a monitored missing released movie with high score', async () => {
    prisma.movie.findFirst.mockResolvedValue({
      id: 2,
      title: 'Forrest Gump',
      cleanTitle: 'forrestgump',
      monitored: true,
      path: null,
      minimumAvailability: 'released',
      status: 'released',
      inCinemas: null,
      digitalRelease: new Date('2025-01-01T00:00:00.000Z'),
      qualityProfileId: 1,
    });

    metadataProvider.getMovieAvailability.mockReturnValue('released');

    await rssSyncService.emit('release:stored', {
      title: 'Forrest.Gump.1994.1080p.BluRay.x264-GRP',
      magnetUrl: 'magnet:?xt=urn:btih:movieabc',
      indexerId: 1,
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(prisma.movie.findFirst).toHaveBeenCalled();
    expect(torrentManager.addTorrent).toHaveBeenCalledWith({
      magnetUrl: 'magnet:?xt=urn:btih:movieabc',
    });
  });

  it('should ignore releases that score below the threshold', async () => {
    prisma.movie.findFirst.mockResolvedValue({
      id: 2,
      title: 'Forrest Gump',
      cleanTitle: 'forrestgump',
      monitored: true,
      path: null,
      minimumAvailability: 'released',
      status: 'released',
      inCinemas: null,
      digitalRelease: new Date('2025-01-01T00:00:00.000Z'),
      qualityProfileId: 1,
    });

    metadataProvider.getMovieAvailability.mockReturnValue('released');

    await rssSyncService.emit('release:stored', {
      title: 'Forrest.Gump.1994.LowScore.Release',
      magnetUrl: 'magnet:?xt=urn:btih:moviexyz',
      indexerId: 1,
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(torrentManager.addTorrent).not.toHaveBeenCalled();
  });

  it('should ignore in-cinemas releases when minimum availability is released', async () => {
    prisma.movie.findFirst.mockResolvedValue({
      id: 2,
      title: 'Forrest Gump',
      cleanTitle: 'forrestgump',
      monitored: true,
      path: null,
      minimumAvailability: 'released',
      status: 'announced',
      inCinemas: new Date('2025-01-01T00:00:00.000Z'),
      digitalRelease: null,
    });

    metadataProvider.getMovieAvailability.mockReturnValue('in_cinemas');

    await rssSyncService.emit('release:stored', {
      title: 'Forrest.Gump.1994.1080p.TS.x264-GRP',
      magnetUrl: 'magnet:?xt=urn:btih:moviexyz',
      indexerId: 1,
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(torrentManager.addTorrent).not.toHaveBeenCalled();
  });
});
