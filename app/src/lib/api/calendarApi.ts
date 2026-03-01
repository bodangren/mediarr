import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import type { CalendarItem, CalendarListParams } from '../../types/calendar';

const calendarItemSchema = z.object({
  id: z.number(),
  type: z.enum(['episode', 'movie']),
  seriesId: z.number().optional(),
  movieId: z.number().optional(),
  title: z.string(),
  episodeTitle: z.string().optional(),
  seasonNumber: z.number().optional(),
  episodeNumber: z.number().optional(),
  date: z.string(),
  time: z.string().optional(),
  status: z.enum(['downloaded', 'missing', 'airing', 'unaired']),
  hasFile: z.boolean(),
  monitored: z.boolean(),
});

export type CalendarItemType = z.infer<typeof calendarItemSchema>;

export function createCalendarApi(client: ApiHttpClient) {
  return {
    list(params: CalendarListParams): Promise<CalendarItem[]> {
      return client.request(
        {
          path: '/api/calendar',
          query: { ...params },
        },
        z.array(calendarItemSchema),
      );
    },
  };
}
