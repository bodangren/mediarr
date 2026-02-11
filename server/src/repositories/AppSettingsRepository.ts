import type { Prisma, PrismaClient } from '@prisma/client';

export interface TorrentLimitsSettings {
  maxActiveDownloads: number;
  maxActiveSeeds: number;
  globalDownloadLimitKbps: number | null;
  globalUploadLimitKbps: number | null;
}

export interface SchedulerIntervalsSettings {
  rssSyncMinutes: number;
  availabilityCheckMinutes: number;
  torrentMonitoringSeconds: number;
}

export interface PathVisibilitySettings {
  showDownloadPath: boolean;
  showMediaPath: boolean;
}

export interface AppSettingsPayload {
  torrentLimits: TorrentLimitsSettings;
  schedulerIntervals: SchedulerIntervalsSettings;
  pathVisibility: PathVisibilitySettings;
}

export const DEFAULT_APP_SETTINGS: AppSettingsPayload = {
  torrentLimits: {
    maxActiveDownloads: 3,
    maxActiveSeeds: 3,
    globalDownloadLimitKbps: null,
    globalUploadLimitKbps: null,
  },
  schedulerIntervals: {
    rssSyncMinutes: 15,
    availabilityCheckMinutes: 30,
    torrentMonitoringSeconds: 5,
  },
  pathVisibility: {
    showDownloadPath: true,
    showMediaPath: true,
  },
};

function readObject(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function readNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return fallback;
}

function readNullableNumber(value: unknown, fallback: number | null): number | null {
  if (value === null) {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return fallback;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  return fallback;
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

/**
 * Persists app-level settings using a single-row record.
 */
export class AppSettingsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async get(): Promise<AppSettingsPayload> {
    const record = await this.prisma.appSettings.findUnique({
      where: { id: 1 },
    });

    if (!record) {
      await this.prisma.appSettings.create({
        data: {
          id: 1,
          torrentLimits: toJson(DEFAULT_APP_SETTINGS.torrentLimits),
          schedulerIntervals: toJson(DEFAULT_APP_SETTINGS.schedulerIntervals),
          pathVisibility: toJson(DEFAULT_APP_SETTINGS.pathVisibility),
        },
      });

      return DEFAULT_APP_SETTINGS;
    }

    return this.mapRecordToPayload(record);
  }

  async update(partial: Partial<AppSettingsPayload>): Promise<AppSettingsPayload> {
    const current = await this.get();
    const merged: AppSettingsPayload = {
      torrentLimits: {
        ...current.torrentLimits,
        ...partial.torrentLimits,
      },
      schedulerIntervals: {
        ...current.schedulerIntervals,
        ...partial.schedulerIntervals,
      },
      pathVisibility: {
        ...current.pathVisibility,
        ...partial.pathVisibility,
      },
    };

    await this.prisma.appSettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        torrentLimits: toJson(merged.torrentLimits),
        schedulerIntervals: toJson(merged.schedulerIntervals),
        pathVisibility: toJson(merged.pathVisibility),
      },
      update: {
        torrentLimits: toJson(merged.torrentLimits),
        schedulerIntervals: toJson(merged.schedulerIntervals),
        pathVisibility: toJson(merged.pathVisibility),
      },
    });

    return merged;
  }

  async replace(payload: AppSettingsPayload): Promise<AppSettingsPayload> {
    await this.prisma.appSettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        torrentLimits: toJson(payload.torrentLimits),
        schedulerIntervals: toJson(payload.schedulerIntervals),
        pathVisibility: toJson(payload.pathVisibility),
      },
      update: {
        torrentLimits: toJson(payload.torrentLimits),
        schedulerIntervals: toJson(payload.schedulerIntervals),
        pathVisibility: toJson(payload.pathVisibility),
      },
    });

    return payload;
  }

  private mapRecordToPayload(record: {
    torrentLimits: unknown;
    schedulerIntervals: unknown;
    pathVisibility: unknown;
  }): AppSettingsPayload {
    const torrentLimits = readObject(record.torrentLimits);
    const schedulerIntervals = readObject(record.schedulerIntervals);
    const pathVisibility = readObject(record.pathVisibility);

    return {
      torrentLimits: {
        maxActiveDownloads: readNumber(
          torrentLimits.maxActiveDownloads,
          DEFAULT_APP_SETTINGS.torrentLimits.maxActiveDownloads,
        ),
        maxActiveSeeds: readNumber(
          torrentLimits.maxActiveSeeds,
          DEFAULT_APP_SETTINGS.torrentLimits.maxActiveSeeds,
        ),
        globalDownloadLimitKbps: readNullableNumber(
          torrentLimits.globalDownloadLimitKbps,
          DEFAULT_APP_SETTINGS.torrentLimits.globalDownloadLimitKbps,
        ),
        globalUploadLimitKbps: readNullableNumber(
          torrentLimits.globalUploadLimitKbps,
          DEFAULT_APP_SETTINGS.torrentLimits.globalUploadLimitKbps,
        ),
      },
      schedulerIntervals: {
        rssSyncMinutes: readNumber(
          schedulerIntervals.rssSyncMinutes,
          DEFAULT_APP_SETTINGS.schedulerIntervals.rssSyncMinutes,
        ),
        availabilityCheckMinutes: readNumber(
          schedulerIntervals.availabilityCheckMinutes,
          DEFAULT_APP_SETTINGS.schedulerIntervals.availabilityCheckMinutes,
        ),
        torrentMonitoringSeconds: readNumber(
          schedulerIntervals.torrentMonitoringSeconds,
          DEFAULT_APP_SETTINGS.schedulerIntervals.torrentMonitoringSeconds,
        ),
      },
      pathVisibility: {
        showDownloadPath: readBoolean(
          pathVisibility.showDownloadPath,
          DEFAULT_APP_SETTINGS.pathVisibility.showDownloadPath,
        ),
        showMediaPath: readBoolean(
          pathVisibility.showMediaPath,
          DEFAULT_APP_SETTINGS.pathVisibility.showMediaPath,
        ),
      },
    };
  }
}
