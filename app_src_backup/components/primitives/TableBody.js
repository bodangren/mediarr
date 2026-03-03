import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, useMemo } from 'react';
export function TableBody({ data, columns, getRowId, rowActions, onRowClick }) {
    const memoizedRowActions = useMemo(() => rowActions, [rowActions]);
    const memoizedOnRowClick = useMemo(() => onRowClick, [onRowClick]);
    return (_jsx("tbody", { className: "divide-y divide-border-subtle bg-surface-1", children: data.map(row => (_jsxs(TableRow, { onClick: () => {
                if (memoizedOnRowClick) {
                    memoizedOnRowClick(row);
                }
            }, children: [columns.map(column => {
                    // Add responsive classes for column visibility
                    const responsiveClasses = [
                        column.hideOnMobile ? 'hidden md:table-cell' : '',
                        column.hideOnTablet ? 'hidden lg:table-cell' : '',
                    ]
                        .filter(Boolean)
                        .join(' ');
                    return (_jsx(TableCell, { className: `${column.className ?? ''} ${responsiveClasses}`, children: column.render(row) }, column.key));
                }), memoizedRowActions ? (_jsx(TableCell, { className: "hidden text-right sm:table-cell", children: memoizedRowActions(row) })) : null] }, getRowId(row)))) }));
}
export const TableRow = memo(function TableRow({ children, onClick }) {
    return (_jsx("tr", { className: onClick ? 'cursor-pointer hover:bg-surface-2' : '', onClick: onClick, children: children }));
});
export const TableCell = memo(function TableCell({ className, children }) {
    return _jsx("td", { className: `px-3 py-2 text-text-primary ${className ?? ''}`, children: children });
});
//# sourceMappingURL=TableBody.js.map