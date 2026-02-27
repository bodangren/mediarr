import { useMemo } from 'react';
import { CalendarEvent } from './CalendarEvent';
import { CalendarMovieEvent } from './CalendarMovieEvent';
import type { CalendarEvent as CalendarEventItem } from '@/types/calendar';

interface AgendaProps {
  events: CalendarEventItem[];
}

export function Agenda({ events }: AgendaProps) {
  const { eventsByDate, sortedDates } = useMemo(() => {
    const eventsByDate: Record<string, CalendarEventItem[]> = {};
    const dates = new Set<string>();

    // Group events by date
    for (const event of events) {
      const eventDate = event.type === 'episode' ? event.data.airDate : event.data.releaseDate;
      if (!eventsByDate[eventDate]) {
        eventsByDate[eventDate] = [];
      }
      eventsByDate[eventDate]!.push(event);
      dates.add(eventDate);
    }

    // Sort events within each day (movies first, then episodes)
    for (const date in eventsByDate) {
      eventsByDate[date]!.sort((a, b) => {
        // Movies first
        if (a.type === 'movie' && b.type === 'episode') return -1;
        if (a.type === 'episode' && b.type === 'movie') return 1;

        // Within same type
        if (a.type === 'movie' && b.type === 'movie') {
          return a.data.title.localeCompare(b.data.title);
        }
        if (a.type === 'episode' && b.type === 'episode') {
          const timeA = a.data.airTime || '00:00';
          const timeB = b.data.airTime || '00:00';
          return timeA.localeCompare(timeB);
        }

        return 0;
      });
    }

    // Sort dates chronologically
    const sortedDates = Array.from(dates).sort();

    return { eventsByDate, sortedDates };
  }, [events]);

  const today = new Date().toISOString().split('T')[0]!;

  return (
    <div className="space-y-4">
      {sortedDates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-sm border border-border-subtle bg-surface-1 p-12 text-text-muted">
          <p className="text-lg font-medium">No events scheduled</p>
          <p className="text-sm">Try adjusting your date range or filters</p>
        </div>
      ) : (
        sortedDates.map(date => {
          const dateObj = new Date(date);
          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
          const monthName = dateObj.toLocaleDateString('en-US', { month: 'long' });
          const dayNumber = dateObj.getDate();
          const isToday = date === today;

          // Separate movies and episodes for this date
          const dateEvents = eventsByDate[date] || [];
          const movies = dateEvents.filter(e => e.type === 'movie').map(e => e.data);
          const episodes = dateEvents.filter(e => e.type === 'episode').map(e => e.data);

          return (
            <div key={date} className="space-y-3">
              <div
                className={`flex items-center gap-2 border-b-2 ${
                  isToday ? 'border-accent-primary text-accent-primary' : 'border-border-subtle text-text-secondary'
                } pb-2`}
              >
                <h2 className="text-lg font-semibold">
                  {dayName}, {monthName} {dayNumber}
                </h2>
                {isToday && <span className="rounded-full bg-accent-primary/20 px-2 py-0.5 text-xs font-medium">Today</span>}
                {(movies.length > 0 || episodes.length > 0) && (
                  <span className="text-sm text-text-muted">
                    {movies.length > 0 && `${movies.length} Movies`}
                    {movies.length > 0 && episodes.length > 0 && ' • '}
                    {episodes.length > 0 && `${episodes.length} Episodes`}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {/* Movies section */}
                {movies.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {movies.map(movie => (
                      <CalendarMovieEvent key={`movie-${movie.movieId}`} movie={movie} />
                    ))}
                  </div>
                )}

                {/* Episodes section */}
                {episodes.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {episodes.map(episode => (
                      <CalendarEvent
                        key={`${episode.seriesId}-${episode.seasonNumber}-${episode.episodeNumber}`}
                        episode={episode}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
