import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { TaskSchedulerTable } from '@/components/scheduler/TaskSchedulerTable';
import type { SchedulerTask } from '@/lib/api/schedulerApi';
import { CronIntervalPicker } from '@/components/scheduler/CronIntervalPicker';
import { TaskHistoryPanel } from '@/components/scheduler/TaskHistoryPanel';
import type { TaskExecutionRow } from '@/components/scheduler/TaskHistoryPanel';
import { getApiClients } from '@/lib/api/client';
import { useOptimisticMutation } from '@/lib/query/useOptimisticMutation';
import { useToast } from '@/components/providers/ToastProvider';

export function AutomationSettingsPage() {
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyFromDate, setHistoryFromDate] = useState<string | null>(null);
  const [historyToDate, setHistoryToDate] = useState<string | null>(null);
  const [runningTaskIds, setRunningTaskIds] = useState<Set<string>>(new Set());

  const tasksQuery = useQuery({
    queryKey: ['scheduler', 'tasks'],
    queryFn: () => api.schedulerApi.listTasks(),
  });

  const tasks: SchedulerTask[] = tasksQuery.data ?? [];

  useEffect(() => {
    if (tasks.length > 0 && !selectedTaskId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedTaskId(tasks[0]!.id);
    }
  }, [tasks, selectedTaskId]);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  const historyQuery = useQuery({
    queryKey: ['scheduler', 'history', { page: historyPage, fromDate: historyFromDate, toDate: historyToDate }],
    queryFn: () =>
      api.schedulerApi.getHistory({
        page: historyPage,
        pageSize: 25,
        fromDate: historyFromDate ?? undefined,
        toDate: historyToDate ?? undefined,
      }),
  });

  const historyData = historyQuery.data ?? { items: [], meta: { page: 1, pageSize: 25, totalCount: 0, totalPages: 0 } };

  const runTaskMutation = useMutation({
    mutationFn: (taskId: string) => api.schedulerApi.runTask(taskId),
    onMutate: (taskId) => {
      setRunningTaskIds((prev) => new Set(prev).add(taskId));
    },
    onSettled: (_data, _error, taskId) => {
      setRunningTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    },
    onSuccess: () => {
      pushToast({ title: 'Task triggered', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['scheduler', 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['scheduler', 'history'] });
    },
    onError: () => {
      pushToast({ title: 'Failed to run task', variant: 'error' });
    },
  });

  const updateIntervalMutation = useOptimisticMutation({
    queryKey: ['scheduler', 'tasks'],
    mutationFn: ({ taskId, cronExpression }: { taskId: string; cronExpression: string }) =>
      api.schedulerApi.updateInterval(taskId, cronExpression),
    updater: (current: SchedulerTask[], { taskId, cronExpression }) =>
      current.map((t) => (t.id === taskId ? { ...t, cronExpression } : t)),
    errorMessage: 'Failed to update interval',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduler', 'history'] });
    },
  });

  const toggleEnabledMutation = useOptimisticMutation({
    queryKey: ['scheduler', 'tasks'],
    mutationFn: ({ taskId, enabled }: { taskId: string; enabled: boolean }) =>
      api.schedulerApi.toggleEnabled(taskId, enabled),
    updater: (current: SchedulerTask[], { taskId, enabled }) =>
      current.map((t) => (t.id === taskId ? { ...t, enabled, status: enabled ? t.status : ('disabled' as const) } : t)),
    errorMessage: 'Failed to toggle task',
  });

  const handleRunNow = (taskId: string) => {
    runTaskMutation.mutate(taskId);
  };

  const handleToggleEnabled = (taskId: string, nextEnabled: boolean) => {
    toggleEnabledMutation.mutate({ taskId, enabled: nextEnabled });
  };

  const handleIntervalChange = (cron: string) => {
    if (!selectedTaskId) return;
    updateIntervalMutation.mutate({ taskId: selectedTaskId, cronExpression: cron });
  };

  const handleHistoryPageChange = (page: number) => {
    setHistoryPage(page);
  };

  const handleHistoryDateFilterChange = (filter: { from: string | null; to: string | null }) => {
    setHistoryFromDate(filter.from);
    setHistoryToDate(filter.to);
    setHistoryPage(1);
  };

  return (
    <RouteScaffold
      title="Automation"
      description="Monitor and configure scheduled automation tasks including RSS sync, wanted searches, import processing, and subtitle fetching."
    >
      <section className="rounded-md border border-border-subtle bg-surface-1 p-4">
        <nav aria-label="Settings sidebar nav">
          <a href="/settings/automation" className="sr-only">Automation</a>
        </nav>
        <TaskSchedulerTable
          tasks={tasks}
          onRunNow={handleRunNow}
          onToggleEnabled={handleToggleEnabled}
          runningTaskIds={runningTaskIds}
        />
      </section>

      {selectedTask && (
        <section className="rounded-md border border-border-subtle bg-surface-1 p-4">
          <h2 className="text-sm font-medium mb-3">
            Edit interval for {selectedTask.taskName}
          </h2>
          <CronIntervalPicker
            value={selectedTask.cronExpression}
            onChange={handleIntervalChange}
          />
        </section>
      )}

      <section className="rounded-md border border-border-subtle bg-surface-1 p-4">
        <h2 className="text-sm font-medium mb-3">Task History</h2>
        <TaskHistoryPanel
          rows={historyData.items as TaskExecutionRow[]}
          page={historyData.meta.page}
          pageSize={historyData.meta.pageSize}
          totalCount={historyData.meta.totalCount}
          onPageChange={handleHistoryPageChange}
          onDateFilterChange={handleHistoryDateFilterChange}
        />
      </section>
    </RouteScaffold>
  );
}
