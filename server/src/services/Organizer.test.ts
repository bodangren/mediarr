import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Organizer } from './Organizer';

// ---------------------------------------------------------------------------
// Hoisted fs mock — gives us access to vi.fn() instances from outside the factory
// ---------------------------------------------------------------------------
const fsMocks = vi.hoisted(() => ({
  mkdir: vi.fn<[], Promise<void>>().mockResolvedValue(undefined),
  link: vi.fn<[], Promise<void>>().mockResolvedValue(undefined),
  rename: vi.fn<[], Promise<void>>().mockResolvedValue(undefined),
  copyFile: vi.fn<[], Promise<void>>().mockResolvedValue(undefined),
  unlink: vi.fn<[], Promise<void>>().mockResolvedValue(undefined),
  writeFile: vi.fn<[], Promise<void>>().mockResolvedValue(undefined),
}));

vi.mock('node:fs/promises', () => ({
  default: fsMocks,
}));

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------
const SERIES = { title: 'Breaking Bad', path: '/media/tv/Breaking Bad' };
const EPISODE = { seasonNumber: 1, episodeNumber: 1, title: 'Pilot' };
const MOVIE = { title: 'The Matrix', year: 1999, path: '/media/movies' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function restoreDefaults() {
  fsMocks.mkdir.mockResolvedValue(undefined);
  fsMocks.link.mockResolvedValue(undefined);
  fsMocks.rename.mockResolvedValue(undefined);
  fsMocks.copyFile.mockResolvedValue(undefined);
  fsMocks.unlink.mockResolvedValue(undefined);
  fsMocks.writeFile.mockResolvedValue(undefined);
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Organizer', () => {
  let organizer: Organizer;

  beforeEach(() => {
    organizer = new Organizer();
    restoreDefaults();
  });

  afterEach(() => {
    vi.resetAllMocks(); // clears call history AND queued implementations
  });

  // -------------------------------------------------------------------------
  // organizeFile — episode import
  // -------------------------------------------------------------------------

  describe('organizeFile (episode import)', () => {
    it('happy path: link succeeds → returns correct Season-folder destination', async () => {
      const result = await organizer.organizeFile(
        '/downloads/breaking.bad.s01e01.mkv',
        SERIES,
        EPISODE,
      );

      expect(fsMocks.mkdir).toHaveBeenCalledWith(
        '/media/tv/Breaking Bad/Season 01',
        { recursive: true },
      );
      expect(fsMocks.link).toHaveBeenCalledWith(
        '/downloads/breaking.bad.s01e01.mkv',
        '/media/tv/Breaking Bad/Season 01/Breaking Bad - S01E01 - Pilot.mkv',
      );
      expect(fsMocks.rename).not.toHaveBeenCalled();
      expect(result).toBe('/media/tv/Breaking Bad/Season 01/Breaking Bad - S01E01 - Pilot.mkv');
    });

    it('link fails → falls back to rename (same-device)', async () => {
      fsMocks.link.mockRejectedValueOnce(new Error('EPERM: operation not permitted'));

      const result = await organizer.organizeFile(
        '/downloads/breaking.bad.s01e01.mkv',
        SERIES,
        EPISODE,
      );

      expect(fsMocks.link).toHaveBeenCalledOnce();
      expect(fsMocks.rename).toHaveBeenCalledWith(
        '/downloads/breaking.bad.s01e01.mkv',
        '/media/tv/Breaking Bad/Season 01/Breaking Bad - S01E01 - Pilot.mkv',
      );
      expect(result).toBe('/media/tv/Breaking Bad/Season 01/Breaking Bad - S01E01 - Pilot.mkv');
    });

    it('source equals destination → returns early without calling link or rename', async () => {
      // File is already at the destination path
      const alreadyOrganized = '/media/tv/Breaking Bad/Season 01/Breaking Bad - S01E01 - Pilot.mkv';

      const result = await organizer.organizeFile(
        alreadyOrganized,
        SERIES,
        EPISODE,
      );

      expect(fsMocks.link).not.toHaveBeenCalled();
      expect(fsMocks.rename).not.toHaveBeenCalled();
      expect(result).toBe(alreadyOrganized);
    });

    it('move: true → calls rename, does NOT call link', async () => {
      const result = await organizer.organizeFile(
        '/downloads/breaking.bad.s01e01.mkv',
        SERIES,
        EPISODE,
        { move: true },
      );

      expect(fsMocks.link).not.toHaveBeenCalled();
      expect(fsMocks.rename).toHaveBeenCalledWith(
        '/downloads/breaking.bad.s01e01.mkv',
        '/media/tv/Breaking Bad/Season 01/Breaking Bad - S01E01 - Pilot.mkv',
      );
      expect(result).toBe('/media/tv/Breaking Bad/Season 01/Breaking Bad - S01E01 - Pilot.mkv');
    });

    it('move: true + rename throws EXDEV → falls back to copyFile + unlink', async () => {
      const exdev = Object.assign(new Error('EXDEV'), { code: 'EXDEV' });
      fsMocks.rename.mockRejectedValueOnce(exdev);

      const result = await organizer.organizeFile(
        '/downloads/breaking.bad.s01e01.mkv',
        SERIES,
        EPISODE,
        { move: true },
      );

      expect(fsMocks.copyFile).toHaveBeenCalledWith(
        '/downloads/breaking.bad.s01e01.mkv',
        '/media/tv/Breaking Bad/Season 01/Breaking Bad - S01E01 - Pilot.mkv',
      );
      expect(fsMocks.unlink).toHaveBeenCalledWith('/downloads/breaking.bad.s01e01.mkv');
      expect(result).toBe('/media/tv/Breaking Bad/Season 01/Breaking Bad - S01E01 - Pilot.mkv');
    });

    it('move: true + rename throws non-EXDEV error → propagates the error', async () => {
      const ioError = Object.assign(new Error('EIO: i/o error'), { code: 'EIO' });
      fsMocks.rename.mockRejectedValueOnce(ioError);

      await expect(
        organizer.organizeFile('/downloads/breaking.bad.s01e01.mkv', SERIES, EPISODE, { move: true }),
      ).rejects.toThrow('EIO');

      expect(fsMocks.copyFile).not.toHaveBeenCalled();
      expect(fsMocks.unlink).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // organizeMovieFile
  // -------------------------------------------------------------------------

  describe('organizeMovieFile', () => {
    it('creates movie subfolder when path is a root folder', async () => {
      const fs = await import('node:fs/promises');

      await organizer.organizeMovieFile('/downloads/The.Matrix.1999.mkv', MOVIE);

      expect(fs.default.mkdir).toHaveBeenCalledWith(
        '/media/movies/The Matrix (1999)',
        { recursive: true },
      );
      expect(fs.default.link).toHaveBeenCalledWith(
        '/downloads/The.Matrix.1999.mkv',
        '/media/movies/The Matrix (1999)/The Matrix (1999).mkv',
      );
    });

    it('does not duplicate subfolder when path is already the movie folder', async () => {
      const fs = await import('node:fs/promises');
      const movieAtMovieDir = { ...MOVIE, path: '/media/movies/The Matrix (1999)' };

      await organizer.organizeMovieFile('/downloads/The.Matrix.1999.mkv', movieAtMovieDir);

      expect(fs.default.mkdir).toHaveBeenCalledWith(
        '/media/movies/The Matrix (1999)',
        { recursive: true },
      );
      expect(fs.default.link).toHaveBeenCalledWith(
        '/downloads/The.Matrix.1999.mkv',
        '/media/movies/The Matrix (1999)/The Matrix (1999).mkv',
      );
    });

    it('move: true → calls rename, does NOT call link', async () => {
      const result = await organizer.organizeMovieFile(
        '/downloads/The.Matrix.1999.mkv',
        MOVIE,
        { move: true },
      );

      expect(fsMocks.link).not.toHaveBeenCalled();
      expect(fsMocks.rename).toHaveBeenCalledWith(
        '/downloads/The.Matrix.1999.mkv',
        '/media/movies/The Matrix (1999)/The Matrix (1999).mkv',
      );
      expect(result).toBe('/media/movies/The Matrix (1999)/The Matrix (1999).mkv');
    });
  });

  // -------------------------------------------------------------------------
  // buildFilename — sanitization of special characters
  // -------------------------------------------------------------------------

  describe('buildFilename', () => {
    it('sanitizes characters that are invalid in filenames', () => {
      const dirtyTitle = 'Breaking: Bad? <Show> |Pilot|';
      const result = organizer.buildFilename(
        { title: dirtyTitle },
        { seasonNumber: 1, episodeNumber: 1, title: 'Pilot: Part 1?' },
        '.mkv',
      );

      // Colons, question marks, angle brackets, pipes removed
      expect(result).toBe('Breaking Bad Show Pilot - S01E01 - Pilot Part 1.mkv');
    });

    it('pads season and episode numbers to two digits', () => {
      const result = organizer.buildFilename(
        { title: 'The Wire' },
        { seasonNumber: 4, episodeNumber: 9, title: 'Know Your Place' },
        '.mkv',
      );

      expect(result).toBe('The Wire - S04E09 - Know Your Place.mkv');
    });
  });

  // -------------------------------------------------------------------------
  // colocateMovieMetadata
  // -------------------------------------------------------------------------

  describe('colocateMovieMetadata', () => {
    it('writes metadata file to the movie directory', async () => {
      const result = await organizer.colocateMovieMetadata(
        MOVIE,
        'movie.nfo',
        '<movie><title>The Matrix</title></movie>',
      );

      expect(fsMocks.mkdir).toHaveBeenCalledWith(
        '/media/movies/The Matrix (1999)',
        { recursive: true },
      );
      expect(fsMocks.writeFile).toHaveBeenCalledWith(
        '/media/movies/The Matrix (1999)/movie.nfo',
        '<movie><title>The Matrix</title></movie>',
        'utf8',
      );
      expect(result).toBe('/media/movies/The Matrix (1999)/movie.nfo');
    });
  });
});
