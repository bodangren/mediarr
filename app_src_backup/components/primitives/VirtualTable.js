import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
export const VirtualTable = memo(function VirtualTable({ columns, data, getRowId, height, rowHeight, width, onRowClick, rowClassName, }) {
    const tableRef = useRef(null);
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
    return (_jsx("div", { ref: tableRef, className: "overflow-auto rounded-md border border-border-subtle", style: {
            height,
            width: typeof width === 'number' ? `${width}px` : width,
        }, children: _jsxs("table", { className: "min-w-full text-left text-sm", children: [_jsx("thead", { className: "bg-surface-2 text-text-secondary sticky top-0", children: _jsx("tr", { children: columns.map((column, idx) => (_jsx("th", { className: "px-3 py-2 font-semibold", style: { width: `${100 / columns.length}%` }, children: column.header }, column.key))) }) }), _jsx("tbody", { style: {
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        position: 'relative',
                    }, children: virtualRows.map(virtualRow => {
                        const row = data[virtualRow.index];
                        if (!row)
                            return null;
                        const rowId = memoizedGetRowId(row);
                        const customClassName = memoizedRowClassName?.(row) || '';
                        return (_jsx("tr", { "data-index": virtualRow.index, ref: rowVirtualizer.measureElement, style: {
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                transform: `translateY(${virtualRow.start}px)`,
                            }, className: memoizedOnRowClick ? `cursor-pointer hover:bg-surface-2 ${customClassName}` : customClassName, onClick: () => memoizedOnRowClick?.(row), children: columns.map(column => (_jsx("td", { className: `px-3 py-2 text-text-primary ${column.className ?? ''}`, children: column.render(row) }, `${rowId}-${column.key}`))) }, rowId));
                    }) })] }) }));
});
//# sourceMappingURL=VirtualTable.js.map