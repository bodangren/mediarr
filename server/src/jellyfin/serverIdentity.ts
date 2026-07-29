import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';

export const JELLYFIN_SERVER_ID_FILENAME = 'jellyfin-server-id';

interface JellyfinIdentityFileSystem {
  mkdir(directory: string, options: { recursive: true }): Promise<unknown>;
  readFile(file: string, encoding: BufferEncoding): Promise<string>;
  writeFile(file: string, data: string, options: { encoding: BufferEncoding; flag: 'wx' }): Promise<void>;
  link(existingPath: string, newPath: string): Promise<void>;
  unlink(file: string): Promise<void>;
}

export interface JellyfinServerIdentityOptions {
  configDir: string;
  filesystem?: JellyfinIdentityFileSystem | undefined;
  generateId?: () => string;
  generateTempSuffix?: () => string;
}

function isMissingFile(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'ENOENT';
}

function isExistingFile(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'EEXIST';
}

/** Validates the durable, protocol-visible Jellyfin server ID format. */
export function parseJellyfinServerId(value: string): string {
  const match = /^([a-f0-9]{32})\n?$/i.exec(value);
  if (!match?.[1]) {
    throw new Error('Jellyfin server identity is corrupt; expected exactly 32 hexadecimal characters.');
  }

  return match[1].toLowerCase();
}

function createServerId(): string {
  return randomBytes(16).toString('hex');
}

function createTempSuffix(): string {
  return `${process.pid}-${randomUUID()}`;
}

async function readPersistedId(
  identityPath: string,
  filesystem: JellyfinIdentityFileSystem,
): Promise<string | null> {
  try {
    return parseJellyfinServerId(await filesystem.readFile(identityPath, 'utf8'));
  } catch (error) {
    if (isMissingFile(error)) {
      return null;
    }
    throw error;
  }
}

/**
 * Loads Mediarr's persistent Jellyfin server ID, creating it once inside
 * CONFIG_DIR. Creation is atomic: the completed temporary file is hard-linked
 * into place, so a concurrent creator wins without replacing an existing ID.
 */
export async function loadOrCreateJellyfinServerId(
  options: JellyfinServerIdentityOptions,
): Promise<string> {
  const configDir = options.configDir.trim();
  if (!configDir) {
    throw new Error('CONFIG_DIR is required to persist the Jellyfin server identity.');
  }

  const filesystem = options.filesystem ?? fs;
  const resolvedConfigDir = path.resolve(configDir);
  const identityPath = path.join(resolvedConfigDir, JELLYFIN_SERVER_ID_FILENAME);
  const existing = await readPersistedId(identityPath, filesystem);
  if (existing) {
    return existing;
  }

  await filesystem.mkdir(resolvedConfigDir, { recursive: true });

  // A directory may be created after the initial read; never replace a valid
  // identity written by another process while ours was being prepared.
  const afterMkdir = await readPersistedId(identityPath, filesystem);
  if (afterMkdir) {
    return afterMkdir;
  }

  const id = parseJellyfinServerId(options.generateId?.() ?? createServerId());
  const tempPath = path.join(
    resolvedConfigDir,
    `.${JELLYFIN_SERVER_ID_FILENAME}.${options.generateTempSuffix?.() ?? createTempSuffix()}.tmp`,
  );

  await filesystem.writeFile(tempPath, `${id}\n`, { encoding: 'utf8', flag: 'wx' });
  try {
    await filesystem.link(tempPath, identityPath);
    await filesystem.unlink(tempPath);
    return id;
  } catch (error) {
    await filesystem.unlink(tempPath).catch(() => undefined);
    if (!isExistingFile(error)) {
      throw error;
    }

    const winner = await readPersistedId(identityPath, filesystem);
    if (!winner) {
      throw new Error('Jellyfin server identity creation raced but no identity was persisted.');
    }
    return winner;
  }
}
