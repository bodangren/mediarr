'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { moveColumn, toggleColumnVisibility } from '@/lib/table/columns';
const COLUMN_ITEM_TYPE = 'table-column';
export function reorderOnHover(columns, dragIndex, hoverIndex) {
    if (dragIndex === hoverIndex) {
        return columns;
    }
    return moveColumn(columns, dragIndex, hoverIndex);
}
export function applyHoverReorder(columns, item, hoverIndex, onChange) {
    const next = reorderOnHover(columns, item.index, hoverIndex);
    if (next === columns) {
        return;
    }
    onChange(next);
    item.index = hoverIndex;
}
function ColumnRow({ column, index, total, columns, onChange }) {
    const ref = useRef(null);
    const [, drop] = useDrop({
        accept: COLUMN_ITEM_TYPE,
        hover(item) {
            applyHoverReorder(columns, item, index, onChange);
        },
    });
    const [{ isDragging }, drag] = useDrag({
        type: COLUMN_ITEM_TYPE,
        item: { index },
        collect: monitor => ({
            isDragging: monitor.isDragging(),
        }),
    });
    const attachRowRef = useCallback((node) => {
        ref.current = node;
        drag(drop(node));
    }, [drag, drop]);
    return (_jsxs("li", { ref: attachRowRef, className: "flex items-center justify-between gap-2 rounded-sm border border-border-subtle p-2", style: { opacity: isDragging ? 0.5 : 1 }, children: [_jsxs("label", { className: "inline-flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", "aria-label": `Toggle ${column.label}`, checked: column.visible, onChange: () => onChange(toggleColumnVisibility(columns, column.key)) }), _jsx("span", { children: column.label })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { type: "button", "aria-label": `Move ${column.label} up`, className: "rounded-sm border border-border-subtle px-2 py-1 text-xs", onClick: () => onChange(moveColumn(columns, index, Math.max(0, index - 1))), disabled: index <= 0, children: "\u2191" }), _jsx("button", { type: "button", "aria-label": `Move ${column.label} down`, className: "rounded-sm border border-border-subtle px-2 py-1 text-xs", onClick: () => onChange(moveColumn(columns, index, Math.min(total - 1, index + 1))), disabled: index >= total - 1, children: "\u2193" })] })] }));
}
export function TableOptionsModal({ title, columns, onChange, onClose }) {
    return (_jsx("div", { className: "fixed inset-0 z-40 flex items-center justify-center bg-surface-3/70 px-4", children: _jsxs("div", { className: "w-full max-w-md rounded-md border border-border-subtle bg-surface-1 p-4 shadow-elevation-3", children: [_jsxs("header", { className: "mb-3 flex items-center justify-between", children: [_jsx("h2", { className: "text-base font-semibold", children: title }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-secondary", onClick: onClose, children: "Close" })] }), _jsx(DndProvider, { backend: HTML5Backend, children: _jsx("ul", { className: "space-y-2", children: columns.map((column, index) => (_jsx(ColumnRow, { column: column, index: index, total: columns.length, columns: columns, onChange: onChange }, column.key))) }) })] }) }));
}
//# sourceMappingURL=TableOptionsModal.js.map