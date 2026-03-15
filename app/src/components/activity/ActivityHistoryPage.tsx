
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getApiClients } from '@/lib/api/client';
import type { ActivityItem, ActivityQuery } from '@/lib/api/activityApi';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { Button } from '@/components/ui/button';
import { ActivityEventBadge } from './ActivityEventBadge';
import { useToast } from '@/components/providers/ToastProvider';
import { AlertTriangle, RotateCcw } from 'lucide-react';

const EVENT_TYPE_OPTIONS = [
  { value: '', label: 'All Events' },
  { value: 'RELEASE_GRABBED', label: 'Grabbed' },
  { value: 'IMPORT_COMPLETED', label: 'Imported' },
  { value: 'IMPORT_FAILED', label: 'Import Failed' },
  { value: 'MEDIA_ADDED', label: 'Media Added' },
  { value: 'SEARCH_EXECUTED', label: 'Search' },
  { value: 'SUBTITLE_DOWNLOADED', label: 'Subtitle Downloaded' },
  { value: 'SEEDING_COMPLETE', label: 'Seeding Complete' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Success' },
  { value: 'false', label: 'Failed' },
];

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function extractDetail(item: ActivityItem, key: string): string {
  if (!item.details || typeof item.details !== 'object') return '—';
  const val = (item.details as Record<string, unknown>)[key];
  return typeof val === 'string' ? val : '—';
}

export function ActivityHistoryPage() {
  const api = useMemo(() => getApiClients(), []);
  const { pushToast } = useToast();

  const [items, setItems] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [totalPages, setTotalPages] = useState(1);

  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [markingId, setMarkingId] = useState<number | null>(null);
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const query: ActivityQuery = { page, pageSize };
      if (eventTypeFilter) query.eventType = eventTypeFilter;
      if (statusFilter !== '') query.success = statusFilter === 'true';

      const result = await api.activityApi.list(query);
      setItems(result.items);
      setTotalPages(Math.max(1, result.meta.totalPages));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch history');
    } finally {
      setIsLoading(false);
    }
  }, [api, page, pageSize, eventTypeFilter, statusFilter]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const handleMarkFailed = async (item: ActivityItem) => {
    setMarkingId(item.id);
    try {
      await api.activityApi.markFailed(item.id);
      pushToast({ title: 'Marked as failed', variant: 'success' });
      void fetchHistory();
    } catch (err) {
      pushToast({
        title: 'Action failed',
        message: err instanceof Error ? err.message : 'Unknown error',
        variant: 'error',
      });
    } finally {
      setMarkingId(null);
    }
  };

  const handleRetryImport = async (item: ActivityItem) => {
    setRetryingId(item.id);
    try {
      await api.activityApi.retryImport(item.id);
      pushToast({ title: 'Import retried', variant: 'success' });
      void fetchHistory();
    } catch (err) {
      pushToast({
        title: 'Retry failed',
        message: err instanceof Error ? err.message : 'Unknown error',
        variant: 'error',
      });
    } finally {
      setRetryingId(null);
    }
  };

  const handleFilterChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setter(e.target.value);
    setPage(1);
  };

  const columns: DataTableColumn<ActivityItem>[] = [
    {
      key: 'occurredAt',
      header: 'Date',
      render: (item) => (
        <span className="whitespace-nowrap text-sm text-text-secondary">
          {formatDate(item.occurredAt)}
        </span>
      ),
    },
    {
      key: 'eventType',
      header: 'Event Type',
      render: (item) => <ActivityEventBadge eventType={item.eventType} />,
    },
    {
      key: 'summary',
      header: 'Summary',
      render: (item) => (
        <span
          className={`text-sm ${item.success === false ? 'text-status-error' : ''}`}
          title={item.summary}
        >
          {item.summary}
        </span>
      ),
    },
    {
      key: 'sourceModule',
      header: 'Source',
      render: (item) => (
        <span className="text-xs text-text-secondary capitalize">{item.sourceModule ?? '—'}</span>
      ),
    },
    {
      key: 'quality',
      header: 'Quality',
      render: (item) => (
        <span className="text-xs text-text-secondary">{extractDetail(item, 'quality')}</span>
      ),
    },
    {
      key: 'indexer',
      header: 'Indexer',
      render: (item) => (
        <span className="text-xs text-text-secondary">{extractDetail(item, 'indexer')}</span>
      ),
    },
  ];

  const rowActions = (item: ActivityItem) => {
    if (item.eventType === 'IMPORT_FAILED' && item.success === false) {
      return (
        <Button
          variant="secondary"
          onClick={() => handleRetryImport(item)}
          disabled={retryingId === item.id}
          aria-label="Retry import"
        >
          <RotateCcw size={14} />
        </Button>
      );
    }

    if (item.success === false) return null;
    return (
      <Button
        variant="destructive"
        onClick={() => handleMarkFailed(item)}
        disabled={markingId === item.id}
        aria-label="Mark failed"
      >
        <AlertTriangle size={14} />
      </Button>
    );
  };

  return (
    <RouteScaffold
      title="History"
      description="Unified activity history and release lifecycle events."
    >
      <div className="flex flex-col gap-6">
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="event-type-filter" className="text-xs text-text-secondary">
              Event Type
            </label>
            <select
              id="event-type-filter"
              aria-label="Event Type"
              value={eventTypeFilter}
              onChange={handleFilterChange(setEventTypeFilter)}
              className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1.5 text-sm"
            >
              {EVENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="status-filter" className="text-xs text-text-secondary">
              Status
            </label>
            <select
              id="status-filter"
              aria-label="Status"
              value={statusFilter}
              onChange={handleFilterChange(setStatusFilter)}
              className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1.5 text-sm"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <DataTable
          data={items}
          columns={columns}
          getRowId={(item) => String(item.id)}
          rowActions={rowActions}
          pagination={{
            page,
            totalPages,
            pageSize,
            onPrev: () => setPage((p) => Math.max(1, p - 1)),
            onNext: () => setPage((p) => Math.min(totalPages, p + 1)),
          }}
        />

        {error && <p className="text-sm text-status-error">{error}</p>}

        {!isLoading && items.length === 0 && (
          <div className="rounded-md border border-dashed border-border-subtle p-12 text-center">
            <p className="text-text-secondary">No activity history found.</p>
          </div>
        )}
      </div>
    </RouteScaffold>
  );
}
