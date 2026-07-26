import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsService } from './SettingsService';
import {
  type AppSettingsPayload,
  AppSettingsRepository,
} from '../repositories/AppSettingsRepository';

function makeRepository() {
  return {
    get: vi.fn(),
    update: vi.fn(),
    replace: vi.fn(),
  };
}

const samplePayload: AppSettingsPayload = {
  torrentLimits: {
    maxActiveDownloads: 3,
    maxActiveSeeds: 3,
    globalDownloadLimitKbps: null,
    globalUploadLimitKbps: null,
    incompleteDirectory: '/downloads/incomplete',
    completeDirectory: '/downloads/complete',
    seedRatioLimit: 0,
    seedTimeLimitMinutes: 0,
    seedLimitAction: 'pause',
  },
  schedulerIntervals: {
    rssSyncMinutes: 15,
    availabilityCheckMinutes: 30,
    torrentMonitoringSeconds: 5,
    wantedSearchMinutes: 60,
  },
  pathVisibility: { showDownloadPath: true, showMediaPath: true },
  apiKeys: {
    tmdbApiKey: null,
    openSubtitlesApiKey: null,
    assrtApiToken: null,
    subdlApiKey: null,
  },
  wantedLanguages: ['en'],
  host: {
    bindAddress: '*',
    port: 9696,
    urlBase: '',
    sslPort: 9697,
    enableSsl: false,
    sslCertPath: null,
    sslKeyPath: null,
  },
  security: {
    authenticationRequired: false,
    authenticationMethod: 'none',
    apiKey: null,
  },
  logging: { logLevel: 'info', logSizeLimit: 1048576, logRetentionDays: 30 },
  update: {
    branch: 'master',
    autoUpdateEnabled: false,
    mechanicsEnabled: false,
    updateScriptPath: null,
    setupCompleted: true,
  },
  mediaManagement: {
    movieRootFolder: '/movies',
    tvRootFolder: '/tv',
    movieNamingPattern: '{Movie Title} ({Release Year})',
    seriesNamingPattern: '{Series Title} - S{season:00}E{episode:00}',
  },
  streaming: {
    discoveryEnabled: true,
    discoveryServiceName: 'Mediarr',
    defaultUserId: 'lan-default',
    watchedThreshold: 0.9,
    subtitleDirectory: null,
  },
};

describe('SettingsService', () => {
  let repository: ReturnType<typeof makeRepository>;
  let service: SettingsService;

  beforeEach(() => {
    repository = makeRepository();
    service = new SettingsService(repository as unknown as AppSettingsRepository);
  });

  describe('get', () => {
    it('returns the full settings object from the repository', async () => {
      repository.get.mockResolvedValue(samplePayload);

      const result = await service.get();

      expect(repository.get).toHaveBeenCalledTimes(1);
      expect(repository.get).toHaveBeenCalledWith();
      expect(result).toEqual(samplePayload);
    });

    it('propagates repository errors on get', async () => {
      const failure = new Error('database unavailable');
      repository.get.mockRejectedValue(failure);

      await expect(service.get()).rejects.toThrow('database unavailable');
      expect(repository.get).toHaveBeenCalledTimes(1);
    });

    it('propagates non-Error rejection reasons unchanged', async () => {
      repository.get.mockRejectedValue('connection reset');

      await expect(service.get()).rejects.toBe('connection reset');
    });

    it('returns the exact object reference resolved by the repository (no cloning)', async () => {
      repository.get.mockResolvedValue(samplePayload);

      const result = await service.get();

      expect(result).toBe(samplePayload);
    });

    it('calls the repository fresh on every invocation (no caching)', async () => {
      repository.get.mockResolvedValueOnce(samplePayload);
      repository.get.mockResolvedValueOnce({ ...samplePayload, wantedLanguages: ['fr'] });

      const first = await service.get();
      const second = await service.get();

      expect(repository.get).toHaveBeenCalledTimes(2);
      expect(first.wantedLanguages).toEqual(['en']);
      expect(second.wantedLanguages).toEqual(['fr']);
    });

    it('does not touch the repository until get() is called', () => {
      expect(repository.get).not.toHaveBeenCalled();
      expect(repository.update).not.toHaveBeenCalled();
      expect(repository.replace).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('forwards a partial payload to the repository and returns the merged result', async () => {
      const partial = { host: { ...samplePayload.host, port: 8080 } };
      const merged: AppSettingsPayload = {
        ...samplePayload,
        host: { ...samplePayload.host, port: 8080 },
      };
      repository.update.mockResolvedValue(merged);

      const result = await service.update(partial);

      expect(repository.update).toHaveBeenCalledTimes(1);
      expect(repository.update).toHaveBeenCalledWith(partial);
      expect(result).toEqual(merged);
    });

    it('forwards an empty partial payload without modifying it', async () => {
      repository.update.mockResolvedValue(samplePayload);

      const result = await service.update({});

      expect(repository.update).toHaveBeenCalledTimes(1);
      expect(repository.update).toHaveBeenCalledWith({});
      expect(result).toEqual(samplePayload);
    });

    it('propagates repository errors on update', async () => {
      const failure = new Error('unique-constraint violation');
      repository.update.mockRejectedValue(failure);

      await expect(service.update({ host: samplePayload.host })).rejects.toThrow(
        'unique-constraint violation',
      );
      expect(repository.update).toHaveBeenCalledTimes(1);
    });

    it('propagates non-Error rejection reasons on update unchanged', async () => {
      repository.update.mockRejectedValue({ code: 'SQLITE_BUSY' });

      await expect(service.update({})).rejects.toEqual({ code: 'SQLITE_BUSY' });
    });

    it('forwards a deeply nested single-field partial without altering shape', async () => {
      const partial = { apiKeys: { ...samplePayload.apiKeys, tmdbApiKey: 'abc123' } };
      repository.update.mockResolvedValue({ ...samplePayload, ...partial });

      await service.update(partial);

      const forwarded = repository.update.mock.calls[0]![0];
      expect(forwarded).toBe(partial);
      expect(forwarded.apiKeys).toEqual({ ...samplePayload.apiKeys, tmdbApiKey: 'abc123' });
    });

    it('forwards partial payloads containing edge-case enum and null values verbatim', async () => {
      const partial = {
        security: { authenticationRequired: true, authenticationMethod: 'form' as const, apiKey: null },
        logging: { logLevel: 'trace' as const, logSizeLimit: 0, logRetentionDays: 0 },
        update: {
          branch: 'phantom' as const,
          autoUpdateEnabled: false,
          mechanicsEnabled: false,
          updateScriptPath: null,
          setupCompleted: false,
        },
      };
      repository.update.mockResolvedValue({ ...samplePayload, ...partial });

      const result = await service.update(partial);

      expect(repository.update).toHaveBeenCalledWith(partial);
      expect(result.security.authenticationMethod).toBe('form');
      expect(result.update.branch).toBe('phantom');
    });

    it('preserves array reference identity for array-valued partials (no defensive copy)', async () => {
      const languages = ['en', 'ja', 'ko'];
      const partial = { wantedLanguages: languages };
      repository.update.mockResolvedValue({ ...samplePayload, wantedLanguages: languages });

      await service.update(partial);

      const forwarded = repository.update.mock.calls[0]![0];
      expect(forwarded.wantedLanguages).toBe(languages);
    });

    it('invokes the repository once per call with independent arguments, in order', async () => {
      repository.update.mockResolvedValueOnce({ ...samplePayload, host: { ...samplePayload.host, port: 1 } });
      repository.update.mockResolvedValueOnce({ ...samplePayload, host: { ...samplePayload.host, port: 2 } });

      await service.update({ host: { ...samplePayload.host, port: 1 } });
      await service.update({ host: { ...samplePayload.host, port: 2 } });

      expect(repository.update).toHaveBeenCalledTimes(2);
      expect(repository.update.mock.calls[0]![0]).toEqual({ host: { ...samplePayload.host, port: 1 } });
      expect(repository.update.mock.calls[1]![0]).toEqual({ host: { ...samplePayload.host, port: 2 } });
    });
  });

  describe('replace', () => {
    it('forwards the full payload to the repository and returns the persisted result', async () => {
      const replacement: AppSettingsPayload = {
        ...samplePayload,
        wantedLanguages: ['en', 'fr'],
        update: { ...samplePayload.update, autoUpdateEnabled: true },
      };
      repository.replace.mockResolvedValue(replacement);

      const result = await service.replace(replacement);

      expect(repository.replace).toHaveBeenCalledTimes(1);
      expect(repository.replace).toHaveBeenCalledWith(replacement);
      expect(result).toEqual(replacement);
    });

    it('propagates repository errors on replace', async () => {
      const failure = new Error('write conflict');
      repository.replace.mockRejectedValue(failure);

      await expect(service.replace(samplePayload)).rejects.toThrow('write conflict');
      expect(repository.replace).toHaveBeenCalledTimes(1);
    });

    it('propagates non-Error rejection reasons on replace unchanged', async () => {
      repository.replace.mockRejectedValue(null);

      await expect(service.replace(samplePayload)).rejects.toBeNull();
    });

    it('forwards a full payload with extreme numeric and null edge values verbatim', async () => {
      const edgePayload: AppSettingsPayload = {
        ...samplePayload,
        host: {
          bindAddress: '0.0.0.0',
          port: 0,
          urlBase: '',
          sslPort: 65535,
          enableSsl: true,
          sslCertPath: null,
          sslKeyPath: null,
        },
        torrentLimits: {
          ...samplePayload.torrentLimits,
          globalDownloadLimitKbps: 0,
          globalUploadLimitKbps: null,
          seedLimitAction: 'remove',
        },
        wantedLanguages: [],
        streaming: { ...samplePayload.streaming, watchedThreshold: 0, subtitleDirectory: null },
      };
      repository.replace.mockResolvedValue(edgePayload);

      const result = await service.replace(edgePayload);

      expect(repository.replace).toHaveBeenCalledWith(edgePayload);
      expect(result.wantedLanguages).toEqual([]);
      expect(result.torrentLimits.seedLimitAction).toBe('remove');
      expect(result.host.port).toBe(0);
    });

    it('forwards the exact payload reference without cloning', async () => {
      repository.replace.mockResolvedValue(samplePayload);

      await service.replace(samplePayload);

      expect(repository.replace.mock.calls[0]![0]).toBe(samplePayload);
    });

    it('does not call get or update when replace is invoked', async () => {
      repository.replace.mockResolvedValue(samplePayload);

      await service.replace(samplePayload);

      expect(repository.get).not.toHaveBeenCalled();
      expect(repository.update).not.toHaveBeenCalled();
    });
  });
});
