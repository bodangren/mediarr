import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';

const downloadClientSchema = z.object({
  id: z.number(),
  name: z.string(),
  implementation: z.string(),
  configContract: z.string(),
  settings: z.string(),
  protocol: z.string(),
  host: z.string(),
  port: z.number(),
  category: z.string().nullable(),
  priority: z.number(),
  enabled: z.boolean(),
});

const testResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  diagnostics: z.object({
    remediationHints: z.array(z.string()),
  }).optional(),
  healthSnapshot: z.unknown().nullable().optional(),
});

export type DownloadClientItem = z.infer<typeof downloadClientSchema>;

export interface CreateDownloadClientInput {
  name: string;
  implementation: string;
  configContract: string;
  settings: string;
  protocol: string;
  host: string;
  port: number;
  category?: string;
  priority?: number;
  enabled?: boolean;
}

export type DownloadClientTestResult = z.infer<typeof testResultSchema>;

export function createDownloadClientApi(client: ApiHttpClient) {
  return {
    list(): Promise<DownloadClientItem[]> {
      return client.request(
        {
          path: routeMap.downloadClients,
        },
        z.array(downloadClientSchema),
      );
    },

    create(input: CreateDownloadClientInput): Promise<DownloadClientItem> {
      return client.request(
        {
          path: routeMap.downloadClients,
          method: 'POST',
          body: input,
        },
        downloadClientSchema,
      );
    },

    update(id: number, input: Partial<CreateDownloadClientInput>): Promise<DownloadClientItem> {
      return client.request(
        {
          path: routeMap.downloadClientUpdate(id),
          method: 'PUT',
          body: input,
        },
        downloadClientSchema,
      );
    },

    remove(id: number): Promise<{ id: number }> {
      return client.request(
        {
          path: routeMap.downloadClientDelete(id),
          method: 'DELETE',
        },
        z.object({ id: z.number() }),
      );
    },

    test(id: number): Promise<DownloadClientTestResult> {
      return client.request(
        {
          path: routeMap.downloadClientTest(id),
          method: 'POST',
        },
        testResultSchema,
      );
    },

    testDraft(input: CreateDownloadClientInput): Promise<DownloadClientTestResult> {
      return client.request(
        {
          path: routeMap.downloadClientTestDraft,
          method: 'POST',
          body: input,
        },
        testResultSchema,
      );
    },
  };
}
