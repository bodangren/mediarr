import { describe, expect, it, vi } from 'vitest';
import { ProviderBackedSubtitleFetchProvider } from './ProviderBackedSubtitleFetchProvider';
import { SubtitleProviderFactory } from './SubtitleProviderFactory';

describe('ProviderBackedSubtitleFetchProvider', () => {
  it('selects highest-ranked wanted candidate and downloads it', async () => {
    const providerA = {
      search: vi.fn().mockResolvedValue([
        {
          languageCode: 'en',
          isForced: false,
          isHi: false,
          provider: 'opensubtitles',
          score: 40,
        },
      ]),
      download: vi.fn(async c => ({ ...c, content: Buffer.from('A') })),
    };

    const providerB = {
      search: vi.fn().mockResolvedValue([
        {
          languageCode: 'th',
          isForced: false,
          isHi: false,
          provider: 'subdl',
          score: 5,
        },
      ]),
      download: vi.fn(async c => ({ ...c, content: Buffer.from('B') })),
    };

    const factory = new SubtitleProviderFactory(
      {
        opensubtitles: providerA,
        subdl: providerB,
      },
      () => ({ manualProvider: 'opensubtitles' }),
    );

    const adapter = new ProviderBackedSubtitleFetchProvider(factory);
    const best = await adapter.searchBestSubtitle({
      wantedSubtitle: {
        id: 1,
        languageCode: 'th',
        isForced: false,
        isHi: false,
      },
      variant: {
        id: 1,
        path: '/tmp/test.mkv',
        releaseName: 'Test.Release.2025',
      },
      audioTracks: [],
    });

    expect(best?.languageCode).toBe('th');
    expect(providerB.download).toHaveBeenCalledOnce();
  });
});
