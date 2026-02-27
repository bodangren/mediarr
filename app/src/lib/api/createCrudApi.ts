import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { testResultSchema } from './shared-schemas';
import type { TestResult } from './shared-schemas';

export interface CrudApiConfig<TItem> {
  basePath: string;
  itemSchema: z.ZodType<TItem, z.ZodTypeDef, unknown>;
  listSchema?: z.ZodType<TItem[], z.ZodTypeDef, unknown>;
}

export function createCrudApi<TItem, TCreate>(
  client: ApiHttpClient,
  config: CrudApiConfig<TItem>
) {
  const { basePath, itemSchema, listSchema } = config;

  return {
    list(): Promise<TItem[]> {
      return client.request(
        {
          path: basePath,
        },
        listSchema ?? z.array(itemSchema),
      );
    },

    create(input: TCreate): Promise<TItem> {
      return client.request(
        {
          path: basePath,
          method: 'POST',
          body: input,
        },
        itemSchema,
      );
    },

    update(id: number, input: Partial<TCreate>): Promise<TItem> {
      return client.request(
        {
          path: `${basePath}/${id}`,
          method: 'PUT',
          body: input,
        },
        itemSchema,
      );
    },

    remove(id: number): Promise<{ id: number }> {
      return client.request(
        {
          path: `${basePath}/${id}`,
          method: 'DELETE',
        },
        z.object({ id: z.number() }),
      );
    },

    test(id: number): Promise<TestResult> {
      return client.request(
        {
          path: `${basePath}/${id}/test`,
          method: 'POST',
        },
        testResultSchema,
      );
    },

    testDraft(input: TCreate): Promise<TestResult> {
      return client.request(
        {
          path: `${basePath}/test`,
          method: 'POST',
          body: input,
        },
        testResultSchema,
      );
    },
  };
}
