'use client';

import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { Label } from '@/components/primitives/Label';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { ProgressBar } from '@/components/primitives/ProgressBar';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { getApiClients } from '@/lib/api/client';
import type { QueuedTask, ScheduledTask, TaskHistory } from '@/lib/api/systemApi';
import { formatRelativeDate } from '@/lib/format';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';

function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) {
    return '-';
  }
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function formatTaskStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Pending',
    running: 'Running',
    completed: 'Completed',
    failed: 'Failed',
    queued: 'Queued',
    paused: 'Paused',
    success: 'Success',
  };
  return statusMap[status] ?? status;
}

function renderHistoryStatus(status: 'success' | 'failed') {
  if (status === 'success') {
    return <Label tone="success">success</Label>;
  }
  return <Label tone="danger">failed</Label>;
}

export default function TasksPage() {
  const api = useMemo(() => getApiClients(), []);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(25);
  const [historyStatus, setHistoryStatus] = useState('');
  const [detailsTask, setDetailsTask] = useState<TaskHistory | null>(null);

  // Scheduled tasks query
  const scheduledQuery = useApiQuery({
    queryKey: queryKeys.tasksScheduled(),
    queryFn: () => api.systemApi.getScheduledTasks(),
    staleTimeKind: 'tasksScheduled',
    isEmpty: data => data.length === 0,
  });

  // Queued tasks query (refreshes frequently)
  const queuedQuery = useApiQuery({
    queryKey: queryKeys.tasksQueued(),
    queryFn: () => api.systemApi.getQueuedTasks(),
    staleTimeKind: 'tasksQueued',
    isEmpty: data => data.length === 0,
  });

  // Task history query
  const historyQuery = useMemo(
    () => ({
      page: historyPage,
      pageSize: historyPageSize,
      ...(historyStatus ? { status: historyStatus as 'success' | 'failed' } : {}),
    }),
    [historyPage, historyPageSize, historyStatus],
  );

  const historyListQuery = useApiQuery({
    queryKey: queryKeys.tasksHistory(historyQuery),
    queryFn: () => api.systemApi.getTaskHistory(historyQuery),
    staleTimeKind: 'tasksHistory',
    isEmpty: data => data.items.length === 0,
  });

  // Run task mutation
  const runTaskMutation = useMutation({
    mutationFn: (taskId: string | number) => api.systemApi.runTask(taskId),
    onSuccess: () => {
      void scheduledQuery.refetch();
      void queuedQuery.refetch();
    },
  });

  // Cancel task mutation
  const cancelTaskMutation = useMutation({
    mutationFn: (taskId: number) => api.systemApi.cancelTask(taskId),
    onSuccess: () => {
      void queuedQuery.refetch();
    },
  });

  // Scheduled tasks columns
  const scheduledColumns: DataTableColumn<ScheduledTask>[] = useMemo(
    () => [
      {
        key: 'taskName',
        header: 'Task Name',
        render: row => row.taskName,
      },
      {
        key: 'interval',
        header: 'Interval',
        render: row => row.interval,
      },
      {
        key: 'lastExecution',
        header: 'Last Execution',
        render: row => (row.lastExecution ? formatRelativeDate(row.lastExecution) : '-'),
      },
      {
        key: 'lastDuration',
        header: 'Last Duration',
        render: row => formatDuration(row.lastDuration),
      },
      {
        key: 'nextExecution',
        header: 'Next Execution',
        render: row => formatRelativeDate(row.nextExecution),
      },
      {
        key: 'status',
        header: 'Status',
        render: row => <StatusBadge status={formatTaskStatus(row.status)} />,
      },
      {
        key: 'actions',
        header: 'Actions',
        render: row => (
          <button
            type="button"
            className="rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-primary hover:bg-surface-2 disabled:opacity-60"
            onClick={() => runTaskMutation.mutate(row.id)}
            disabled={runTaskMutation.isPending || row.status === 'running'}
            aria-label={`Run ${row.taskName} now`}
          >
            Run Now
          </button>
        ),
      },
    ],
    [runTaskMutation.isPending],
  );

  // Queued tasks columns
  const queuedColumns: DataTableColumn<QueuedTask>[] = useMemo(
    () => [
      {
        key: 'taskName',
        header: 'Task Name',
        render: row => row.taskName,
      },
      {
        key: 'started',
        header: 'Started',
        render: row => formatRelativeDate(row.started),
      },
      {
        key: 'duration',
        header: 'Duration',
        render: row => formatDuration(row.duration),
      },
      {
        key: 'progress',
        header: 'Progress',
        render: row => (
          <ProgressBar value={row.progress} label="" indeterminate={row.status === 'running' && row.progress === 0} />
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: row => <StatusBadge status={formatTaskStatus(row.status)} />,
      },
      {
        key: 'actions',
        header: 'Actions',
        render: row => (
          <button
            type="button"
            className="rounded-sm border border-border-danger bg-surface-danger px-2 py-1 text-xs text-text-primary hover:bg-surface-danger/80 disabled:opacity-60"
            onClick={() => cancelTaskMutation.mutate(row.id as number)}
            disabled={cancelTaskMutation.isPending}
            aria-label={`Cancel ${row.taskName}`}
          >
            Cancel
          </button>
        ),
      },
    ],
    [cancelTaskMutation.isPending],
  );

  // Task history columns
  const historyColumns: DataTableColumn<TaskHistory>[] = useMemo(
    () => [
      {
        key: 'taskName',
        header: 'Task Name',
        render: row => row.taskName,
      },
      {
        key: 'started',
        header: 'Started',
        render: row => formatRelativeDate(row.started),
      },
      {
        key: 'duration',
        header: 'Duration',
        render: row => formatDuration(row.duration),
      },
      {
        key: 'status',
        header: 'Status',
        render: row => renderHistoryStatus(row.status),
      },
      {
        key: 'actions',
        header: 'Actions',
        render: row => (
          <button
            type="button"
            className="rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-primary hover:bg-surface-2"
            onClick={() => setDetailsTask(row)}
            aria-label={`Details for ${row.taskName}`}
          >
            Details
          </button>
        ),
      },
    ],
    [],
  );

  // Task details query
  const taskDetailsQuery = useApiQuery({
    queryKey: queryKeys.taskDetails(detailsTask?.id ?? 0),
    queryFn: () => api.systemApi.getTaskDetails(detailsTask!.id),
    enabled: detailsTask !== null,
    staleTimeKind: 'detail',
  });

  const historyMeta = historyListQuery.data?.meta;

  return (
    <section className="space-y-6">
      {/* Page Header */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">System Tasks</h1>
        <p className="text-sm text-text-secondary">Scheduled jobs and manual task execution.</p>
      </header>

      {/* Scheduled Tasks Table */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium">Scheduled Tasks</h2>
        <QueryPanel
          isLoading={scheduledQuery.isPending}
          isError={scheduledQuery.isError}
          isEmpty={scheduledQuery.isResolvedEmpty}
          errorMessage={scheduledQuery.error?.message}
          onRetry={() => void scheduledQuery.refetch()}
          emptyTitle="No scheduled tasks"
          emptyBody="Configure scheduled tasks in settings."
        >
          <DataTable data={scheduledQuery.data ?? []} columns={scheduledColumns} getRowId={row => String(row.id)} />
        </QueryPanel>
      </div>

      {/* Queued Tasks Table */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium">Queued Tasks</h2>
        <QueryPanel
          isLoading={queuedQuery.isPending}
          isError={queuedQuery.isError}
          isEmpty={queuedQuery.isResolvedEmpty}
          errorMessage={queuedQuery.error?.message}
          onRetry={() => void queuedQuery.refetch()}
          emptyTitle="No queued tasks"
          emptyBody="Tasks will appear here when running."
        >
          <DataTable data={queuedQuery.data ?? []} columns={queuedColumns} getRowId={row => String(row.id)} />
        </QueryPanel>
      </div>

      {/* Task History Table */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium">Task History</h2>
        <div className="flex flex-wrap items-end gap-3 rounded-md border border-border-subtle bg-surface-1 p-3">
          <label className="flex min-w-40 flex-col gap-1 text-xs text-text-secondary" htmlFor="history-status">
            Status
            <select
              id="history-status"
              value={historyStatus}
              className="rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-sm text-text-primary"
              onChange={event => {
                setHistoryStatus(event.currentTarget.value);
                setHistoryPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </label>
        </div>
        <QueryPanel
          isLoading={historyListQuery.isPending}
          isError={historyListQuery.isError}
          isEmpty={historyListQuery.isResolvedEmpty}
          errorMessage={historyListQuery.error?.message}
          onRetry={() => void historyListQuery.refetch()}
          emptyTitle="No task history"
          emptyBody="Completed tasks will appear here."
        >
          <DataTable
            data={historyListQuery.data?.items ?? []}
            columns={historyColumns}
            getRowId={row => row.id}
            pagination={{
              page: historyMeta?.page ?? historyPage,
              totalPages: Math.max(1, historyMeta?.totalPages ?? 1),
              pageSize: historyMeta?.pageSize ?? historyPageSize,
              onPrev: () => setHistoryPage(current => Math.max(1, current - 1)),
              onNext: () => {
                const totalPages = Math.max(1, historyMeta?.totalPages ?? 1);
                setHistoryPage(current => Math.min(totalPages, current + 1));
              },
              onPageSizeChange: nextPageSize => {
                setHistoryPageSize(nextPageSize);
                setHistoryPage(1);
              },
            }}
          />
        </QueryPanel>
      </div>

      {/* Task Details Modal */}
      {detailsTask ? (
        <Modal isOpen ariaLabel="Task Details" onClose={() => setDetailsTask(null)}>
          <ModalHeader title="Task Details" onClose={() => setDetailsTask(null)} />
          <ModalBody>
            {taskDetailsQuery.isPending ? (
              <div className="text-sm text-text-secondary">Loading task details...</div>
            ) : taskDetailsQuery.isError ? (
              <div className="text-sm text-text-error">Failed to load task details: {taskDetailsQuery.error?.message}</div>
            ) : taskDetailsQuery.data ? (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-text-secondary">Task</p>
                    <p>{taskDetailsQuery.data.taskName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary">Status</p>
                    <div>{renderHistoryStatus(taskDetailsQuery.data.status)}</div>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary">Started</p>
                    <p>{formatRelativeDate(taskDetailsQuery.data.started)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary">Duration</p>
                    <p>{formatDuration(taskDetailsQuery.data.duration)}</p>
                  </div>
                </div>
                {taskDetailsQuery.data.output ? (
                  <div>
                    <p className="text-xs text-text-secondary">Output</p>
                    <pre className="overflow-x-auto rounded-sm border border-border-subtle bg-surface-2 p-2 text-xs text-text-primary whitespace-pre-wrap">
                      {taskDetailsQuery.data.output}
                    </pre>
                  </div>
                ) : null}
              </div>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <button
              type="button"
              className="rounded-sm border border-border-subtle px-3 py-1 text-sm text-text-primary hover:bg-surface-2"
              onClick={() => setDetailsTask(null)}
              aria-label="Close details"
            >
              Close
            </button>
          </ModalFooter>
        </Modal>
      ) : null}
    </section>
  );
}
