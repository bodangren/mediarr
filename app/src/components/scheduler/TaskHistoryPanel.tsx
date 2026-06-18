import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';


export interface TaskExecutionRow {
  id: number;
  taskName: string;
  status: 'SUCCESS' | 'FAILED' | 'RUNNING';
  startedAt: string;
  completedAt: string;
  durationMs: number;
  errorMessage: string | null;
}

interface DateFilter {
  from: string | null;
  to: string | null;
}

interface TaskHistoryPanelProps {
  rows: TaskExecutionRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onDateFilterChange?: (filter: DateFilter) => void;
  onStatusFilterChange?: (status: string) => void;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
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

export function TaskHistoryPanel({
  rows,
  page,
  pageSize,
  totalCount,
  onPageChange,
  onDateFilterChange,
  onStatusFilterChange,
}: TaskHistoryPanelProps) {
  const [fromValue, setFromValue] = useState('');
  const [toValue, setToValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const totalPages = Math.ceil(totalCount / pageSize);
  const showPagination = totalCount > pageSize;

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFromValue(e.target.value);
    onDateFilterChange?.({ from: e.target.value || null, to: toValue || null });
  };

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setToValue(e.target.value);
    onDateFilterChange?.({ from: fromValue || null, to: e.target.value || null });
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    onStatusFilterChange?.(e.target.value);
  };

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-muted">
        <p className="text-sm">No executions yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <label htmlFor="history-from" className="text-xs font-medium">
            From
          </label>
          <Input
            id="history-from"
            type="date"
            value={fromValue}
            onChange={handleFromChange}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="history-to" className="text-xs font-medium">
            To
          </label>
          <Input
            id="history-to"
            type="date"
            value={toValue}
            onChange={handleToChange}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="history-status" className="text-xs font-medium">
            Status
          </label>
          <select
            id="history-status"
            value={statusFilter}
            onChange={handleStatusFilterChange}
            aria-label="Status"
            className="flex h-12 w-36 items-center rounded-sm border-b border-border-subtle bg-transparent px-4 py-3 text-sm text-text-primary transition-all focus-visible:outline-none focus-visible:border-white"
          >
            <option value="All">All</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
            <option value="RUNNING">Running</option>
          </select>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.taskName}</TableCell>
              <TableCell>{formatDateTime(row.startedAt)}</TableCell>
              <TableCell>{formatDuration(row.durationMs)}</TableCell>
              <TableCell>
                <span
                  className={
                    row.status === 'SUCCESS'
                      ? 'text-status-completed'
                      : row.status === 'FAILED'
                        ? 'text-status-error'
                        : 'text-accent-warning'
                  }
                >
                  {row.status}
                </span>
              </TableCell>
            </TableRow>
          ))}
          {/* Show error messages as additional rows or in a separate cell */}
          {rows.some((r) => r.errorMessage) && (
            <TableRow>
              <TableCell colSpan={4} className="text-xs text-text-muted">
                {rows
                  .filter((r) => r.errorMessage)
                  .map((r) => r.errorMessage)
                  .join('; ')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {showPagination && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-muted">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              aria-label="Next page"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
