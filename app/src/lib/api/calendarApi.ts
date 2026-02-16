import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';
import type { CalendarEpisode, CalendarListParams } from '../../types/calendar';

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

export type CalendarEpisodeType = z.infer<typeof calendarEpisodeSchema>;

export function createCalendarApi(client: ApiHttpClient) {
  return {
    listCalendarEpisodes(params: CalendarListParams): Promise<CalendarEpisode[]> {
      return client.request(
        {
          path: '/api/calendar',
          query: params,
        },
        z.array(calendarEpisodeSchema),
      );
    },
  };
}
