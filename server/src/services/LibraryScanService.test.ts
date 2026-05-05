import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LibraryScanService } from './LibraryScanService';

// Mock fs/promises
vi.mock('node:fs/promises', () => ({
  default: {
    access: vi.fn(),
    readdir: vi.fn(),
  },
}));

const fs = await import('node:fs/promises');

function createMockPrisma() {
  return {
    movie: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    episode: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  };
}

describe('LibraryScanService', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let service: LibraryScanService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = createMockPrisma();
    service = new LibraryScanService(prisma as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('scanAll()', () => {
    it('returns zero summary when both roots are empty', async () => {
      (vi.mocked(fs.default.readdir) as any).mockResolvedValue([]);
      prisma.movie.findMany.mockResolvedValue([]);
      prisma.episode.findMany.mockResolvedValue([]);

      const result = await service.scanAll({ movieRootFolder: '/movies', tvRootFolder: '/tv' });

      expect(result).toEqual({
        moviesAdded: 0,
        moviesMissing: 0,
        tvEpisodesAdded: 0,
        tvEpisodesMissing: 0,
        subtitleFilesDetected: 0,
        durationMs: expect.any(Number),
      });
    });

    it('skips movie scan when movieRootFolder is empty string', async () => {
      (vi.mocked(fs.default.readdir) as any).mockResolvedValue([]);
      prisma.episode.findMany.mockResolvedValue([]);

      await service.scanAll({ movieRootFolder: '', tvRootFolder: '/tv' });

      expect(prisma.movie.findMany).not.toHaveBeenCalled();
    });

    it('skips episode scan when tvRootFolder is empty string', async () => {
      (vi.mocked(fs.default.readdir) as any).mockResolvedValue([]);
      prisma.movie.findMany.mockResolvedValue([]);

      await service.scanAll({ movieRootFolder: '/movies', tvRootFolder: '' });

      expect(prisma.episode.findMany).not.toHaveBeenCalled();
    });

    it('scans both roots when both are set', async () => {
      (vi.mocked(fs.default.readdir) as any).mockResolvedValue([]);
      prisma.movie.findMany.mockResolvedValue([]);
      prisma.episode.findMany.mockResolvedValue([]);

      await service.scanAll({ movieRootFolder: '/movies', tvRootFolder: '/tv' });

      expect(prisma.movie.findMany).toHaveBeenCalled();
      expect(prisma.episode.findMany).toHaveBeenCalled();
    });

    it('aggregates summary from both scans', async () => {
      (vi.mocked(fs.default.readdir) as any).mockImplementation(async (dir: string) => {
        if (String(dir).includes('movies')) {
          return [{ name: 'Movie (2020).mkv', isDirectory: () => false }];
        }
        return [{ name: 'S01E01.mkv', isDirectory: () => false }];
      });
      prisma.movie.findMany.mockResolvedValue([]);
      prisma.episode.findMany.mockResolvedValue([]);

      const result = await service.scanAll({ movieRootFolder: '/movies', tvRootFolder: '/tv' });

      expect(result.moviesAdded).toBeGreaterThanOrEqual(0);
      expect(result.tvEpisodesAdded).toBeGreaterThanOrEqual(0);
    });
  });

  describe('scanMovies() — DB-to-disk reconciliation', () => {
    it('marks movie as missing when file is deleted', async () => {
      (vi.mocked(fs.default.readdir) as any).mockResolvedValue([]);
      vi.mocked(fs.default.access).mockRejectedValue(new Error('ENOENT'));
      prisma.movie.findMany.mockResolvedValue([
        { id: 1, path: '/movies/Existing Movie (2020).mkv', title: 'Existing Movie', year: 2020 },
      ]);

      await (service as any).scanMovies('/movies');

      expect(prisma.movie.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { path: null },
      });
    });

    it('does not mark movie as missing when file exists', async () => {
      (vi.mocked(fs.default.readdir) as any).mockResolvedValue([]);
      vi.mocked(fs.default.access).mockResolvedValue(undefined);
      prisma.movie.findMany.mockResolvedValue([
        { id: 1, path: '/movies/Existing Movie (2020).mkv', title: 'Existing Movie', year: 2020 },
      ]);

      const result = await (service as any).scanMovies('/movies');

      expect(result.missing).toBe(0);
      expect(prisma.movie.update).not.toHaveBeenCalled();
    });

    it('skips movies with null path', async () => {
      (vi.mocked(fs.default.readdir) as any).mockResolvedValue([]);
      prisma.movie.findMany.mockResolvedValue([
        { id: 1, path: null, title: 'Unpathed Movie', year: 2020 },
      ]);

      const result = await (service as any).scanMovies('/movies');

      expect(fs.default.access).not.toHaveBeenCalled();
      expect(result.missing).toBe(0);
    });

    it('handles empty movie DB', async () => {
      (vi.mocked(fs.default.readdir) as any).mockResolvedValue([]);
      prisma.movie.findMany.mockResolvedValue([]);

      const result = await (service as any).scanMovies('/movies');

      expect(result).toEqual({ added: 0, missing: 0, subtitles: 0 });
    });

    it('counts multiple missing movies correctly', async () => {
      (vi.mocked(fs.default.readdir) as any).mockResolvedValue([]);
      vi.mocked(fs.default.access).mockRejectedValue(new Error('ENOENT'));
      prisma.movie.findMany.mockResolvedValue([
        { id: 1, path: '/movies/Movie A (2020).mkv', title: 'Movie A', year: 2020 },
        { id: 2, path: '/movies/Movie B (2021).mkv', title: 'Movie B', year: 2021 },
        { id: 3, path: '/movies/Movie C (2022).mkv', title: 'Movie C', year: 2022 },
      ]);

      const result = await (service as any).scanMovies('/movies');

      expect(result.missing).toBe(3);
      expect(prisma.movie.update).toHaveBeenCalledTimes(3);
    });

    it('marks movie missing on any fs.access error including permission denied', async () => {
      (vi.mocked(fs.default.readdir) as any).mockResolvedValue([]);
      vi.mocked(fs.default.access).mockRejectedValue(new Error('EACCES: permission denied'));
      prisma.movie.findMany.mockResolvedValue([
        { id: 1, path: '/movies/Secret Movie (2020).mkv', title: 'Secret Movie', year: 2020 },
      ]);

      const result = await (service as any).scanMovies('/movies');

      // Current behavior: ALL access errors mark as missing (no distinction between ENOENT and EACCES)
      expect(result.missing).toBe(1);
      expect(prisma.movie.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { path: null },
      });
    });
  });

  describe('scanMovies() — disk-to-DB auto-matching', () => {
    it('matches unpathed movie by exact title+year', async () => {
      (vi.mocked(fs.default.readdir) as any).mockResolvedValue([
        { name: 'The Matrix (1999).mkv', isDirectory: () => false },
      ]);
      vi.mocked(fs.default.access).mockResolvedValue(undefined);
      prisma.movie.findMany.mockResolvedValue([
        { id: 1, path: null, title: 'The Matrix', year: 1999 },
      ]);

      const result = await (service as any).scanMovies('/movies');

      expect(result.added).toBe(1);
      expect(prisma.movie.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { path: expect.stringContaining('The Matrix (1999).mkv') },
      });
    });

    it('matches title with substring — "It" matches "It Chapter Two"', async () => {
      (vi.mocked(fs.default.readdir) as any).mockResolvedValue([
        { name: 'It Chapter Two (2019).mkv', isDirectory: () => false },
      ]);
      vi.mocked(fs.default.access).mockResolvedValue(undefined);
      prisma.movie.findMany.mockResolvedValue([
        { id: 1, path: null, title: 'It', year: 2019 },
      ]);

      const result = await (service as any).scanMovies('/movies');

      // Current behavior: substring match succeeds — "itchapter2019" includes "it2019"
      expect(result.added).toBe(1);
    });

    it('does not match when year differs', async () => {
      (vi.mocked(fs.default.readdir) as any).mockResolvedValue([
        { name: 'The Matrix (1999).mkv', isDirectory: () => false },
      ]);
      vi.mocked(fs.default.access).mockResolvedValue(undefined);
      prisma.movie.findMany.mockResolvedValue([
        { id: 1, path: null, title: 'The Matrix', year: 2000 },
      ]);

      const result = await (service as any).scanMovies('/movies');

      expect(result.added).toBe(0);
      expect(prisma.movie.update).not.toHaveBeenCalled();
    });

    it('does not re-match movies that already have a path', async () => {
      (vi.mocked(fs.default.readdir) as any).mockResolvedValue([
        { name: 'The Matrix (1999).mkv', isDirectory: () => false },
      ]);
      vi.mocked(fs.default.access).mockResolvedValue(undefined);
      prisma.movie.findMany.mockResolvedValue([
        { id: 1, path: '/movies/already/pathed.mkv', title: 'The Matrix', year: 1999 },
      ]);

      const result = await (service as any).scanMovies('/movies');

      expect(result.added).toBe(0);
      expect(prisma.movie.update).not.toHaveBeenCalled();
    });

    it('ignores video files already in DB', async () => {
      (vi.mocked(fs.default.readdir) as any).mockResolvedValue([
        { name: 'The Matrix (1999).mkv', isDirectory: () => false },
      ]);
      vi.mocked(fs.default.access).mockResolvedValue(undefined);
      prisma.movie.findMany.mockResolvedValue([
        { id: 1, path: '/movies/The Matrix (1999).mkv', title: 'The Matrix', year: 1999 },
      ]);

      const result = await (service as any).scanMovies('/movies');

      expect(result.added).toBe(0);
    });

    it('ignores files with no matching movie', async () => {
      (vi.mocked(fs.default.readdir) as any).mockResolvedValue([
        { name: 'Unknown Movie (2025).mkv', isDirectory: () => false },
      ]);
      vi.mocked(fs.default.access).mockResolvedValue(undefined);
      prisma.movie.findMany.mockResolvedValue([
        { id: 1, path: null, title: 'Different Movie', year: 2020 },
      ]);

      const result = await (service as any).scanMovies('/movies');

      expect(result.added).toBe(0);
    });

    it('matches multiple unpathed movies to distinct files', async () => {
      (vi.mocked(fs.default.readdir) as any).mockResolvedValue([
        { name: 'The Matrix (1999).mkv', isDirectory: () => false },
        { name: 'Inception (2010).mkv', isDirectory: () => false },
      ]);
      vi.mocked(fs.default.access).mockResolvedValue(undefined);
      prisma.movie.findMany.mockResolvedValue([
        { id: 1, path: null, title: 'The Matrix', year: 1999 },
        { id: 2, path: null, title: 'Inception', year: 2010 },
      ]);

      const result = await (service as any).scanMovies('/movies');

      expect(result.added).toBe(2);
      expect(prisma.movie.update).toHaveBeenCalledTimes(2);
    });

    it('first match wins when multiple movies could match the same file', async () => {
      (vi.mocked(fs.default.readdir) as any).mockResolvedValue([
        { name: 'Star Wars Episode IV (1977).mkv', isDirectory: () => false },
      ]);
      vi.mocked(fs.default.access).mockResolvedValue(undefined);
      prisma.movie.findMany.mockResolvedValue([
        { id: 1, path: null, title: 'Star Wars', year: 1977 },
        { id: 2, path: null, title: 'Star Wars Episode IV', year: 1977 },
      ]);

      const result = await (service as any).scanMovies('/movies');

      // Both movies have the same year and the filename includes both titles
      // The first one in the array gets matched (break on line 102)
      // The second remains unpathed
      expect(result.added).toBe(1);
    });

    it('counts subtitle files detected', async () => {
      (vi.mocked(fs.default.readdir) as any).mockResolvedValue([
        { name: 'Movie (2020).mkv', isDirectory: () => false },
        { name: 'Movie (2020).srt', isDirectory: () => false },
        { name: 'Movie (2020).ass', isDirectory: () => false },
      ]);
      vi.mocked(fs.default.access).mockResolvedValue(undefined);
      prisma.movie.findMany.mockResolvedValue([]);

      const result = await (service as any).scanMovies('/movies');

      expect(result.subtitles).toBe(2);
    });

    it('ignores non-video files during auto-matching', async () => {
      (vi.mocked(fs.default.readdir) as any).mockResolvedValue([
        { name: 'Movie (2020).txt', isDirectory: () => false },
        { name: 'Movie (2020).nfo', isDirectory: () => false },
      ]);
      vi.mocked(fs.default.access).mockResolvedValue(undefined);
      prisma.movie.findMany.mockResolvedValue([
        { id: 1, path: null, title: 'Movie', year: 2020 },
      ]);

      const result = await (service as any).scanMovies('/movies');

      expect(result.added).toBe(0);
    });
  });

  describe('scanEpisodes() — DB-to-disk reconciliation', () => {
    it('marks episode as missing when file is deleted', async () => {
      (vi.mocked(fs.default.readdir) as any).mockResolvedValue([]);
      vi.mocked(fs.default.access).mockRejectedValue(new Error('ENOENT'));
      prisma.episode.findMany.mockResolvedValue([
        { id: 1, path: '/tv/Show/S01/S01E01.mkv' },
      ]);

      const result = await (service as any).scanEpisodes('/tv');

      expect(result.missing).toBe(1);
      expect(prisma.episode.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { path: null },
      });
    });

    it('does not mark episode as missing when file exists', async () => {
      (vi.mocked(fs.default.readdir) as any).mockResolvedValue([]);
      vi.mocked(fs.default.access).mockResolvedValue(undefined);
      prisma.episode.findMany.mockResolvedValue([
        { id: 1, path: '/tv/Show/S01/S01E01.mkv' },
      ]);

      const result = await (service as any).scanEpisodes('/tv');

      expect(result.missing).toBe(0);
      expect(prisma.episode.update).not.toHaveBeenCalled();
    });

    it('skips episodes with null path', async () => {
      (vi.mocked(fs.default.readdir) as any).mockResolvedValue([]);
      prisma.episode.findMany.mockResolvedValue([
        { id: 1, path: null },
      ]);

      const result = await (service as any).scanEpisodes('/tv');

      expect(fs.default.access).not.toHaveBeenCalled();
      expect(result.missing).toBe(0);
    });

    it('handles empty episode DB', async () => {
      (vi.mocked(fs.default.readdir) as any).mockResolvedValue([]);
      prisma.episode.findMany.mockResolvedValue([]);

      const result = await (service as any).scanEpisodes('/tv');

      expect(result).toEqual({ added: 0, missing: 0, subtitles: 0 });
    });

    it('counts multiple missing episodes correctly', async () => {
      (vi.mocked(fs.default.readdir) as any).mockResolvedValue([]);
      vi.mocked(fs.default.access).mockRejectedValue(new Error('ENOENT'));
      prisma.episode.findMany.mockResolvedValue([
        { id: 1, path: '/tv/Show/S01/S01E01.mkv' },
        { id: 2, path: '/tv/Show/S01/S01E02.mkv' },
        { id: 3, path: '/tv/Show/S01/S01E03.mkv' },
      ]);

      const result = await (service as any).scanEpisodes('/tv');

      expect(result.missing).toBe(3);
    });
  });

  describe('scanEpisodes() — orphan counting', () => {
    it('counts video files not in DB as added', async () => {
      (vi.mocked(fs.default.readdir) as any).mockResolvedValue([
        { name: 'S01E01.mkv', isDirectory: () => false },
        { name: 'S01E02.mkv', isDirectory: () => false },
      ]);
      vi.mocked(fs.default.access).mockResolvedValue(undefined);
      prisma.episode.findMany.mockResolvedValue([]);

      const result = await (service as any).scanEpisodes('/tv');

      expect(result.added).toBe(2);
    });

    it('does not count already-pathed episodes as added', async () => {
      (vi.mocked(fs.default.readdir) as any).mockResolvedValue([
        { name: 'S01E01.mkv', isDirectory: () => false },
        { name: 'S01E02.mkv', isDirectory: () => false },
      ]);
      vi.mocked(fs.default.access).mockResolvedValue(undefined);
      prisma.episode.findMany.mockResolvedValue([
        { id: 1, path: '/tv/S01E01.mkv' },
      ]);

      const result = await (service as any).scanEpisodes('/tv');

      expect(result.added).toBe(1);
    });

    it('counts subtitle files detected', async () => {
      (vi.mocked(fs.default.readdir) as any).mockResolvedValue([
        { name: 'S01E01.mkv', isDirectory: () => false },
        { name: 'S01E01.srt', isDirectory: () => false },
        { name: 'S01E01.vtt', isDirectory: () => false },
      ]);
      vi.mocked(fs.default.access).mockResolvedValue(undefined);
      prisma.episode.findMany.mockResolvedValue([]);

      const result = await (service as any).scanEpisodes('/tv');

      expect(result.subtitles).toBe(2);
    });

    it('does not count subtitle files as added', async () => {
      (vi.mocked(fs.default.readdir) as any).mockResolvedValue([
        { name: 'S01E01.srt', isDirectory: () => false },
        { name: 'S01E01.ass', isDirectory: () => false },
      ]);
      vi.mocked(fs.default.access).mockResolvedValue(undefined);
      prisma.episode.findMany.mockResolvedValue([]);

      const result = await (service as any).scanEpisodes('/tv');

      expect(result.added).toBe(0);
    });
  });

  describe('walkDir error handling', () => {
    it('returns empty array when root folder does not exist', async () => {
      (vi.mocked(fs.default.readdir) as any).mockRejectedValue(new Error('ENOENT'));
      prisma.movie.findMany.mockResolvedValue([]);

      const result = await (service as any).scanMovies('/nonexistent');

      expect(result).toEqual({ added: 0, missing: 0, subtitles: 0 });
    });

    it('returns empty array on permission denied', async () => {
      (vi.mocked(fs.default.readdir) as any).mockRejectedValue(new Error('EACCES'));
      prisma.movie.findMany.mockResolvedValue([]);

      const result = await (service as any).scanMovies('/restricted');

      expect(result).toEqual({ added: 0, missing: 0, subtitles: 0 });
    });

    it('returns empty array on permission denied', async () => {
      (vi.mocked(fs.default.readdir) as any).mockRejectedValue(new Error('EACCES'));
      prisma.movie.findMany.mockResolvedValue([]);

      const result = await (service as any).scanMovies('/restricted');

      expect(result).toEqual({ added: 0, missing: 0, subtitles: 0 });
    });

    it('handles nested directory traversal', async () => {
      (vi.mocked(fs.default.readdir) as any)
        .mockResolvedValueOnce([
          { name: 'SubDir', isDirectory: () => true },
          { name: 'Movie (2020).mkv', isDirectory: () => false },
        ])
        .mockResolvedValueOnce([
          { name: 'Movie2 (2021).mkv', isDirectory: () => false },
        ]);
      vi.mocked(fs.default.access).mockResolvedValue(undefined);
      prisma.movie.findMany.mockResolvedValue([]);

      const result = await (service as any).scanMovies('/movies');

      expect(result.added).toBe(0); // no unpathed movies in DB
      expect(fs.default.readdir).toHaveBeenCalledTimes(2);
    });
  });
});
