import { describe, expect, it, vi } from 'vitest';
import { createApplicationsApi } from './applicationsApi';

describe('applicationsApi', () => {
  const mockClient = {
    request: vi.fn(),
  };

  const api = createApplicationsApi(mockClient as any);

  it('lists applications', async () => {
    mockClient.request.mockResolvedValue([]);
    await api.list();
    expect(mockClient.request).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/api/applications' }),
      expect.anything(),
    );
  });

  it('creates applications with baseUrl', async () => {
    const input = {
      name: 'My Sonarr',
      type: 'Sonarr' as const,
      baseUrl: 'http://localhost:8989',
      apiKey: 'api-key',
      syncCategories: [5000],
      tags: ['prowlarr'],
    };
    mockClient.request.mockResolvedValue({ id: 1, ...input });

    await api.create(input);
    expect(mockClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/applications',
        method: 'POST',
        body: input,
      }),
      expect.anything(),
    );
  });

  it('syncs all via /api/applications/sync', async () => {
    mockClient.request.mockResolvedValue({ success: true, message: 'ok', syncedCount: 1 });
    await api.syncAll();
    expect(mockClient.request).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/api/applications/sync', method: 'POST' }),
      expect.anything(),
    );
  });
});
