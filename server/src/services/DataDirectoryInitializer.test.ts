import { beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import {
  DataDirectoryInitializer,
  resolveRequiredDataDirectories,
} from './DataDirectoryInitializer';

// Sibling coverage for DataDirectoryInitializer
// (chore_remaining_server_service_coverage_20260728).
//
// SCOPE HONESTY: this service was ALREADY at 90% branch before this file, via
// tests/data-directory-initializer.test.js written by the deployment-hardening
// track. It did not meaningfully lack coverage — only a sibling file and the
// fresh-install mediaDir default (line 22). This suite must not be counted as
// "closed a coverage gap"; it adds locality and the missing default-path case.
//
// The class already accepts an injected filesystem, so no node:fs mocking is
// needed — the seam is part of its production design.

const makeFilesystem = () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
});

const BLANK = {
  mediaDir: '',
  incompleteDirectory: '',
  completeDirectory: '',
  movieRootFolder: '',
  tvRootFolder: '',
};

describe('resolveRequiredDataDirectories', () => {
  // Line 22: a blank mediaDir on a fresh install falls back to /data.
  it('fills every path from the /data default when settings are blank', () => {
    expect(resolveRequiredDataDirectories(BLANK)).toEqual([
      path.join('/data', 'downloads/incomplete'),
      path.join('/data', 'downloads/complete'),
      path.join('/data', 'media/movies'),
      path.join('/data', 'media/tv'),
    ]);
  });

  it('honours a custom mediaDir when the sub-paths are blank', () => {
    expect(resolveRequiredDataDirectories({ ...BLANK, mediaDir: '/srv/media' })).toEqual([
      path.join('/srv/media', 'downloads/incomplete'),
      path.join('/srv/media', 'downloads/complete'),
      path.join('/srv/media', 'media/movies'),
      path.join('/srv/media', 'media/tv'),
    ]);
  });

  it('preserves explicitly configured roots instead of deriving them', () => {
    const resolved = resolveRequiredDataDirectories({
      mediaDir: '/srv/media',
      incompleteDirectory: '/fast/incomplete',
      completeDirectory: '/fast/complete',
      movieRootFolder: '/archive/movies',
      tvRootFolder: '/archive/tv',
    });

    expect(resolved).toEqual([
      '/fast/incomplete',
      '/fast/complete',
      '/archive/movies',
      '/archive/tv',
    ]);
  });

  it('mixes configured and derived roots independently', () => {
    const resolved = resolveRequiredDataDirectories({
      ...BLANK,
      mediaDir: '/srv',
      movieRootFolder: '/archive/movies',
    });

    expect(resolved).toEqual([
      path.join('/srv', 'downloads/incomplete'),
      path.join('/srv', 'downloads/complete'),
      '/archive/movies',
      path.join('/srv', 'media/tv'),
    ]);
  });

  it('treats whitespace-only settings as blank', () => {
    const resolved = resolveRequiredDataDirectories({
      mediaDir: '   ',
      incompleteDirectory: '  ',
      completeDirectory: '\t',
      movieRootFolder: ' ',
      tvRootFolder: '',
    });

    expect(resolved[0]).toBe(path.join('/data', 'downloads/incomplete'));
    expect(resolved).toHaveLength(4);
  });
});

describe('DataDirectoryInitializer', () => {
  let filesystem: ReturnType<typeof makeFilesystem>;

  beforeEach(() => {
    filesystem = makeFilesystem();
  });

  it('creates each directory and probes it for writability', async () => {
    await new DataDirectoryInitializer(['/data/movies'], filesystem).initialize();

    expect(filesystem.mkdir).toHaveBeenCalledWith('/data/movies', { recursive: true });
    expect(filesystem.writeFile).toHaveBeenCalledWith(
      expect.stringContaining(path.join('/data/movies', '.mediarr-write-test-')),
      '',
      { flag: 'wx' },
    );
    expect(filesystem.unlink).toHaveBeenCalledTimes(1);
  });

  it('removes its probe file rather than leaving litter behind', async () => {
    await new DataDirectoryInitializer(['/data/movies'], filesystem).initialize();

    const written = filesystem.writeFile.mock.calls[0]?.[0];
    expect(filesystem.unlink).toHaveBeenCalledWith(written);
  });

  it('processes every configured directory', async () => {
    await new DataDirectoryInitializer(['/a', '/b', '/c'], filesystem).initialize();

    expect(filesystem.mkdir).toHaveBeenCalledTimes(3);
    expect(filesystem.mkdir.mock.calls.map(c => c[0])).toEqual(['/a', '/b', '/c']);
  });

  it.each([
    ['an empty list', [] as string[]],
    ['an omitted list', undefined],
  ])('does nothing for %s', async (_label, directories) => {
    const initializer =
      directories === undefined
        ? new DataDirectoryInitializer(undefined, filesystem)
        : new DataDirectoryInitializer(directories, filesystem);

    await expect(initializer.initialize()).resolves.toBeUndefined();
    expect(filesystem.mkdir).not.toHaveBeenCalled();
  });

  it.each([
    ['an empty string', ''],
    ['whitespace only', '   '],
  ])('skips %s without probing', async (_label, directory) => {
    await new DataDirectoryInitializer([directory], filesystem).initialize();

    expect(filesystem.mkdir).not.toHaveBeenCalled();
  });

  it('trims surrounding whitespace from a configured directory', async () => {
    await new DataDirectoryInitializer(['  /data/tv  '], filesystem).initialize();

    expect(filesystem.mkdir).toHaveBeenCalledWith('/data/tv', { recursive: true });
  });

  // Fail-closed contract from the deployment-hardening track: startup must abort
  // before health readiness rather than run with an unwritable mount.
  it.each([
    ['mkdir', 'mkdir'],
    ['writeFile', 'writeFile'],
    ['unlink', 'unlink'],
  ] as const)('refuses to start when %s fails', async (_label, method) => {
    filesystem[method].mockRejectedValue(new Error('EACCES'));

    await expect(
      new DataDirectoryInitializer(['/data/movies'], filesystem).initialize(),
    ).rejects.toThrow(/'\/data\/movies' is not writable; refusing to start/);
  });

  it('attaches the underlying failure as the error cause', async () => {
    const underlying = new Error('EROFS: read-only file system');
    filesystem.mkdir.mockRejectedValue(underlying);

    await expect(
      new DataDirectoryInitializer(['/data/movies'], filesystem).initialize(),
    ).rejects.toMatchObject({ cause: underlying });
  });

  it('stops at the first unwritable directory', async () => {
    filesystem.mkdir
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('EACCES'));

    await expect(
      new DataDirectoryInitializer(['/ok', '/bad', '/never'], filesystem).initialize(),
    ).rejects.toThrow(/'\/bad'/);

    expect(filesystem.mkdir).toHaveBeenCalledTimes(2);
  });

  it('gives each probe a unique name so concurrent starts cannot collide', async () => {
    await new DataDirectoryInitializer(['/a', '/b'], filesystem).initialize();

    const [first, second] = filesystem.writeFile.mock.calls.map(c => c[0]);
    expect(first).not.toBe(second);
    expect(first).toContain(String(process.pid));
  });
});
