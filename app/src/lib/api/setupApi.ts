import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';

const setupStatusSchema = z.object({
  isConfigured: z.boolean(),
  completedSteps: z.array(z.string()).default([]),
});

export type SetupStatus = z.infer<typeof setupStatusSchema>;

export function createSetupApi(client: ApiHttpClient) {
  return {
    getStatus(): Promise<SetupStatus> {
      return client.request(
        {
          path: routeMap.setupStatus,
        },
        setupStatusSchema,
      );
    },

    complete(): Promise<SetupStatus> {
      return client.request(
        {
          path: routeMap.setupComplete,
          method: 'POST',
        },
        setupStatusSchema,
      );
    },
  };
}
