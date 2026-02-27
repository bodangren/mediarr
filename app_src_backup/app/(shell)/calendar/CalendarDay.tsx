import { CalendarEvent } from './CalendarEvent';
import { CalendarMovieEvent } from './CalendarMovieEvent';
import type { CalendarEvent as CalendarEventItem } from '@/types/calendar';

interface CalendarDayProps {
  date: string;
  events: CalendarEventItem[];
  isToday: boolean;
}

export function CalendarDay({ date, events, isToday }: CalendarDayProps) {
  const dateObj = new Date(date);
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
  const dayNumber = dateObj.getDate();
  const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });

  // Separate movies and episodes
  const movies = events.filter(e => e.type === 'movie').map(e => e.data);
  const episodes = events.filter(e => e.type === 'episode').map(e => e.data);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-sm border border-border-subtle bg-surface-1 p-3">
      <div
        className={`flex items-center justify-between border-b border-border-subtle pb-2 ${
          isToday ? 'text-accent-primary' : ''
        }`}
      >
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-text-secondary">{dayName}</span>
          <span className="text-xl font-bold text-text-primary">
            {dayNumber}
          </span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-xs text-text-muted">{monthName}</span>
          {(movies.length > 0 || episodes.length > 0) && (
            <div className="flex items-center gap-1 text-[10px] text-text-muted">
              {movies.length > 0 && <span>{movies.length} Movies</span>}
              {movies.length > 0 && episodes.length > 0 && <span>/</span>}
              {episodes.length > 0 && <span>{episodes.length} Episodes</span>}
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {events.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-text-muted">
            <span className="text-sm">No events</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Movies section */}
            {movies.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {movies.map(movie => (
                  <CalendarMovieEvent
                    key={`movie-${movie.movieId}`}
                    movie={movie}
                  />
                ))}
              </div>
            )}

            {/* Episodes section */}
            {episodes.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {episodes.map(episode => (
                  <CalendarEvent
                    key={`${episode.seriesId}-${episode.seasonNumber}-${episode.episodeNumber}`}
                    episode={episode}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
