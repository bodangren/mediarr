import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';
import type { MovieCollection, CollectionMovie, CollectionEditForm } from '@/types/collection';

export type { MovieCollection, CollectionMovie, CollectionEditForm };

const collectionMovieSchema = z.object({
  id: z.number(),
  tmdbId: z.number(),
  title: z.string(),
  year: z.number(),
  posterUrl: z.string().optional().nullable(),
  overview: z.string().optional().nullable(),
  inLibrary: z.boolean(),
  monitored: z.boolean().optional(),
  status: z.string().optional(),
  quality: z.string().optional().nullable(),
});

const collectionSchema = z.object({
  id: z.number(),
  tmdbCollectionId: z.number(),
  name: z.string(),
  overview: z.string().optional().nullable(),
  posterUrl: z.string().optional().nullable(),
  backdropUrl: z.string().optional().nullable(),
  movieCount: z.number(),
  moviesInLibrary: z.number(),
  monitored: z.boolean(),
  movies: z.array(collectionMovieSchema).optional(),
  qualityProfileId: z.number().optional().nullable(),
  qualityProfile: z.object({
    id: z.number(),
    name: z.string(),
  }).optional().nullable(),
  minimumAvailability: z.string().optional(),
  rootFolderPath: z.string().optional().nullable(),
  addMoviesAutomatically: z.boolean().optional(),
  searchOnAdd: z.boolean().optional(),
});

const createCollectionResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  moviesAdded: z.number(),
});

const searchResponseSchema = z.object({
  id: z.number(),
  message: z.string(),
  searched: z.number(),
  missing: z.number(),
});

const syncResponseSchema = z.object({
  id: z.number(),
  message: z.string(),
  added: z.number(),
  updated: z.number(),
});

export interface CreateCollectionInput {
  tmdbCollectionId: number;
  monitored?: boolean;
  qualityProfileId?: number;
  rootFolderPath?: string;
  addMoviesAutomatically?: boolean;
  searchOnAdd?: boolean;
}

export function createCollectionApi(client: ApiHttpClient) {
  return {
    list(): Promise<MovieCollection[]> {
      return client.request(
        {
          path: routeMap.collections,
        },
        z.array(collectionSchema),
      );
    },

    getById(id: number): Promise<MovieCollection> {
      return client.request(
        {
          path: routeMap.collectionDetail(id),
        },
        collectionSchema,
      );
    },

    create(input: CreateCollectionInput): Promise<z.infer<typeof createCollectionResponseSchema>> {
      return client.request(
        {
          path: routeMap.collections,
          method: 'POST',
          body: input,
        },
        createCollectionResponseSchema,
      );
    },

    update(id: number, input: Partial<CollectionEditForm>): Promise<MovieCollection> {
      return client.request(
        {
          path: routeMap.collectionUpdate(id),
          method: 'PUT',
          body: input,
        },
        collectionSchema,
      );
    },

    delete(id: number): Promise<{ id: number; deleted: boolean }> {
      return client.request(
        {
          path: routeMap.collectionDelete(id),
          method: 'DELETE',
        },
        z.object({ id: z.number(), deleted: z.boolean() }),
      );
    },

    search(id: number): Promise<z.infer<typeof searchResponseSchema>> {
      return client.request(
        {
          path: routeMap.collectionSearch(id),
          method: 'POST',
        },
        searchResponseSchema,
      );
    },

    sync(id: number): Promise<z.infer<typeof syncResponseSchema>> {
      return client.request(
        {
          path: routeMap.collectionSync(id),
          method: 'POST',
        },
        syncResponseSchema,
      );
    },
  };
}
