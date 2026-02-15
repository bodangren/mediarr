import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import 'dotenv/config';
import { AppSettingsRepository } from '../server/src/repositories/AppSettingsRepository';
import { SettingsService } from '../server/src/services/SettingsService';

function resolveTestDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.startsWith('file:/config/')) {
    return 'file:./mediarr.db';
  }
  return databaseUrl;
}

const adapter = new PrismaBetterSqlite3({ url: resolveTestDatabaseUrl() });
const prisma = new PrismaClient({ adapter });
const repository = new AppSettingsRepository(prisma);
const service = new SettingsService(repository);

describe('AppSettingsRepository', () => {
  beforeEach(async () => {
    await prisma.appSettings.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should return typed defaults on first run', async () => {
    const settings = await repository.get();

    expect(settings.torrentLimits.maxActiveDownloads).toBeGreaterThan(0);
    expect(settings.schedulerIntervals.rssSyncMinutes).toBeGreaterThan(0);
    expect(settings.pathVisibility.showDownloadPath).toBe(true);
    expect(settings.apiKeys.tmdbApiKey).toBe(null);
    // New sections
    expect(settings.host.bindAddress).toBe('*');
    expect(settings.host.port).toBe(9696);
    expect(settings.security.authenticationRequired).toBe(false);
    expect(settings.security.authenticationMethod).toBe('none');
    expect(settings.logging.logLevel).toBe('info');
    expect(settings.update.autoUpdateEnabled).toBe(false);
  });

  it('should merge partial updates without dropping untouched sections', async () => {
    await repository.get();

    const updated = await repository.update({
      torrentLimits: {
        maxActiveDownloads: 8,
      },
      apiKeys: {
        tmdbApiKey: 'partial-update-key',
      }
    });

    expect(updated.torrentLimits.maxActiveDownloads).toBe(8);
    expect(updated.schedulerIntervals.rssSyncMinutes).toBeGreaterThan(0);
    expect(updated.pathVisibility.showMediaPath).toBe(true);
    expect(updated.apiKeys.tmdbApiKey).toBe('partial-update-key');
  });

  it('should replace settings payload fully via SettingsService', async () => {
    const replaced = await service.replace({
      torrentLimits: {
        maxActiveDownloads: 2,
        maxActiveSeeds: 4,
        globalDownloadLimitKbps: 1024,
        globalUploadLimitKbps: 512,
      },
      schedulerIntervals: {
        rssSyncMinutes: 12,
        availabilityCheckMinutes: 20,
        torrentMonitoringSeconds: 10,
      },
      pathVisibility: {
        showDownloadPath: false,
        showMediaPath: false,
      },
      apiKeys: {
        tmdbApiKey: 'replaced-key',
      },
      host: {
        bindAddress: '127.0.0.1',
        port: 8080,
        urlBase: '/test',
        sslPort: 8443,
        enableSsl: true,
        sslCertPath: '/tmp/cert.pem',
        sslKeyPath: '/tmp/key.pem',
      },
      security: {
        authenticationRequired: true,
        authenticationMethod: 'form',
        apiKey: 'key123',
      },
      logging: {
        logLevel: 'debug',
        logSizeLimit: 2097152,
        logRetentionDays: 14,
      },
      update: {
        branch: 'develop',
        autoUpdateEnabled: true,
        mechanicsEnabled: true,
        updateScriptPath: '/path/to/script.sh',
      },
    });

    expect(replaced.torrentLimits.maxActiveSeeds).toBe(4);
    expect(replaced.schedulerIntervals.torrentMonitoringSeconds).toBe(10);
    expect(replaced.pathVisibility.showMediaPath).toBe(false);
    expect(replaced.apiKeys.tmdbApiKey).toBe('replaced-key');
    // New sections
    expect(replaced.host.bindAddress).toBe('127.0.0.1');
    expect(replaced.host.port).toBe(8080);
    expect(replaced.security.authenticationRequired).toBe(true);
    expect(replaced.logging.logLevel).toBe('debug');
    expect(replaced.update.autoUpdateEnabled).toBe(true);
  });
});
