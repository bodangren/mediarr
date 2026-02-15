import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';

const applicationSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.enum(['Sonarr', 'Radarr', 'Lidarr', 'Readarr', 'Whisparr']),
  url: z.string().url(),
  apiKey: z.string(), // This is masked on the frontend
  syncEnabled: z.boolean(),
});

const testResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  diagnostics: z.object({
    remediationHints: z.array(z.string()),
  }).optional(),
  healthSnapshot: z.unknown().nullable().optional(),
});

const syncResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  syncedCount: z.number().optional(),
});

export type ApplicationItem = z.infer<typeof applicationSchema>;
export type ApplicationTestResult = z.infer<typeof testResultSchema>;
export type ApplicationSyncResult = z.infer<typeof syncResultSchema>;

export interface CreateApplicationInput {
  name: string;
  type: 'Sonarr' | 'Radarr' | 'Lidarr' | 'Readarr' | 'Whisparr';
  url: string;
  apiKey: string;
  syncEnabled: boolean;
}

export interface UpdateApplicationInput {
  name?: string;
  type?: 'Sonarr' | 'Radarr' | 'Lidarr' | 'Readarr' | 'Whisparr';
  url?: string;
  apiKey?: string;
  syncEnabled?: boolean;
}

export function createApplicationsApi(client: ApiHttpClient) {
  return {
    list(): Promise<ApplicationItem[]> {
      return client.request(
        {
          path: routeMap.applications,
        },
        z.array(applicationSchema),
      );
    },

    create(input: CreateApplicationInput): Promise<ApplicationItem> {
      return client.request(
        {
          path: routeMap.applications,
          method: 'POST',
          body: input,
        },
        applicationSchema,
      );
    },

    update(id: number, input: UpdateApplicationInput): Promise<ApplicationItem> {
      return client.request(
        {
          path: routeMap.applicationUpdate(id),
          method: 'PUT',
          body: input,
        },
        applicationSchema,
      );
    },

    remove(id: number): Promise<{ id: number }> {
      return client.request(
        {
          path: routeMap.applicationDelete(id),
          method: 'DELETE',
        },
        z.object({ id: z.number() }),
      );
    },

    test(id: number): Promise<ApplicationTestResult> {
      return client.request(
        {
          path: routeMap.applicationTest(id),
          method: 'POST',
        },
        testResultSchema,
      );
    },

    testDraft(input: CreateApplicationInput): Promise<ApplicationTestResult> {
      return client.request(
        {
          path: routeMap.applicationTestDraft,
          method: 'POST',
          body: input,
        },
        testResultSchema,
      );
    },

    sync(id: number): Promise<ApplicationSyncResult> {
      return client.request(
        {
          path: routeMap.applicationSync(id),
          method: 'POST',
        },
        syncResultSchema,
      );
    },

    syncAll(): Promise<ApplicationSyncResult> {
      return client.request(
        {
          path: routeMap.applicationSyncAll,
          method: 'POST',
        },
        syncResultSchema,
      );
    },
  };
}
