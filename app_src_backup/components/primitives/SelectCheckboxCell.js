'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useSelectContext } from './SelectProvider';
export function SelectCheckboxCell({ rowId }) {
    const { isSelected, toggleRow } = useSelectContext();
    return (_jsx("td", { className: "px-3 py-2", children: _jsx("input", { type: "checkbox", "aria-label": "Select row", checked: isSelected(rowId), onChange: event => toggleRow(rowId, event.nativeEvent.shiftKey) }) }));
}
//# sourceMappingURL=SelectCheckboxCell.js.map