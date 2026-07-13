import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs/promises';
import {
  DataDirectoryInitializer,
  resolveRequiredDataDirectories,
} from '../server/src/services/DataDirectoryInitializer';

vi.mock('node:fs/promises');

describe('DataDirectoryInitializer', () => {
  let initializer;
  const configuredDirs = [
    '/downloads/incomplete',
    '/downloads/complete',
  ];

  beforeEach(() => {
    initializer = new DataDirectoryInitializer(configuredDirs);
    vi.clearAllMocks();
  });

  it('should create configured directories', async () => {
    fs.mkdir.mockResolvedValue(undefined);
    fs.writeFile.mockResolvedValue(undefined);
    fs.unlink.mockResolvedValue(undefined);

    await initializer.initialize();

    expect(fs.mkdir).toHaveBeenCalledTimes(configuredDirs.length);
    for (const dir of configuredDirs) {
      expect(fs.mkdir).toHaveBeenCalledWith(dir, { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^${dir}/\\.mediarr-write-test-`)),
        '',
        { flag: 'wx' },
      );
    }
  });

  it('should not throw if directories already exist', async () => {
    fs.mkdir.mockResolvedValue(undefined);

    await expect(initializer.initialize()).resolves.not.toThrow();
  });

  it('skips empty path entries', async () => {
    const withEmptyEntries = new DataDirectoryInitializer(['', '  ', '/ok/path']);
    fs.mkdir.mockResolvedValue(undefined);

    await withEmptyEntries.initialize();

    expect(fs.mkdir).toHaveBeenCalledTimes(1);
    expect(fs.mkdir).toHaveBeenCalledWith('/ok/path', { recursive: true });
  });

  it('uses all four MEDIA_DIR defaults when persisted settings are blank', () => {
    expect(resolveRequiredDataDirectories({
      mediaDir: '/mounted-data',
      incompleteDirectory: '',
      completeDirectory: '  ',
      movieRootFolder: '',
      tvRootFolder: '',
    })).toEqual([
      '/mounted-data/downloads/incomplete',
      '/mounted-data/downloads/complete',
      '/mounted-data/media/movies',
      '/mounted-data/media/tv',
    ]);
  });

  it('fresh/default configuration rejects an unwritable MEDIA_DIR', async () => {
    const filesystem = {
      mkdir: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockRejectedValue(new Error('permission denied')),
      unlink: vi.fn(),
    };
    const directories = resolveRequiredDataDirectories({
      mediaDir: '/data',
      incompleteDirectory: '',
      completeDirectory: '',
      movieRootFolder: '',
      tvRootFolder: '',
    });

    await expect(
      new DataDirectoryInitializer(directories, filesystem).initialize(),
    ).rejects.toThrow('/data/downloads/incomplete');
  });

  it('preserves configured custom roots instead of replacing them with defaults', () => {
    expect(resolveRequiredDataDirectories({
      mediaDir: '/data',
      incompleteDirectory: '/custom/incomplete',
      completeDirectory: '/custom/complete',
      movieRootFolder: '/custom/movies',
      tvRootFolder: '/custom/tv',
    })).toEqual([
      '/custom/incomplete',
      '/custom/complete',
      '/custom/movies',
      '/custom/tv',
    ]);
  });

  it.each([
    '/data/downloads/incomplete',
    '/data/downloads/complete',
    '/data/media/movies',
    '/data/media/tv',
  ])('fails closed when configured data path %s is inaccessible', async inaccessiblePath => {
    const initializer = new DataDirectoryInitializer([
      '/data/downloads/incomplete',
      '/data/downloads/complete',
      '/data/media/movies',
      '/data/media/tv',
    ]);
    fs.mkdir.mockResolvedValue(undefined);
    fs.writeFile.mockImplementation(async probePath => {
      if (probePath.startsWith(`${inaccessiblePath}/`)) {
        throw new Error('permission denied');
      }
    });

    await expect(initializer.initialize()).rejects.toThrow(inaccessiblePath);
  });
});
