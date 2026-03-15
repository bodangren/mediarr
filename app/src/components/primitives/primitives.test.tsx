import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataTable, type DataTableColumn } from './DataTable';
import { EmptyPanel } from '@/components/ui/empty-panel';
import { ErrorPanel } from '@/components/ui/error-panel';
import { MetricCard } from './MetricCard';
import { ProgressBar } from '@/components/ui/progress-bar-compat';
import { SkeletonBlock } from '@/components/ui/skeleton-compat';
import { StatusBadge } from '@/components/ui/status-badge-compat';

interface Row {
  id: number;
  title: string;
}

describe('UI primitives', () => {
  it('renders semantic status badge classes', () => {
    render(<StatusBadge status="downloading" />);
    expect(screen.getByText('downloading')).toBeInTheDocument();
  });

  it('renders progress values for determinate and indeterminate modes', () => {
    const { rerender } = render(<ProgressBar value={42} label="Sync" />);
    expect(screen.getByText('42%')).toBeInTheDocument();

    rerender(<ProgressBar indeterminate label="Sync" />);
    expect(screen.queryByText('42%')).not.toBeInTheDocument();
  });

  it('renders metric card trend + action', () => {
    const onAction = vi.fn();
    render(<MetricCard label="Queue" value="12" trend="up" onAction={onAction} />);
    fireEvent.click(screen.getByRole('button', { name: /open queue/i }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders empty and error panels', () => {
    const onRetry = vi.fn();
    render(
      <>
        <EmptyPanel title="Nothing here" body="Try broader filters." />
        <ErrorPanel title="Load failed" body="Backend offline" onRetry={onRetry} />
      </>,
    );

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('supports sorting, row actions, pagination and horizontal overflow table wrapper', () => {
    const onSort = vi.fn();
    const onPrev = vi.fn();
    const onNext = vi.fn();

    const columns: DataTableColumn<Row>[] = [
      { key: 'title', header: 'Title', sortable: true, render: row => row.title },
    ];

    render(
      <DataTable<Row>
        data={[{ id: 1, title: 'Andor' }]}
        columns={columns}
        getRowId={row => row.id}
        sort={{ key: 'title', direction: 'asc' }}
        onSort={onSort}
        pagination={{ page: 2, totalPages: 3, onNext, onPrev }}
        rowActions={row => <button type="button">Open {row.title}</button>}
      />,
    );

    expect(screen.getByTestId('table-overflow')).toHaveClass('overflow-x-auto');
    fireEvent.click(screen.getByRole('button', { name: /sort by title/i }));
    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    fireEvent.click(screen.getByRole('button', { name: /previous page/i }));

    expect(onSort).toHaveBeenCalledWith('title');
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it('renders skeleton block placeholder', () => {
    render(<SkeletonBlock ariaLabel="loading row" className="h-4 w-24" />);
    expect(screen.getByLabelText('loading row')).toBeInTheDocument();
  });
});
