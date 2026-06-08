import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { DataTable, type DataTableColumn } from './DataTable';

interface RowModel {
  id: number;
  name: string;
  status: string;
}

const baseColumns: DataTableColumn<RowModel>[] = [
  { key: 'name', header: 'Name', sortable: true, render: row => row.name },
  { key: 'status', header: 'Status', sortable: false, render: row => row.status },
];

const baseData: RowModel[] = [
  { id: 1, name: 'Indexer A', status: 'active' },
  { id: 2, name: 'Indexer B', status: 'inactive' },
  { id: 3, name: 'Indexer C', status: 'active' },
];

describe('DataTable', () => {
  it('renders rows from data', () => {
    render(<DataTable<RowModel> data={baseData} columns={baseColumns} getRowId={row => row.id} />);

    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(baseData.length + 1);

    for (const row of baseData) {
      expect(within(rows[row.id]).getByText(row.name)).toBeInTheDocument();
      expect(within(rows[row.id]).getByText(row.status)).toBeInTheDocument();
    }
  });

  it('sorts by column on header click', () => {
    const onSort = vi.fn();

    render(
      <DataTable<RowModel>
        data={baseData}
        columns={baseColumns}
        getRowId={row => row.id}
        sort={{ key: 'name', direction: 'asc' }}
        onSort={onSort}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /sort by name/i }));

    expect(onSort).toHaveBeenCalledTimes(1);
    expect(onSort).toHaveBeenCalledWith('name');
  });

  it('renders the TablePager with the correct page info when pagination is supplied', () => {
    const fullDataset: RowModel[] = Array.from({ length: 25 }, (_, index) => ({
      id: index + 1,
      name: `Row ${index + 1}`,
      status: 'active',
    }));

    const onPrev = vi.fn();
    const onNext = vi.fn();
    const onPageSizeChange = vi.fn();

    // DataTable is purely presentational — it renders whatever slice the caller hands it
    // and surfaces pagination controls via the TablePager.
    const pageSlice = fullDataset.slice(0, 10);

    render(
      <DataTable<RowModel>
        data={pageSlice}
        columns={baseColumns}
        getRowId={row => row.id}
        pagination={{
          page: 1,
          totalPages: 3,
          pageSize: 10,
          onPrev,
          onNext,
          onPageSizeChange,
        }}
      />,
    );

    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous page/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Page size')).toBeInTheDocument();
  });

  it('omits the TablePager when no pagination prop is supplied', () => {
    render(<DataTable<RowModel> data={baseData} columns={baseColumns} getRowId={row => row.id} />);

    expect(screen.queryByText(/page \d+ of \d+/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /previous page/i })).not.toBeInTheDocument();
  });

  it('calls onRowClick when a row is clicked', () => {
    const onRowClick = vi.fn();

    render(
      <DataTable<RowModel>
        data={baseData}
        columns={baseColumns}
        getRowId={row => row.id}
        onRowClick={onRowClick}
      />,
    );

    const target = screen.getByText('Indexer B');
    const targetRow = target.closest('tr');
    expect(targetRow).not.toBeNull();

    fireEvent.click(targetRow as HTMLElement);

    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(baseData[1]);
  });

  it('renders the mobile card branch when mobileCardView is enabled with a custom renderer', () => {
    const renderMobileCard = vi.fn((row: RowModel) => (
      <div data-testid={`mobile-card-${row.id}`}>{`Mobile: ${row.name}`}</div>
    ));

    const { container } = render(
      <DataTable<RowModel>
        data={baseData}
        columns={baseColumns}
        getRowId={row => row.id}
        mobileCardView
        renderMobileCard={renderMobileCard}
      />,
    );

    for (const row of baseData) {
      expect(within(container).getByTestId(`mobile-card-${row.id}`)).toBeInTheDocument();
    }
    expect(renderMobileCard).toHaveBeenCalledTimes(baseData.length);
  });
});
