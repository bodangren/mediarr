import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { TaskStatusBadge } from './TaskStatusBadge';

export interface SchedulerTask {
  id: string;
  taskName: string;
  cronExpression: string;
  lastRunAt: string;
  lastDurationMs: number;
  nextRunAt: string;
  enabled: boolean;
  status: 'healthy' | 'warning' | 'error' | 'disabled';
}

interface TaskSchedulerTableProps {
  tasks: SchedulerTask[];
  onRunNow: (taskId: string) => void;
  onToggleEnabled: (taskId: string, nextEnabled: boolean) => void;
  runningTaskIds?: Set<string>;
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TaskSchedulerTable({ tasks, onRunNow, onToggleEnabled, runningTaskIds }: TaskSchedulerTableProps) {
  const [sortAsc, setSortAsc] = useState(false);

  const sortedTasks = [...tasks].sort((a, b) => {
    const da = new Date(a.lastRunAt).getTime();
    const db = new Date(b.lastRunAt).getTime();
    return sortAsc ? da - db : db - da;
  });

  const handleSortClick = () => {
    setSortAsc((prev) => !prev);
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-muted">
        <p className="text-sm">No scheduled tasks</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Task</TableHead>
          <TableHead>Interval</TableHead>
          <TableHead role="columnheader" aria-label="Last Run" onClick={handleSortClick} className="cursor-pointer select-none">
            Last Run{sortAsc ? ' ▲' : ' ▼'}
          </TableHead>
          <TableHead>Next Run</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Enabled</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedTasks.map((task) => (
          <TableRow key={task.id}>
            <TableCell>{task.taskName}</TableCell>
            <TableCell>{task.cronExpression}</TableCell>
            <TableCell>{formatDateTime(task.lastRunAt)}</TableCell>
            <TableCell>{formatDateTime(task.nextRunAt)}</TableCell>
            <TableCell>
              <TaskStatusBadge status={task.enabled ? task.status : 'disabled'} />
            </TableCell>
            <TableCell>
              <Switch
                checked={task.enabled}
                onCheckedChange={(checked) => onToggleEnabled(task.id, checked)}
                aria-label={`Enable ${task.taskName}`}
              />
            </TableCell>
            <TableCell>
              <Button
                variant="outline"
                size="sm"
                disabled={runningTaskIds?.has(task.id)}
                onClick={() => onRunNow(task.id)}
              >
                {runningTaskIds?.has(task.id) ? 'Running...' : 'Run Now'}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
