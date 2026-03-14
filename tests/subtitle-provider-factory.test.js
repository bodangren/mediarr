import { describe, it, expect, vi } from 'vitest';
import { SubtitleProviderFactory } from '../server/src/services/SubtitleProviderFactory';
import { SubtitleInventoryApiService } from '../server/src/services/SubtitleInventoryApiService';

vi.mock('node:fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

describe('SubtitleProviderFactory', () => {
  it('should resolve providers from runtime config', () => {
    const providerA = { search: vi.fn() };
    const providerB = { search: vi.fn() };

    const factory = new SubtitleProviderFactory(
      {
        opensubtitles: providerA,
        subdl: providerB,
      },
      () => ({ manualProvider: 'subdl' }),
    );

    expect(factory.resolveManualProvider()).toBe(providerB);
    expect(factory.resolveManualProvider('opensubtitles')).toBe(providerA);
  });

  it('should run manual search/download without per-call provider injection', async () => {
    const provider = {
      search: vi.fn().mockResolvedValue([
        {
          languageCode: 'en',
          isForced: false,
          isHi: false,
          provider: 'opensubtitles',
          score: 77,
        },
      ]),
      download: vi.fn().mockImplementation(async candidate => candidate),
    };

    const factory = new SubtitleProviderFactory(
      { opensubtitles: provider },
      () => ({ manualProvider: 'opensubtitles' }),
    );

    const repository = {
      listMovieVariants: vi.fn().mockResolvedValue([{ id: 11 }]),
      listEpisodeVariants: vi.fn().mockResolvedValue([]),
      getVariantInventory: vi.fn().mockResolvedValue({
        variant: {
          id: 11,
          path: '/data/media/movie.mp4',
          releaseName: 'Movie.Release',
          fileSize: BigInt(100),
        },
        audioTracks: [],
        subtitleTracks: [],
        missingSubtitles: [],
      }),
      listSiblingSubtitlePaths: vi.fn().mockResolvedValue([]),
      createSubtitleTrack: vi.fn().mockResolvedValue(undefined),
      createSubtitleHistory: vi.fn().mockResolvedValue(undefined),
    };

    const service = new SubtitleInventoryApiService(repository, undefined, factory);

    const results = await service.manualSearch({ variantId: 11 });
    expect(results).toHaveLength(1);
    expect(provider.search).toHaveBeenCalledOnce();

    const downloadResult = await service.manualDownload({
      variantId: 11,
      candidate: {
        languageCode: 'en',
        isForced: false,
        isHi: false,
        provider: 'opensubtitles',
        score: 80,
      },
    });

    expect(downloadResult.storedPath).toContain('movie.en.srt');
    expect(provider.download).toHaveBeenCalledOnce();
  });
});
