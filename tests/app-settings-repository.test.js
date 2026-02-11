import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import 'dotenv/config';
import { AppSettingsRepository } from '../server/src/repositories/AppSettingsRepository';
import { SettingsService } from '../server/src/services/SettingsService';

const adapter = new PrismaBetterSqlite3({ url: 'file:prisma/dev.db' });
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
  });

  it('should merge partial updates without dropping untouched sections', async () => {
    await repository.get();

    const updated = await repository.update({
      torrentLimits: {
        maxActiveDownloads: 8,
      },
    });

    expect(updated.torrentLimits.maxActiveDownloads).toBe(8);
    expect(updated.schedulerIntervals.rssSyncMinutes).toBeGreaterThan(0);
    expect(updated.pathVisibility.showMediaPath).toBe(true);
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
    });

    expect(replaced.torrentLimits.maxActiveSeeds).toBe(4);
    expect(replaced.schedulerIntervals.torrentMonitoringSeconds).toBe(10);
    expect(replaced.pathVisibility.showMediaPath).toBe(false);
  });
});
