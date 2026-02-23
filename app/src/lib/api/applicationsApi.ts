import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';
import { testResultSchema, TestResult } from './shared-schemas';

const applicationTypeSchema = z.enum(['Sonarr', 'Radarr', 'Lidarr', 'Readarr']);

const applicationSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: applicationTypeSchema,
  baseUrl: z.string().url(),
  apiKey: z.string(),
  syncCategories: z.array(z.number()),
  tags: z.array(z.string()),
});

const syncResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  syncedCount: z.number(),
  applicationId: z.number().optional(),
  failedApplications: z.array(z.object({
    id: z.number(),
    name: z.string(),
    message: z.string(),
  })).optional(),
});

export type ApplicationItem = z.infer<typeof applicationSchema>;
export type ApplicationTestResult = TestResult;
export type ApplicationSyncResult = z.infer<typeof syncResultSchema>;

export interface CreateApplicationInput {
  name: string;
  type: 'Sonarr' | 'Radarr' | 'Lidarr' | 'Readarr';
  baseUrl: string;
  apiKey: string;
  syncCategories?: number[];
  tags?: string[];
}

export interface UpdateApplicationInput {
  name?: string;
  type?: 'Sonarr' | 'Radarr' | 'Lidarr' | 'Readarr';
  baseUrl?: string;
  apiKey?: string;
  syncCategories?: number[];
  tags?: string[];
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
