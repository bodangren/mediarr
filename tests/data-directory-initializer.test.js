import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs/promises';
import { DataDirectoryInitializer } from '../server/src/services/DataDirectoryInitializer';

vi.mock('node:fs/promises');

describe('DataDirectoryInitializer', () => {
  let initializer;

  beforeEach(() => {
    initializer = new DataDirectoryInitializer();
    vi.clearAllMocks();
  });

  it('should create all required subdirectories under /data', async () => {
    fs.mkdir.mockResolvedValue(undefined);

    await initializer.initialize();

    const expectedDirs = [
      '/data/downloads/incomplete',
      '/data/downloads/complete',
      '/data/media/tv',
      '/data/media/movies',
    ];

    expect(fs.mkdir).toHaveBeenCalledTimes(expectedDirs.length);
    for (const dir of expectedDirs) {
      expect(fs.mkdir).toHaveBeenCalledWith(dir, { recursive: true });
    }
  });

  it('should not throw if directories already exist', async () => {
    fs.mkdir.mockResolvedValue(undefined);

    await expect(initializer.initialize()).resolves.not.toThrow();
  });
});
