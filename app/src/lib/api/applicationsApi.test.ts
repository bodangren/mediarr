import { describe, expect, it, vi } from 'vitest';
import { createApplicationsApi } from './applicationsApi';

describe('applicationsApi', () => {
  const mockClient = {
    request: vi.fn(),
  };

  const api = createApplicationsApi(mockClient as any);

  describe('list', () => {
    it('should fetch all applications', async () => {
      const mockApplications = [
        {
          id: 1,
          name: 'My Sonarr',
          type: 'Sonarr',
          url: 'http://localhost:8989',
          apiKey: '********',
          syncEnabled: true,
        },
      ];

      mockClient.request.mockResolvedValue(mockApplications);

      const result = await api.list();

      expect(result).toEqual(mockApplications);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/applications',
        }),
        expect.anything(),
      );
    });
  });

  describe('create', () => {
    it('should create a new application', async () => {
      const input = {
        name: 'My Radarr',
        type: 'Radarr' as const,
        url: 'http://localhost:7878',
        apiKey: 'test-api-key',
        syncEnabled: true,
      };

      const mockResult = {
        id: 2,
        ...input,
        apiKey: '********',
      };

      mockClient.request.mockResolvedValue(mockResult);

      const result = await api.create(input);

      expect(result).toEqual(mockResult);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/applications',
          method: 'POST',
          body: input,
        }),
        expect.anything(),
      );
    });
  });

  describe('update', () => {
    it('should update an existing application', async () => {
      const input = {
        name: 'Updated Sonarr',
        syncEnabled: false,
      };

      const mockResult = {
        id: 1,
        name: 'Updated Sonarr',
        type: 'Sonarr',
        url: 'http://localhost:8989',
        apiKey: '********',
        syncEnabled: false,
      };

      mockClient.request.mockResolvedValue(mockResult);

      const result = await api.update(1, input);

      expect(result).toEqual(mockResult);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/applications/1',
          method: 'PUT',
          body: input,
        }),
        expect.anything(),
      );
    });
  });

  describe('remove', () => {
    it('should delete an application', async () => {
      const mockResult = { id: 1 };

      mockClient.request.mockResolvedValue(mockResult);

      const result = await api.remove(1);

      expect(result).toEqual(mockResult);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/applications/1',
          method: 'DELETE',
        }),
        expect.anything(),
      );
    });
  });

  describe('test', () => {
    it('should test connection to an application', async () => {
      const mockResult = {
        success: true,
        message: 'Connection successful',
        diagnostics: {
          remediationHints: [],
        },
      };

      mockClient.request.mockResolvedValue(mockResult);

      const result = await api.test(1);

      expect(result).toEqual(mockResult);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/applications/1/test',
          method: 'POST',
        }),
        expect.anything(),
      );
    });
  });

  describe('testDraft', () => {
    it('should test connection using draft settings', async () => {
      const input = {
        name: 'My Radarr',
        type: 'Radarr' as const,
        url: 'http://localhost:7878',
        apiKey: 'test-api-key',
        syncEnabled: true,
      };

      const mockResult = {
        success: false,
        message: 'API Key is invalid',
        diagnostics: {
          remediationHints: ['Check API Key', 'Verify URL'],
        },
      };

      mockClient.request.mockResolvedValue(mockResult);

      const result = await api.testDraft(input);

      expect(result).toEqual(mockResult);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/applications/test',
          method: 'POST',
          body: input,
        }),
        expect.anything(),
      );
    });
  });

  describe('sync', () => {
    it('should sync indexers to application', async () => {
      const mockResult = {
        success: true,
        message: 'Synced 3 indexers',
      };

      mockClient.request.mockResolvedValue(mockResult);

      const result = await api.sync(1);

      expect(result).toEqual(mockResult);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/applications/1/sync',
          method: 'POST',
        }),
        expect.anything(),
      );
    });
  });

  describe('syncAll', () => {
    it('should sync indexers to all applications', async () => {
      const mockResult = {
        success: true,
        message: 'Synced 12 indexers across 4 applications',
      };

      mockClient.request.mockResolvedValue(mockResult);

      const result = await api.syncAll();

      expect(result).toEqual(mockResult);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/applications/sync-all',
          method: 'POST',
        }),
        expect.anything(),
      );
    });
  });
});
