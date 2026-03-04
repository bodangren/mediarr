import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SubtitleInventoryApiService } from './SubtitleInventoryApiService';
import { SubtitleProviderFactory } from './SubtitleProviderFactory';

describe('SubtitleInventoryApiService manual search/download', () => {
  const tempDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirectories.map(async dir => {
      await fs.rm(dir, { recursive: true, force: true });
    }));
    tempDirectories.length = 0;
  });

  it('continues searching when one provider fails', async () => {
    const repository = {
      getVariantInventory: vi.fn().mockResolvedValue({
        variant: {
          id: 1,
          path: '/tmp/movie.mkv',
          releaseName: 'Movie.Name.2025',
        },
        audioTracks: [],
        subtitleTracks: [],
        missingSubtitles: [],
      }),
    };

    const workingProvider = {
      search: vi.fn().mockResolvedValue([
        {
          languageCode: 'en',
          isForced: false,
          isHi: false,
          provider: 'opensubtitles',
          score: 10,
        },
      ]),
      download: vi.fn(),
    };

    const failingProvider = {
      search: vi.fn().mockRejectedValue(new Error('boom')),
      download: vi.fn(),
    };

    const factory = new SubtitleProviderFactory(
      {
        opensubtitles: workingProvider,
        assrt: failingProvider,
      },
      () => ({ manualProvider: 'opensubtitles' }),
    );

    const service = new SubtitleInventoryApiService(repository as any, undefined, factory);
    const results = await service.manualSearch({ variantId: 1 });

    expect(results).toHaveLength(1);
    expect(results[0]?.provider).toBe('opensubtitles');
  });

  it('writes downloaded subtitle content to disk', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mediarr-manual-download-'));
    tempDirectories.push(tempDir);

    const variantPath = path.join(tempDir, 'Movie.Name.2025.mkv');

    const repository = {
      getVariantInventory: vi.fn().mockResolvedValue({
        variant: {
          id: 1,
          path: variantPath,
          releaseName: 'Movie.Name.2025',
        },
        audioTracks: [],
        subtitleTracks: [],
        missingSubtitles: [],
      }),
      listSiblingSubtitlePaths: vi.fn().mockResolvedValue([]),
      createSubtitleTrack: vi.fn().mockResolvedValue({ id: 11 }),
      createSubtitleHistory: vi.fn().mockResolvedValue({ id: 22 }),
    };

    const provider = {
      search: vi.fn(),
      download: vi.fn(async candidate => ({
        ...candidate,
        content: Buffer.from('subtitle body'),
      })),
    };

    const factory = new SubtitleProviderFactory(
      {
        opensubtitles: provider,
      },
      () => ({ manualProvider: 'opensubtitles' }),
    );

    const service = new SubtitleInventoryApiService(repository as any, undefined, factory);
    const result = await service.manualDownload({
      variantId: 1,
      candidate: {
        languageCode: 'en',
        isForced: false,
        isHi: false,
        provider: 'opensubtitles',
        score: 1,
        extension: '.srt',
      },
    });

    const written = await fs.readFile(result.storedPath, 'utf8');
    expect(written).toContain('subtitle body');
    expect(repository.createSubtitleTrack).toHaveBeenCalledOnce();
  });
});
