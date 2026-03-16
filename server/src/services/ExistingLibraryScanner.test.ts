import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ExistingLibraryScanner } from './ExistingLibraryScanner';

describe('ExistingLibraryScanner', () => {
  let tempDir: string;
  let scanner: ExistingLibraryScanner;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scanner-test-'));
    scanner = new ExistingLibraryScanner();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('scan', () => {
    it('scans a directory with a single movie file', async () => {
      await fs.writeFile(path.join(tempDir, 'The.Matrix.1999.1080p.mkv'), '');

      const result = await scanner.scan(tempDir);

      expect(result.folders).toHaveLength(1);
      expect(result.folders[0]?.type).toBe('movie');
      expect(result.folders[0]?.files).toHaveLength(1);
      expect(result.folders[0]?.files[0]?.parsedInfo?.movieTitle).toBe('The Matrix');
      expect(result.folders[0]?.files[0]?.parsedInfo?.year).toBe(1999);
    });

    it('scans a directory with movie folder structure', async () => {
      const movieDir = path.join(tempDir, 'The Matrix (1999)');
      await fs.mkdir(movieDir);
      await fs.writeFile(path.join(movieDir, 'The.Matrix.1999.1080p.mkv'), '');

      const result = await scanner.scan(tempDir);

      expect(result.folders).toHaveLength(1);
      expect(result.folders[0]?.type).toBe('movie');
      expect(result.folders[0]?.parsedTitle).toBe('The Matrix');
      expect(result.folders[0]?.parsedYear).toBe(1999);
    });

    it('scans a directory with series episodes', async () => {
      await fs.writeFile(path.join(tempDir, 'Breaking.Bad.S01E01.Pilot.mkv'), '');
      await fs.writeFile(path.join(tempDir, 'Breaking.Bad.S01E02.Cat\'s in the Bag.mkv'), '');

      const result = await scanner.scan(tempDir);

      expect(result.folders).toHaveLength(1);
      expect(result.folders[0]?.type).toBe('series');
      expect(result.folders[0]?.files).toHaveLength(2);
    });

    it('scans a directory with series folder and season subfolders', async () => {
      const seriesDir = path.join(tempDir, 'Breaking Bad');
      const seasonDir = path.join(seriesDir, 'Season 01');
      await fs.mkdir(seasonDir, { recursive: true });
      await fs.writeFile(path.join(seasonDir, 'Breaking.Bad.S01E01.mkv'), '');

      const result = await scanner.scan(tempDir);

      expect(result.folders).toHaveLength(1);
      expect(result.folders[0]?.type).toBe('series');
    });

    it('ignores non-video files', async () => {
      await fs.writeFile(path.join(tempDir, 'movie.srt'), '');
      await fs.writeFile(path.join(tempDir, 'movie.jpg'), '');

      const result = await scanner.scan(tempDir);

      expect(result.folders).toHaveLength(0);
      expect(result.totalFiles).toBe(0);
    });

    it('detects NFO files alongside video files', async () => {
      await fs.writeFile(path.join(tempDir, 'The.Matrix.1999.mkv'), '');
      await fs.writeFile(path.join(tempDir, 'The.Matrix.1999.nfo'), '<movie><title>The Matrix</title></movie>');

      const result = await scanner.scan(tempDir);

      expect(result.folders).toHaveLength(1);
      expect(result.folders[0]?.files[0]?.nfoPath).toBeDefined();
    });

    it('extracts IMDB ID from NFO file', async () => {
      await fs.writeFile(path.join(tempDir, 'movie.mkv'), '');
      await fs.writeFile(
        path.join(tempDir, 'movie.nfo'),
        '<movie><id>tt0133093</id><title>The Matrix</title></movie>'
      );

      const result = await scanner.scan(tempDir);

      expect(result.folders[0]?.nfoData?.imdbId).toBe('tt0133093');
    });

    it('extracts TMDB ID from NFO file', async () => {
      await fs.writeFile(path.join(tempDir, 'movie.mkv'), '');
      await fs.writeFile(
        path.join(tempDir, 'movie.nfo'),
        '<movie><url>https://www.themoviedb.org/movie/603</url></movie>'
      );

      const result = await scanner.scan(tempDir);

      expect(result.folders[0]?.nfoData?.tmdbId).toBe(603);
    });

    it('extracts TVDB ID from NFO file', async () => {
      await fs.writeFile(path.join(tempDir, 'show.S01E01.mkv'), '');
      await fs.writeFile(
        path.join(tempDir, 'show.nfo'),
        '<tvshow><id>81189</id></tvshow>'
      );

      const result = await scanner.scan(tempDir);

      expect(result.folders[0]?.nfoData?.tvdbId).toBe(81189);
    });

    it('calculates total files count', async () => {
      await fs.writeFile(path.join(tempDir, 'movie1.mkv'), '');
      await fs.writeFile(path.join(tempDir, 'movie2.mkv'), '');
      await fs.writeFile(path.join(tempDir, 'movie3.mp4'), '');

      const result = await scanner.scan(tempDir);

      expect(result.totalFiles).toBe(3);
    });

    it('returns scan duration', async () => {
      await fs.writeFile(path.join(tempDir, 'movie.mkv'), '');

      const result = await scanner.scan(tempDir);

      expect(result.scanDurationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
