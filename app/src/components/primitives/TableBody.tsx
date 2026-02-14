import type { ReactNode } from 'react';
import type { TableColumn } from './TableHeader';

interface TableBodyProps<RowType> {
  data: RowType[];
  columns: TableColumn<RowType>[];
  getRowId: (row: RowType) => string | number;
  rowActions?: (row: RowType) => ReactNode;
}

interface TableCellProps {
  className?: string;
  children: ReactNode;
}

interface TableRowProps {
  children: ReactNode;
}

export function TableBody<RowType>({ data, columns, getRowId, rowActions }: TableBodyProps<RowType>) {
  return (
    <tbody className="divide-y divide-border-subtle bg-surface-1">
      {data.map(row => (
        <TableRow key={getRowId(row)}>
          {columns.map(column => (
            <TableCell key={column.key} className={column.className}>
              {column.render(row)}
            </TableCell>
          ))}
          {rowActions ? <TableCell className="text-right">{rowActions(row)}</TableCell> : null}
        </TableRow>
      ))}
    </tbody>
  );
}

export function TableRow({ children }: TableRowProps) {
  return <tr>{children}</tr>;
}

export function TableCell({ className, children }: TableCellProps) {
  return <td className={`px-3 py-2 text-text-primary ${className ?? ''}`}>{children}</td>;
}
