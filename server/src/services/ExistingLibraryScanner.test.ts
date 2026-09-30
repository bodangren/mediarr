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

    it('uses the show tvshow.nfo when episodes live in season subfolders', async () => {
      // The show folder holds no video file of its own, so it is dropped
      // before season consolidation. The synthetic show folder must then
      // carry the show-level NFO, never the season's episode NFO.
      const showDir = path.join(tempDir, 'Firefly');
      const seasonDir = path.join(showDir, 'Season 1');
      await fs.mkdir(seasonDir, { recursive: true });
      await fs.writeFile(
        path.join(showDir, 'tvshow.nfo'),
        '<tvshow><title>Firefly</title><tvdbid>78874</tvdbid>' +
          '<tmdbid>1437</tmdbid><year>2002</year></tvshow>',
      );
      await fs.writeFile(
        path.join(seasonDir, 'Firefly.S01E01.nfo'),
        '<episodedetails><title>The Train Job</title><tvdbid>297989</tvdbid></episodedetails>',
      );
      await fs.writeFile(path.join(seasonDir, 'Firefly.S01E01.mkv'), '');

      const result = await scanner.scan(tempDir);
      const show = result.folders.find((f) => f.path === showDir);

      expect(show?.nfoData?.title).toBe('Firefly');
      expect(show?.nfoData?.tvdbId).toBe(78874);
      expect(show?.nfoData?.tmdbId).toBe(1437);
      expect(show?.files).toHaveLength(1);
    });

    it('prefers tvshow.nfo over an episode NFO in a flat show folder', async () => {
      const showDir = path.join(tempDir, 'Gravity Falls');
      await fs.mkdir(showDir, { recursive: true });
      await fs.writeFile(
        path.join(showDir, 'tvshow.nfo'),
        '<tvshow><title>Gravity Falls</title><tvdbid>4344073</tvdbid></tvshow>',
      );
      await fs.writeFile(
        path.join(showDir, 'Gravity.Falls.S01E01.nfo'),
        '<episodedetails><title>Tourist Trapped</title><tvdbid>999999</tvdbid></episodedetails>',
      );
      await fs.writeFile(path.join(showDir, 'Gravity.Falls.S01E01.mkv'), '');

      const result = await scanner.scan(tempDir);
      const show = result.folders.find((f) => f.path === showDir);

      expect(show?.nfoData?.title).toBe('Gravity Falls');
      expect(show?.nfoData?.tvdbId).toBe(4344073);
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
