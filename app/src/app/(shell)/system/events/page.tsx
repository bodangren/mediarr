'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { Label } from '@/components/primitives/Label';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { Icon } from '@/components/primitives/Icon';
import { getApiClients } from '@/lib/api/client';
import type { EventLevel, EventType, SystemEvent } from '@/lib/api/systemApi';
import { formatDateTime } from '@/lib/format';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';

interface EventFilters {
  level?: EventLevel;
  type?: EventType;
  page: number;
  pageSize: number;
}

function getEventLevelTone(level: EventLevel): 'info' | 'success' | 'warning' | 'danger' {
  switch (level) {
    case 'fatal':
    case 'error':
      return 'danger';
    case 'warning':
      return 'warning';
    case 'info':
    default:
      return 'info';
  }
}

function EventLevelBadge({ level }: { level: EventLevel }) {
  return <Label tone={getEventLevelTone(level)}>{level.toUpperCase()}</Label>;
}

function formatEventTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return formatDateTime(date);
}

export default function EventsPage() {
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<EventFilters>({ page: 1, pageSize: 25 });
  const [selectedEvent, setSelectedEvent] = useState<SystemEvent | null>(null);

  // Events query
  const eventsQuery = useApiQuery({
    queryKey: queryKeys.systemEvents(filters),
    queryFn: () => api.systemApi.getEvents(filters),
    staleTimeKind: 'systemEvents',
    isEmpty: data => data.items.length === 0,
  });

  // Clear events mutation
  const clearEventsMutation = useMutation({
    mutationFn: () => api.systemApi.clearEvents(),
    onSuccess: () => {
      void eventsQuery.refetch();
    },
  });

  // Export events mutation
  const exportEventsMutation = useMutation({
    mutationFn: (format: 'csv' | 'json') =>
      api.systemApi.exportEvents({ ...filters, format }),
    onSuccess: (blob: Blob, format: 'csv' | 'json') => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `events-${new Date().toISOString()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });

  // Handle filter changes
  const updateFilter = <K extends keyof EventFilters>(key: K, value: EventFilters[K]) => {
    setFilters(prev => {
      const next = {
        ...prev,
        [key]: value,
      } as EventFilters;

      // Reset to page 1 for non-pagination filter changes.
      next.page = key === 'page' && typeof value === 'number' ? value : 1;
      return next;
    });
  };

  // Events table columns
  const columns: DataTableColumn<SystemEvent>[] = useMemo(
    () => [
      {
        key: 'timestamp',
        header: 'Timestamp',
        render: row => formatEventTimestamp(row.timestamp),
      },
      {
        key: 'level',
        header: 'Level',
        render: row => <EventLevelBadge level={row.level} />,
      },
      {
        key: 'type',
        header: 'Type',
        render: row => row.type,
      },
      {
        key: 'message',
        header: 'Message',
        render: row => row.message,
      },
      {
        key: 'source',
        header: 'Source',
        render: row => row.source ?? '-',
      },
    ],
    [],
  );

  const meta = eventsQuery.data?.meta;

  // Loading state
  if (eventsQuery.isPending) {
    return (
      <section className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">System Events</h1>
          <p className="text-sm text-text-secondary">Application event log and notifications timeline.</p>
        </header>
        <div className="flex items-center justify-center py-12 text-text-muted">
          <Icon name="refresh" label="Loading" className="animate-spin h-5 w-5" />
          <span className="ml-2">Loading events...</span>
        </div>
      </section>
    );
  }

  // Error state
  if (eventsQuery.isError) {
    return (
      <section className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">System Events</h1>
          <p className="text-sm text-text-secondary">Application event log and notifications timeline.</p>
        </header>
        <div className="rounded-md border border-border-danger bg-surface-danger p-4">
          <h2 className="text-lg font-medium text-text-error">Failed to load events</h2>
          <p className="text-sm text-text-error">{eventsQuery.error?.message || 'Unknown error'}</p>
          <button
            type="button"
            className="mt-3 rounded-sm border border-border-subtle px-3 py-1 text-sm text-text-primary hover:bg-surface-2"
            onClick={() => void eventsQuery.refetch()}
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* Page Header */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">System Events</h1>
        <p className="text-sm text-text-secondary">Application event log and notifications timeline.</p>
      </header>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-end gap-3 rounded-md border border-border-subtle bg-surface-1 p-3">
        <label className="flex min-w-40 flex-col gap-1 text-xs text-text-secondary" htmlFor="filter-level">
          Level
          <select
            id="filter-level"
            value={filters.level ?? ''}
            className="rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-sm text-text-primary"
            onChange={event => {
              updateFilter('level', event.currentTarget.value === '' ? undefined : (event.currentTarget.value as EventLevel));
            }}
            aria-label="Filter by event level"
          >
            <option value="">All levels</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="fatal">Fatal</option>
          </select>
        </label>

        <label className="flex min-w-40 flex-col gap-1 text-xs text-text-secondary" htmlFor="filter-type">
          Type
          <select
            id="filter-type"
            value={filters.type ?? ''}
            className="rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-sm text-text-primary"
            onChange={event => {
              updateFilter('type', event.currentTarget.value === '' ? undefined : (event.currentTarget.value as EventType));
            }}
            aria-label="Filter by event type"
          >
            <option value="">All types</option>
            <option value="system">System</option>
            <option value="indexer">Indexer</option>
            <option value="network">Network</option>
            <option value="download">Download</option>
            <option value="import">Import</option>
            <option value="health">Health</option>
            <option value="update">Update</option>
            <option value="backup">Backup</option>
            <option value="other">Other</option>
          </select>
        </label>

        {/* Export Button */}
        <button
          type="button"
          className="ml-auto flex items-center gap-2 rounded-sm border border-border-subtle px-3 py-1.5 text-sm text-text-primary hover:bg-surface-2 disabled:opacity-60"
          disabled={exportEventsMutation.isPending}
          onClick={() => {
            void exportEventsMutation.mutate('csv');
          }}
          aria-label="Export events"
        >
          <Icon name="download" label="Export" className="h-4 w-4" />
          {exportEventsMutation.isPending ? 'Exporting...' : 'Export'}
        </button>

        {/* Clear Events Button */}
        <button
          type="button"
          className="flex items-center gap-2 rounded-sm border border-border-danger bg-surface-danger px-3 py-1.5 text-sm text-text-primary hover:bg-surface-danger/80 disabled:opacity-60"
          disabled={clearEventsMutation.isPending}
          onClick={() => {
            if (confirm('Are you sure you want to clear all events? This action cannot be undone.')) {
              void clearEventsMutation.mutate();
            }
          }}
          aria-label="Clear events"
        >
          <Icon name="trash" label="Clear" className="h-4 w-4" />
          {clearEventsMutation.isPending ? 'Clearing...' : 'Clear Events'}
        </button>
      </div>

      {/* Events Table */}
      <QueryPanel
        isLoading={false}
        isError={false}
        isEmpty={eventsQuery.data?.items.length === 0}
        errorMessage={undefined}
        onRetry={() => void eventsQuery.refetch()}
        emptyTitle="No events found"
        emptyBody="System events will appear here when logged."
      >
        <DataTable
          data={eventsQuery.data?.items ?? []}
          columns={columns}
          getRowId={row => row.id}
          onRowClick={row => setSelectedEvent(row)}
          pagination={
            meta
              ? {
                  page: meta.page,
                  totalPages: meta.totalPages,
                  pageSize: meta.pageSize,
                  onPrev: () => updateFilter('page', Math.max(1, filters.page - 1)),
                  onNext: () => updateFilter('page', Math.min(meta.totalPages, filters.page + 1)),
                }
              : undefined
          }
        />
      </QueryPanel>

      {/* Event Details Modal */}
      {selectedEvent ? (
        <Modal
          isOpen
          ariaLabel="Event Details"
          onClose={() => setSelectedEvent(null)}
          maxWidthClassName="max-w-2xl"
        >
          <ModalHeader title="Event Details" onClose={() => setSelectedEvent(null)} />
          <ModalBody>
            <div className="space-y-4">
              {/* Event Summary */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <EventLevelBadge level={selectedEvent.level} />
                  <span className="text-sm font-semibold text-text-primary">{selectedEvent.type.toUpperCase()}</span>
                  {selectedEvent.source && <span className="text-sm text-text-secondary">• {selectedEvent.source}</span>}
                </div>
                <p className="text-base text-text-primary">{selectedEvent.message}</p>
                <p className="text-xs text-text-muted">{formatEventTimestamp(selectedEvent.timestamp)}</p>
              </div>

              {/* Event Details */}
              {selectedEvent.details && Object.keys(selectedEvent.details).length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-text-primary">Details</h3>
                  <div className="overflow-x-auto rounded-sm border border-border-subtle bg-surface-2 p-3">
                    <pre className="text-xs text-text-primary whitespace-pre-wrap">
                      {JSON.stringify(selectedEvent.details, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Event ID */}
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span>ID:</span>
                <span className="font-mono">{selectedEvent.id}</span>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <button
              type="button"
              className="rounded-sm border border-border-subtle px-3 py-1 text-sm text-text-primary hover:bg-surface-2"
              onClick={() => setSelectedEvent(null)}
              aria-label="Close event details"
            >
              Close
            </button>
          </ModalFooter>
        </Modal>
      ) : null}
    </section>
  );
}
