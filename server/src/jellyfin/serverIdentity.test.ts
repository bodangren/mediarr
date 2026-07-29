import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  JELLYFIN_SERVER_ID_FILENAME,
  loadOrCreateJellyfinServerId,
  parseJellyfinServerId,
} from './serverIdentity';

const tempDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirectories.map(directory => fs.rm(directory, { recursive: true, force: true })));
  tempDirectories.length = 0;
});

function missingFile(): NodeJS.ErrnoException {
  const error = new Error('not found') as NodeJS.ErrnoException;
  error.code = 'ENOENT';
  return error;
}

function existingFile(): NodeJS.ErrnoException {
  const error = new Error('already exists') as NodeJS.ErrnoException;
  error.code = 'EEXIST';
  return error;
}

describe('Jellyfin server identity', () => {
  it('creates a 32-hex identity once and reads the same identity after restart', async () => {
    const configDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mediarr-jellyfin-id-'));
    tempDirectories.push(configDir);

    const first = await loadOrCreateJellyfinServerId({ configDir });
    const second = await loadOrCreateJellyfinServerId({ configDir });

    expect(first).toMatch(/^[a-f0-9]{32}$/);
    expect(second).toBe(first);
    await expect(fs.readFile(path.join(configDir, JELLYFIN_SERVER_ID_FILENAME), 'utf8'))
      .resolves.toBe(`${first}\n`);
  });

  it('creates the file through injected atomic filesystem primitives', async () => {
    const filesystem = {
      mkdir: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn().mockRejectedValue(missingFile()),
      writeFile: vi.fn().mockResolvedValue(undefined),
      link: vi.fn().mockResolvedValue(undefined),
      unlink: vi.fn().mockResolvedValue(undefined),
    };

    await expect(loadOrCreateJellyfinServerId({
      configDir: '/config',
      filesystem,
      generateId: () => 'a'.repeat(32),
      generateTempSuffix: () => 'test',
    })).resolves.toBe('a'.repeat(32));

    expect(filesystem.mkdir).toHaveBeenCalledWith('/config', { recursive: true });
    expect(filesystem.writeFile).toHaveBeenCalledWith(
      '/config/.jellyfin-server-id.test.tmp',
      `${'a'.repeat(32)}\n`,
      { encoding: 'utf8', flag: 'wx' },
    );
    expect(filesystem.link).toHaveBeenCalledWith(
      '/config/.jellyfin-server-id.test.tmp',
      '/config/jellyfin-server-id',
    );
    expect(filesystem.unlink).toHaveBeenCalledWith('/config/.jellyfin-server-id.test.tmp');
  });

  it('returns the concurrently created valid identity instead of replacing it', async () => {
    const winningId = 'b'.repeat(32);
    const filesystem = {
      mkdir: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn()
        .mockRejectedValueOnce(missingFile())
        .mockRejectedValueOnce(missingFile())
        .mockResolvedValueOnce(`${winningId}\n`),
      writeFile: vi.fn().mockResolvedValue(undefined),
      link: vi.fn().mockRejectedValue(existingFile()),
      unlink: vi.fn().mockResolvedValue(undefined),
    };

    await expect(loadOrCreateJellyfinServerId({
      configDir: '/config',
      filesystem,
      generateId: () => 'a'.repeat(32),
      generateTempSuffix: () => 'race',
    })).resolves.toBe(winningId);

    expect(filesystem.unlink).toHaveBeenCalledWith('/config/.jellyfin-server-id.race.tmp');
  });

  it('fails closed on a corrupt persisted identity', async () => {
    const filesystem = {
      mkdir: vi.fn(),
      readFile: vi.fn().mockResolvedValue('not-a-server-id\n'),
      writeFile: vi.fn(),
      link: vi.fn(),
      unlink: vi.fn(),
    };

    await expect(loadOrCreateJellyfinServerId({ configDir: '/config', filesystem }))
      .rejects.toThrow(/identity is corrupt/i);
    expect(filesystem.mkdir).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', ''],
    ['short', 'a'.repeat(31)],
    ['non-hex', `${'a'.repeat(31)}g`],
    ['multiple lines', `${'a'.repeat(32)}\n\n`],
  ])('rejects %s identity content', (_name, value) => {
    expect(() => parseJellyfinServerId(value)).toThrow(/identity is corrupt/i);
  });
});
