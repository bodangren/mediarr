import { describe, expect, it, vi } from 'vitest';
import { ApiHttpClient } from './httpClient';
import { createUpdatesApi } from './updatesApi';

describe('UpdatesApi', () => {
  describe('getCurrentVersion', () => {
    it('should fetch current version information', async () => {
      const mockRequest = vi.fn().mockResolvedValue({
        version: '1.0.0',
        branch: 'main',
        commit: 'abc123def456',
        buildDate: '2026-02-15T00:00:00Z',
      });

      const client = {
        request: mockRequest,
      } as unknown as ApiHttpClient;

      const updatesApi = createUpdatesApi(client);
      const result = await updatesApi.getCurrentVersion();

      expect(mockRequest).toHaveBeenCalledWith(
        {
          path: '/api/updates/current',
        },
        expect.any(Object),
      );

      expect(result).toEqual({
        version: '1.0.0',
        branch: 'main',
        commit: 'abc123def456',
        buildDate: '2026-02-15T00:00:00Z',
      });
    });
  });

  describe('getAvailableUpdates', () => {
    it('should fetch available updates', async () => {
      const mockRequest = vi.fn().mockResolvedValue({
        available: true,
        version: '1.1.0',
        releaseDate: '2026-02-20T00:00:00Z',
        changelog: '- Fixed bugs\n- Added features',
        downloadUrl: 'https://github.com/example/mediarr/releases/v1.1.0',
      });

      const client = {
        request: mockRequest,
      } as unknown as ApiHttpClient;

      const updatesApi = createUpdatesApi(client);
      const result = await updatesApi.getAvailableUpdates();

      expect(mockRequest).toHaveBeenCalledWith(
        {
          path: '/api/updates/available',
        },
        expect.any(Object),
      );

      expect(result).toEqual({
        available: true,
        version: '1.1.0',
        releaseDate: '2026-02-20T00:00:00Z',
        changelog: '- Fixed bugs\n- Added features',
        downloadUrl: 'https://github.com/example/mediarr/releases/v1.1.0',
      });
    });

    it('should return no update available', async () => {
      const mockRequest = vi.fn().mockResolvedValue({
        available: false,
      });

      const client = {
        request: mockRequest,
      } as unknown as ApiHttpClient;

      const updatesApi = createUpdatesApi(client);
      const result = await updatesApi.getAvailableUpdates();

      expect(result).toEqual({
        available: false,
      });
    });
  });

  describe('getUpdateHistory', () => {
    it('should fetch update history', async () => {
      const mockRequest = vi.fn().mockResolvedValue({
        items: [
          {
            id: 1,
            version: '1.0.0',
            installedDate: '2026-02-15T00:00:00Z',
            status: 'success' as const,
            branch: 'main',
          },
          {
            id: 2,
            version: '0.9.0',
            installedDate: '2026-01-15T00:00:00Z',
            status: 'success' as const,
            branch: 'main',
          },
        ],
        meta: {
          page: 1,
          pageSize: 20,
          totalCount: 2,
          totalPages: 1,
        },
      });

      const client = {
        requestPaginated: mockRequest,
      } as unknown as ApiHttpClient;

      const updatesApi = createUpdatesApi(client);
      const result = await updatesApi.getUpdateHistory({ page: 1, pageSize: 20 });

      expect(mockRequest).toHaveBeenCalledWith(
        {
          path: '/api/updates/history',
          query: { page: 1, pageSize: 20 },
        },
        expect.any(Object),
      );

      expect(result).toEqual({
        items: [
          {
            id: 1,
            version: '1.0.0',
            installedDate: '2026-02-15T00:00:00Z',
            status: 'success',
            branch: 'main',
          },
          {
            id: 2,
            version: '0.9.0',
            installedDate: '2026-01-15T00:00:00Z',
            status: 'success',
            branch: 'main',
          },
        ],
        meta: {
          page: 1,
          pageSize: 20,
          totalCount: 2,
          totalPages: 1,
        },
      });
    });
  });

  describe('checkForUpdates', () => {
    it('should trigger update check', async () => {
      const mockRequest = vi.fn().mockResolvedValue({
        checked: true,
        timestamp: '2026-02-15T12:00:00Z',
      });

      const client = {
        request: mockRequest,
      } as unknown as ApiHttpClient;

      const updatesApi = createUpdatesApi(client);
      const result = await updatesApi.checkForUpdates();

      expect(mockRequest).toHaveBeenCalledWith(
        {
          path: '/api/updates/check',
          method: 'POST',
        },
        expect.any(Object),
      );

      expect(result).toEqual({
        checked: true,
        timestamp: '2026-02-15T12:00:00Z',
      });
    });
  });

  describe('installUpdate', () => {
    it('should trigger update installation', async () => {
      const mockRequest = vi.fn().mockResolvedValue({
        updateId: 'update-123',
        version: '1.1.0',
        startedAt: '2026-02-15T12:00:00Z',
        status: 'started' as const,
      });

      const client = {
        request: mockRequest,
      } as unknown as ApiHttpClient;

      const updatesApi = createUpdatesApi(client);
      const result = await updatesApi.installUpdate('1.1.0');

      expect(mockRequest).toHaveBeenCalledWith(
        {
          path: '/api/updates/install',
          method: 'POST',
          body: { version: '1.1.0' },
        },
        expect.any(Object),
      );

      expect(result).toEqual({
        updateId: 'update-123',
        version: '1.1.0',
        startedAt: '2026-02-15T12:00:00Z',
        status: 'started',
      });
    });
  });

  describe('getUpdateProgress', () => {
    it('should fetch update progress', async () => {
      const mockRequest = vi.fn().mockResolvedValue({
        updateId: 'update-123',
        version: '1.1.0',
        status: 'downloading' as const,
        progress: 45,
        message: 'Downloading update...',
        startedAt: '2026-02-15T12:00:00Z',
        estimatedTimeRemaining: 300,
      });

      const client = {
        request: mockRequest,
      } as unknown as ApiHttpClient;

      const updatesApi = createUpdatesApi(client);
      const result = await updatesApi.getUpdateProgress('update-123');

      expect(mockRequest).toHaveBeenCalledWith(
        {
          path: '/api/updates/progress/update-123',
        },
        expect.any(Object),
      );

      expect(result).toEqual({
        updateId: 'update-123',
        version: '1.1.0',
        status: 'downloading',
        progress: 45,
        message: 'Downloading update...',
        startedAt: '2026-02-15T12:00:00Z',
        estimatedTimeRemaining: 300,
      });
    });

    it('should handle completed update', async () => {
      const mockRequest = vi.fn().mockResolvedValue({
        updateId: 'update-123',
        version: '1.1.0',
        status: 'completed' as const,
        progress: 100,
        message: 'Update installed successfully',
        startedAt: '2026-02-15T12:00:00Z',
        completedAt: '2026-02-15T12:02:00Z',
      });

      const client = {
        request: mockRequest,
      } as unknown as ApiHttpClient;

      const updatesApi = createUpdatesApi(client);
      const result = await updatesApi.getUpdateProgress('update-123');

      expect(result.status).toBe('completed');
      expect(result.progress).toBe(100);
    });

    it('should handle failed update', async () => {
      const mockRequest = vi.fn().mockResolvedValue({
        updateId: 'update-123',
        version: '1.1.0',
        status: 'failed' as const,
        progress: 30,
        message: 'Update failed: Download interrupted',
        startedAt: '2026-02-15T12:00:00Z',
        error: 'Download interrupted',
      });

      const client = {
        request: mockRequest,
      } as unknown as ApiHttpClient;

      const updatesApi = createUpdatesApi(client);
      const result = await updatesApi.getUpdateProgress('update-123');

      expect(result.status).toBe('failed');
      expect(result.error).toBe('Download interrupted');
    });
  });
});
