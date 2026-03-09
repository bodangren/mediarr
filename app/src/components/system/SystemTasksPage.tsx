import { useCallback, useEffect, useState } from 'react';
import { getApiClients } from '@/lib/api/client';
import type { ScheduledTask, QueuedTask, TaskHistory } from '@/lib/api/systemApi';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { Button } from '@/components/primitives/Button';
import { formatDateTime, formatRelativeDate } from '@/lib/format';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDurationMs(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-blue-500/20 text-blue-400',
    running: 'bg-yellow-500/20 text-yellow-400',
    completed: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400',
    success: 'bg-green-500/20 text-green-400',
    queued: 'bg-slate-500/20 text-slate-400',
    paused: 'bg-slate-500/20 text-slate-400',
  };
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${colors[status] ?? 'bg-slate-500/20 text-slate-400'}`}>
      {status}
    </span>
  );
}

// ─── Scheduled Tasks ──────────────────────────────────────────────────────────

function ScheduledTasksSection() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningIds, setRunningIds] = useState<Set<string | number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const data = await getApiClients().systemApi.getScheduledTasks();
      setTasks(data);
      setError(null);
    } catch {
      setError('Failed to load scheduled tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTasks();
    const interval = setInterval(() => { void fetchTasks(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  async function handleRunNow(taskId: string | number) {
    setRunningIds(prev => new Set(prev).add(taskId));
    try {
      await getApiClients().systemApi.runTask(taskId);
      await fetchTasks();
    } finally {
      setRunningIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  }

  if (loading) {
    return <div className="text-sm text-text-secondary">Loading scheduled tasks…</div>;
  }

  if (error) {
    return <div className="text-sm text-status-error">{error}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-subtle text-left text-xs text-text-secondary">
            <th className="pb-2 pr-4 font-medium">Task</th>
            <th className="pb-2 pr-4 font-medium">Interval</th>
            <th className="pb-2 pr-4 font-medium">Last Run</th>
            <th className="pb-2 pr-4 font-medium">Duration</th>
            <th className="pb-2 pr-4 font-medium">Next Run</th>
            <th className="pb-2 pr-4 font-medium">Status</th>
            <th className="pb-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {tasks.map(task => (
            <tr key={task.id} className="border-b border-border-subtle/50">
              <td className="py-2 pr-4 font-medium">{task.taskName}</td>
              <td className="py-2 pr-4 text-text-secondary">{task.interval}</td>
              <td className="py-2 pr-4 text-text-secondary">
                {task.lastExecution ? formatRelativeDate(task.lastExecution) : '—'}
              </td>
              <td className="py-2 pr-4 text-text-secondary tabular-nums">
                {formatDurationMs(task.lastDuration)}
              </td>
              <td className="py-2 pr-4 text-text-secondary">
                {formatRelativeDate(task.nextExecution)}
              </td>
              <td className="py-2 pr-4">
                <StatusBadge status={task.status} />
              </td>
              <td className="py-2">
                <Button
                  variant="secondary"
                  className="text-xs"
                  disabled={runningIds.has(task.id)}
                  onClick={() => { void handleRunNow(task.id); }}
                >
                  {runningIds.has(task.id) ? 'Running…' : 'Run Now'}
                </Button>
              </td>
            </tr>
          ))}
          {tasks.length === 0 && (
            <tr>
              <td colSpan={7} className="py-4 text-center text-text-secondary">No scheduled tasks</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Queued Tasks ─────────────────────────────────────────────────────────────

function QueuedTasksSection() {
  const [tasks, setTasks] = useState<QueuedTask[]>([]);
  const [cancellingIds, setCancellingIds] = useState<Set<number>>(new Set());

  const fetchQueued = useCallback(async () => {
    try {
      const data = await getApiClients().systemApi.getQueuedTasks();
      setTasks(data);
    } catch {
      // queued tasks are optional; silently ignore
    }
  }, []);

  useEffect(() => {
    void fetchQueued();
    const interval = setInterval(() => { void fetchQueued(); }, 5000);
    return () => clearInterval(interval);
  }, [fetchQueued]);

  async function handleCancel(taskId: number) {
    setCancellingIds(prev => new Set(prev).add(taskId));
    try {
      await getApiClients().systemApi.cancelTask(taskId);
      await fetchQueued();
    } finally {
      setCancellingIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  }

  if (tasks.length === 0) {
    return <p className="text-sm text-text-secondary">No tasks currently running.</p>;
  }

  return (
    <div className="space-y-2">
      {tasks.map(task => (
        <div key={task.id} className="flex items-center gap-4 rounded-md border border-border-subtle bg-surface-1 px-4 py-2">
          <div className="flex-1">
            <p className="font-medium">{task.taskName}</p>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-accent-primary transition-all"
                style={{ width: `${task.progress}%` }}
              />
            </div>
          </div>
          <StatusBadge status={task.status} />
          <span className="text-xs text-text-secondary tabular-nums">{task.progress}%</span>
          <Button
            variant="danger"
            className="text-xs"
            disabled={cancellingIds.has(task.id as number)}
            onClick={() => { void handleCancel(task.id as number); }}
          >
            Cancel
          </Button>
        </div>
      ))}
    </div>
  );
}

// ─── Task History ─────────────────────────────────────────────────────────────

function TaskHistorySection() {
  const [items, setItems] = useState<TaskHistory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'success' | 'failed' | ''>('');
  const [nameFilter, setNameFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getApiClients().systemApi.getTaskHistory({
        page,
        pageSize: 20,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(nameFilter.trim() ? { taskName: nameFilter.trim() } : {}),
      });
      setItems(result.items);
      setTotal(result.meta.totalCount);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, nameFilter]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value as '' | 'success' | 'failed'); setPage(1); }}
          className="rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-sm"
        >
          <option value="">All statuses</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
        <input
          type="text"
          placeholder="Filter by task name…"
          value={nameFilter}
          onChange={e => { setNameFilter(e.target.value); setPage(1); }}
          className="rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-sm"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-sm text-text-secondary">Loading…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs text-text-secondary">
                <th className="pb-2 pr-4 font-medium">Task</th>
                <th className="pb-2 pr-4 font-medium">Started</th>
                <th className="pb-2 pr-4 font-medium">Duration</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 font-medium">Output</th>
              </tr>
            </thead>
            <tbody>
              {items.map(entry => (
                <tr key={entry.id} className="border-b border-border-subtle/50">
                  <td className="py-2 pr-4 font-medium">{entry.taskName}</td>
                  <td className="py-2 pr-4 text-text-secondary">{formatDateTime(entry.started)}</td>
                  <td className="py-2 pr-4 text-text-secondary tabular-nums">{formatDurationMs(entry.duration)}</td>
                  <td className="py-2 pr-4"><StatusBadge status={entry.status} /></td>
                  <td className="py-2 max-w-xs truncate text-text-secondary">{entry.output ?? '—'}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-text-secondary">No history entries</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            Previous
          </Button>
          <span className="text-text-secondary">Page {page} of {totalPages}</span>
          <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SystemTasksPage() {
  return (
    <RouteScaffold title="Tasks" description="Unified scheduled and queued background task management.">
      <section className="space-y-2 rounded-md border border-border-subtle bg-surface-1 p-4">
        <h2 className="text-sm font-semibold">Scheduled Tasks</h2>
        <ScheduledTasksSection />
      </section>

      <section className="space-y-2 rounded-md border border-border-subtle bg-surface-1 p-4">
        <h2 className="text-sm font-semibold">Running Now</h2>
        <QueuedTasksSection />
      </section>

      <section className="space-y-2 rounded-md border border-border-subtle bg-surface-1 p-4">
        <h2 className="text-sm font-semibold">History</h2>
        <TaskHistorySection />
      </section>
    </RouteScaffold>
  );
}
