import { afterEach, describe, expect, it, vi } from 'vitest';
import { SubdlProvider } from './SubdlProvider';

describe('SubdlProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.SUBDL_API_KEY;
  });

  it('maps thai results from search response', async () => {
    const httpClient = {
      get: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: JSON.stringify({
          subtitles: [
            {
              language: 'TH',
              hi: false,
              comment: 'forced foreign parts',
              url: '/api/file/123',
              name: 'Movie.th.srt',
              releases: ['Movie.Name.2025'],
            },
          ],
        }),
      }),
    };

    const settingsService = {
      get: vi.fn().mockResolvedValue({ apiKeys: { subdlApiKey: 'api-key' } }),
    };

    const provider = new SubdlProvider(httpClient as any, settingsService as any);
    const results = await provider.search({
      variant: { id: 1, path: '/tmp/Movie.Name.2025.mkv', releaseName: 'Movie.Name.2025' },
      audioTracks: [],
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      languageCode: 'th',
      provider: 'subdl',
      isForced: true,
    });
  });

  it('downloads content from SubDL path', async () => {
    const httpClient = {
      get: vi.fn(),
    };

    const settingsService = {
      get: vi.fn().mockResolvedValue({ apiKeys: { subdlApiKey: 'api-key' } }),
    };

    const fileContent = new TextEncoder().encode('thai subtitle');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => fileContent.buffer,
    }));

    const provider = new SubdlProvider(httpClient as any, settingsService as any);
    const result = await provider.download({
      languageCode: 'th',
      isForced: false,
      isHi: false,
      provider: 'subdl',
      score: 1,
      providerData: {
        downloadPath: '/api/file/123',
        fileName: 'Movie.th.srt',
      },
    });

    expect(result.content?.byteLength).toBeGreaterThan(0);
    expect(result.extension).toBe('.srt');
  });
});
