import { describe, expect, it, vi } from 'vitest';
import { ApiHttpClient } from './httpClient';
import { createSetupApi } from './setupApi';

describe('SetupApi', () => {
  it('getStatus calls /api/setup/status', async () => {
    const mockRequest = vi.fn().mockResolvedValue({
      isConfigured: false,
      completedSteps: [],
    });

    const client = {
      request: mockRequest,
    } as unknown as ApiHttpClient;

    const setupApi = createSetupApi(client);
    const result = await setupApi.getStatus();

    expect(mockRequest).toHaveBeenCalledWith(
      {
        path: '/api/setup/status',
      },
      expect.any(Object),
    );
    expect(result).toEqual({
      isConfigured: false,
      completedSteps: [],
    });
  });

  it('complete calls /api/setup/complete', async () => {
    const mockRequest = vi.fn().mockResolvedValue({
      isConfigured: true,
      completedSteps: ['rootFolders', 'indexers', 'complete'],
    });

    const client = {
      request: mockRequest,
    } as unknown as ApiHttpClient;

    const setupApi = createSetupApi(client);
    const result = await setupApi.complete();

    expect(mockRequest).toHaveBeenCalledWith(
      {
        path: '/api/setup/complete',
        method: 'POST',
      },
      expect.any(Object),
    );
    expect(result.isConfigured).toBe(true);
  });
});
