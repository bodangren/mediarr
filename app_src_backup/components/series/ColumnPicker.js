'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export function ColumnPicker({ options, visibleColumns, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    return (_jsxs("div", { className: "relative", children: [_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle bg-surface-1 px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-2 hover:text-text-primary", onClick: () => setIsOpen(current => !current), "aria-expanded": isOpen, children: "Columns" }), isOpen && (_jsx("div", { className: "absolute right-0 mt-1 w-52 rounded-sm border border-border-subtle bg-surface-1 p-2 shadow-elevation-3 z-20", children: _jsx("div", { className: "space-y-1", children: options.map(option => {
                        const checked = visibleColumns.includes(option.key);
                        return (_jsxs("label", { className: "flex items-center gap-2 rounded-sm px-1 py-1 text-xs hover:bg-surface-2", children: [_jsx("input", { type: "checkbox", checked: checked, onChange: () => {
                                        const next = checked
                                            ? visibleColumns.filter(column => column !== option.key)
                                            : [...visibleColumns, option.key];
                                        if (next.length === 0) {
                                            return;
                                        }
                                        onChange(next);
                                    } }), option.label] }, option.key));
                    }) }) }))] }));
}
//# sourceMappingURL=ColumnPicker.js.map