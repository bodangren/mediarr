import type { Prisma, PrismaClient } from '@prisma/client';

export interface TorrentLimitsSettings {
  maxActiveDownloads: number;
  maxActiveSeeds: number;
  globalDownloadLimitKbps: number | null;
  globalUploadLimitKbps: number | null;
  incompleteDirectory: string;
  completeDirectory: string;
  seedRatioLimit: number;
  seedTimeLimitMinutes: number;
  seedLimitAction: 'pause' | 'remove';
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

export interface ApiKeysSettings {
  tmdbApiKey: string | null;
  openSubtitlesApiKey: string | null;
  assrtApiToken: string | null;
  subdlApiKey: string | null;
}

export interface HostSettings {
  bindAddress: string;
  port: number;
  urlBase: string;
  sslPort: number;
  enableSsl: boolean;
  sslCertPath: string | null;
  sslKeyPath: string | null;
}

export interface SecuritySettings {
  authenticationRequired: boolean;
  authenticationMethod: 'none' | 'basic' | 'form';
  apiKey: string | null;
}

export interface LoggingSettings {
  logLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  logSizeLimit: number;
  logRetentionDays: number;
}

export interface UpdateSettings {
  branch: 'master' | 'develop' | 'phantom';
  autoUpdateEnabled: boolean;
  mechanicsEnabled: boolean;
  updateScriptPath: string | null;
}

export interface MediaManagementSettings {
  movieRootFolder: string;
  tvRootFolder: string;
}

export interface StreamingSettings {
  discoveryEnabled: boolean;
  discoveryServiceName: string;
  defaultUserId: string;
  watchedThreshold: number;
  subtitleDirectory: string | null;
}

export interface AppSettingsPayload {
  torrentLimits: TorrentLimitsSettings;
  schedulerIntervals: SchedulerIntervalsSettings;
  pathVisibility: PathVisibilitySettings;
  apiKeys: ApiKeysSettings;
  wantedLanguages: string[];
  host: HostSettings;
  security: SecuritySettings;
  logging: LoggingSettings;
  update: UpdateSettings;
  mediaManagement: MediaManagementSettings;
  streaming: StreamingSettings;
}

export const DEFAULT_MEDIA_MANAGEMENT_SETTINGS: MediaManagementSettings = {
  movieRootFolder: '',
  tvRootFolder: '',
};

export const DEFAULT_STREAMING_SETTINGS: StreamingSettings = {
  discoveryEnabled: true,
  discoveryServiceName: 'Mediarr',
  defaultUserId: 'lan-default',
  watchedThreshold: 0.9,
  subtitleDirectory: null,
};

export const DEFAULT_APP_SETTINGS: AppSettingsPayload = {
  torrentLimits: {
    maxActiveDownloads: 3,
    maxActiveSeeds: 3,
    globalDownloadLimitKbps: null,
    globalUploadLimitKbps: null,
    incompleteDirectory: '',
    completeDirectory: '',
    seedRatioLimit: 0,
    seedTimeLimitMinutes: 0,
    seedLimitAction: 'pause',
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
  apiKeys: {
    tmdbApiKey: null,
    openSubtitlesApiKey: null,
    assrtApiToken: null,
    subdlApiKey: null,
  },
  wantedLanguages: [],
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
  logging: {
    logLevel: 'info',
    logSizeLimit: 1048576,
    logRetentionDays: 30,
  },
  update: {
    branch: 'master',
    autoUpdateEnabled: false,
    mechanicsEnabled: false,
    updateScriptPath: null,
  },
  mediaManagement: DEFAULT_MEDIA_MANAGEMENT_SETTINGS,
  streaming: DEFAULT_STREAMING_SETTINGS,
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

function readNullableString(value: unknown, fallback: string | null): string | null {
  if (typeof value === 'string') {
    return value;
  }
  return fallback;
}

function readNullableTrimmedString(value: unknown, fallback: string | null): string | null {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function readString(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    return value;
  }
  return fallback;
}

function readTrimmedString(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function readStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const next = value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim().toLowerCase())
    .filter(item => item.length > 0);

  return Array.from(new Set(next));
}

function readLogLevel(value: unknown, fallback: LoggingSettings['logLevel']): LoggingSettings['logLevel'] {
  if (
    value === 'trace' ||
    value === 'debug' ||
    value === 'info' ||
    value === 'warn' ||
    value === 'error' ||
    value === 'fatal'
  ) {
    return value;
  }
  return fallback;
}

function readAuthenticationMethod(
  value: unknown,
  fallback: SecuritySettings['authenticationMethod'],
): SecuritySettings['authenticationMethod'] {
  if (value === 'none' || value === 'basic' || value === 'form') {
    return value;
  }

  return fallback;
}

function readUpdateBranch(value: unknown, fallback: UpdateSettings['branch']): UpdateSettings['branch'] {
  if (value === 'master' || value === 'develop' || value === 'phantom') {
    return value;
  }

  return fallback;
}

function readSeedLimitAction(
  value: unknown,
  fallback: TorrentLimitsSettings['seedLimitAction'],
): TorrentLimitsSettings['seedLimitAction'] {
  if (value === 'pause' || value === 'remove') {
    return value;
  }

  return fallback;
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
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
          apiKeys: toJson(DEFAULT_APP_SETTINGS.apiKeys),
          host: toJson(DEFAULT_APP_SETTINGS.host),
          security: toJson(DEFAULT_APP_SETTINGS.security),
          logging: toJson(DEFAULT_APP_SETTINGS.logging),
          update: toJson({
            ...DEFAULT_APP_SETTINGS.update,
            wantedLanguages: DEFAULT_APP_SETTINGS.wantedLanguages,
          }),
          mediaManagement: toJson(DEFAULT_APP_SETTINGS.mediaManagement),
          streaming: toJson(DEFAULT_APP_SETTINGS.streaming),
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
      apiKeys: {
        ...current.apiKeys,
        ...partial.apiKeys,
      },
      wantedLanguages: readStringArray(
        partial.wantedLanguages,
        current.wantedLanguages,
      ),
      host: {
        ...current.host,
        ...partial.host,
      },
      security: {
        ...current.security,
        ...partial.security,
      },
      logging: {
        ...current.logging,
        ...partial.logging,
      },
      update: {
        ...current.update,
        ...partial.update,
      },
      mediaManagement: {
        ...current.mediaManagement,
        ...partial.mediaManagement,
      },
      streaming: {
        ...current.streaming,
        ...partial.streaming,
      },
    };

    await this.prisma.appSettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        torrentLimits: toJson(merged.torrentLimits),
        schedulerIntervals: toJson(merged.schedulerIntervals),
        pathVisibility: toJson(merged.pathVisibility),
        apiKeys: toJson(merged.apiKeys),
        host: toJson(merged.host),
        security: toJson(merged.security),
        logging: toJson(merged.logging),
        update: toJson({
          ...merged.update,
          wantedLanguages: merged.wantedLanguages,
        }),
        mediaManagement: toJson(merged.mediaManagement),
        streaming: toJson(merged.streaming),
      },
      update: {
        torrentLimits: toJson(merged.torrentLimits),
        schedulerIntervals: toJson(merged.schedulerIntervals),
        pathVisibility: toJson(merged.pathVisibility),
        apiKeys: toJson(merged.apiKeys),
        host: toJson(merged.host),
        security: toJson(merged.security),
        logging: toJson(merged.logging),
        update: toJson({
          ...merged.update,
          wantedLanguages: merged.wantedLanguages,
        }),
        mediaManagement: toJson(merged.mediaManagement),
        streaming: toJson(merged.streaming),
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
        apiKeys: toJson(payload.apiKeys),
        host: toJson(payload.host),
        security: toJson(payload.security),
        logging: toJson(payload.logging),
        update: toJson({
          ...payload.update,
          wantedLanguages: payload.wantedLanguages,
        }),
        mediaManagement: toJson(payload.mediaManagement),
        streaming: toJson(payload.streaming),
      },
      update: {
        torrentLimits: toJson(payload.torrentLimits),
        schedulerIntervals: toJson(payload.schedulerIntervals),
        pathVisibility: toJson(payload.pathVisibility),
        apiKeys: toJson(payload.apiKeys),
        host: toJson(payload.host),
        security: toJson(payload.security),
        logging: toJson(payload.logging),
        update: toJson({
          ...payload.update,
          wantedLanguages: payload.wantedLanguages,
        }),
        mediaManagement: toJson(payload.mediaManagement),
        streaming: toJson(payload.streaming),
      },
    });

    return payload;
  }

  private mapRecordToPayload(record: {
    torrentLimits: unknown;
    schedulerIntervals: unknown;
    pathVisibility: unknown;
    apiKeys?: unknown;
    host?: unknown;
    security?: unknown;
    logging?: unknown;
    update?: unknown;
    mediaManagement?: unknown;
    streaming?: unknown;
  }): AppSettingsPayload {
    const torrentLimits = readObject(record.torrentLimits);
    const schedulerIntervals = readObject(record.schedulerIntervals);
    const pathVisibility = readObject(record.pathVisibility);
    const apiKeys = readObject(record.apiKeys ?? {});
    const host = readObject(record.host ?? {});
    const security = readObject(record.security ?? {});
    const logging = readObject(record.logging ?? {});
    const update = readObject(record.update ?? {});
    const mediaManagement = readObject(record.mediaManagement ?? {});
    const streaming = readObject(record.streaming ?? {});

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
        incompleteDirectory: readString(
          torrentLimits.incompleteDirectory,
          DEFAULT_APP_SETTINGS.torrentLimits.incompleteDirectory,
        ),
        completeDirectory: readString(
          torrentLimits.completeDirectory,
          DEFAULT_APP_SETTINGS.torrentLimits.completeDirectory,
        ),
        seedRatioLimit: readNumber(
          torrentLimits.seedRatioLimit,
          DEFAULT_APP_SETTINGS.torrentLimits.seedRatioLimit,
        ),
        seedTimeLimitMinutes: readNumber(
          torrentLimits.seedTimeLimitMinutes,
          DEFAULT_APP_SETTINGS.torrentLimits.seedTimeLimitMinutes,
        ),
        seedLimitAction: readSeedLimitAction(
          torrentLimits.seedLimitAction,
          DEFAULT_APP_SETTINGS.torrentLimits.seedLimitAction,
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
      apiKeys: {
        tmdbApiKey: readNullableString(
          apiKeys.tmdbApiKey,
          DEFAULT_APP_SETTINGS.apiKeys.tmdbApiKey,
        ),
        openSubtitlesApiKey: readNullableString(
          apiKeys.openSubtitlesApiKey,
          DEFAULT_APP_SETTINGS.apiKeys.openSubtitlesApiKey,
        ),
        assrtApiToken: readNullableString(
          apiKeys.assrtApiToken,
          DEFAULT_APP_SETTINGS.apiKeys.assrtApiToken,
        ),
        subdlApiKey: readNullableString(
          apiKeys.subdlApiKey,
          DEFAULT_APP_SETTINGS.apiKeys.subdlApiKey,
        ),
      },
      wantedLanguages: readStringArray(
        update.wantedLanguages,
        DEFAULT_APP_SETTINGS.wantedLanguages,
      ),
      host: {
        bindAddress: readString(
          host.bindAddress,
          DEFAULT_APP_SETTINGS.host.bindAddress,
        ),
        port: readNumber(
          host.port,
          DEFAULT_APP_SETTINGS.host.port,
        ),
        urlBase: readString(
          host.urlBase,
          DEFAULT_APP_SETTINGS.host.urlBase,
        ),
        sslPort: readNumber(
          host.sslPort,
          DEFAULT_APP_SETTINGS.host.sslPort,
        ),
        enableSsl: readBoolean(
          host.enableSsl,
          DEFAULT_APP_SETTINGS.host.enableSsl,
        ),
        sslCertPath: readNullableString(
          host.sslCertPath,
          DEFAULT_APP_SETTINGS.host.sslCertPath,
        ),
        sslKeyPath: readNullableString(
          host.sslKeyPath,
          DEFAULT_APP_SETTINGS.host.sslKeyPath,
        ),
      },
      security: {
        authenticationRequired: readBoolean(
          security.authenticationRequired,
          DEFAULT_APP_SETTINGS.security.authenticationRequired,
        ),
        authenticationMethod: readAuthenticationMethod(
          security.authenticationMethod,
          DEFAULT_APP_SETTINGS.security.authenticationMethod,
        ),
        apiKey: readNullableString(
          security.apiKey,
          DEFAULT_APP_SETTINGS.security.apiKey,
        ),
      },
      logging: {
        logLevel: readLogLevel(
          logging.logLevel,
          DEFAULT_APP_SETTINGS.logging.logLevel,
        ),
        logSizeLimit: readNumber(
          logging.logSizeLimit,
          DEFAULT_APP_SETTINGS.logging.logSizeLimit,
        ),
        logRetentionDays: readNumber(
          logging.logRetentionDays,
          DEFAULT_APP_SETTINGS.logging.logRetentionDays,
        ),
      },
      update: {
        branch: readUpdateBranch(
          update.branch,
          DEFAULT_APP_SETTINGS.update.branch,
        ),
        autoUpdateEnabled: readBoolean(
          update.autoUpdateEnabled,
          DEFAULT_APP_SETTINGS.update.autoUpdateEnabled,
        ),
        mechanicsEnabled: readBoolean(
          update.mechanicsEnabled,
          DEFAULT_APP_SETTINGS.update.mechanicsEnabled,
        ),
        updateScriptPath: readNullableString(
          update.updateScriptPath,
          DEFAULT_APP_SETTINGS.update.updateScriptPath,
        ),
      },
      mediaManagement: {
        movieRootFolder: readString(
          mediaManagement.movieRootFolder,
          DEFAULT_MEDIA_MANAGEMENT_SETTINGS.movieRootFolder,
        ),
        tvRootFolder: readString(
          mediaManagement.tvRootFolder,
          DEFAULT_MEDIA_MANAGEMENT_SETTINGS.tvRootFolder,
        ),
      },
      streaming: {
        discoveryEnabled: readBoolean(
          streaming.discoveryEnabled,
          DEFAULT_APP_SETTINGS.streaming.discoveryEnabled,
        ),
        discoveryServiceName: readTrimmedString(
          streaming.discoveryServiceName,
          DEFAULT_APP_SETTINGS.streaming.discoveryServiceName,
        ),
        defaultUserId: readTrimmedString(
          streaming.defaultUserId,
          DEFAULT_APP_SETTINGS.streaming.defaultUserId,
        ),
        watchedThreshold: clamp(
          readNumber(
            streaming.watchedThreshold,
            DEFAULT_APP_SETTINGS.streaming.watchedThreshold,
          ),
          0,
          1,
        ),
        subtitleDirectory: readNullableTrimmedString(
          streaming.subtitleDirectory,
          DEFAULT_APP_SETTINGS.streaming.subtitleDirectory,
        ),
      },
    };
  }
}
