import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskHistoryPanel, type TaskExecutionRow } from './TaskHistoryPanel';

const baseRows: TaskExecutionRow[] = [
  {
    id: 3,
    taskName: 'rss-sync',
    status: 'SUCCESS',
    startedAt: '2026-06-18T12:30:00.000Z',
    completedAt: '2026-06-18T12:30:01.000Z',
    durationMs: 1000,
    errorMessage: null,
  },
  {
    id: 2,
    taskName: 'rss-sync',
    status: 'FAILED',
    startedAt: '2026-06-18T12:00:00.000Z',
    completedAt: '2026-06-18T12:00:05.000Z',
    durationMs: 5000,
    errorMessage: 'upstream timeout',
  },
  {
    id: 1,
    taskName: 'wanted-search',
    status: 'SUCCESS',
    startedAt: '2026-06-18T06:00:00.000Z',
    completedAt: '2026-06-18T06:00:08.000Z',
    durationMs: 8000,
    errorMessage: null,
  },
];

describe('TaskHistoryPanel', () => {
  it('renders one row per execution with task name and status visible', () => {
    render(
      <TaskHistoryPanel
        rows={baseRows}
        page={1}
        pageSize={25}
        totalCount={3}
        onPageChange={() => {}}
      />,
    );

    expect(screen.getAllByText('rss-sync').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('wanted-search')).toBeInTheDocument();
    expect(screen.getByText(/upstream timeout/i)).toBeInTheDocument();
  });

  it('renders the column headers required by the spec', () => {
    render(
      <TaskHistoryPanel
        rows={baseRows}
        page={1}
        pageSize={25}
        totalCount={3}
        onPageChange={() => {}}
      />,
    );

    expect(screen.getByRole('columnheader', { name: /task/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /started/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /duration/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();
  });

  it('renders a date-range filter with from and to inputs', () => {
    render(
      <TaskHistoryPanel
        rows={baseRows}
        page={1}
        pageSize={25}
        totalCount={3}
        onPageChange={() => {}}
      />,
    );

    expect(screen.getByLabelText(/from/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/to/i)).toBeInTheDocument();
  });

  it('renders a status filter with options for success / failed / running', () => {
    render(
      <TaskHistoryPanel
        rows={baseRows}
        page={1}
        pageSize={25}
        totalCount={3}
        onPageChange={() => {}}
      />,
    );

    const statusFilter = screen.getByRole('combobox', { name: /status/i });
    const options = within(statusFilter).getAllByRole('option').map((opt) => opt.textContent);
    expect(options).toEqual(expect.arrayContaining(['All', 'Success', 'Failed', 'Running']));
  });

  it('shows the empty state when rows are empty', () => {
    render(
      <TaskHistoryPanel
        rows={[]}
        page={1}
        pageSize={25}
        totalCount={0}
        onPageChange={() => {}}
      />,
    );

    expect(screen.getByText(/no executions yet/i)).toBeInTheDocument();
  });

  it('renders pagination controls when totalCount exceeds pageSize', () => {
    render(
      <TaskHistoryPanel
        rows={baseRows}
        page={1}
        pageSize={2}
        totalCount={5}
        onPageChange={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: /previous page/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
    expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
  });

  it('disables Previous on the first page', () => {
    render(
      <TaskHistoryPanel
        rows={baseRows}
        page={1}
        pageSize={2}
        totalCount={5}
        onPageChange={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next page/i })).not.toBeDisabled();
  });

  it('disables Next on the last page', () => {
    render(
      <TaskHistoryPanel
        rows={baseRows}
        page={3}
        pageSize={2}
        totalCount={5}
        onPageChange={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: /previous page/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
  });

  it('fires onPageChange with the incremented page when Next is clicked', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <TaskHistoryPanel
        rows={baseRows}
        page={1}
        pageSize={2}
        totalCount={5}
        onPageChange={onPageChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: /next page/i }));

    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('fires onPageChange with the decremented page when Previous is clicked', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <TaskHistoryPanel
        rows={baseRows}
        page={2}
        pageSize={2}
        totalCount={5}
        onPageChange={onPageChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: /previous page/i }));

    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('calls onDateFilterChange when the From date input changes', () => {
    const onDateFilterChange = vi.fn();
    render(
      <TaskHistoryPanel
        rows={baseRows}
        page={1}
        pageSize={25}
        totalCount={3}
        onPageChange={() => {}}
        onDateFilterChange={onDateFilterChange}
      />,
    );

    const fromInput = screen.getByLabelText(/from/i);
    fireEvent.change(fromInput, { target: { value: '2026-06-18' } });

    expect(onDateFilterChange).toHaveBeenCalledTimes(1);
    expect(onDateFilterChange).toHaveBeenCalledWith({ from: '2026-06-18', to: null });
  });

  it('calls onDateFilterChange when the To date input changes', () => {
    const onDateFilterChange = vi.fn();
    render(
      <TaskHistoryPanel
        rows={baseRows}
        page={1}
        pageSize={25}
        totalCount={3}
        onPageChange={() => {}}
        onDateFilterChange={onDateFilterChange}
      />,
    );

    const toInput = screen.getByLabelText(/to/i);
    fireEvent.change(toInput, { target: { value: '2026-06-18' } });

    expect(onDateFilterChange).toHaveBeenCalledTimes(1);
    expect(onDateFilterChange).toHaveBeenCalledWith({ from: null, to: '2026-06-18' });
  });
});