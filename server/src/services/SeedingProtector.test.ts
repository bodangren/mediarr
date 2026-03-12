import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SeedingProtector } from './SeedingProtector';

// Minimal Torrent shape used in tests
function makeTorrent(overrides: Partial<{
  infoHash: string;
  status: string;
  ratio: number;
  stopAtRatio: number | null;
  stopAtTime: number | null;
  completedAt: Date | null;
  episodeId: number | null;
  movieId: number | null;
}>): any {
  return {
    infoHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    name: 'Test.Torrent',
    status: 'seeding',
    ratio: 0,
    stopAtRatio: null,
    stopAtTime: null,
    completedAt: null,
    episodeId: null,
    movieId: null,
    ...overrides,
  };
}

describe('SeedingProtector', () => {
  let manager: { removeTorrent: ReturnType<typeof vi.fn> };
  let repository: { findAll: ReturnType<typeof vi.fn> };
  let prisma: {
    episode: { findUnique: ReturnType<typeof vi.fn> };
    movie: { findUnique: ReturnType<typeof vi.fn> };
    activityEvent: { create: ReturnType<typeof vi.fn> };
  };
  let protector: SeedingProtector;

  beforeEach(() => {
    manager = { removeTorrent: vi.fn().mockResolvedValue(undefined) };
    repository = { findAll: vi.fn() };
    prisma = {
      episode: { findUnique: vi.fn() },
      movie: { findUnique: vi.fn() },
      activityEvent: { create: vi.fn().mockResolvedValue({}) },
    };
    protector = new SeedingProtector(manager as any, repository as any, prisma as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('ratio limit', () => {
    it('removes an unlinked torrent when ratio limit is reached', async () => {
      repository.findAll.mockResolvedValue([
        makeTorrent({ ratio: 2.0, stopAtRatio: 1.5 }),
      ]);

      await protector.checkLimits();

      expect(manager.removeTorrent).toHaveBeenCalledOnce();
    });

    it('does not remove a torrent whose ratio is below the limit', async () => {
      repository.findAll.mockResolvedValue([
        makeTorrent({ ratio: 1.0, stopAtRatio: 1.5 }),
      ]);

      await protector.checkLimits();

      expect(manager.removeTorrent).not.toHaveBeenCalled();
    });

    it('does not remove a torrent that is not seeding', async () => {
      repository.findAll.mockResolvedValue([
        makeTorrent({ status: 'downloading', ratio: 5.0, stopAtRatio: 1.5 }),
      ]);

      await protector.checkLimits();

      expect(manager.removeTorrent).not.toHaveBeenCalled();
    });
  });

  describe('time limit', () => {
    it('removes an unlinked torrent when seed-time limit is reached', async () => {
      const completedAt = new Date(Date.now() - 120 * 60 * 1000); // 2 hours ago
      repository.findAll.mockResolvedValue([
        makeTorrent({ completedAt, stopAtTime: 60 }), // limit 60 min, seeded 120 min
      ]);

      await protector.checkLimits();

      expect(manager.removeTorrent).toHaveBeenCalledOnce();
    });

    it('does not remove a torrent that has not yet reached the time limit', async () => {
      const completedAt = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
      repository.findAll.mockResolvedValue([
        makeTorrent({ completedAt, stopAtTime: 60 }),
      ]);

      await protector.checkLimits();

      expect(manager.removeTorrent).not.toHaveBeenCalled();
    });
  });

  describe('linked episode — import guard', () => {
    it('removes the torrent when the linked episode HAS been imported (path set)', async () => {
      repository.findAll.mockResolvedValue([
        makeTorrent({ episodeId: 10, ratio: 2.0, stopAtRatio: 1.0 }),
      ]);
      prisma.episode.findUnique.mockResolvedValue({ id: 10, path: '/tv/Show/S01E01.mkv' });

      await protector.checkLimits();

      expect(manager.removeTorrent).toHaveBeenCalledOnce();
    });

    it('does NOT remove the torrent when the linked episode has NOT been imported (path null)', async () => {
      repository.findAll.mockResolvedValue([
        makeTorrent({ episodeId: 10, ratio: 2.0, stopAtRatio: 1.0 }),
      ]);
      // Episode exists but has no path → import never completed
      prisma.episode.findUnique.mockResolvedValue({ id: 10, path: null });

      await protector.checkLimits();

      expect(manager.removeTorrent).not.toHaveBeenCalled();
    });

    it('does NOT remove the torrent when the linked episode no longer exists in DB', async () => {
      repository.findAll.mockResolvedValue([
        makeTorrent({ episodeId: 99, ratio: 2.0, stopAtRatio: 1.0 }),
      ]);
      // Episode was deleted — treat as not-imported to preserve files
      prisma.episode.findUnique.mockResolvedValue(null);

      await protector.checkLimits();

      expect(manager.removeTorrent).not.toHaveBeenCalled();
    });
  });

  describe('linked movie — import guard', () => {
    it('removes the torrent when the linked movie HAS been imported (path set)', async () => {
      repository.findAll.mockResolvedValue([
        makeTorrent({ movieId: 20, ratio: 2.0, stopAtRatio: 1.0 }),
      ]);
      prisma.movie.findUnique.mockResolvedValue({ id: 20, path: '/movies/Inception (2010)' });

      await protector.checkLimits();

      expect(manager.removeTorrent).toHaveBeenCalledOnce();
    });

    it('does NOT remove the torrent when the linked movie has NOT been imported (path null)', async () => {
      repository.findAll.mockResolvedValue([
        makeTorrent({ movieId: 20, ratio: 2.0, stopAtRatio: 1.0 }),
      ]);
      prisma.movie.findUnique.mockResolvedValue({ id: 20, path: null });

      await protector.checkLimits();

      expect(manager.removeTorrent).not.toHaveBeenCalled();
    });

    it('does NOT remove the torrent when the linked movie no longer exists in DB', async () => {
      repository.findAll.mockResolvedValue([
        makeTorrent({ movieId: 99, ratio: 2.0, stopAtRatio: 1.0 }),
      ]);
      prisma.movie.findUnique.mockResolvedValue(null);

      await protector.checkLimits();

      expect(manager.removeTorrent).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('continues checking other torrents when removeTorrent throws', async () => {
      const torrent1 = makeTorrent({
        infoHash: 'aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111',
        ratio: 2.0,
        stopAtRatio: 1.0,
      });
      const torrent2 = makeTorrent({
        infoHash: 'bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222',
        ratio: 3.0,
        stopAtRatio: 1.0,
      });
      repository.findAll.mockResolvedValue([torrent1, torrent2]);
      manager.removeTorrent
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce(undefined);

      await protector.checkLimits();

      expect(manager.removeTorrent).toHaveBeenCalledTimes(2);
    });
  });

  describe('start / stop', () => {
    it('start registers an interval and stop clears it', () => {
      vi.useFakeTimers();
      repository.findAll.mockResolvedValue([]);

      protector.start(5000);
      vi.advanceTimersByTime(5000);
      expect(repository.findAll).toHaveBeenCalled();

      protector.stop();
      vi.clearAllTimers();
      vi.useRealTimers();
    });

    it('calling start twice does not register a second interval', () => {
      vi.useFakeTimers();
      repository.findAll.mockResolvedValue([]);

      protector.start(5000);
      protector.start(5000);
      vi.advanceTimersByTime(5000);
      expect(repository.findAll).toHaveBeenCalledOnce();

      protector.stop();
      vi.clearAllTimers();
      vi.useRealTimers();
    });
  });
});
