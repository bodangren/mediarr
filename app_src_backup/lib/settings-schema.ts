import { z } from 'zod';

export const settingsSchema = z.object({
  torrentLimits: z.object({
    maxActiveDownloads: z.coerce.number().min(1),
    maxActiveSeeds: z.coerce.number().min(1),
    globalDownloadLimitKbps: z.coerce.number().nullable().optional(),
    globalUploadLimitKbps: z.coerce.number().nullable().optional(),
  }),
  schedulerIntervals: z.object({
    rssSyncMinutes: z.coerce.number().min(5),
    availabilityCheckMinutes: z.coerce.number().min(15),
    torrentMonitoringSeconds: z.coerce.number().min(5),
  }),
  pathVisibility: z.object({
    showDownloadPath: z.boolean(),
    showMediaPath: z.boolean(),
  }),
  apiKeys: z.object({
    tmdbApiKey: z.string().nullable().optional(),
    openSubtitlesApiKey: z.string().nullable().optional(),
  }),
  host: z.object({
    port: z.coerce.number().min(1).max(65535),
    bindAddress: z.string(),
    urlBase: z.string().nullable().optional(),
    sslPort: z.coerce.number().min(1).max(65535).nullable().optional(),
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
    logSizeLimit: z.coerce.number().min(1),
    logRetentionDays: z.coerce.number().min(1),
  }).optional(),
  update: z.object({
    branch: z.enum(['master', 'develop', 'phantom']),
    autoUpdateEnabled: z.boolean(),
    mechanicsEnabled: z.boolean(),
    updateScriptPath: z.string().nullable().optional(),
  }).optional(),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;
