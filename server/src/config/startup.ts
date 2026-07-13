import fs from 'node:fs/promises';
import path from 'node:path';

const PLACEHOLDER_ENCRYPTION_KEYS = new Set([
  'change-me-to-a-random-string',
  'generate-a-random-string-here',
  'replace-me',
  'your-encryption-key',
]);

interface StartupFileSystem {
  mkdir(directory: string, options: { recursive: true }): Promise<unknown>;
  writeFile(file: string, data: string, options: { flag: 'wx' }): Promise<void>;
  unlink(file: string): Promise<void>;
}

export interface PersistentStorageOptions {
  databaseUrl: string;
  configDir?: string | undefined;
}

/** Reject a missing or example encryption key before any database work begins. */
export function assertValidEncryptionKey(value: string | undefined): string {
  const key = value?.trim();
  const normalizedKey = (key ?? '').toLowerCase();
  if (
    !key
    || PLACEHOLDER_ENCRYPTION_KEYS.has(normalizedKey)
    || /^(?:change|generate|paste|replace|your)[-_ ]/.test(normalizedKey)
  ) {
    throw new Error(
      'ENCRYPTION_KEY must be set to a unique, non-placeholder secret before Mediarr can start.',
    );
  }

  return key;
}

/**
 * Prove that the SQLite database is located under writable persistent config
 * storage. This deliberately has no temporary-DB fallback: a failed probe
 * prevents migrations and the API from starting.
 */
export async function preparePersistentStorage(
  options: PersistentStorageOptions,
  filesystem: StartupFileSystem = fs,
): Promise<string> {
  if (!options.databaseUrl.startsWith('file:')) {
    throw new Error('DATABASE_URL must use a file: URL for persistent database storage.');
  }

  const configuredPath = options.databaseUrl.slice('file:'.length);
  if (!configuredPath || configuredPath === ':memory:' || configuredPath.includes('?')) {
    throw new Error('DATABASE_URL must name a persistent database using a file: URL.');
  }

  const databasePath = path.resolve(configuredPath);
  const configDirectory = path.resolve(options.configDir ?? path.dirname(databasePath));
  const databaseRelativePath = path.relative(configDirectory, databasePath);
  if (
    databaseRelativePath === ''
    || databaseRelativePath === '..'
    || databaseRelativePath.startsWith(`..${path.sep}`)
    || path.isAbsolute(databaseRelativePath)
  ) {
    throw new Error('DATABASE_URL must point inside CONFIG_DIR persistent storage.');
  }

  const probePath = path.join(
    configDirectory,
    `.mediarr-write-test-${process.pid}-${Date.now()}`,
  );
  try {
    await filesystem.mkdir(configDirectory, { recursive: true });
    await filesystem.writeFile(probePath, '', { flag: 'wx' });
    await filesystem.unlink(probePath);
  } catch (error) {
    throw new Error(
      `Persistent configuration storage '${configDirectory}' is not writable; refusing to start without durable SQLite storage.`,
      { cause: error },
    );
  }

  return options.databaseUrl;
}
