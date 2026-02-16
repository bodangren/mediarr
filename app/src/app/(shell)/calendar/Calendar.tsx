import { useMemo } from 'react';
import { CalendarDay } from './CalendarDay';
import type { CalendarEpisode } from '@/types/calendar';

interface CalendarProps {
  episodes: CalendarEpisode[];
  currentDate: string;
  dayCount: 3 | 5 | 7;
}

export function Calendar({ episodes, currentDate, dayCount }: CalendarProps) {
  const { days, episodesByDate, today } = useMemo(() => {
    const startDate = new Date(currentDate);
    const startOfWeek = new Date(startDate);
    startOfWeek.setDate(startDate.getDate() - startDate.getDay());

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: string[] = [];
    const episodesByDate: Record<string, CalendarEpisode[]> = {};

    // Generate date range based on dayCount
    for (let i = 0; i < dayCount; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const isoDate = date.toISOString().split('T')[0]!;
      days.push(isoDate);
      episodesByDate[isoDate] = [];
    }

    // Group episodes by date
    for (const episode of episodes) {
      if (episodesByDate[episode.airDate]) {
        episodesByDate[episode.airDate]!.push(episode);
      }
    }

    // Sort episodes within each day by air time
    for (const date in episodesByDate) {
      episodesByDate[date]!.sort((a, b) => {
        const timeA = a.airTime || '00:00';
        const timeB = b.airTime || '00:00';
        return timeA.localeCompare(timeB);
      });
    }

    return { days, episodesByDate, today: today.toISOString().split('T')[0]! };
  }, [episodes, currentDate, dayCount]);

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {days.map(date => (
        <CalendarDay
          key={date}
          date={date}
          episodes={episodesByDate[date] || []}
          isToday={date === today}
        />
      ))}
    </div>
  );
}
