import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Organizer } from '../server/src/services/Organizer';
import fs from 'node:fs/promises';
import path from 'node:path';

vi.mock('node:fs/promises');

describe('Organizer', () => {
  let organizer;

  beforeEach(() => {
    organizer = new Organizer();
    vi.clearAllMocks();
  });

  it('should generate a standard filename', () => {
    const series = { title: 'The Boys' };
    const episode = { seasonNumber: 1, episodeNumber: 1, title: 'Pilot' };
    
    const filename = organizer.buildFilename(series, episode, '.mkv');
    expect(filename).toBe('The Boys - S01E01 - Pilot.mkv');
  });

  it('should move and rename a file', async () => {
    const series = { title: 'The Boys', path: '/media/TV/The Boys' };
    const episode = { seasonNumber: 1, episodeNumber: 1, title: 'Pilot' };
    const sourcePath = '/downloads/complete/The.Boys.S01E01.mkv';

    // Mock mkdir and rename
    fs.mkdir.mockResolvedValue(undefined);
    fs.rename.mockResolvedValue(undefined);

    const destinationPath = await organizer.organizeFile(sourcePath, series, episode);

    const expectedDir = path.join('/media/TV/The Boys', 'Season 01');
    const expectedFile = 'The Boys - S01E01 - Pilot.mkv';
    const expectedPath = path.join(expectedDir, expectedFile);

    expect(fs.mkdir).toHaveBeenCalledWith(expectedDir, { recursive: true });
    expect(fs.rename).toHaveBeenCalledWith(sourcePath, expectedPath);
    expect(destinationPath).toBe(expectedPath);
  });
});
