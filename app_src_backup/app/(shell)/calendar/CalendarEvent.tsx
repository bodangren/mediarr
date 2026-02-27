import Link from 'next/link';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import type { CalendarEpisode } from '@/types/calendar';

interface CalendarEventProps {
  episode: CalendarEpisode;
}

export function CalendarEvent({ episode }: CalendarEventProps) {
  const statusConfig: Record<
    string,
    { color: string; label: string }
  > = {
    downloaded: { color: 'status-completed', label: 'Downloaded' },
    missing: { color: 'status-wanted', label: 'Missing' },
    airing: { color: 'status-downloading', label: 'Airing' },
    unaired: { color: 'status-monitored', label: 'Unaired' },
  };

  const config = statusConfig[episode.status] || { color: 'text-text-muted', label: episode.status };

  return (
    <Link
      href={`/library/series/${episode.seriesId}`}
      className="group block rounded-sm border border-border-subtle bg-surface-2 p-3 transition hover:border-status-monitored hover:bg-surface-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-text-primary group-hover:text-accent-primary">
            {episode.seriesTitle}
          </h3>
          <p className="text-sm text-text-secondary">
            S{episode.seasonNumber.toString().padStart(2, '0')}E
            {episode.episodeNumber.toString().padStart(2, '0')} - {episode.episodeTitle}
          </p>
          {episode.airTime && (
            <p className="text-xs text-text-muted">
              {episode.airTime}
            </p>
          )}
        </div>
        <StatusBadge status={config.label} />
      </div>
    </Link>
  );
}
