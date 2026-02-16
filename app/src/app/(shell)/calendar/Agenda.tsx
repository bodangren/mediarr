import { useMemo } from 'react';
import { CalendarEvent } from './CalendarEvent';
import type { CalendarEpisode } from '@/types/calendar';

interface AgendaProps {
  episodes: CalendarEpisode[];
}

export function Agenda({ episodes }: AgendaProps) {
  const { episodesByDate, sortedDates } = useMemo(() => {
    const episodesByDate: Record<string, CalendarEpisode[]> = {};
    const dates = new Set<string>();

    // Group episodes by date
    for (const episode of episodes) {
      if (!episodesByDate[episode.airDate]) {
        episodesByDate[episode.airDate] = [];
      }
      episodesByDate[episode.airDate]!.push(episode);
      dates.add(episode.airDate);
    }

    // Sort episodes within each day by air time
    for (const date in episodesByDate) {
      episodesByDate[date]!.sort((a, b) => {
        const timeA = a.airTime || '00:00';
        const timeB = b.airTime || '00:00';
        return timeA.localeCompare(timeB);
      });
    }

    // Sort dates chronologically
    const sortedDates = Array.from(dates).sort();

    return { episodesByDate, sortedDates };
  }, [episodes]);

  const today = new Date().toISOString().split('T')[0]!;

  return (
    <div className="space-y-4">
      {sortedDates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-sm border border-border-subtle bg-surface-1 p-12 text-text-muted">
          <p className="text-lg font-medium">No episodes scheduled</p>
          <p className="text-sm">Try adjusting your date range or filters</p>
        </div>
      ) : (
        sortedDates.map(date => {
          const dateObj = new Date(date);
          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
          const monthName = dateObj.toLocaleDateString('en-US', { month: 'long' });
          const dayNumber = dateObj.getDate();
          const isToday = date === today;

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
              </div>

              <div className="space-y-2">
                {episodesByDate[date]!.map(episode => (
                  <CalendarEvent
                    key={`${episode.seriesId}-${episode.seasonNumber}-${episode.episodeNumber}`}
                    episode={episode}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
