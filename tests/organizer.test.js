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

  it('should hard link a file when source and destination are on the same filesystem', async () => {
    const series = { title: 'The Boys', path: '/data/media/tv/The Boys' };
    const episode = { seasonNumber: 1, episodeNumber: 1, title: 'Pilot' };
    const sourcePath = '/data/downloads/complete/The.Boys.S01E01.mkv';

    fs.mkdir.mockResolvedValue(undefined);
    fs.link.mockResolvedValue(undefined);

    const destinationPath = await organizer.organizeFile(sourcePath, series, episode);

    const expectedDir = path.join('/data/media/tv/The Boys', 'Season 01');
    const expectedFile = 'The Boys - S01E01 - Pilot.mkv';
    const expectedPath = path.join(expectedDir, expectedFile);

    expect(fs.mkdir).toHaveBeenCalledWith(expectedDir, { recursive: true });
    expect(fs.link).toHaveBeenCalledWith(sourcePath, expectedPath);
    expect(destinationPath).toBe(expectedPath);
  });

  it('should fall back to fs.rename when hard linking fails and log a warning', async () => {
    const series = { title: 'The Boys', path: '/data/media/tv/The Boys' };
    const episode = { seasonNumber: 1, episodeNumber: 1, title: 'Pilot' };
    const sourcePath = '/data/downloads/complete/The.Boys.S01E01.mkv';

    fs.mkdir.mockResolvedValue(undefined);
    // Simulate cross-device link error
    const crossDeviceError = new Error('EXDEV: cross-device link not permitted');
    crossDeviceError.code = 'EXDEV';
    fs.link.mockRejectedValue(crossDeviceError);
    fs.rename.mockResolvedValue(undefined);

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const destinationPath = await organizer.organizeFile(sourcePath, series, episode);

    const expectedDir = path.join('/data/media/tv/The Boys', 'Season 01');
    const expectedFile = 'The Boys - S01E01 - Pilot.mkv';
    const expectedPath = path.join(expectedDir, expectedFile);

    expect(fs.link).toHaveBeenCalledWith(sourcePath, expectedPath);
    expect(fs.rename).toHaveBeenCalledWith(sourcePath, expectedPath);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Hard link failed')
    );
    expect(destinationPath).toBe(expectedPath);

    consoleSpy.mockRestore();
  });
  it('should organize a movie into Movie Title (Year)/ structure', async () => {
    const movie = {
      title: 'Forrest Gump',
      year: 1994,
      path: '/data/media/movies',
    };
    const sourcePath = '/data/downloads/complete/Forrest.Gump.1994.1080p.mkv';

    fs.mkdir.mockResolvedValue(undefined);
    fs.link.mockResolvedValue(undefined);

    const destinationPath = await organizer.organizeMovieFile(sourcePath, movie);

    const expectedDir = path.join('/data/media/movies', 'Forrest Gump (1994)');
    const expectedPath = path.join(expectedDir, 'Forrest Gump (1994).mkv');

    expect(fs.mkdir).toHaveBeenCalledWith(expectedDir, { recursive: true });
    expect(fs.link).toHaveBeenCalledWith(sourcePath, expectedPath);
    expect(destinationPath).toBe(expectedPath);
  });

  it('should colocate metadata files in the movie folder', async () => {
    const movie = {
      title: 'Forrest Gump',
      year: 1994,
      path: '/data/media/movies',
    };

    fs.writeFile.mockResolvedValue(undefined);

    const metadataPath = await organizer.colocateMovieMetadata(
      movie,
      'movie.nfo',
      '<movie><title>Forrest Gump</title></movie>'
    );

    const expectedPath = path.join('/data/media/movies', 'Forrest Gump (1994)', 'movie.nfo');

    expect(fs.mkdir).toHaveBeenCalledWith(
      path.join('/data/media/movies', 'Forrest Gump (1994)'),
      { recursive: true }
    );
    expect(fs.writeFile).toHaveBeenCalledWith(expectedPath, '<movie><title>Forrest Gump</title></movie>', 'utf8');
    expect(metadataPath).toBe(expectedPath);
  });
});
