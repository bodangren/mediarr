'use client';

import { useMemo, useState } from 'react';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { Label } from '@/components/primitives/Label';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { getApiClients } from '@/lib/api/client';
import type { ActivityItem } from '@/lib/api/activityApi';
import { formatRelativeDate } from '@/lib/format';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';

const EVENT_TYPE_OPTIONS = [
  { label: 'All events', value: '' },
  { label: 'Grabbed', value: 'RELEASE_GRABBED' },
  { label: 'Query', value: 'INDEXER_QUERY' },
  { label: 'RSS', value: 'INDEXER_RSS' },
  { label: 'Auth', value: 'INDEXER_AUTH' },
] as const;

type HistoryStatus = 'success' | 'failed' | 'unknown';

function getHistoryStatus(success: boolean | undefined): HistoryStatus {
  if (success === true) {
    return 'success';
  }

  if (success === false) {
    return 'failed';
  }

  return 'unknown';
}

function renderStatus(status: HistoryStatus) {
  if (status === 'success') {
    return <Label tone="success">success</Label>;
  }

  if (status === 'failed') {
    return <Label tone="danger">failed</Label>;
  }

  return '-';
}

export default function HistoryPage() {
  const api = useMemo(() => getApiClients(), []);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [eventType, setEventType] = useState('');

  const query = useMemo(
    () => ({
      page,
      pageSize,
      ...(eventType ? { eventType } : {}),
    }),
    [eventType, page, pageSize],
  );

  const historyQuery = useApiQuery({
    queryKey: queryKeys.activity(query),
    queryFn: () => api.activityApi.list(query),
    staleTimeKind: 'list',
    isEmpty: data => data.items.length === 0,
  });

  const columns = useMemo<DataTableColumn<ActivityItem>[]>(() => [
    {
      key: 'occurredAt',
      header: 'Time',
      render: row => formatRelativeDate(row.occurredAt),
    },
    {
      key: 'eventType',
      header: 'Event',
      render: row => row.eventType,
    },
    {
      key: 'summary',
      header: 'Summary',
      render: row => row.summary,
    },
    {
      key: 'sourceModule',
      header: 'Source',
      render: row => row.sourceModule ?? 'core',
    },
    {
      key: 'success',
      header: 'Status',
      render: row => renderStatus(getHistoryStatus(row.success)),
    },
  ], []);

  const meta = historyQuery.data?.meta;

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">History</h1>
        <p className="text-sm text-text-secondary">Indexer query and release history timeline.</p>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-md border border-border-subtle bg-surface-1 p-3">
        <label className="flex min-w-56 flex-col gap-1 text-xs text-text-secondary" htmlFor="history-event-type">
          Event type
          <select
            id="history-event-type"
            value={eventType}
            className="rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-sm text-text-primary"
            onChange={event => {
              setEventType(event.currentTarget.value);
              setPage(1);
            }}
          >
            {EVENT_TYPE_OPTIONS.map(option => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <QueryPanel
        isLoading={historyQuery.isPending}
        isError={historyQuery.isError}
        isEmpty={historyQuery.isResolvedEmpty}
        errorMessage={historyQuery.error?.message}
        onRetry={() => void historyQuery.refetch()}
        emptyTitle="No history records"
        emptyBody="Indexer activity will appear once queries and grabs run."
      >
        <DataTable
          data={historyQuery.data?.items ?? []}
          columns={columns}
          getRowId={row => row.id}
          pagination={{
            page: meta?.page ?? page,
            totalPages: Math.max(1, meta?.totalPages ?? 1),
            pageSize: meta?.pageSize ?? pageSize,
            onPrev: () => setPage(current => Math.max(1, current - 1)),
            onNext: () => {
              const totalPages = Math.max(1, meta?.totalPages ?? 1);
              setPage(current => Math.min(totalPages, current + 1));
            },
            onPageSizeChange: nextPageSize => {
              setPageSize(nextPageSize);
              setPage(1);
            },
          }}
        />
      </QueryPanel>
    </section>
  );
}
