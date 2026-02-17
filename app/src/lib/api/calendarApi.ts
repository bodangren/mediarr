import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';
import type { CalendarEpisode, CalendarMovie, CalendarListParams } from '../../types/calendar';

const calendarEpisodeSchema = z.object({
  id: z.number(),
  seriesId: z.number(),
  seriesTitle: z.string(),
  seasonNumber: z.number(),
  episodeNumber: z.number(),
  episodeTitle: z.string(),
  airDate: z.string(),
  airTime: z.string().optional(),
  status: z.enum(['downloaded', 'missing', 'airing', 'unaired']),
  hasFile: z.boolean(),
  monitored: z.boolean(),
});

const calendarMovieSchema = z.object({
  id: z.number(),
  movieId: z.number(),
  title: z.string(),
  releaseType: z.enum(['cinema', 'digital', 'physical']),
  releaseDate: z.string(),
  posterUrl: z.string().optional(),
  status: z.enum(['downloaded', 'monitored', 'missing', 'unmonitored']),
  hasFile: z.boolean(),
  monitored: z.boolean(),
  certification: z.string().optional(),
  runtime: z.number().optional(),
});

export type CalendarEpisodeType = z.infer<typeof calendarEpisodeSchema>;
export type CalendarMovieType = z.infer<typeof calendarMovieSchema>;

export function createCalendarApi(client: ApiHttpClient) {
  return {
    listCalendarEpisodes(params: CalendarListParams): Promise<CalendarEpisode[]> {
      return client.request(
        {
          path: '/api/calendar',
          query: { ...params, contentType: 'tv' },
        },
        z.array(calendarEpisodeSchema),
      );
    },

    listCalendarMovies(params: CalendarListParams): Promise<CalendarMovie[]> {
      return client.request(
        {
          path: '/api/calendar',
          query: { ...params, contentType: 'movies' },
        },
        z.array(calendarMovieSchema),
      );
    },
  };
}
