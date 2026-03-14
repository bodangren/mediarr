
export interface ActivityEventBadgeProps {
  eventType: string;
}

const EVENT_TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  RELEASE_GRABBED: {
    label: 'Grabbed',
    className: 'bg-accent-primary/20 text-accent-primary',
  },
  IMPORT_COMPLETED: {
    label: 'Imported',
    className: 'bg-status-completed/20 text-status-completed',
  },
  MOVIE_IMPORTED: {
    label: 'Movie Imported',
    className: 'bg-status-completed/20 text-status-completed',
  },
  SERIES_IMPORTED: {
    label: 'Episode Imported',
    className: 'bg-status-completed/20 text-status-completed',
  },
  SEEDING_COMPLETE: {
    label: 'Seeding Complete',
    className: 'bg-status-completed/20 text-status-completed',
  },
  IMPORT_FAILED: {
    label: 'Import Failed',
    className: 'bg-status-error/20 text-status-error',
  },
  MEDIA_ADDED: {
    label: 'Added',
    className: 'bg-accent-info/20 text-accent-info',
  },
  SEARCH_EXECUTED: {
    label: 'Search',
    className: 'bg-surface-2 text-text-secondary',
  },
  SUBTITLE_DOWNLOADED: {
    label: 'Subtitle',
    className: 'bg-accent-info/20 text-accent-info',
  },
};

export function ActivityEventBadge({ eventType }: ActivityEventBadgeProps) {
  const config = EVENT_TYPE_CONFIG[eventType] ?? {
    label: eventType,
    className: 'bg-surface-2 text-text-secondary',
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${config.className}`}
      title={eventType}
    >
      {config.label}
    </span>
  );
}
