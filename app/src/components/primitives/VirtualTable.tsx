import type { ReactNode } from 'react';
import { memo, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { TableColumn } from './TableHeader';

interface VirtualTableProps<RowType> {
  columns: TableColumn<RowType>[];
  data: RowType[];
  getRowId: (row: RowType) => string | number;
  height: number;
  rowHeight: number | null;
  width: number | string;
  onRowClick?: (row: RowType) => void;
  rowClassName?: (row: RowType) => string;
}

export const VirtualTable = memo(function VirtualTable<RowType>({
  columns,
  data,
  getRowId,
  height,
  rowHeight,
  width,
  onRowClick,
  rowClassName,
}: VirtualTableProps<RowType>) {
  const tableRef = useRef<HTMLDivElement>(null);

  const memoizedGetRowId = useMemo(() => getRowId, [getRowId]);
  const memoizedOnRowClick = useMemo(() => onRowClick, [onRowClick]);
  const memoizedRowClassName = useMemo(() => rowClassName, [rowClassName]);

  // Default row height if not specified
  const effectiveRowHeight = rowHeight ?? 50;

  // Create virtualizer
  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => effectiveRowHeight,
    overscan: 5,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  return (
    <div
      ref={tableRef}
      className="overflow-auto rounded-md border border-border-subtle"
      style={{
        height,
        width: typeof width === 'number' ? `${width}px` : width,
      }}
    >
      <table className="min-w-full text-left text-sm">
        <thead className="bg-surface-2 text-text-secondary sticky top-0">
          <tr>
            {columns.map((column, idx) => (
              <th
                key={column.key}
                className="px-3 py-2 font-semibold"
                style={{ width: `${100 / columns.length}%` }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          {virtualRows.map(virtualRow => {
            const row = data[virtualRow.index];
            if (!row) return null;

            const rowId = memoizedGetRowId(row);
            const customClassName = memoizedRowClassName?.(row) || '';

            return (
              <tr
                key={rowId}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className={memoizedOnRowClick ? `cursor-pointer hover:bg-surface-2 ${customClassName}` : customClassName}
                onClick={() => memoizedOnRowClick?.(row)}
              >
                {columns.map(column => (
                  <td key={`${rowId}-${column.key}`} className={`px-3 py-2 text-text-primary ${column.className ?? ''}`}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}) as <RowType>(props: VirtualTableProps<RowType>) => ReactNode;
