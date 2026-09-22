import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { deriveHasFile, pathLooksPlayable } from './hasFileHelpers';

describe('deriveHasFile', () => {
  it('returns true when any fileVariant exists even without a path', async () => {
    expect(await deriveHasFile({ fileVariants: [{ id: 1 }] })).toBe(true);
    expect(await deriveHasFile({ fileVariants: { length: 3 }, path: null })).toBe(true);
  });

  it('returns false when there are no variants and no path', async () => {
    expect(await deriveHasFile({})).toBe(false);
    expect(await deriveHasFile({ fileVariants: [], path: null })).toBe(false);
    expect(await deriveHasFile({ path: '' })).toBe(false);
    expect(await deriveHasFile({ path: '   ' })).toBe(false);
  });

  it('returns false when path is set but no variants and the path is not on disk', async () => {
    expect(await deriveHasFile({ path: '/definitely/does/not/exist/movie.mkv' })).toBe(false);
  });
});

describe('pathLooksPlayable', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hasfile-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('returns true for an existing video file', async () => {
    const filePath = path.join(tempDir, 'movie.mkv');
    await fs.writeFile(filePath, '');

    expect(await pathLooksPlayable(filePath)).toBe(true);
  });

  it('returns true for a folder containing a video file', async () => {
    const folder = path.join(tempDir, 'Alien (2024)');
    await fs.mkdir(folder);
    await fs.writeFile(path.join(folder, 'Alien.mkv'), '');

    expect(await pathLooksPlayable(folder)).toBe(true);
  });

  it('returns false for a folder with no video files', async () => {
    const folder = path.join(tempDir, 'EmptyMovie');
    await fs.mkdir(folder);
    await fs.writeFile(path.join(folder, 'poster.jpg'), '');

    expect(await pathLooksPlayable(folder)).toBe(false);
  });

  it('returns false for a missing path', async () => {
    const missing = path.join(tempDir, 'missing.mkv');

    expect(await pathLooksPlayable(missing)).toBe(false);
  });
});