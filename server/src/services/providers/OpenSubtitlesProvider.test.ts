import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenSubtitlesProvider } from './OpenSubtitlesProvider';

describe('OpenSubtitlesProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps subtitle search results with provider metadata', async () => {
    const httpClient = {
      get: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: JSON.stringify({
          data: [
            {
              attributes: {
                language: 'th',
                foreign_parts_only: false,
                hearing_impaired: true,
                votes: 4,
                download_count: 150,
                release: 'Test.Movie.2025',
                files: [{ file_id: 123, file_name: 'test.th.srt' }],
              },
            },
          ],
        }),
      }),
      post: vi.fn(),
    };

    const settingsService = {
      get: vi.fn().mockResolvedValue({ apiKeys: { openSubtitlesApiKey: 'key' } }),
    };

    const provider = new OpenSubtitlesProvider(httpClient as any, settingsService as any);
    const results = await provider.search({
      variant: {
        id: 1,
        path: '/media/Test.Movie.2025.mkv',
        releaseName: 'Test.Movie.2025',
      },
      audioTracks: [],
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      provider: 'opensubtitles',
      languageCode: 'th',
      isHi: true,
    });
    expect(results[0]?.providerData).toEqual({ fileId: 123 });
  });

  it('downloads content using file id', async () => {
    const httpClient = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: JSON.stringify({
          link: 'https://cdn.example/sub.srt',
          file_name: 'sub.srt',
        }),
      }),
    };

    const settingsService = {
      get: vi.fn().mockResolvedValue({ apiKeys: { openSubtitlesApiKey: 'key' } }),
    };

    const fileContent = new TextEncoder().encode('1\n00:00:00,000 --> 00:00:01,000\nHello');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => fileContent.buffer,
    }));

    const provider = new OpenSubtitlesProvider(httpClient as any, settingsService as any);
    const result = await provider.download({
      languageCode: 'en',
      isForced: false,
      isHi: false,
      provider: 'opensubtitles',
      score: 10,
      providerData: { fileId: 456 },
    });

    expect(result.content?.byteLength).toBeGreaterThan(0);
    expect(result.extension).toBe('.srt');
  });
});
