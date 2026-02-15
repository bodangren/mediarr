import type { ReactNode } from 'react';
import { memo, useMemo } from 'react';
import type { TableColumn } from './TableHeader';

interface TableBodyProps<RowType> {
  data: RowType[];
  columns: TableColumn<RowType>[];
  getRowId: (row: RowType) => string | number;
  rowActions?: (row: RowType) => ReactNode;
  onRowClick?: (row: RowType) => void;
}

interface TableCellProps {
  className?: string;
  children: ReactNode;
}

interface TableRowProps {
  children: ReactNode;
  onClick?: () => void;
}

export function TableBody<RowType>({ data, columns, getRowId, rowActions, onRowClick }: TableBodyProps<RowType>) {
  const memoizedRowActions = useMemo(() => rowActions, [rowActions]);
  const memoizedOnRowClick = useMemo(() => onRowClick, [onRowClick]);

  return (
    <tbody className="divide-y divide-border-subtle bg-surface-1">
      {data.map(row => (
        <TableRow
          key={getRowId(row)}
          onClick={() => {
            if (memoizedOnRowClick) {
              memoizedOnRowClick(row);
            }
          }}
        >
          {columns.map(column => {
            // Add responsive classes for column visibility
            const responsiveClasses = [
              column.hideOnMobile ? 'hidden md:table-cell' : '',
              column.hideOnTablet ? 'hidden lg:table-cell' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <TableCell key={column.key} className={`${column.className ?? ''} ${responsiveClasses}`}>
                {column.render(row)}
              </TableCell>
            );
          })}
          {memoizedRowActions ? (
            <TableCell className="hidden text-right sm:table-cell">{memoizedRowActions(row)}</TableCell>
          ) : null}
        </TableRow>
      ))}
    </tbody>
  );
}

export const TableRow = memo(function TableRow({ children, onClick }: TableRowProps) {
  return (
    <tr
      className={onClick ? 'cursor-pointer hover:bg-surface-2' : ''}
      onClick={onClick}
    >
      {children}
    </tr>
  );
});

export const TableCell = memo(function TableCell({ className, children }: TableCellProps) {
  return <td className={`px-3 py-2 text-text-primary ${className ?? ''}`}>{children}</td>;
});
