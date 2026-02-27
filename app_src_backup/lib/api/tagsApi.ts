import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';

const tagSchema = z.object({
  id: z.number(),
  label: z.string(),
  color: z.string(),
  indexerIds: z.array(z.number()),
  applicationIds: z.array(z.number()),
  downloadClientIds: z.array(z.number()),
});

const tagDetailsSchema = z.object({
  tag: z.object({
    id: z.number(),
    label: z.string(),
    color: z.string(),
  }),
  indexers: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
    }),
  ),
  applications: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
    }),
  ),
  downloadClients: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
    }),
  ),
});

export type TagItem = z.infer<typeof tagSchema>;
export type TagDetails = z.infer<typeof tagDetailsSchema>;

export interface CreateTagInput {
  label: string;
  color: string;
}

export interface UpdateTagInput {
  label?: string;
  color?: string;
}

export interface UpdateTagAssignmentsInput {
  indexerIds?: number[];
  applicationIds?: number[];
  downloadClientIds?: number[];
}

export function createTagsApi(client: ApiHttpClient) {
  return {
    list(): Promise<TagItem[]> {
      return client.request(
        {
          path: routeMap.tags,
        },
        z.array(tagSchema),
      );
    },

    create(input: CreateTagInput): Promise<TagItem> {
      return client.request(
        {
          path: routeMap.tags,
          method: 'POST',
          body: input,
        },
        tagSchema,
      );
    },

    update(id: number, input: UpdateTagInput): Promise<TagItem> {
      return client.request(
        {
          path: routeMap.tagUpdate(id),
          method: 'PUT',
          body: input,
        },
        tagSchema,
      );
    },

    remove(id: number): Promise<{ id: number }> {
      return client.request(
        {
          path: routeMap.tagDelete(id),
          method: 'DELETE',
        },
        z.object({ id: z.number() }),
      );
    },

    getDetails(id: number): Promise<TagDetails> {
      return client.request(
        {
          path: routeMap.tagDetails(id),
        },
        tagDetailsSchema,
      );
    },

    updateAssignments(id: number, input: UpdateTagAssignmentsInput): Promise<TagItem> {
      return client.request(
        {
          path: routeMap.tagAssignments(id),
          method: 'PUT',
          body: input,
        },
        tagSchema,
      );
    },
  };
}
