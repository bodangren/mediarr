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
  });
});
