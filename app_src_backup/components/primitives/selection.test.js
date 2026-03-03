import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SelectCheckboxCell } from './SelectCheckboxCell';
import { SelectFooter } from './SelectFooter';
import { SelectProvider } from './SelectProvider';
function SelectionHarness({ onBulkAction }) {
    return (_jsxs(SelectProvider, { rowIds: [1, 2, 3, 4], children: [_jsx("table", { children: _jsx("tbody", { children: [1, 2, 3, 4].map(id => (_jsx("tr", { children: _jsx(SelectCheckboxCell, { rowId: id }) }, id))) }) }), _jsx(SelectFooter, { actions: [
                    {
                        label: 'Delete',
                        onClick: onBulkAction,
                    },
                ] })] }));
}
describe('selection mode', () => {
    it('supports row selection and shift-click range selection', () => {
        const onBulkAction = vi.fn();
        render(_jsx(SelectionHarness, { onBulkAction: onBulkAction }));
        const checkboxes = screen.getAllByRole('checkbox', { name: /select row/i });
        fireEvent.click(checkboxes[0]);
        fireEvent.click(checkboxes[2], { shiftKey: true });
        expect(screen.getByText('3 selected')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
        expect(onBulkAction).toHaveBeenCalledWith([1, 2, 3]);
    });
});
//# sourceMappingURL=selection.test.js.map