import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SubtitleInventoryApiService } from './SubtitleInventoryApiService';
import { SubtitleNamingService } from './SubtitleNamingService';

describe('SubtitleInventoryApiService uploadSubtitle', () => {
  const originalSubtitlesDir = process.env.SUBTITLES_DIR;
  const tempDirectories: string[] = [];

  afterEach(async () => {
    process.env.SUBTITLES_DIR = originalSubtitlesDir;
    await Promise.all(tempDirectories.map(async dir => {
      await fs.rm(dir, { recursive: true, force: true });
    }));
    tempDirectories.length = 0;
  });

  it('stores subtitle file and creates inventory track', async () => {
    const subtitlesDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mediarr-subtitles-'));
    tempDirectories.push(subtitlesDir);
    process.env.SUBTITLES_DIR = subtitlesDir;

    const variant = {
      id: 44,
      path: '/media/movies/The Matrix (1999).mkv',
      releaseName: null,
    };

    const repository = {
      listMovieVariants: vi.fn().mockResolvedValue([variant]),
      listEpisodeVariants: vi.fn(),
      getVariantInventory: vi.fn().mockResolvedValue({
        variant,
        audioTracks: [],
        subtitleTracks: [],
        missingSubtitles: [],
      }),
      listSiblingSubtitlePaths: vi.fn().mockResolvedValue([]),
      createSubtitleTrack: vi.fn().mockResolvedValue({
        id: 101,
        languageCode: 'en',
        isForced: false,
        isHi: true,
      }),
    };

    const service = new SubtitleInventoryApiService(
      repository as any,
      new SubtitleNamingService(),
    );

    const result = await service.uploadSubtitle({
      mediaId: 7,
      mediaType: 'movie',
      language: 'en',
      forced: false,
      hearingImpaired: true,
      originalFilename: 'The.Matrix.en.srt',
      content: Buffer.from('1\n00:00:00,000 --> 00:00:01,000\nHello world'),
    });

    expect(repository.createSubtitleTrack).toHaveBeenCalledTimes(1);
    expect(result.filePath).toContain(subtitlesDir);
    expect(result.filePath).toContain('The Matrix (1999).en.hi.srt');
    expect(result.mediaId).toBe(7);
    expect(result.mediaType).toBe('movie');
    expect(result.hearingImpaired).toBe(true);

    const written = await fs.readFile(result.filePath, 'utf8');
    expect(written).toContain('Hello world');
  });

  it('rejects files with unsupported extension', async () => {
    const repository = {
      listMovieVariants: vi.fn(),
      listEpisodeVariants: vi.fn(),
      getVariantInventory: vi.fn(),
      listSiblingSubtitlePaths: vi.fn(),
      createSubtitleTrack: vi.fn(),
    };

    const service = new SubtitleInventoryApiService(
      repository as any,
      new SubtitleNamingService(),
    );

    await expect(service.uploadSubtitle({
      mediaId: 1,
      mediaType: 'movie',
      language: 'en',
      forced: false,
      hearingImpaired: false,
      originalFilename: 'notes.txt',
      content: Buffer.from('not subtitle'),
    })).rejects.toThrow('Only subtitle files are supported');

    expect(repository.listMovieVariants).not.toHaveBeenCalled();
    expect(repository.createSubtitleTrack).not.toHaveBeenCalled();
  });
});
