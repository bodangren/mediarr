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
