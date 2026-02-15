import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';

const settingsSchema = z.object({
  torrentLimits: z.object({
    maxActiveDownloads: z.number(),
    maxActiveSeeds: z.number(),
    globalDownloadLimitKbps: z.number().nullable(),
    globalUploadLimitKbps: z.number().nullable(),
  }),
  schedulerIntervals: z.object({
    rssSyncMinutes: z.number(),
    availabilityCheckMinutes: z.number(),
    torrentMonitoringSeconds: z.number(),
  }),
  pathVisibility: z.object({
    showDownloadPath: z.boolean(),
    showMediaPath: z.boolean(),
  }),
  apiKeys: z.object({
    tmdbApiKey: z.string().nullable().optional(),
    openSubtitlesApiKey: z.string().nullable().optional(),
  }).optional(),
  host: z.object({
    port: z.number(),
    bindAddress: z.string(),
    urlBase: z.string().nullable().optional(),
    sslPort: z.number().nullable().optional(),
    enableSsl: z.boolean(),
    sslCertPath: z.string().nullable().optional(),
    sslKeyPath: z.string().nullable().optional(),
  }).optional(),
  security: z.object({
    apiKey: z.string().nullable().optional(),
    authenticationMethod: z.enum(['none', 'basic', 'form']),
    authenticationRequired: z.boolean(),
  }).optional(),
  logging: z.object({
    logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']),
    logSizeLimit: z.number(),
    logRetentionDays: z.number(),
  }).optional(),
  update: z.object({
    branch: z.enum(['master', 'develop', 'phantom']),
    autoUpdateEnabled: z.boolean(),
    mechanicsEnabled: z.boolean(),
    updateScriptPath: z.string().nullable().optional(),
  }).optional(),
});

export type AppSettings = z.infer<typeof settingsSchema>;

export function createSettingsApi(client: ApiHttpClient) {
  return {
    get(): Promise<AppSettings> {
      return client.request(
        {
          path: routeMap.settings,
        },
        settingsSchema,
      );
    },

    update(input: Partial<AppSettings>): Promise<AppSettings> {
      return client.request(
        {
          path: routeMap.settings,
          method: 'PATCH',
          body: input,
        },
        settingsSchema,
      );
    },
  };
}
