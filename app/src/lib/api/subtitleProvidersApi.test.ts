import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createSubtitleProvidersApi } from './subtitleProvidersApi';
import { ApiHttpClient } from './httpClient';
import { ContractViolationError } from './errors';

// Mock the ApiHttpClient
vi.mock('./httpClient', () => {
  class MockHttpClient {
    public request = vi.fn();
  }

  return {
    ApiHttpClient: MockHttpClient,
  };
});

describe('Subtitle Providers API', () => {
  const mockHttpClient = new ApiHttpClient() as ApiHttpClient & {
    request: ReturnType<typeof vi.fn>;
  };
  const subtitleProvidersApi = createSubtitleProvidersApi(mockHttpClient);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listProviders', () => {
    it('should list all subtitle providers', async () => {
      const mockProviders = [
        {
          id: 'opensubtitles',
          name: 'OpenSubtitles',
          enabled: true,
          type: 'opensubtitles',
          settings: { username: 'user1', password: 'pass1', timeout: 30, maxResults: 100 },
          status: 'active',
        },
        {
          id: 'subscene',
          name: 'Subscene',
          enabled: true,
          type: 'subscene',
          settings: { timeout: 20, maxResults: 50 },
          status: 'active',
        },
        {
          id: 'addic7ed',
          name: 'Addic7ed',
          enabled: false,
          type: 'addic7ed',
          settings: { username: 'user2', password: 'pass2', useSSL: true },
          lastError: 'Authentication failed',
          status: 'error',
        },
      ];

      mockHttpClient.request.mockResolvedValue(mockProviders);

      const result = await subtitleProvidersApi.listProviders();

      expect(mockHttpClient.request).toHaveBeenCalledWith(
        {
          path: '/api/subtitles/providers',
        },
        expect.anything(),
      );
      expect(result).toEqual(mockProviders);
    });

    it('should return empty array when no providers configured', async () => {
      mockHttpClient.request.mockResolvedValue([]);

      const result = await subtitleProvidersApi.listProviders();

      expect(result).toEqual([]);
    });

    it('should accept legacy raw array payload when success envelope validation fails', async () => {
      const legacyProviders = [
        {
          id: 'opensubtitles',
          name: 'OpenSubtitles',
          enabled: true,
          type: 'api',
          settings: { apiKey: 'abc' },
          status: 'active' as const,
        },
      ];

      mockHttpClient.request.mockRejectedValue(
        new ContractViolationError('Response did not match success envelope contract', {
          payload: legacyProviders,
        }),
      );

      const result = await subtitleProvidersApi.listProviders();
      expect(result).toEqual(legacyProviders);
    });

    it('should rethrow contract violations when payload cannot be interpreted as providers', async () => {
      const error = new ContractViolationError('Response did not match success envelope contract', {
        payload: { unexpected: true },
      });
      mockHttpClient.request.mockRejectedValue(error);

      await expect(subtitleProvidersApi.listProviders()).rejects.toBe(error);
    });
  });

  describe('getProvider', () => {
    it('should get a specific provider by id', async () => {
      const mockProvider = {
        id: 'opensubtitles',
        name: 'OpenSubtitles',
        enabled: true,
        type: 'opensubtitles',
        settings: { username: 'user1', password: 'pass1', apiKey: 'key123', timeout: 30, maxResults: 100 },
        status: 'active',
      };

      mockHttpClient.request.mockResolvedValue(mockProvider);

      const result = await subtitleProvidersApi.getProvider('opensubtitles');

      expect(mockHttpClient.request).toHaveBeenCalledWith(
        {
          path: '/api/subtitles/providers/opensubtitles',
        },
        expect.anything(),
      );
      expect(result).toEqual(mockProvider);
    });

    it('should handle provider with api key settings', async () => {
      const mockProvider = {
        id: 'podnapisi',
        name: 'Podnapisi.NET',
        enabled: true,
        type: 'podnapisi',
        settings: { apiKey: 'abc123', timeout: 15, maxResults: 50, useSSL: true },
        status: 'active',
      };

      mockHttpClient.request.mockResolvedValue(mockProvider);

      const result = await subtitleProvidersApi.getProvider('podnapisi');

      expect(result).toEqual(mockProvider);
      expect(result.settings).toHaveProperty('apiKey');
    });
  });

  describe('updateProvider', () => {
    it('should update provider settings', async () => {
      const mockUpdatedProvider = {
        id: 'opensubtitles',
        name: 'OpenSubtitles',
        enabled: true,
        type: 'opensubtitles',
        settings: { username: 'newuser', password: 'newpass', timeout: 60, maxResults: 200 },
        status: 'active',
      };

      mockHttpClient.request.mockResolvedValue(mockUpdatedProvider);

      const settings = {
        username: 'newuser',
        password: 'newpass',
        timeout: 60,
        maxResults: 200,
      };

      const result = await subtitleProvidersApi.updateProvider('opensubtitles', settings);

      expect(mockHttpClient.request).toHaveBeenCalledWith(
        {
          path: '/api/subtitles/providers/opensubtitles',
          method: 'PUT',
          body: settings,
        },
        expect.anything(),
      );
      expect(result).toEqual(mockUpdatedProvider);
    });

    it('should update partial provider settings', async () => {
      const mockUpdatedProvider = {
        id: 'subscene',
        name: 'Subscene',
        enabled: true,
        type: 'subscene',
        settings: { timeout: 45, maxResults: 75, useSSL: true },
        status: 'active',
      };

      mockHttpClient.request.mockResolvedValue(mockUpdatedProvider);

      const settings = {
        timeout: 45,
        maxResults: 75,
      };

      const result = await subtitleProvidersApi.updateProvider('subscene', settings);

      expect(mockHttpClient.request).toHaveBeenCalledWith(
        {
          path: '/api/subtitles/providers/subscene',
          method: 'PUT',
          body: settings,
        },
        expect.anything(),
      );
      expect(result).toEqual(mockUpdatedProvider);
    });

    it('should enable/disable provider', async () => {
      const mockUpdatedProvider = {
        id: 'addic7ed',
        name: 'Addic7ed',
        enabled: false,
        type: 'addic7ed',
        settings: { username: 'user', password: 'pass', useSSL: false },
        lastError: undefined,
        status: 'disabled' as const,
      };

      mockHttpClient.request.mockResolvedValue(mockUpdatedProvider);

      const settings = {
        username: 'user',
        password: 'pass',
      };

      const result = await subtitleProvidersApi.updateProvider('addic7ed', settings);

      expect(result.enabled).toBe(false);
      expect(result.status).toBe('disabled');
    });
  });

  describe('testProvider', () => {
    it('should test provider connection successfully', async () => {
      const mockTestResult = {
        success: true,
        message: 'Connection to OpenSubtitles successful',
      };

      mockHttpClient.request.mockResolvedValue(mockTestResult);

      const result = await subtitleProvidersApi.testProvider('opensubtitles');

      expect(mockHttpClient.request).toHaveBeenCalledWith(
        {
          path: '/api/subtitles/providers/opensubtitles/test',
          method: 'POST',
        },
        expect.anything(),
      );
      expect(result.success).toBe(true);
      expect(result.message).toBe('Connection to OpenSubtitles successful');
    });

    it('should handle failed provider test', async () => {
      const mockTestResult = {
        success: false,
        message: 'Authentication failed: Invalid credentials',
      };

      mockHttpClient.request.mockResolvedValue(mockTestResult);

      const result = await subtitleProvidersApi.testProvider('addic7ed');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Authentication failed');
    });

    it('should test different provider types', async () => {
      const providers = ['subscene', 'podnapisi', 'addic7ed'];

      for (const providerId of providers) {
        mockHttpClient.request.mockResolvedValue({
          success: true,
          message: `${providerId} connection successful`,
        });

        const result = await subtitleProvidersApi.testProvider(providerId);

        expect(mockHttpClient.request).toHaveBeenCalledWith(
          {
            path: `/api/subtitles/providers/${providerId}/test`,
            method: 'POST',
          },
          expect.anything(),
        );
        expect(result.success).toBe(true);
      }
    });
  });

  describe('resetProvider', () => {
    it('should reset provider to default settings', async () => {
      const mockResetProvider = {
        id: 'opensubtitles',
        name: 'OpenSubtitles',
        enabled: true,
        type: 'opensubtitles',
        settings: { timeout: 30, maxResults: 100 },
        lastError: undefined,
        status: 'active' as const,
      };

      mockHttpClient.request.mockResolvedValue(mockResetProvider);

      const result = await subtitleProvidersApi.resetProvider('opensubtitles');

      expect(mockHttpClient.request).toHaveBeenCalledWith(
        {
          path: '/api/subtitles/providers/opensubtitles/reset',
          method: 'POST',
        },
        expect.anything(),
      );
      expect(result.settings).not.toHaveProperty('username');
      expect(result.settings).not.toHaveProperty('password');
      expect(result.lastError).toBeUndefined();
    });

    it('should clear error state after reset', async () => {
      const mockResetProvider = {
        id: 'addic7ed',
        name: 'Addic7ed',
        enabled: true,
        type: 'addic7ed',
        settings: { username: '', password: '', timeout: 30 },
        lastError: undefined,
        status: 'active' as const,
      };

      mockHttpClient.request.mockResolvedValue(mockResetProvider);

      const result = await subtitleProvidersApi.resetProvider('addic7ed');

      expect(result.lastError).toBeUndefined();
      expect(result.status).toBe('active');
    });
  });

  describe('Provider types', () => {
    it('should handle opensubtitles provider type', async () => {
      const provider = {
        id: 'opensubtitles',
        name: 'OpenSubtitles',
        enabled: true,
        type: 'opensubtitles' as const,
        settings: { username: 'user', password: 'pass', apiKey: 'key', timeout: 30, maxResults: 100 },
        status: 'active' as const,
      };

      mockHttpClient.request.mockResolvedValue(provider);

      const result = await subtitleProvidersApi.getProvider('opensubtitles');

      expect(result.type).toBe('opensubtitles');
    });

    it('should handle subscene provider type', async () => {
      const provider = {
        id: 'subscene',
        name: 'Subscene',
        enabled: true,
        type: 'subscene' as const,
        settings: { timeout: 20, maxResults: 50, useSSL: true },
        status: 'active' as const,
      };

      mockHttpClient.request.mockResolvedValue(provider);

      const result = await subtitleProvidersApi.getProvider('subscene');

      expect(result.type).toBe('subscene');
    });

    it('should handle podnapisi provider type', async () => {
      const provider = {
        id: 'podnapisi',
        name: 'Podnapisi.NET',
        enabled: true,
        type: 'podnapisi' as const,
        settings: { apiKey: 'abc123', timeout: 15, maxResults: 50 },
        status: 'active' as const,
      };

      mockHttpClient.request.mockResolvedValue(provider);

      const result = await subtitleProvidersApi.getProvider('podnapisi');

      expect(result.type).toBe('podnapisi');
    });

    it('should handle addic7ed provider type', async () => {
      const provider = {
        id: 'addic7ed',
        name: 'Addic7ed',
        enabled: true,
        type: 'addic7ed' as const,
        settings: { username: 'user', password: 'pass', useSSL: true },
        status: 'active' as const,
      };

      mockHttpClient.request.mockResolvedValue(provider);

      const result = await subtitleProvidersApi.getProvider('addic7ed');

      expect(result.type).toBe('addic7ed');
    });

    it('should handle custom provider types', async () => {
      const provider = {
        id: 'custom-provider',
        name: 'Custom Provider',
        enabled: true,
        type: 'custom_subtitle_source' as const,
        settings: { apiKey: 'custom-key', timeout: 25 },
        status: 'active' as const,
      };

      mockHttpClient.request.mockResolvedValue(provider);

      const result = await subtitleProvidersApi.getProvider('custom-provider');

      expect(result.type).toBe('custom_subtitle_source');
    });
  });

  describe('Provider status', () => {
    it('should handle active status', async () => {
      const provider = {
        id: 'opensubtitles',
        name: 'OpenSubtitles',
        enabled: true,
        type: 'opensubtitles' as const,
        settings: {},
        status: 'active' as const,
      };

      mockHttpClient.request.mockResolvedValue(provider);

      const result = await subtitleProvidersApi.getProvider('opensubtitles');

      expect(result.status).toBe('active');
    });

    it('should handle error status with lastError', async () => {
      const provider = {
        id: 'addic7ed',
        name: 'Addic7ed',
        enabled: true,
        type: 'addic7ed' as const,
        settings: {},
        lastError: 'Rate limit exceeded',
        status: 'error' as const,
      };

      mockHttpClient.request.mockResolvedValue(provider);

      const result = await subtitleProvidersApi.getProvider('addic7ed');

      expect(result.status).toBe('error');
      expect(result.lastError).toBe('Rate limit exceeded');
    });

    it('should handle disabled status', async () => {
      const provider = {
        id: 'subscene',
        name: 'Subscene',
        enabled: false,
        type: 'subscene' as const,
        settings: {},
        status: 'disabled' as const,
      };

      mockHttpClient.request.mockResolvedValue(provider);

      const result = await subtitleProvidersApi.getProvider('subscene');

      expect(result.status).toBe('disabled');
      expect(result.enabled).toBe(false);
    });
  });

  describe('Schema validation', () => {
    it('should validate provider response schema', async () => {
      const validProvider = {
        id: 'opensubtitles',
        name: 'OpenSubtitles',
        enabled: true,
        type: 'opensubtitles',
        settings: { timeout: 30 },
        status: 'active',
      };

      mockHttpClient.request.mockResolvedValue(validProvider);

      const result = await subtitleProvidersApi.getProvider('opensubtitles');

      expect(result).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        enabled: expect.any(Boolean),
        type: expect.any(String),
        settings: expect.any(Object),
        status: expect.stringMatching(/^(active|error|disabled)$/),
      });
    });

    it('should validate test result schema', async () => {
      const validTestResult = {
        success: true,
        message: 'Test passed',
      };

      mockHttpClient.request.mockResolvedValue(validTestResult);

      const result = await subtitleProvidersApi.testProvider('opensubtitles');

      expect(result).toMatchObject({
        success: expect.any(Boolean),
        message: expect.any(String),
      });
    });
  });
});
