import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';

const appProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
  enableRss: z.boolean(),
  enableInteractiveSearch: z.boolean(),
  enableAutomaticSearch: z.boolean(),
  minimumSeeders: z.number(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});

export type AppProfileItem = z.infer<typeof appProfileSchema>;

export interface AppProfileInput {
  name: string;
  enableRss?: boolean;
  enableInteractiveSearch?: boolean;
  enableAutomaticSearch?: boolean;
  minimumSeeders?: number;
}

export function createAppProfilesApi(client: ApiHttpClient) {
  return {
    list(): Promise<AppProfileItem[]> {
      return client.request({ path: routeMap.appProfiles }, z.array(appProfileSchema));
    },

    create(input: AppProfileInput): Promise<AppProfileItem> {
      return client.request({
        path: routeMap.appProfiles,
        method: 'POST',
        body: input,
      }, appProfileSchema);
    },

    update(id: number, input: Partial<AppProfileInput>): Promise<AppProfileItem> {
      return client.request({
        path: routeMap.appProfile(id),
        method: 'PUT',
        body: input,
      }, appProfileSchema);
    },

    remove(id: number): Promise<{ id: number }> {
      return client.request({
        path: routeMap.appProfile(id),
        method: 'DELETE',
      }, z.object({ id: z.number() }));
    },

    clone(id: number): Promise<AppProfileItem> {
      return client.request({
        path: routeMap.appProfileClone(id),
        method: 'POST',
      }, appProfileSchema);
    },
  };
}
