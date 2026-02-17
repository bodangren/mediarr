import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';

/**
 * Schema for a single language setting within a profile
 */
export const languageSettingSchema = z.object({
  languageCode: z.string(),
  isForced: z.boolean(),
  isHi: z.boolean(),
  audioExclude: z.boolean(),
  score: z.number(),
});

/**
 * Schema for a language profile
 */
export const languageProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
  languages: z.array(languageSettingSchema),
  cutoff: z.string(),
  upgradeAllowed: z.boolean(),
  mustContain: z.array(z.string()),
  mustNotContain: z.array(z.string()),
});

/**
 * Schema for creating/updating a language profile
 */
export const languageProfileInputSchema = z.object({
  name: z.string(),
  languages: z.array(languageSettingSchema),
  cutoff: z.string().optional(),
  upgradeAllowed: z.boolean().optional(),
});

/**
 * Schema for language setting input (subset of LanguageSetting for create/update)
 */
export const languageSettingInputSchema = z.object({
  languageCode: z.string(),
  isForced: z.boolean(),
  isHi: z.boolean(),
  audioExclude: z.boolean(),
  score: z.number(),
});

export type LanguageSetting = z.infer<typeof languageSettingSchema>;
export type LanguageProfile = z.infer<typeof languageProfileSchema>;
export type LanguageSettingInput = z.infer<typeof languageSettingInputSchema>;
export type LanguageProfileInput = z.infer<typeof languageProfileInputSchema>;

export function createLanguageProfilesApi(client: ApiHttpClient) {
  return {
    /**
     * Get all language profiles
     */
    listProfiles(): Promise<LanguageProfile[]> {
      return client.request(
        {
          path: routeMap.languageProfiles,
        },
        z.array(languageProfileSchema),
      );
    },

    /**
     * Get a single language profile by ID
     */
    getProfile(id: number): Promise<LanguageProfile> {
      return client.request(
        {
          path: routeMap.languageProfile(id),
        },
        languageProfileSchema,
      );
    },

    /**
     * Create a new language profile
     */
    createProfile(input: LanguageProfileInput): Promise<LanguageProfile> {
      return client.request(
        {
          path: routeMap.languageProfiles,
          method: 'POST',
          body: input,
        },
        languageProfileSchema,
      );
    },

    /**
     * Update an existing language profile
     */
    updateProfile(id: number, input: LanguageProfileInput): Promise<LanguageProfile> {
      return client.request(
        {
          path: routeMap.languageProfile(id),
          method: 'PUT',
          body: input,
        },
        languageProfileSchema,
      );
    },

    /**
     * Delete a language profile
     */
    deleteProfile(id: number): Promise<{ id: number }> {
      return client.request(
        {
          path: routeMap.languageProfile(id),
          method: 'DELETE',
        },
        z.object({ id: z.number() }),
      );
    },
  };
}
