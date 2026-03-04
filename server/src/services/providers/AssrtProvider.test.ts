import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssrtProvider } from './AssrtProvider';

describe('AssrtProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.ASSRT_API_TOKEN;
  });

  it('maps chinese candidates from ASSRT language list', async () => {
    const httpClient = {
      get: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: JSON.stringify({
          sub: {
            subs: [
              {
                id: 7,
                videoname: 'Movie.Name.2025',
                lang: { langlist: { langchs: '简体' } },
              },
            ],
          },
        }),
      }),
    };

    const settingsService = {
      get: vi.fn().mockResolvedValue({ apiKeys: { assrtApiToken: 'token' } }),
    };

    const provider = new AssrtProvider(httpClient as any, settingsService as any);
    const results = await provider.search({
      variant: { id: 1, path: '/tmp/Movie.Name.2025.mkv', releaseName: 'Movie.Name.2025' },
      audioTracks: [],
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.languageCode).toBe('zh');
    expect(results[0]?.provider).toBe('assrt');
    expect(results[0]?.providerData).toEqual({ subtitleId: 7 });
  });

  it('downloads subtitle content from detail endpoint', async () => {
    const httpClient = {
      get: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: JSON.stringify({
          sub: {
            subs: [
              {
                filelist: [{ f: 'sub.srt', url: 'https://files.example/sub.srt' }],
              },
            ],
          },
        }),
      }),
    };

    const settingsService = {
      get: vi.fn().mockResolvedValue({ apiKeys: { assrtApiToken: 'token' } }),
    };

    const fileContent = new TextEncoder().encode('sub content');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => fileContent.buffer,
    }));

    const provider = new AssrtProvider(httpClient as any, settingsService as any);
    const result = await provider.download({
      languageCode: 'zh',
      isForced: false,
      isHi: false,
      provider: 'assrt',
      score: 50,
      providerData: { subtitleId: 7 },
    });

    expect(result.content?.byteLength).toBeGreaterThan(0);
    expect(result.extension).toBe('.srt');
  });
});
