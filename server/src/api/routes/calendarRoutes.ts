import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../contracts';
import { ValidationError } from '../../errors/domainErrors';
import type { ApiDependencies } from '../types';

export type CalendarItemStatus = 'downloaded' | 'missing' | 'airing' | 'unaired';

export interface CalendarItem {
  id: number;
  type: 'episode' | 'movie';
  seriesId?: number;
  movieId?: number;
  title: string;          // Series title or Movie title
  episodeTitle?: string;  // Episode specific
  seasonNumber?: number;
  episodeNumber?: number;
  date: string;           // Formatted date (YYYY-MM-DD)
  time?: string;          // Formatted time (HH:MM AM/PM) or '00:00 AM' for movies without specific time
  status: CalendarItemStatus;
  hasFile: boolean;
  monitored: boolean;
}

function determineEpisodeStatus(airDateUtc: Date | null | undefined, hasFile: boolean): CalendarItemStatus {
  if (hasFile) return 'downloaded';
  if (!airDateUtc) return 'unaired';
  
  const now = new Date();
  if (airDateUtc > now) return 'unaired';
  
  // Aired in the last 24 hours
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (airDateUtc >= oneDayAgo && airDateUtc <= now) return 'airing';
  
  return 'missing';
}

function determineMovieStatus(releaseDate: Date | null | undefined, hasFile: boolean): CalendarItemStatus {
  if (hasFile) return 'downloaded';
  if (!releaseDate) return 'unaired';
  
  const now = new Date();
  if (releaseDate > now) return 'unaired';
  
  return 'missing';
}

function formatAirDate(date: Date | null | undefined): string {
  if (!date) return '';
  return date.toISOString().split('T')[0];
}

function formatAirTime(date: Date | null | undefined): string {
  if (!date) return '';
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function registerCalendarRoutes(
  app: FastifyInstance,
  deps: ApiDependencies,
): void {
  /**
   * GET /api/calendar
   * Returns episodes and movies releasing within a specified date range.
   */
  app.get('/api/calendar', {
    schema: {
      querystring: {
        type: 'object',
        required: ['start', 'end'],
        properties: {
          start: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
          end: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' },
        },
      },
    },
  }, async (request, reply) => {
    const prisma = deps.prisma as any;
    const query = request.query as Record<string, unknown>;

    const startStr = typeof query.start === 'string' ? query.start : undefined;
    const endStr = typeof query.end === 'string' ? query.end : undefined;

    if (!startStr || !endStr) {
      throw new ValidationError('Both start and end date parameters are required');
    }

    const startDate = new Date(startStr);
    const endDate = new Date(endStr);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new ValidationError('Invalid date format for start or end parameter');
    }

    const queryStartDate = new Date(startDate);
    queryStartDate.setHours(0, 0, 0, 0);
    const queryEndDate = new Date(endDate);
    queryEndDate.setHours(23, 59, 59, 999);

    const calendarItems: CalendarItem[] = [];

    // Query Episodes
    if (prisma.episode && prisma.episode.findMany) {
      const episodes = await prisma.episode.findMany({
        where: {
          airDateUtc: {
            gte: queryStartDate,
            lte: queryEndDate,
          },
          monitored: true, // Only monitored episodes according to plan
        },
        include: {
          series: { select: { id: true, title: true } },
          fileVariants: { select: { id: true } },
        },
      });

      for (const ep of episodes) {
        const hasFile = ep.fileVariants && ep.fileVariants.length > 0;
        calendarItems.push({
          id: ep.id,
          type: 'episode',
          seriesId: ep.seriesId,
          title: ep.series?.title ?? 'Unknown Series',
          episodeTitle: ep.title ?? 'Untitled Episode',
          seasonNumber: ep.seasonNumber,
          episodeNumber: ep.episodeNumber,
          date: formatAirDate(ep.airDateUtc),
          time: formatAirTime(ep.airDateUtc),
          status: determineEpisodeStatus(ep.airDateUtc, hasFile),
          hasFile,
          monitored: ep.monitored ?? false,
        });
      }
    }

    // Query Movies
    if (prisma.movie && prisma.movie.findMany) {
      const movies = await prisma.movie.findMany({
        where: {
          OR: [
            { inCinemas: { gte: queryStartDate, lte: queryEndDate } },
            { digitalRelease: { gte: queryStartDate, lte: queryEndDate } },
            { physicalRelease: { gte: queryStartDate, lte: queryEndDate } }
          ],
          monitored: true, // Only monitored movies according to plan
        },
        include: {
          fileVariants: { select: { id: true } },
        },
      });

      for (const movie of movies) {
        const hasFile = movie.fileVariants && movie.fileVariants.length > 0;
        
        // Pick the most relevant date in the range (preferring digital/physical over cinema)
        let relevantDate = movie.digitalRelease || movie.physicalRelease || movie.inCinemas;
        if (!relevantDate || relevantDate < queryStartDate || relevantDate > queryEndDate) {
            if (movie.digitalRelease && movie.digitalRelease >= queryStartDate && movie.digitalRelease <= queryEndDate) relevantDate = movie.digitalRelease;
            else if (movie.physicalRelease && movie.physicalRelease >= queryStartDate && movie.physicalRelease <= queryEndDate) relevantDate = movie.physicalRelease;
            else if (movie.inCinemas && movie.inCinemas >= queryStartDate && movie.inCinemas <= queryEndDate) relevantDate = movie.inCinemas;
        }

        calendarItems.push({
          id: movie.id,
          type: 'movie',
          movieId: movie.id,
          title: movie.title,
          date: formatAirDate(relevantDate),
          status: determineMovieStatus(relevantDate, hasFile),
          hasFile,
          monitored: movie.monitored ?? false,
        });
      }
    }

    // Sort all items by date
    calendarItems.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      
      // If same date, sort by time if available
      const timeA = a.time ? new Date(`1970-01-01T${a.time}`).getTime() : 0;
      const timeB = b.time ? new Date(`1970-01-01T${b.time}`).getTime() : 0;
      return timeA - timeB;
    });

    return sendSuccess(reply, calendarItems);
  });
}
