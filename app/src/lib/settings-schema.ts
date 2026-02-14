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
});

export type SettingsFormData = z.infer<typeof settingsSchema>;
