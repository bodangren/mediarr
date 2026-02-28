import { describe, expect, it, vi } from 'vitest';
import { createDownloadClientApi, type TorrentLimitsSettings } from './downloadClientsApi';
import { ApiHttpClient } from './httpClient';

// Mock the ApiHttpClient
vi.mock('./httpClient', () => {
  class MockHttpClient {
    public request = vi.fn();
  }

  return {
    ApiHttpClient: MockHttpClient,
  };
});

const defaultSettings: TorrentLimitsSettings = {
  maxActiveDownloads: 3,
  maxActiveSeeds: 3,
  globalDownloadLimitKbps: null,
  globalUploadLimitKbps: null,
  incompleteDirectory: '',
  completeDirectory: '',
  seedRatioLimit: 0,
  seedTimeLimitMinutes: 0,
  seedLimitAction: 'pause',
};

describe('Download Client API — single-instance settings', () => {
  const mockHttpClient = new ApiHttpClient() as ApiHttpClient & {
    request: ReturnType<typeof vi.fn>;
  };
  const downloadClientApi = createDownloadClientApi(mockHttpClient);

  it('get() calls GET /api/download-client', async () => {
    mockHttpClient.request.mockResolvedValue(defaultSettings);

    const result = await downloadClientApi.get();

    expect(mockHttpClient.request).toHaveBeenCalledWith(
      { path: '/api/download-client' },
      expect.anything(),
    );
    expect(result).toEqual(defaultSettings);
  });

  it('save() calls PUT /api/download-client with full settings', async () => {
    const custom: TorrentLimitsSettings = {
      ...defaultSettings,
      incompleteDirectory: '/tmp/incomplete',
      completeDirectory: '/media/done',
      seedRatioLimit: 1.5,
      seedTimeLimitMinutes: 60,
      seedLimitAction: 'remove',
    };

    mockHttpClient.request.mockResolvedValue(custom);

    const result = await downloadClientApi.save(custom);

    expect(mockHttpClient.request).toHaveBeenCalledWith(
      {
        path: '/api/download-client',
        method: 'PUT',
        body: custom,
      },
      expect.anything(),
    );
    expect(result).toEqual(custom);
  });
});
