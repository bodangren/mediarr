import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';

const collectionMovieSchema = z.object({
  id: z.number(),
  tmdbId: z.number(),
  title: z.string(),
  year: z.number(),
  posterUrl: z.string().optional(),
  inLibrary: z.boolean(),
  monitored: z.boolean().optional(),
});

const collectionSchema = z.object({
  id: z.number(),
  tmdbId: z.number(),
  name: z.string(),
  overview: z.string().optional(),
  posterUrl: z.string().optional(),
  movieCount: z.number(),
  moviesInLibrary: z.number(),
  monitored: z.boolean(),
  movies: z.array(collectionMovieSchema),
});

export type MovieCollection = z.infer<typeof collectionSchema>;
export type CollectionMovie = z.infer<typeof collectionMovieSchema>;

export interface CollectionEditForm {
  name: string;
  overview: string;
  monitored: boolean;
  minimumAvailability: string;
  qualityProfileId: number;
  rootFolder: string;
  searchOnAdd: boolean;
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

    delete(id: number): Promise<{ id: number }> {
      return client.request(
        {
          path: routeMap.collectionDelete(id),
          method: 'DELETE',
        },
        z.object({ id: z.number() }),
      );
    },

    search(id: number): Promise<{ id: number; message: string }> {
      return client.request(
        {
          path: routeMap.collectionSearch(id),
          method: 'POST',
        },
        z.object({ id: z.number(), message: z.string() }),
      );
    },
  };
}
