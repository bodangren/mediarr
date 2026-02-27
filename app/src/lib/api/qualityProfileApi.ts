import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';

const qualityDefinitionSchema = z.object({
  id: z.number(),
  name: z.string(),
  resolution: z.number(),
  source: z.string(),
});

const qualityProfileItemSchema = z.object({
  quality: qualityDefinitionSchema,
  allowed: z.boolean(),
});

const qualityProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
  cutoff: z.number(),
  items: z.array(qualityProfileItemSchema),
  languageProfileId: z.number().nullable().optional(),
});

/**
 * Language profile (simplified for now)
 */
const languageProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export interface CreateQualityProfileInput {
  name: string;
  cutoff: number;
  items: QualityProfileRule[];
  languageProfileId?: number | null;
}

export interface UpdateQualityProfileInput {
  name?: string;
  cutoff?: number;
  items?: QualityProfileRule[];
  languageProfileId?: number | null;
}

export type QualityDefinition = z.infer<typeof qualityDefinitionSchema>;
export type QualityProfileRule = z.infer<typeof qualityProfileItemSchema>;
export type QualityProfileItem = z.infer<typeof qualityProfileSchema>;
export type LanguageProfileItem = z.infer<typeof languageProfileSchema>;

export function createQualityProfileApi(client: ApiHttpClient) {
  return {
    /**
     * Get all quality profiles
     */
    list(): Promise<QualityProfileItem[]> {
      return client.request(
        {
          path: routeMap.qualityProfiles,
        },
        z.array(qualityProfileSchema),
      );
    },

    /**
     * Get a single quality profile by ID
     */
    get(id: number): Promise<QualityProfileItem> {
      return client.request(
        {
          path: routeMap.qualityProfile(id),
        },
        qualityProfileSchema,
      );
    },

    /**
     * Create a new quality profile
     */
    create(input: CreateQualityProfileInput): Promise<QualityProfileItem> {
      return client.request(
        {
          path: routeMap.qualityProfiles,
          method: 'POST',
          body: input,
        },
        qualityProfileSchema,
      );
    },

    /**
     * Update an existing quality profile
     */
    update(id: number, input: UpdateQualityProfileInput): Promise<QualityProfileItem> {
      return client.request(
        {
          path: routeMap.qualityProfile(id),
          method: 'PUT',
          body: input,
        },
        qualityProfileSchema,
      );
    },

    /**
     * Delete a quality profile
     */
    delete(id: number): Promise<{ id: number }> {
      return client.request(
        {
          path: routeMap.qualityProfile(id),
          method: 'DELETE',
        },
        z.object({ id: z.number() }),
      );
    },

    /**
     * Get all available language profiles
     */
    listLanguageProfiles(): Promise<LanguageProfileItem[]> {
      return client.request(
        {
          path: routeMap.languageProfiles,
        },
        z.array(languageProfileSchema),
      );
    },
  };
}
