import { CalendarEvent } from './CalendarEvent';
import type { CalendarEpisode } from '@/types/calendar';

interface CalendarDayProps {
  date: string;
  episodes: CalendarEpisode[];
  isToday: boolean;
}

export function CalendarDay({ date, episodes, isToday }: CalendarDayProps) {
  const dateObj = new Date(date);
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
  const dayNumber = dateObj.getDate();
  const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });

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
        <span className="text-xs text-text-muted">{monthName}</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {episodes.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-text-muted">
            <span className="text-sm">No episodes</span>
          </div>
        ) : (
          episodes.map(episode => (
            <CalendarEvent key={`${episode.seriesId}-${episode.seasonNumber}-${episode.episodeNumber}`} episode={episode} />
          ))
        )}
      </div>
    </div>
  );
}
