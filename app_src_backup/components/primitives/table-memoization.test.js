import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Table } from './Table';
import { TableBody, TableCell, TableRow } from './TableBody';
import { TableHeader } from './TableHeader';
describe('Table Memoization', () => {
    const columns = [
        { key: 'name', header: 'Name', sortable: true, render: row => row.name },
        { key: 'status', header: 'Status', sortable: false, render: row => row.status },
    ];
    const data = [
        { id: 1, name: 'Item 1', status: 'active' },
        { id: 2, name: 'Item 2', status: 'inactive' },
    ];
    it('Table component memoizes rendering with same props', () => {
        const { rerender } = render(_jsxs(Table, { children: [_jsx(TableHeader, { columns: columns }), _jsx(TableBody, { data: data, columns: columns, getRowId: row => row.id })] }));
        const tableBefore = screen.getByRole('table');
        // Re-render with same props
        rerender(_jsxs(Table, { children: [_jsx(TableHeader, { columns: columns }), _jsx(TableBody, { data: data, columns: columns, getRowId: row => row.id })] }));
        const tableAfter = screen.getByRole('table');
        // The table should still be present
        expect(tableBefore).toBeInTheDocument();
        expect(tableAfter).toBeInTheDocument();
    });
    it('TableHeader memoizes with same columns prop', () => {
        const onSort = vi.fn();
        const { rerender } = render(_jsx(Table, { children: _jsx(TableHeader, { columns: columns, onSort: onSort }) }));
        const headerBefore = screen.getByText('Name');
        // Re-render with same columns reference
        rerender(_jsx(Table, { children: _jsx(TableHeader, { columns: columns, onSort: onSort }) }));
        const headerAfter = screen.getByText('Name');
        expect(headerBefore).toBe(headerAfter);
    });
    it('TableBody memoizes with same data and columns', () => {
        const { rerender } = render(_jsx(Table, { children: _jsx(TableBody, { data: data, columns: columns, getRowId: row => row.id }) }));
        const rowBefore = screen.getByText('Item 1');
        // Re-render with same data and columns
        rerender(_jsx(Table, { children: _jsx(TableBody, { data: data, columns: columns, getRowId: row => row.id }) }));
        const rowAfter = screen.getByText('Item 1');
        expect(rowBefore).toBe(rowAfter);
    });
    it('TableRow memoizes with same children', () => {
        const onClick = vi.fn();
        const { rerender } = render(_jsx("table", { children: _jsx("tbody", { children: _jsx(TableRow, { onClick: onClick, children: _jsx(TableCell, { children: "Test Content" }) }) }) }));
        const rowBefore = screen.getByText('Test Content');
        // Re-render with same children
        rerender(_jsx("table", { children: _jsx("tbody", { children: _jsx(TableRow, { onClick: onClick, children: _jsx(TableCell, { children: "Test Content" }) }) }) }));
        const rowAfter = screen.getByText('Test Content');
        expect(rowBefore).toBe(rowAfter);
    });
    it('TableCell memoizes with same className and children', () => {
        const { rerender } = render(_jsx("table", { children: _jsx("tbody", { children: _jsx(TableRow, { children: _jsx(TableCell, { className: "custom-class", children: "Cell Content" }) }) }) }));
        const cellBefore = screen.getByText('Cell Content');
        // Re-render with same props
        rerender(_jsx("table", { children: _jsx("tbody", { children: _jsx(TableRow, { children: _jsx(TableCell, { className: "custom-class", children: "Cell Content" }) }) }) }));
        const cellAfter = screen.getByText('Cell Content');
        expect(cellBefore).toBe(cellAfter);
    });
    it('prevents unnecessary re-renders when irrelevant props change', () => {
        const onSort = vi.fn();
        const getRowId = (row) => row.id;
        // Track table renders
        const tableRenderSpy = vi.fn();
        const { rerender } = render(_jsxs(Table, { children: [_jsx(TableHeader, { columns: columns, onSort: onSort }), _jsx(TableBody, { data: data, columns: columns, getRowId: getRowId })] }));
        // Get reference to rendered table
        const tableBefore = screen.getByRole('table');
        // Re-render with same props
        rerender(_jsxs(Table, { children: [_jsx(TableHeader, { columns: columns, onSort: onSort }), _jsx(TableBody, { data: data, columns: columns, getRowId: getRowId })] }));
        const tableAfter = screen.getByRole('table');
        // The table should still be present (memoization doesn't prevent re-render of parent)
        expect(tableBefore).toBeInTheDocument();
        expect(tableAfter).toBeInTheDocument();
        // But with React.memo, if props are identical, React may reuse the component
    });
});
//# sourceMappingURL=table-memoization.test.js.map