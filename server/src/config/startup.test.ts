import { describe, expect, it, vi } from 'vitest';
import {
  assertValidEncryptionKey,
  preparePersistentStorage,
} from './startup';

describe('startup configuration', () => {
  it.each([
    undefined,
    '',
    'change-me-to-a-random-string',
    'generate-a-random-string-here',
    'paste-the-output-of-openssl-rand-hex-32-here',
  ])('rejects missing or placeholder encryption keys: %s', key => {
    expect(() => assertValidEncryptionKey(key)).toThrow(/ENCRYPTION_KEY/i);
  });

  it('accepts a non-placeholder encryption key', () => {
    expect(assertValidEncryptionKey('a-long-unique-household-secret')).toBe(
      'a-long-unique-household-secret',
    );
  });

  it('fails closed when the configured storage cannot be made writable', async () => {
    const filesystem = {
      mkdir: vi.fn().mockRejectedValue(new Error('permission denied')),
      writeFile: vi.fn(),
      unlink: vi.fn(),
    };

    await expect(preparePersistentStorage({
      databaseUrl: 'file:/config/mediarr.db',
      configDir: '/config',
    }, filesystem)).rejects.toThrow(/persistent configuration storage/i);

    expect(filesystem.writeFile).not.toHaveBeenCalled();
  });

  it('rejects an ephemeral or out-of-config database URL rather than falling back', async () => {
    const filesystem = {
      mkdir: vi.fn(),
      writeFile: vi.fn(),
      unlink: vi.fn(),
    };

    await expect(preparePersistentStorage({
      databaseUrl: ':memory:',
      configDir: '/config',
    }, filesystem)).rejects.toThrow(/file:.*persistent database/i);

    await expect(preparePersistentStorage({
      databaseUrl: 'file:/tmp/mediarr.db',
      configDir: '/config',
    }, filesystem)).rejects.toThrow(/inside CONFIG_DIR/i);
  });

  it('uses the configured database path after proving the config directory is writable', async () => {
    const filesystem = {
      mkdir: vi.fn(),
      writeFile: vi.fn(),
      unlink: vi.fn(),
    };

    await expect(preparePersistentStorage({
      databaseUrl: 'file:/config/mediarr.db',
      configDir: '/config',
    }, filesystem)).resolves.toBe('file:/config/mediarr.db');

    expect(filesystem.writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/^\/config\/\.mediarr-write-test-/),
      '',
      { flag: 'wx' },
    );
    expect(filesystem.unlink).toHaveBeenCalledWith(expect.any(String));
  });
});
