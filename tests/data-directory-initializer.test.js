import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs/promises';
import { DataDirectoryInitializer } from '../server/src/services/DataDirectoryInitializer';

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

    await initializer.initialize();

    expect(fs.mkdir).toHaveBeenCalledTimes(configuredDirs.length);
    for (const dir of configuredDirs) {
      expect(fs.mkdir).toHaveBeenCalledWith(dir, { recursive: true });
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
});
