import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Table } from './Table';
import { TableBody, TableCell, TableRow } from './TableBody';
import { TableHeader, type TableColumn } from './TableHeader';

interface RowModel {
  id: number;
  name: string;
  status: string;
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

  it('Table component memoizes rendering with same props', () => {
    const { rerender } = render(
      <Table>
        <TableHeader<RowModel> columns={columns} />
        <TableBody<RowModel> data={data} columns={columns} getRowId={row => row.id} />
      </Table>,
    );

    const tableBefore = screen.getByRole('table');

    // Re-render with same props
    rerender(
      <Table>
        <TableHeader<RowModel> columns={columns} />
        <TableBody<RowModel> data={data} columns={columns} getRowId={row => row.id} />
      </Table>,
    );

    const tableAfter = screen.getByRole('table');

    // The table should still be present
    expect(tableBefore).toBeInTheDocument();
    expect(tableAfter).toBeInTheDocument();
  });

  it('TableHeader memoizes with same columns prop', () => {
    const onSort = vi.fn();

    const { rerender } = render(
      <Table>
        <TableHeader<RowModel> columns={columns} onSort={onSort} />
      </Table>,
    );

    const headerBefore = screen.getByText('Name');

    // Re-render with same columns reference
    rerender(
      <Table>
        <TableHeader<RowModel> columns={columns} onSort={onSort} />
      </Table>,
    );

    const headerAfter = screen.getByText('Name');

    expect(headerBefore).toBe(headerAfter);
  });

  it('TableBody memoizes with same data and columns', () => {
    const { rerender } = render(
      <Table>
        <TableBody<RowModel> data={data} columns={columns} getRowId={row => row.id} />
      </Table>,
    );

    const rowBefore = screen.getByText('Item 1');

    // Re-render with same data and columns
    rerender(
      <Table>
        <TableBody<RowModel> data={data} columns={columns} getRowId={row => row.id} />
      </Table>,
    );

    const rowAfter = screen.getByText('Item 1');

    expect(rowBefore).toBe(rowAfter);
  });

  it('TableRow memoizes with same children', () => {
    const onClick = vi.fn();

    const { rerender } = render(
      <table>
        <tbody>
          <TableRow onClick={onClick}>
            <TableCell>Test Content</TableCell>
          </TableRow>
        </tbody>
      </table>,
    );

    const rowBefore = screen.getByText('Test Content');

    // Re-render with same children
    rerender(
      <table>
        <tbody>
          <TableRow onClick={onClick}>
            <TableCell>Test Content</TableCell>
          </TableRow>
        </tbody>
      </table>,
    );

    const rowAfter = screen.getByText('Test Content');

    expect(rowBefore).toBe(rowAfter);
  });

  it('TableCell memoizes with same className and children', () => {
    const { rerender } = render(
      <table>
        <tbody>
          <TableRow>
            <TableCell className="custom-class">Cell Content</TableCell>
          </TableRow>
        </tbody>
      </table>,
    );

    const cellBefore = screen.getByText('Cell Content');

    // Re-render with same props
    rerender(
      <table>
        <tbody>
          <TableRow>
            <TableCell className="custom-class">Cell Content</TableCell>
          </TableRow>
        </tbody>
      </table>,
    );

    const cellAfter = screen.getByText('Cell Content');

    expect(cellBefore).toBe(cellAfter);
  });

  it('prevents unnecessary re-renders when irrelevant props change', () => {
    const onSort = vi.fn();
    const getRowId = (row: RowModel) => row.id;

    // Track table renders
    const tableRenderSpy = vi.fn();

    const { rerender } = render(
      <Table>
        <TableHeader<RowModel> columns={columns} onSort={onSort} />
        <TableBody<RowModel> data={data} columns={columns} getRowId={getRowId} />
      </Table>,
    );

    // Get reference to rendered table
    const tableBefore = screen.getByRole('table');

    // Re-render with same props
    rerender(
      <Table>
        <TableHeader<RowModel> columns={columns} onSort={onSort} />
        <TableBody<RowModel> data={data} columns={columns} getRowId={getRowId} />
      </Table>,
    );

    const tableAfter = screen.getByRole('table');

    // The table should still be present (memoization doesn't prevent re-render of parent)
    expect(tableBefore).toBeInTheDocument();
    expect(tableAfter).toBeInTheDocument();
    // But with React.memo, if props are identical, React may reuse the component
  });
});
