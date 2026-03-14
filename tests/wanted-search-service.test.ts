import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WantedSearchService } from '../server/src/services/WantedSearchService';
import type { MediaSearchService, SearchCandidate } from '../server/src/services/MediaSearchService';
import type { PrismaClient } from '@prisma/client';
import type { ActivityEventEmitter } from '../server/src/services/ActivityEventEmitter';

describe('WantedSearchService', () => {
  let mediaSearchService: any;
  let prisma: any;
  let activityEventEmitter: any;
  let service: WantedSearchService;

  beforeEach(() => {
    mediaSearchService = {
      searchAllIndexers: vi.fn(),
      grabRelease: vi.fn(),
    };

    prisma = {
      movie: {
        findUnique: vi.fn(),
      },
      episode: {
        findUnique: vi.fn(),
      },
      series: {
        findUnique: vi.fn(),
      }
    };

    activityEventEmitter = {
      emit: vi.fn(),
    };

    service = new WantedSearchService(mediaSearchService, prisma, activityEventEmitter);
  });

  it('should trigger search for a movie and grab the best candidate above threshold', async () => {
    prisma.movie.findUnique.mockResolvedValue({
      id: 1,
      title: 'The Matrix',
      year: 1999,
    });

    const candidates: SearchCandidate[] = [
      {
        indexer: 'TestIndexer',
        indexerId: 1,
        title: 'The.Matrix.1999.1080p',
        guid: '123',
        size: 1000,
        seeders: 10,
        customFormatScore: 200, // Above threshold
      }
    ];

    mediaSearchService.searchAllIndexers.mockResolvedValue({
      releases: candidates,
      indexerResults: [],
      totalResults: 1,
      deduplicatedCount: 1,
    });

    mediaSearchService.grabRelease.mockResolvedValue({ infoHash: 'hash', name: 'release' });

    const result = await service.autoSearchMovie(1);

    expect(result.success).toBe(true);
    expect(mediaSearchService.searchAllIndexers).toHaveBeenCalledWith(expect.objectContaining({
      title: 'The Matrix',
      year: 1999,
      type: 'movie',
    }));
    expect(mediaSearchService.grabRelease).toHaveBeenCalledWith(candidates[0], { movieId: 1 });
  });

  it('should skip grabbing if best candidate is below threshold', async () => {
    prisma.movie.findUnique.mockResolvedValue({
      id: 1,
      title: 'The Matrix',
      year: 1999,
    });

    const candidates: SearchCandidate[] = [
      {
        indexer: 'TestIndexer',
        indexerId: 1,
        title: 'Completely.Wrong.Movie',
        guid: '123',
        size: 1000,
        seeders: 1,
        customFormatScore: 10, // Below threshold
      }
    ];

    mediaSearchService.searchAllIndexers.mockResolvedValue({
      releases: candidates,
    });

    const result = await service.autoSearchMovie(1);

    expect(result.success).toBe(false);
    expect(result.reason).toContain('below threshold');
    expect(mediaSearchService.grabRelease).not.toHaveBeenCalled();
  });
});
