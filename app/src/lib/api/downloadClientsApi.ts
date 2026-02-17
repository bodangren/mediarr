import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { createCrudApi } from './createCrudApi';
import { TestResult } from './shared-schemas';

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

export type DownloadClientTestResult = TestResult;

export function createDownloadClientApi(client: ApiHttpClient) {
  const crudApi = createCrudApi<DownloadClientItem, CreateDownloadClientInput>(client, {
    basePath: '/api/download-clients',
    itemSchema: downloadClientSchema,
  });

  return {
    list: crudApi.list,
    create: crudApi.create,
    update: crudApi.update,
    remove: crudApi.remove,
    test: crudApi.test,
    testDraft: crudApi.testDraft,
  };
}
