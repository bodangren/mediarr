import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { LibraryScanner } from './LibraryScanner';

// Sibling coverage for LibraryScanner (chore_remaining_server_service_coverage_20260728).
//
// Baseline 71.42% branch — the inaccessible-path branches (22-23, 64-65) were
// unreached. Real temp directories are used rather than a global node:fs mock,
// per this track's spec; only the release parser is mocked, because the real one
// makes network calls to an LLM provider.

const { parseMock } = vi.hoisted(() => ({ parseMock: vi.fn() }));

vi.mock('./ReleaseParser', () => ({
  releaseParser: { parse: parseMock },
}));

const makeDb = () => {
  const episodeFindFirst = vi.fn().mockResolvedValue(null);
  const episodeUpdate = vi.fn().mockResolvedValue(undefined);
  const movieUpdate = vi.fn().mockResolvedValue(undefined);
  return {
    db: {
      episode: { findFirst: episodeFindFirst, update: episodeUpdate },
      movie: { update: movieUpdate },
    },
    episodeFindFirst,
    episodeUpdate,
    movieUpdate,
  };
};

let tempRoot: string;

beforeEach(async () => {
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mediarr-libscan-'));
  parseMock.mockReset();
  parseMock.mockResolvedValue({ seasonNumber: 1, episodeNumbers: [1] });
});

afterEach(async () => {
  await fs.rm(tempRoot, { recursive: true, force: true });
  vi.restoreAllMocks();
});

const touch = async (relativePath: string) => {
  const full = path.join(tempRoot, relativePath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, '');
  return full;
};

describe('LibraryScanner', () => {
  describe('scanSeries', () => {
    it('returns immediately when the series has no path', async () => {
      const { db, episodeFindFirst } = makeDb();

      await new LibraryScanner(db).scanSeries({ id: 1, path: '', title: 'Show' });

      expect(episodeFindFirst).not.toHaveBeenCalled();
      expect(parseMock).not.toHaveBeenCalled();
    });

    it('warns and returns when the series path is not accessible', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { db, episodeFindFirst } = makeDb();
      const missing = path.join(tempRoot, 'does-not-exist');

      await new LibraryScanner(db).scanSeries({ id: 1, path: missing, title: 'Show' });

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('not accessible'));
      expect(episodeFindFirst).not.toHaveBeenCalled();
    });

    it('links a parsed video file to its matching episode', async () => {
      const filePath = await touch('Season 01/Show.S01E01.mkv');
      const { db, episodeFindFirst, episodeUpdate } = makeDb();
      episodeFindFirst.mockResolvedValue({ id: 42 });

      await new LibraryScanner(db).scanSeries({ id: 7, path: tempRoot, title: 'Show' });

      expect(episodeFindFirst).toHaveBeenCalledWith({
        where: { seriesId: 7, seasonNumber: 1, episodeNumber: 1 },
      });
      expect(episodeUpdate).toHaveBeenCalledWith({
        where: { id: 42 },
        data: { path: filePath },
      });
    });

    it('does not update when no episode row matches', async () => {
      await touch('Show.S01E01.mkv');
      const { db, episodeUpdate } = makeDb();

      await new LibraryScanner(db).scanSeries({ id: 7, path: tempRoot, title: 'Show' });

      expect(episodeUpdate).not.toHaveBeenCalled();
    });

    it.each([
      ['a null parse result', null],
      ['a missing season number', { seasonNumber: undefined, episodeNumbers: [1] }],
      ['an empty episode list', { seasonNumber: 1, episodeNumbers: [] }],
    ])('skips the file on %s', async (_label, parsed) => {
      await touch('Show.S01E01.mkv');
      parseMock.mockResolvedValue(parsed);
      const { db, episodeFindFirst } = makeDb();

      await new LibraryScanner(db).scanSeries({ id: 7, path: tempRoot, title: 'Show' });

      expect(episodeFindFirst).not.toHaveBeenCalled();
    });

    it.each(['.mkv', '.mp4', '.avi', '.ts', '.m4v'])(
      'treats %s as a video extension',
      async extension => {
        await touch(`Show.S01E01${extension}`);
        const { db } = makeDb();

        await new LibraryScanner(db).scanSeries({ id: 7, path: tempRoot, title: 'Show' });

        expect(parseMock).toHaveBeenCalledTimes(1);
      },
    );

    it('ignores non-video files and is case-insensitive about extensions', async () => {
      await touch('poster.jpg');
      await touch('notes.txt');
      await touch('Show.S01E01.MKV');
      const { db } = makeDb();

      await new LibraryScanner(db).scanSeries({ id: 7, path: tempRoot, title: 'Show' });

      expect(parseMock).toHaveBeenCalledTimes(1);
      expect(parseMock).toHaveBeenCalledWith('Show.S01E01.MKV');
    });

    it('walks nested directories', async () => {
      await touch('Season 01/a/b/Deep.S01E01.mkv');
      const { db } = makeDb();

      await new LibraryScanner(db).scanSeries({ id: 7, path: tempRoot, title: 'Show' });

      expect(parseMock).toHaveBeenCalledWith('Deep.S01E01.mkv');
    });
  });

  describe('scanMovie', () => {
    const MOVIE = { id: 3, title: 'The Matrix', year: 1999 };

    it('returns immediately when the movie has no path', async () => {
      const { db, movieUpdate } = makeDb();

      await new LibraryScanner(db).scanMovie({ ...MOVIE, path: '' });

      expect(movieUpdate).not.toHaveBeenCalled();
    });

    it('warns and returns when the movie path is not accessible', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { db, movieUpdate } = makeDb();

      await new LibraryScanner(db).scanMovie({
        ...MOVIE,
        path: path.join(tempRoot, 'nope'),
      });

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('not accessible'));
      expect(movieUpdate).not.toHaveBeenCalled();
    });

    it('attaches a file whose name contains both title and year', async () => {
      const filePath = await touch('The.Matrix.1999.1080p.mkv');
      const { db, movieUpdate } = makeDb();

      await new LibraryScanner(db).scanMovie({ ...MOVIE, path: tempRoot });

      expect(movieUpdate).toHaveBeenCalledWith({
        where: { id: 3 },
        data: { path: filePath },
      });
    });

    it('requires the year as well as the title', async () => {
      await touch('The.Matrix.1080p.mkv');
      const { db, movieUpdate } = makeDb();

      await new LibraryScanner(db).scanMovie({ ...MOVIE, path: tempRoot });

      expect(movieUpdate).not.toHaveBeenCalled();
    });

    it('requires the title as well as the year', async () => {
      await touch('Some.Other.Film.1999.mkv');
      const { db, movieUpdate } = makeDb();

      await new LibraryScanner(db).scanMovie({ ...MOVIE, path: tempRoot });

      expect(movieUpdate).not.toHaveBeenCalled();
    });

    it('stops at the first match rather than updating repeatedly', async () => {
      await touch('a/The.Matrix.1999.720p.mkv');
      await touch('b/The.Matrix.1999.1080p.mkv');
      const { db, movieUpdate } = makeDb();

      await new LibraryScanner(db).scanMovie({ ...MOVIE, path: tempRoot });

      expect(movieUpdate).toHaveBeenCalledTimes(1);
    });

    it('ignores non-video files that would otherwise match', async () => {
      await touch('The.Matrix.1999.nfo');
      const { db, movieUpdate } = makeDb();

      await new LibraryScanner(db).scanMovie({ ...MOVIE, path: tempRoot });

      expect(movieUpdate).not.toHaveBeenCalled();
    });

    it('matches despite punctuation differences in the title', async () => {
      await touch('WallE.2008.mkv');
      const { db, movieUpdate } = makeDb();

      await new LibraryScanner(db).scanMovie({
        id: 4,
        title: 'WALL·E',
        year: 2008,
        path: tempRoot,
      });

      expect(movieUpdate).toHaveBeenCalledTimes(1);
    });
  });

  // CHARACTERISATION TESTS for the defect flagged in Phase 1 discovery.
  //
  // getAllFiles() recurses with no per-directory error handling, and the
  // fs.access() guard covers only the scan root. A single unreadable
  // subdirectory therefore aborts the entire scan and the error escapes to the
  // caller — so one bad permission bit anywhere in a library silently prevents
  // every later file from being linked.
  //
  // Pinned rather than fixed: the fix is a production change and this track is
  // scoped to tests unless a defect is found. It IS a defect, and it is live
  // (LibraryScanner is wired), so it is recorded in tech-debt.md for routing.
  describe('known defect: an unreadable subdirectory aborts the whole scan', () => {
    const canTestPermissions = process.getuid ? process.getuid() !== 0 : false;

    it.runIf(canTestPermissions)(
      'throws instead of skipping the unreadable directory',
      async () => {
        await touch('good/Show.S01E01.mkv');
        const locked = path.join(tempRoot, 'locked');
        await fs.mkdir(locked, { recursive: true });
        await fs.chmod(locked, 0o000);

        const { db } = makeDb();

        try {
          await expect(
            new LibraryScanner(db).scanSeries({ id: 7, path: tempRoot, title: 'Show' }),
          ).rejects.toThrow(/EACCES|EPERM/);
        } finally {
          await fs.chmod(locked, 0o755);
        }
      },
    );

    it.runIf(canTestPermissions)(
      'loses files it had not yet reached when the error is thrown',
      async () => {
        // 'a-good' sorts before 'b-locked'; readdir order decides how much work
        // is lost, which is exactly why aborting instead of skipping is wrong.
        await touch('a-good/Show.S01E01.mkv');
        const locked = path.join(tempRoot, 'b-locked');
        await fs.mkdir(locked, { recursive: true });
        await fs.chmod(locked, 0o000);
        await touch('c-good/Show.S01E02.mkv');

        const { db, episodeUpdate } = makeDb();

        try {
          await new LibraryScanner(db)
            .scanSeries({ id: 7, path: tempRoot, title: 'Show' })
            .catch(() => undefined);

          // The walk collects every path before parsing any of them, so an
          // abort mid-walk means NOTHING is linked, not even the readable files.
          expect(episodeUpdate).not.toHaveBeenCalled();
        } finally {
          await fs.chmod(locked, 0o755);
        }
      },
    );
  });
});
