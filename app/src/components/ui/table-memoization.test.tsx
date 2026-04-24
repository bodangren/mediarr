import {render} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Table } from '@/components/ui/table-compat';
import { TableBody, TableCell, TableRow } from '@/components/ui/table-body-compat';
import { TableHeader, type TableColumn } from '@/components/ui/table-header-compat';

interface RowModel {
  id: number;
  name: string;
  status: string;
}

/** Helper to count renders of a component */
function withRenderCount<Props extends Record<string, unknown>>(
  Component: React.ComponentType<Props>,
  name: string,
) {
  const renderCounts = new Map<string, number>();

  const WrappedComponent = (props: Props) => {
    const current = renderCounts.get(name) ?? 0;
    renderCounts.set(name, current + 1);
    return <Component {...props} />;
  };

  WrappedComponent.displayName = `WithRenderCount(${name})`;

  return {
    Component: WrappedComponent,
    getCount: () => renderCounts.get(name) ?? 0,
    resetCount: () => renderCounts.set(name, 0),
  };
}

describe('Table Memoization', () => {
  const columns: TableColumn<RowModel>[] = [
    { key: 'name', header: 'Name', sortable: true, render: row => row.name },
    { key: 'status', header: 'Status', sortable: false, render: row => row.status },
  ];

  const data: RowModel[] = [
    { id: 1, name: 'Item 1', status: 'active' },
    { id: 2, name: 'Item 2', status: 'inactive' },
  ];

  it('Table component does not re-render with same props', () => {
    const { Component: TrackedTable, getCount, resetCount } = withRenderCount(Table, 'Table');

    const { rerender } = render(
      <TrackedTable>
        <TableHeader<RowModel> columns={columns} />
        <TableBody<RowModel> data={data} columns={columns} getRowId={row => row.id} />
      </TrackedTable>,
    );

    resetCount();

    // Re-render with same props
    rerender(
      <TrackedTable>
        <TableHeader<RowModel> columns={columns} />
        <TableBody<RowModel> data={data} columns={columns} getRowId={row => row.id} />
      </TrackedTable>,
    );

    // Table is memoized, so with identical children (same references) it should not re-render
    expect(getCount()).toBe(0);
  });

  it('Table component re-renders when children change', () => {
    const { Component: TrackedTable, getCount, resetCount } = withRenderCount(Table, 'Table');

    const { rerender } = render(
      <TrackedTable>
        <TableHeader<RowModel> columns={columns} />
        <TableBody<RowModel> data={data} columns={columns} getRowId={row => row.id} />
      </TrackedTable>,
    );

    resetCount();

    const newColumns: TableColumn<RowModel>[] = [
      { key: 'name', header: 'Name', sortable: true, render: row => row.name },
    ];

    // Re-render with different columns reference
    rerender(
      <TrackedTable>
        <TableHeader<RowModel> columns={newColumns} />
        <TableBody<RowModel> data={data} columns={newColumns} getRowId={row => row.id} />
      </TrackedTable>,
    );

    expect(getCount()).toBe(1);
  });

  it('TableHeader does not re-render with same columns prop', () => {
    const onSort = vi.fn();
    const { Component: TrackedHeader, getCount, resetCount } = withRenderCount(TableHeader<RowModel>, 'TableHeader');

    const { rerender } = render(
      <table>
        <TrackedHeader columns={columns} onSort={onSort} />
      </table>,
    );

    resetCount();

    // Re-render with same columns reference
    rerender(
      <table>
        <TrackedHeader columns={columns} onSort={onSort} />
      </table>,
    );

    // React.memo should prevent re-render with identical props
    expect(getCount()).toBe(0);
  });

  it('TableHeader re-renders when sort changes', () => {
    const onSort = vi.fn();
    const { Component: TrackedHeader, getCount, resetCount } = withRenderCount(TableHeader<RowModel>, 'TableHeader');

    const { rerender } = render(
      <table>
        <TrackedHeader columns={columns} onSort={onSort} sort={{ key: 'name', direction: 'asc' }} />
      </table>,
    );

    resetCount();

    rerender(
      <table>
        <TrackedHeader columns={columns} onSort={onSort} sort={{ key: 'name', direction: 'desc' }} />
      </table>,
    );

    expect(getCount()).toBe(1);
  });

  it('TableBody does not re-render with same data and columns', () => {
    const { Component: TrackedBody, getCount, resetCount } = withRenderCount(TableBody<RowModel>, 'TableBody');

    const { rerender } = render(
      <table>
        <TrackedBody data={data} columns={columns} getRowId={row => row.id} />
      </table>,
    );

    resetCount();

    // Re-render with same data and columns
    rerender(
      <table>
        <TrackedBody data={data} columns={columns} getRowId={row => row.id} />
      </table>,
    );

    expect(getCount()).toBe(0);
  });

  it('TableBody re-renders when data changes', () => {
    const { Component: TrackedBody, getCount, resetCount } = withRenderCount(TableBody<RowModel>, 'TableBody');

    const { rerender } = render(
      <table>
        <TrackedBody data={data} columns={columns} getRowId={row => row.id} />
      </table>,
    );

    resetCount();

    const newData = [...data, { id: 3, name: 'Item 3', status: 'active' }];

    rerender(
      <table>
        <TrackedBody data={newData} columns={columns} getRowId={row => row.id} />
      </table>,
    );

    expect(getCount()).toBe(1);
  });

  it('TableRow does not re-render with same children', () => {
    const onClick = vi.fn();
    const { Component: TrackedRow, getCount, resetCount } = withRenderCount(TableRow, 'TableRow');

    const { rerender } = render(
      <table>
        <tbody>
          <TrackedRow onClick={onClick}>
            <TableCell>Test Content</TableCell>
          </TrackedRow>
        </tbody>
      </table>,
    );

    resetCount();

    // Re-render with same children
    rerender(
      <table>
        <tbody>
          <TrackedRow onClick={onClick}>
            <TableCell>Test Content</TableCell>
          </TrackedRow>
        </tbody>
      </table>,
    );

    expect(getCount()).toBe(0);
  });

  it('TableRow re-renders when onClick changes', () => {
    const onClick1 = vi.fn();
    const onClick2 = vi.fn();
    const { Component: TrackedRow, getCount, resetCount } = withRenderCount(TableRow, 'TableRow');

    const { rerender } = render(
      <table>
        <tbody>
          <TrackedRow onClick={onClick1}>
            <TableCell>Test Content</TableCell>
          </TrackedRow>
        </tbody>
      </table>,
    );

    resetCount();

    rerender(
      <table>
        <tbody>
          <TrackedRow onClick={onClick2}>
            <TableCell>Test Content</TableCell>
          </TrackedRow>
        </tbody>
      </table>,
    );

    expect(getCount()).toBe(1);
  });

  it('TableCell does not re-render with same className and children', () => {
    const { Component: TrackedCell, getCount, resetCount } = withRenderCount(TableCell, 'TableCell');

    const { rerender } = render(
      <table>
        <tbody>
          <tr>
            <TrackedCell className="custom-class">Cell Content</TrackedCell>
          </tr>
        </tbody>
      </table>,
    );

    resetCount();

    // Re-render with same props
    rerender(
      <table>
        <tbody>
          <tr>
            <TrackedCell className="custom-class">Cell Content</TrackedCell>
          </tr>
        </tbody>
      </table>,
    );

    expect(getCount()).toBe(0);
  });

  it('TableCell re-renders when children change', () => {
    const { Component: TrackedCell, getCount, resetCount } = withRenderCount(TableCell, 'TableCell');

    const { rerender } = render(
      <table>
        <tbody>
          <tr>
            <TrackedCell className="custom-class">Cell Content</TrackedCell>
          </tr>
        </tbody>
      </table>,
    );

    resetCount();

    rerender(
      <table>
        <tbody>
          <tr>
            <TrackedCell className="custom-class">Updated Content</TrackedCell>
          </tr>
        </tbody>
      </table>,
    );

    expect(getCount()).toBe(1);
  });

  it('prevents unnecessary re-renders of memoized children when parent re-renders with identical props', () => {
    const onSort = vi.fn();
    const getRowId = (row: RowModel) => row.id;

    const { Component: TrackedHeader, getCount: headerCount, resetCount: resetHeader } = withRenderCount(
      TableHeader<RowModel>,
      'HeaderInParent',
    );
    const { Component: TrackedBody, getCount: bodyCount, resetCount: resetBody } = withRenderCount(
      TableBody<RowModel>,
      'BodyInParent',
    );

    function Parent({ sortDirection }: { sortDirection: 'asc' | 'desc' }) {
      return (
        <Table>
          <TrackedHeader columns={columns} onSort={onSort} sort={{ key: 'name', direction: sortDirection }} />
          <TrackedBody data={data} columns={columns} getRowId={getRowId} />
        </Table>
      );
    }

    const { rerender } = render(<Parent sortDirection="asc" />);

    resetHeader();
    resetBody();

    // Re-render parent with same props — Table and its memoized children should not re-render
    rerender(<Parent sortDirection="asc" />);

    expect(headerCount()).toBe(0);
    expect(bodyCount()).toBe(0);
  });
});
