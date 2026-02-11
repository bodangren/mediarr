import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MetadataGenerator } from '../server/src/services/MetadataGenerator';
import { HttpClient } from '../server/src/indexers/HttpClient';
import fs from 'node:fs/promises';

vi.mock('node:fs/promises');

describe('MetadataGenerator', () => {
  let generator;
  let client;

  beforeEach(() => {
    client = new HttpClient();
    generator = new MetadataGenerator(client);
    vi.clearAllMocks();
  });

  it('should generate tvshow.nfo', async () => {
    const series = {
      title: 'The Boys',
      overview: 'Superheroes are bad.',
      tvdbId: 123,
      status: 'Continuing',
      year: 2019,
      path: '/media/TV/The Boys'
    };

    await generator.generateSeriesMetadata(series);

    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('tvshow.nfo'),
      expect.stringContaining('<title>The Boys</title>')
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('tvshow.nfo'),
      expect.stringContaining('<uniqueid type="tvdb" default="true">123</uniqueid>')
    );
  });

  it('should generate episode .nfo', async () => {
    const series = { path: '/media/TV/The Boys' };
    const episode = {
      title: 'Pilot',
      seasonNumber: 1,
      episodeNumber: 1,
      tvdbId: 456
    };
    const filePath = '/media/TV/The Boys/Season 01/The.Boys.S01E01.mkv';

    await generator.generateEpisodeMetadata(series, episode, filePath);

    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('The.Boys.S01E01.nfo'),
      expect.stringContaining('<title>Pilot</title>')
    );
  });
});
