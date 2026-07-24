import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Organizer } from './Organizer';

describe('Organizer filesystem import strategies', () => {
  let testRoot: string;
  let sourcePath: string;
  let mediaRoot: string;

  beforeEach(async () => {
    testRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mediarr-organizer-'));
    const downloadsRoot = path.join(testRoot, 'downloads');
    mediaRoot = path.join(testRoot, 'media');
    sourcePath = path.join(downloadsRoot, 'Show.S01E01.mkv');
    await fs.mkdir(downloadsRoot, { recursive: true });
    await fs.writeFile(sourcePath, 'video-content');
  });

  afterEach(async () => {
    await fs.rm(testRoot, { recursive: true, force: true });
  });

  it('hard-links on the same volume and leaves the seeding source intact', async () => {
    const organizer = new Organizer();
    const destinationPath = await organizer.organizeFile(
      sourcePath,
      { title: 'Show', path: mediaRoot },
      { seasonNumber: 1, episodeNumber: 1, title: 'Pilot' },
      { strategy: 'hardlink' },
    );

    const [sourceStats, destinationStats] = await Promise.all([
      fs.stat(sourcePath),
      fs.stat(destinationPath),
    ]);
    expect(destinationStats.ino).toBe(sourceStats.ino);
    expect(sourceStats.nlink).toBeGreaterThanOrEqual(2);
    await expect(fs.readFile(sourcePath, 'utf8')).resolves.toBe('video-content');
  });

  it('copy strategy creates a distinct file and leaves the seeding source intact', async () => {
    const organizer = new Organizer();
    const destinationPath = await organizer.organizeFile(
      sourcePath,
      { title: 'Show', path: mediaRoot },
      { seasonNumber: 1, episodeNumber: 1, title: 'Pilot' },
      { strategy: 'copy' },
    );

    const [sourceStats, destinationStats] = await Promise.all([
      fs.stat(sourcePath),
      fs.stat(destinationPath),
    ]);
    expect(destinationStats.ino).not.toBe(sourceStats.ino);
    await expect(fs.readFile(sourcePath, 'utf8')).resolves.toBe('video-content');
    await expect(fs.readFile(destinationPath, 'utf8')).resolves.toBe('video-content');
  });
});
