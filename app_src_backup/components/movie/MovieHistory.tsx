'use client';

import { useMemo } from 'react';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { queryKeys } from '@/lib/query/queryKeys';
import { getApiClients } from '@/lib/api/client';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { EmptyPanel } from '@/components/primitives/EmptyPanel';
import type { ActivityItem } from '@/lib/api/activityApi';

export interface MovieHistoryProps {
  movieId: number;
}

interface MovieHistoryEvent {
  id: number;
  type: 'grab' | 'import' | 'download' | 'delete' | 'refresh';
  date: string;
  quality?: string;
  source?: string;
  details: string;
  success?: boolean;
}

function formatActivityToHistoryEvent(activity: ActivityItem): MovieHistoryEvent {
  const eventType = activity.eventType.toLowerCase();
  let type: MovieHistoryEvent['type'] = 'download';

  if (eventType.includes('grab')) type = 'grab';
  else if (eventType.includes('import')) type = 'import';
  else if (eventType.includes('delete')) type = 'delete';
  else if (eventType.includes('refresh')) type = 'refresh';

  // Extract quality from details if available
  let quality: string | undefined;
  if (activity.details && typeof activity.details === 'object') {
    quality = (activity.details as any).quality;
  }

  // Extract source from sourceModule
  const source = activity.sourceModule;

  return {
    id: activity.id,
    type,
    date: activity.occurredAt || new Date().toISOString(),
    quality,
    source,
    details: activity.summary,
    success: activity.success,
  };
}

function getEventIcon(type: MovieHistoryEvent['type']): string {
  switch (type) {
    case 'grab':
      return '⬇️';
    case 'import':
      return '📥';
    case 'download':
      return '📦';
    case 'delete':
      return '🗑️';
    case 'refresh':
      return '🔄';
    default:
      return '📄';
  }
}

function getEventColor(type: MovieHistoryEvent['type'], success?: boolean): string {
  if (success === false) {
    return 'text-status-error';
  }

  switch (type) {
    case 'grab':
      return 'text-accent-primary';
    case 'import':
      return 'text-accent-success';
    case 'download':
      return 'text-accent-info';
    case 'delete':
      return 'text-status-error';
    case 'refresh':
      return 'text-accent-warning';
    default:
      return 'text-text-primary';
  }
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export function MovieHistory({ movieId }: MovieHistoryProps) {
  const api = useMemo(() => getApiClients(), []);

  const historyQuery = useApiQuery({
    queryKey: ['activity', { entityRef: `movie:${movieId}` }],
    queryFn: async () => {
      return api.activityApi.list({
        entityRef: `movie:${movieId}`,
        pageSize: 50,
      });
    },
    staleTimeKind: 'detail',
  });

  const historyEvents = useMemo(() => {
    if (!historyQuery.data) return [];

    return historyQuery.data.items
      .map(formatActivityToHistoryEvent)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [historyQuery.data]);

  if (historyQuery.isPending) {
    return (
      <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-1 p-4">
        <h2 className="text-lg font-semibold">History</h2>
        <QueryPanel
          isLoading={true}
          isError={false}
          isEmpty={false}
          emptyTitle=""
          emptyBody=""
        >
          <div />
        </QueryPanel>
      </div>
    );
  }

  if (historyQuery.isError) {
    return (
      <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-1 p-4">
        <h2 className="text-lg font-semibold">History</h2>
        <QueryPanel
          isLoading={false}
          isError={true}
          isEmpty={false}
          errorMessage={historyQuery.error?.message}
          onRetry={() => void historyQuery.refetch()}
          emptyTitle=""
          emptyBody=""
        >
          <div />
        </QueryPanel>
      </div>
    );
  }

  return (
    <section className="space-y-3 rounded-lg border border-border-subtle bg-surface-1 p-4">
      <h2 className="text-lg font-semibold">History</h2>

      {historyEvents.length === 0 ? (
        <EmptyPanel
          title="No history yet"
          body="Activity events for this movie will appear here."
        />
      ) : (
        <div className="space-y-3">
          {historyEvents.map(event => (
            <div
              key={event.id}
              className="flex gap-3 rounded-md bg-surface-2 p-3"
            >
              <div className={`flex-shrink-0 text-2xl ${getEventColor(event.type, event.success)}`}>
                {getEventIcon(event.type)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text-primary capitalize">{event.type}</span>
                  {event.quality && (
                    <span className="rounded-sm bg-surface-3 px-2 py-0.5 text-xs text-text-secondary">
                      {event.quality}
                    </span>
                  )}
                  <span className="text-xs text-text-muted">{formatDateTime(event.date)}</span>
                </div>
                <p className="mt-1 truncate text-sm text-text-secondary">{event.details}</p>
                {event.source && (
                  <p className="mt-1 text-xs text-text-muted">Source: {event.source}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {historyEvents.length > 0 && (
        <p className="text-xs text-text-secondary">
          {historyEvents.length} event{historyEvents.length !== 1 ? 's' : ''} shown
        </p>
      )}
    </section>
  );
}
