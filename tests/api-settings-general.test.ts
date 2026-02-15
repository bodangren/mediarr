import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApiServer } from '../server/src/api/createApiServer';
import type { FastifyInstance } from 'fastify';
import { DEFAULT_APP_SETTINGS } from '../server/src/repositories/AppSettingsRepository';

// Minimal deps for settings routes (they use mocked service)
const createMinimalDeps = (settingsService: any) => ({
  prisma: {},
  settingsService,
});

describe('Settings General Sections (host/security/logging/update)', () => {
  let apps: FastifyInstance[] = [];

  afterEach(async () => {
    for (const app of apps) {
      await app.close();
    }
    apps = [];
  });

  function createTestApp(settingsService: any) {
    const app = createApiServer(createMinimalDeps(settingsService) as any, {
      torrentStatsIntervalMs: 60_000,
      activityPollIntervalMs: 60_000,
      healthPollIntervalMs: 60_000,
    });
    apps.push(app);
    return app;
  }

  describe('AppSettingsRepository defaults', () => {
    it('includes host section in DEFAULT_APP_SETTINGS', () => {
      expect(DEFAULT_APP_SETTINGS.host).toBeDefined();
      expect(DEFAULT_APP_SETTINGS.host.bindAddress).toBe('*');
      expect(DEFAULT_APP_SETTINGS.host.port).toBe(9696);
      expect(DEFAULT_APP_SETTINGS.host.urlBase).toBe('');
      expect(DEFAULT_APP_SETTINGS.host.sslPort).toBe(9697);
      expect(DEFAULT_APP_SETTINGS.host.enableSsl).toBe(false);
    });

    it('includes security section in DEFAULT_APP_SETTINGS', () => {
      expect(DEFAULT_APP_SETTINGS.security).toBeDefined();
      expect(DEFAULT_APP_SETTINGS.security.authenticationRequired).toBe(false);
      expect(DEFAULT_APP_SETTINGS.security.authenticationMethod).toBe('none');
      expect(DEFAULT_APP_SETTINGS.security.apiKey).toBeNull();
    });

    it('includes logging section in DEFAULT_APP_SETTINGS', () => {
      expect(DEFAULT_APP_SETTINGS.logging).toBeDefined();
      expect(DEFAULT_APP_SETTINGS.logging.logLevel).toBe('info');
      expect(DEFAULT_APP_SETTINGS.logging.logSizeLimit).toBe(1048576);
      expect(DEFAULT_APP_SETTINGS.logging.logRetentionDays).toBe(30);
    });

    it('includes update section in DEFAULT_APP_SETTINGS', () => {
      expect(DEFAULT_APP_SETTINGS.update).toBeDefined();
      expect(DEFAULT_APP_SETTINGS.update.autoUpdateEnabled).toBe(false);
      expect(DEFAULT_APP_SETTINGS.update.branch).toBe('master');
      expect(DEFAULT_APP_SETTINGS.update.mechanicsEnabled).toBe(false);
      expect(DEFAULT_APP_SETTINGS.update.updateScriptPath).toBeNull();
    });
  });

  describe('GET /api/settings', () => {
    it('returns all settings sections including host/security/logging/update', async () => {
      const app = createTestApp({
        get: async () => DEFAULT_APP_SETTINGS,
        update: async () => DEFAULT_APP_SETTINGS,
      });

      const response = await app.inject({ method: 'GET', url: '/api/settings' });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      
      // Verify all sections exist
      expect(payload.data).toHaveProperty('torrentLimits');
      expect(payload.data).toHaveProperty('schedulerIntervals');
      expect(payload.data).toHaveProperty('pathVisibility');
      expect(payload.data).toHaveProperty('apiKeys');
      expect(payload.data).toHaveProperty('host');
      expect(payload.data).toHaveProperty('security');
      expect(payload.data).toHaveProperty('logging');
      expect(payload.data).toHaveProperty('update');
      
      // Verify host section structure
      expect(payload.data.host).toHaveProperty('bindAddress');
      expect(payload.data.host).toHaveProperty('port');
      expect(payload.data.host).toHaveProperty('urlBase');
      expect(payload.data.host).toHaveProperty('sslPort');
      expect(payload.data.host).toHaveProperty('enableSsl');
      
      // Verify security section structure
      expect(payload.data.security).toHaveProperty('authenticationRequired');
      expect(payload.data.security).toHaveProperty('authenticationMethod');
      expect(payload.data.security).toHaveProperty('apiKey');
      
      // Verify logging section structure
      expect(payload.data.logging).toHaveProperty('logLevel');
      expect(payload.data.logging).toHaveProperty('logSizeLimit');
      expect(payload.data.logging).toHaveProperty('logRetentionDays');
      
      // Verify update section structure
      expect(payload.data.update).toHaveProperty('autoUpdateEnabled');
      expect(payload.data.update).toHaveProperty('branch');
      expect(payload.data.update).toHaveProperty('mechanicsEnabled');
      expect(payload.data.update).toHaveProperty('updateScriptPath');
    });
  });

  describe('PATCH /api/settings round-trip', () => {
    it('preserves host settings in PATCH->GET round-trip', async () => {
      const newHostSettings = {
        bindAddress: '127.0.0.1',
        port: 8080,
        urlBase: '/mediarr',
        sslPort: 8443,
        enableSsl: true,
        sslCertPath: '/etc/ssl/cert.pem',
        sslKeyPath: '/etc/ssl/key.pem',
      };
      
      let storedSettings = { ...DEFAULT_APP_SETTINGS, host: { ...DEFAULT_APP_SETTINGS.host } };
      
      const app = createTestApp({
        get: async () => storedSettings,
        update: async (partial: any) => {
          storedSettings = {
            ...storedSettings,
            host: { ...storedSettings.host, ...partial.host },
          };
          return storedSettings;
        },
      });

      // PATCH new host settings
      const patchResponse = await app.inject({
        method: 'PATCH',
        url: '/api/settings',
        payload: { host: newHostSettings },
      });
      
      expect(patchResponse.statusCode).toBe(200);
      expect(patchResponse.json().ok).toBe(true);
      expect(patchResponse.json().data.host).toEqual(newHostSettings);
      
      // GET to verify persistence
      const getResponse = await app.inject({ method: 'GET', url: '/api/settings' });
      expect(getResponse.json().data.host).toEqual(newHostSettings);
    });

    it('preserves security settings in PATCH->GET round-trip', async () => {
      const newSecuritySettings = {
        authenticationRequired: true,
        authenticationMethod: 'form',
        apiKey: 'secret-key-123',
      };
      
      let storedSettings = { ...DEFAULT_APP_SETTINGS, security: { ...DEFAULT_APP_SETTINGS.security } };
      
      const app = createTestApp({
        get: async () => storedSettings,
        update: async (partial: any) => {
          storedSettings = {
            ...storedSettings,
            security: { ...storedSettings.security, ...partial.security },
          };
          return storedSettings;
        },
      });

      const patchResponse = await app.inject({
        method: 'PATCH',
        url: '/api/settings',
        payload: { security: newSecuritySettings },
      });
      
      expect(patchResponse.statusCode).toBe(200);
      expect(patchResponse.json().data.security).toEqual(newSecuritySettings);
      
      const getResponse = await app.inject({ method: 'GET', url: '/api/settings' });
      expect(getResponse.json().data.security).toEqual(newSecuritySettings);
    });

    it('preserves logging settings in PATCH->GET round-trip', async () => {
      const newLoggingSettings = {
        logLevel: 'debug' as const,
        logSizeLimit: 10485760,
        logRetentionDays: 14,
      };
      
      let storedSettings = { ...DEFAULT_APP_SETTINGS, logging: { ...DEFAULT_APP_SETTINGS.logging } };
      
      const app = createTestApp({
        get: async () => storedSettings,
        update: async (partial: any) => {
          storedSettings = {
            ...storedSettings,
            logging: { ...storedSettings.logging, ...partial.logging },
          };
          return storedSettings;
        },
      });

      const patchResponse = await app.inject({
        method: 'PATCH',
        url: '/api/settings',
        payload: { logging: newLoggingSettings },
      });
      
      expect(patchResponse.statusCode).toBe(200);
      expect(patchResponse.json().data.logging).toEqual(newLoggingSettings);
      
      const getResponse = await app.inject({ method: 'GET', url: '/api/settings' });
      expect(getResponse.json().data.logging).toEqual(newLoggingSettings);
    });

    it('preserves update settings in PATCH->GET round-trip', async () => {
      const newUpdateSettings = {
        autoUpdateEnabled: true,
        branch: 'develop' as const,
        mechanicsEnabled: true,
        updateScriptPath: '/opt/mediarr/update.sh',
      };
      
      let storedSettings = { ...DEFAULT_APP_SETTINGS, update: { ...DEFAULT_APP_SETTINGS.update } };
      
      const app = createTestApp({
        get: async () => storedSettings,
        update: async (partial: any) => {
          storedSettings = {
            ...storedSettings,
            update: { ...storedSettings.update, ...partial.update },
          };
          return storedSettings;
        },
      });

      const patchResponse = await app.inject({
        method: 'PATCH',
        url: '/api/settings',
        payload: { update: newUpdateSettings },
      });
      
      expect(patchResponse.statusCode).toBe(200);
      expect(patchResponse.json().data.update).toEqual(newUpdateSettings);
      
      const getResponse = await app.inject({ method: 'GET', url: '/api/settings' });
      expect(getResponse.json().data.update).toEqual(newUpdateSettings);
    });

    it('supports partial updates within a section', async () => {
      let storedSettings = { ...DEFAULT_APP_SETTINGS, host: { ...DEFAULT_APP_SETTINGS.host } };
      
      const app = createTestApp({
        get: async () => storedSettings,
        update: async (partial: any) => {
          storedSettings = {
            ...storedSettings,
            host: { ...storedSettings.host, ...partial.host },
          };
          return storedSettings;
        },
      });

      // Only update port
      const patchResponse = await app.inject({
        method: 'PATCH',
        url: '/api/settings',
        payload: { host: { port: 9000 } },
      });
      
      expect(patchResponse.statusCode).toBe(200);
      const result = patchResponse.json().data;
      expect(result.host.port).toBe(9000);
      // Other host fields should remain at defaults
      expect(result.host.bindAddress).toBe('*');
      expect(result.host.urlBase).toBe('');
      expect(result.host.enableSsl).toBe(false);
    });

    it('maintains backward compatibility when new fields are absent', async () => {
      const app = createTestApp({
        get: async () => DEFAULT_APP_SETTINGS,
        update: async (partial: any) => ({
          ...DEFAULT_APP_SETTINGS,
          ...partial,
        }),
      });

      const response = await app.inject({ method: 'GET', url: '/api/settings' });
      expect(response.statusCode).toBe(200);
      
      // Should still return all sections with defaults
      const data = response.json().data;
      expect(data.host).toEqual(DEFAULT_APP_SETTINGS.host);
      expect(data.security).toEqual(DEFAULT_APP_SETTINGS.security);
      expect(data.logging).toEqual(DEFAULT_APP_SETTINGS.logging);
      expect(data.update).toEqual(DEFAULT_APP_SETTINGS.update);
    });
  });
});

describe('Logs download URL', () => {
  let apps: FastifyInstance[] = [];

  afterEach(async () => {
    for (const app of apps) {
      await app.close();
    }
    apps = [];
  });

  function createTestApp() {
    const app = createApiServer({
      prisma: {},
    } as any, {
      torrentStatsIntervalMs: 60_000,
      activityPollIntervalMs: 60_000,
      healthPollIntervalMs: 60_000,
    });
    apps.push(app);
    return app;
  }

  describe('GET /api/logs/files/:filename/download', () => {
    it('returns a download URL that points to a working route', async () => {
      const app = createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: '/api/logs/files/mediarr.log/download',
      });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload.data).toHaveProperty('downloadUrl');
      expect(payload.data.filename).toBe('mediarr.log');
      
      // Verify the download URL is served
      const rawUrl = payload.data.downloadUrl;
      expect(rawUrl).toBe('/api/logs/files/mediarr.log/raw');
      
      // Test that the raw URL actually works
      const rawResponse = await app.inject({
        method: 'GET',
        url: rawUrl,
      });
      
      expect(rawResponse.statusCode).toBe(200);
      expect(rawResponse.headers['content-type']).toContain('text/plain');
      expect(rawResponse.headers['content-disposition']).toContain('attachment');
      expect(rawResponse.headers['content-disposition']).toContain('mediarr.log');
      expect(typeof rawResponse.body).toBe('string');
      expect(rawResponse.body.length).toBeGreaterThan(0);
    });

    it('returns 404 for non-existent file in raw endpoint', async () => {
      const app = createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: '/api/logs/files/nonexistent.log/raw',
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().ok).toBe(false);
    });
  });

  describe('GET /api/logs/files/:filename/raw', () => {
    it('serves raw log file content with proper headers', async () => {
      const app = createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: '/api/logs/files/mediarr.log/raw',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');
      expect(response.headers['content-disposition']).toBe('attachment; filename="mediarr.log"');
      expect(response.body).toContain('[2024-02-15');
    });

    it('handles URL-encoded filenames correctly', async () => {
      const app = createTestApp();

      // First get the download URL
      const downloadResponse = await app.inject({
        method: 'GET',
        url: '/api/logs/files/mediarr.trace.log/download',
      });

      expect(downloadResponse.statusCode).toBe(200);
      const downloadUrl = downloadResponse.json().data.downloadUrl;

      // Verify the raw endpoint works with the encoded URL
      const rawResponse = await app.inject({
        method: 'GET',
        url: downloadUrl,
      });

      expect(rawResponse.statusCode).toBe(200);
    });
  });
});
