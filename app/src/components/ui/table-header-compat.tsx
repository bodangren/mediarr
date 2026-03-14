import type { ReactNode } from 'react';
import { memo, useMemo } from 'react';
import { StatusBadge } from './status-badge-compat';

export interface TableColumn<RowType> {
  key: string;
  header: ReactNode;
  sortLabel?: string;
  sortable?: boolean;
  render: (row: RowType) => ReactNode;
  className?: string;
  /** Whether to hide this column on small screens (mobile) */
  hideOnMobile?: boolean;
  /** Whether to hide this column on medium screens (tablets) */
  hideOnTablet?: boolean;
}

interface TableSort {
  key: string;
  direction: 'asc' | 'desc';
}

interface TableHeaderProps<RowType> {
  columns: TableColumn<RowType>[];
  sort?: TableSort;
  onSort?: (key: string) => void;
  showActions?: boolean;
}

export const TableHeader = memo(function TableHeader<RowType>({ columns, sort, onSort, showActions = false }: TableHeaderProps<RowType>) {
  const memoizedOnSort = useMemo(() => onSort, [onSort]);

  return (
    <thead className="bg-surface-2 text-text-secondary">
      <tr>
        {columns.map(column => {
          const isActiveSort = sort?.key === column.key;
          // Add responsive classes for column visibility
          const responsiveClasses = [
            column.hideOnMobile ? 'hidden md:table-cell' : '',
            column.hideOnTablet ? 'hidden lg:table-cell' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <th
              key={column.key}
              className={`px-3 py-2 font-semibold ${responsiveClasses} ${column.className || ''}`}
            >
              {column.sortable && memoizedOnSort ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-left"
                  onClick={() => memoizedOnSort(column.key)}
                  aria-label={`Sort by ${column.sortLabel ?? (typeof column.header === 'string' ? column.header : column.key)}`}
                >
                  {column.header}
                  <span aria-hidden="true">
                    {isActiveSort ? (sort?.direction === 'asc' ? '↑' : '↓') : '↕'}
                  </span>
                </button>
              ) : (
                column.header
              )}
            </th>
          );
        })}
        {showActions ? (
          <th className="hidden px-3 py-2 text-right font-semibold sm:table-cell">Actions</th>
        ) : null}
      </tr>
    </thead>
  );
}) as <RowType>(props: TableHeaderProps<RowType>) => ReactNode;

export function renderTextCell(value: string | number | null | undefined): string {
  return value == null ? '-' : String(value);
}

export function renderDateCell(value: string | Date | null | undefined): string {
  if (!value) {
    return '-';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString();
}

interface StatusCellProps {
  status: string;
}

const StatusCell = memo(function StatusCell({ status }: StatusCellProps): ReactNode {
  return <StatusBadge status={status} />;
});

export function renderStatusCell(status: string): ReactNode {
  return <StatusCell status={status} />;
}
