import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';

const subtitleVariantSchema = z.object({
  variantId: z.number(),
  path: z.string(),
}).passthrough();

const manualSearchCandidateSchema = z.object({
  languageCode: z.string(),
  isForced: z.boolean(),
  isHi: z.boolean(),
  provider: z.string(),
  score: z.number(),
  extension: z.string().optional(),
});

const manualDownloadSchema = z.object({
  storedPath: z.string(),
});

export type SubtitleVariantInventory = z.infer<typeof subtitleVariantSchema>;
export type ManualSearchCandidate = z.infer<typeof manualSearchCandidateSchema>;

export interface ManualSearchInput {
  movieId?: number;
  episodeId?: number;
  variantId?: number;
}

export interface ManualDownloadInput extends ManualSearchInput {
  candidate: ManualSearchCandidate;
}

export function createSubtitleApi(client: ApiHttpClient) {
  return {
    listMovieVariants(movieId: number): Promise<SubtitleVariantInventory[]> {
      return client.request(
        {
          path: routeMap.subtitleMovieVariants(movieId),
        },
        z.array(subtitleVariantSchema),
      );
    },

    listEpisodeVariants(episodeId: number): Promise<SubtitleVariantInventory[]> {
      return client.request(
        {
          path: routeMap.subtitleEpisodeVariants(episodeId),
        },
        z.array(subtitleVariantSchema),
      );
    },

    manualSearch(input: ManualSearchInput): Promise<ManualSearchCandidate[]> {
      return client.request(
        {
          path: routeMap.subtitleSearch,
          method: 'POST',
          body: input,
        },
        z.array(manualSearchCandidateSchema),
      );
    },

    manualDownload(input: ManualDownloadInput): Promise<z.infer<typeof manualDownloadSchema>> {
      return client.request(
        {
          path: routeMap.subtitleDownload,
          method: 'POST',
          body: input,
        },
        manualDownloadSchema,
      );
    },
  };
}
