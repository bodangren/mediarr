import type { ReactNode } from 'react';
import { StatusBadge } from './StatusBadge';

export interface TableColumn<RowType> {
  key: string;
  header: string;
  sortable?: boolean;
  render: (row: RowType) => ReactNode;
  className?: string;
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

export function TableHeader<RowType>({ columns, sort, onSort, showActions = false }: TableHeaderProps<RowType>) {
  return (
    <thead className="bg-surface-2 text-text-secondary">
      <tr>
        {columns.map(column => {
          const isActiveSort = sort?.key === column.key;
          return (
            <th key={column.key} className="px-3 py-2 font-semibold">
              {column.sortable && onSort ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-left"
                  onClick={() => onSort(column.key)}
                  aria-label={`Sort by ${column.header}`}
                >
                  {column.header}
                  <span aria-hidden="true">{isActiveSort ? (sort?.direction === 'asc' ? '↑' : '↓') : '↕'}</span>
                </button>
              ) : (
                column.header
              )}
            </th>
          );
        })}
        {showActions ? <th className="px-3 py-2 text-right font-semibold">Actions</th> : null}
      </tr>
    </thead>
  );
}

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

export function renderStatusCell(status: string): ReactNode {
  return <StatusBadge status={status} />;
}
