import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';

const releaseCandidateSchema = z.object({
  indexer: z.string(),
  title: z.string(),
  size: z.number(),
  seeders: z.number(),
  indexerFlags: z.string().optional(),
  quality: z.string().optional(),
  age: z.number().optional(),
  magnetUrl: z.string().optional(),
  downloadUrl: z.string().optional(),
});

const grabResultSchema = z.object({
  infoHash: z.string(),
  name: z.string().optional(),
  path: z.string().optional(),
}).passthrough();

export type ReleaseCandidate = z.infer<typeof releaseCandidateSchema>;
export type GrabResult = z.infer<typeof grabResultSchema>;

export function createReleaseApi(client: ApiHttpClient) {
  return {
    searchCandidates(query: Record<string, unknown>): Promise<ReleaseCandidate[]> {
      return client.request(
        {
          path: routeMap.releaseSearch,
          method: 'POST',
          body: query,
        },
        z.array(releaseCandidateSchema),
      );
    },

    grabRelease(candidate: ReleaseCandidate): Promise<GrabResult> {
      return client.request(
        {
          path: routeMap.releaseGrab,
          method: 'POST',
          body: candidate,
        },
        grabResultSchema,
      );
    },
  };
}
