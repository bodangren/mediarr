import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskSchedulerTable, type SchedulerTask } from './TaskSchedulerTable';

const baseTasks: SchedulerTask[] = [
  {
    id: 'rss-sync',
    taskName: 'RSS Sync',
    cronExpression: '*/15 * * * *',
    lastRunAt: '2026-06-18T12:00:00.000Z',
    lastDurationMs: 1234,
    nextRunAt: '2026-06-18T12:15:00.000Z',
    enabled: true,
    status: 'healthy',
  },
  {
    id: 'wanted-search',
    taskName: 'Wanted Search',
    cronExpression: '0 */6 * * *',
    lastRunAt: '2026-06-18T06:00:00.000Z',
    lastDurationMs: 5800,
    nextRunAt: '2026-06-18T12:00:00.000Z',
    enabled: true,
    status: 'warning',
  },
  {
    id: 'library-scan',
    taskName: 'Library Scan',
    cronExpression: '0 2 * * *',
    lastRunAt: '2026-06-17T02:00:00.000Z',
    lastDurationMs: 92000,
    nextRunAt: '2026-06-19T02:00:00.000Z',
    enabled: false,
    status: 'disabled',
  },
];

describe('TaskSchedulerTable', () => {
  it('renders one row per scheduler task', () => {
    render(<TaskSchedulerTable tasks={baseTasks} onRunNow={() => {}} onToggleEnabled={() => {}} />);

    expect(screen.getByText('RSS Sync')).toBeInTheDocument();
    expect(screen.getByText('Wanted Search')).toBeInTheDocument();
    expect(screen.getByText('Library Scan')).toBeInTheDocument();
  });

  it('exposes the cron expression for each row', () => {
    render(<TaskSchedulerTable tasks={baseTasks} onRunNow={() => {}} onToggleEnabled={() => {}} />);

    expect(screen.getByText('*/15 * * * *')).toBeInTheDocument();
    expect(screen.getByText('0 */6 * * *')).toBeInTheDocument();
    expect(screen.getByText('0 2 * * *')).toBeInTheDocument();
  });

  it('renders the column headers required by the spec', () => {
    render(<TaskSchedulerTable tasks={baseTasks} onRunNow={() => {}} onToggleEnabled={() => {}} />);

    expect(screen.getByRole('columnheader', { name: /task/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /interval/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /last run/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /next run/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /enabled/i })).toBeInTheDocument();
  });

  it('renders a "Run Now" button per task that calls onRunNow with the task id', async () => {
    const user = userEvent.setup();
    const onRunNow = vi.fn();
    render(<TaskSchedulerTable tasks={baseTasks} onRunNow={onRunNow} onToggleEnabled={() => {}} />);

    const buttons = screen.getAllByRole('button', { name: /run now/i });
    expect(buttons).toHaveLength(3);

    await user.click(buttons[1]);

    expect(onRunNow).toHaveBeenCalledTimes(1);
    expect(onRunNow).toHaveBeenCalledWith('wanted-search');
  });

  it('fires onToggleEnabled with the next enabled value when the toggle is flipped', () => {
    const onToggleEnabled = vi.fn();
    render(<TaskSchedulerTable tasks={baseTasks} onRunNow={() => {}} onToggleEnabled={onToggleEnabled} />);

    const rssRow = screen.getByText('RSS Sync').closest('tr');
    if (!rssRow) throw new Error('Expected to find row for RSS Sync');

    const rssToggle = within(rssRow).getByRole('switch', { name: /enable rss sync/i });
    expect(rssToggle).toBeChecked();

    fireEvent.click(rssToggle);

    expect(onToggleEnabled).toHaveBeenCalledTimes(1);
    expect(onToggleEnabled).toHaveBeenCalledWith('rss-sync', false);
  });

  it('reflects the disabled state of each task via the switch aria-checked', () => {
    render(<TaskSchedulerTable tasks={baseTasks} onRunNow={() => {}} onToggleEnabled={() => {}} />);

    const libraryRow = screen.getByText('Library Scan').closest('tr');
    if (!libraryRow) throw new Error('Expected to find row for Library Scan');

    const toggle = within(libraryRow).getByRole('switch', { name: /enable library scan/i });
    expect(toggle).not.toBeChecked();
  });

  it('sorts the table by lastRunAt descending when the Last Run header is clicked', async () => {
    const user = userEvent.setup();
    render(<TaskSchedulerTable tasks={baseTasks} onRunNow={() => {}} onToggleEnabled={() => {}} />);

    await user.click(screen.getByRole('columnheader', { name: /last run/i }));

    const rowTaskNames = screen
      .getAllByRole('row')
      .map((row) => within(row).queryByRole('cell', { name: /^(RSS Sync|Wanted Search|Library Scan)$/ }))
      .filter((cell): cell is HTMLElement => cell !== null)
      .map((cell) => cell.textContent);

    expect(rowTaskNames).toEqual(['RSS Sync', 'Wanted Search', 'Library Scan']);
  });

  it('shows an empty state when there are no tasks', () => {
    render(<TaskSchedulerTable tasks={[]} onRunNow={() => {}} onToggleEnabled={() => {}} />);

    expect(screen.getByText(/no scheduled tasks/i)).toBeInTheDocument();
  });
});