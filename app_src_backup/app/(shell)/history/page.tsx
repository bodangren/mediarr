'use client';

import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { Label } from '@/components/primitives/Label';
import { ConfirmModal, Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { Button } from '@/components/primitives/Button';
import { MovieCell } from '@/components/activity/MovieCell';
import { ActivityEventBadge } from '@/components/activity/ActivityEventBadge';
import { getApiClients } from '@/lib/api/client';
import type { ActivityItem } from '@/lib/api/activityApi';
import { formatRelativeDate } from '@/lib/format';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';

const EVENT_TYPE_OPTIONS = [
  { label: 'All events', value: '' },
  { label: 'Movie Grabbed', value: 'MOVIE_GRABBED' },
  { label: 'Movie Downloaded', value: 'MOVIE_DOWNLOADED' },
  { label: 'Movie Imported', value: 'MOVIE_IMPORTED' },
  { label: 'Movie Renamed', value: 'MOVIE_RENAMED' },
  { label: 'File Deleted', value: 'MOVIE_FILE_DELETED' },
  { label: 'Download Failed', value: 'DOWNLOAD_FAILED' },
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

function formatDetails(details: unknown): string {
  if (details === undefined || details === null) {
    return '{}';
  }

  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return '{}';
  }
}

function downloadHistoryExport(payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `history-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

export default function HistoryPage() {
  const api = useMemo(() => getApiClients(), []);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [eventType, setEventType] = useState('');
  const [detailsRow, setDetailsRow] = useState<ActivityItem | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

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
      key: 'movie',
      header: 'Movie',
      render: row =>
        (row as any).movieId ? (
          <MovieCell
            movieId={(row as any).movieId}
            title={(row as any).movieTitle ?? row.summary}
            posterUrl={(row as any).moviePosterUrl}
            size="small"
          />
        ) : (
          <span className="text-sm text-text-muted">-</span>
        ),
    },
    {
      key: 'eventType',
      header: 'Event',
      render: row => <ActivityEventBadge eventType={row.eventType} />,
    },
    {
      key: 'quality',
      header: 'Quality',
      render: row =>
        (row as any).quality ? (
          <span className="text-xs text-text-primary bg-surface-2 px-2 py-0.5 rounded-sm">
            {(row as any).quality}
          </span>
        ) : (
          <span className="text-sm text-text-muted">-</span>
        ),
    },
    {
      key: 'indexer',
      header: 'Indexer',
      render: row =>
        (row as any).indexer ? (
          <span className="text-sm text-text-secondary">{(row as any).indexer}</span>
        ) : (
          <span className="text-sm text-text-muted">-</span>
        ),
    },
    {
      key: 'summary',
      header: 'Summary',
      render: row => (
        <span className="text-sm text-text-primary truncate" title={row.summary}>
          {row.summary}
        </span>
      ),
    },
    {
      key: 'success',
      header: 'Status',
      render: row => renderStatus(getHistoryStatus(row.success)),
    },
  ], []);

  const meta = historyQuery.data?.meta;
  const exportQuery = useMemo(
    () => (eventType ? { eventType } : {}),
    [eventType],
  );

  const clearHistoryMutation = useMutation({
    mutationFn: () => api.activityApi.clear({}),
    onSuccess: () => {
      setPage(1);
      setIsClearConfirmOpen(false);
      void historyQuery.refetch();
    },
  });

  const markFailedMutation = useMutation({
    mutationFn: (id: number) => api.activityApi.markFailed(id),
    onSuccess: () => {
      void historyQuery.refetch();
    },
  });

  const exportHistoryMutation = useMutation({
    mutationFn: () => api.activityApi.export(exportQuery),
    onSuccess: exported => {
      downloadHistoryExport(exported.items);
    },
  });

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">History</h1>
        <p className="text-sm text-text-secondary">Download/import activity timeline with movie support.</p>
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
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            disabled={exportHistoryMutation.isPending}
            onClick={() => {
              exportHistoryMutation.mutate();
            }}
          >
            Export history
          </Button>
          <Button
            variant="danger"
            disabled={clearHistoryMutation.isPending}
            onClick={() => setIsClearConfirmOpen(true)}
          >
            Clear history
          </Button>
        </div>
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
          rowActions={row => (
            <div className="flex items-center justify-end gap-2">
              {(row.eventType === 'RELEASE_GRABBED' ||
                row.eventType === 'MOVIE_GRABBED') &&
              row.success !== false ? (
                <Button
                  variant="secondary"
                  className="text-xs px-2 py-1"
                  onClick={() => markFailedMutation.mutate(row.id)}
                  disabled={markFailedMutation.isPending}
                >
                  Mark failed
                </Button>
              ) : null}
              <Button
                variant="secondary"
                className="text-xs px-2 py-1"
                onClick={() => setDetailsRow(row)}
              >
                Details
              </Button>
            </div>
          )}
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

      {detailsRow ? (
        <Modal isOpen ariaLabel="History details" onClose={() => setDetailsRow(null)}>
          <ModalHeader title="History details" onClose={() => setDetailsRow(null)} />
          <ModalBody>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-text-secondary">Event</p>
                  <div className="flex items-center gap-2">
                    <ActivityEventBadge eventType={detailsRow.eventType} />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Status</p>
                  <div>{renderStatus(getHistoryStatus(detailsRow.success))}</div>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Source</p>
                  <p>{detailsRow.sourceModule ?? 'core'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Entity</p>
                  <p>{detailsRow.entityRef ?? 'n/a'}</p>
                </div>
                {(detailsRow as any).movieId ? (
                  <>
                    <div>
                      <p className="text-xs text-text-secondary">Movie</p>
                      <MovieCell
                        movieId={(detailsRow as any).movieId}
                        title={(detailsRow as any).movieTitle ?? 'Unknown'}
                        posterUrl={(detailsRow as any).moviePosterUrl}
                      />
                    </div>
                    {(detailsRow as any).quality ? (
                      <div>
                        <p className="text-xs text-text-secondary">Quality</p>
                        <p>{(detailsRow as any).quality}</p>
                      </div>
                    ) : null}
                    {(detailsRow as any).indexer ? (
                      <div>
                        <p className="text-xs text-text-secondary">Indexer</p>
                        <p>{(detailsRow as any).indexer}</p>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
              <div>
                <p className="text-xs text-text-secondary">Parameters</p>
                <pre className="overflow-x-auto rounded-sm border border-border-subtle bg-surface-2 p-2 text-xs text-text-primary">
                  {formatDetails(detailsRow.details)}
                </pre>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setDetailsRow(null)}>
              Close
            </Button>
          </ModalFooter>
        </Modal>
      ) : null}

      <ConfirmModal
        isOpen={isClearConfirmOpen}
        title="Clear history"
        description="This will permanently remove all history records."
        onCancel={() => setIsClearConfirmOpen(false)}
        onConfirm={() => clearHistoryMutation.mutate()}
        confirmLabel="Clear history"
        confirmVariant="danger"
        isConfirming={clearHistoryMutation.isPending}
      />
    </section>
  );
}
