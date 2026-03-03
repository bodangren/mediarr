'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { LayoutGrid, List, Table2 } from 'lucide-react';
import { Button } from './Button';
const VIEW_OPTIONS = [
    { key: 'poster', label: 'Poster', icon: LayoutGrid },
    { key: 'overview', label: 'Overview', icon: List },
    { key: 'table', label: 'Table', icon: Table2 },
];
export function ViewMenu({ value, onChange, label = 'View' }) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = VIEW_OPTIONS.find(opt => opt.key === value);
    return (_jsxs("div", { className: "relative inline-flex items-center", children: [_jsxs(Button, { variant: "secondary", onClick: () => setIsOpen(!isOpen), "aria-expanded": isOpen, "aria-haspopup": "listbox", "aria-label": `${label}: ${selectedOption?.label}`, children: [selectedOption && _jsx(selectedOption.icon, { size: 14, className: "mr-1.5" }), _jsx("span", { className: "text-xs", children: selectedOption?.label })] }), isOpen && (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: "fixed inset-0 z-30", onClick: () => setIsOpen(false), "aria-label": "Close view menu" }), _jsx("ul", { className: "absolute right-0 z-40 mt-1 min-w-[140px] rounded-sm border border-border-subtle bg-surface-1 shadow-elevation-2", role: "listbox", "aria-label": label, children: VIEW_OPTIONS.map(option => {
                            const Icon = option.icon;
                            const isActive = option.key === value;
                            return (_jsx("li", { role: "option", "aria-selected": isActive, children: _jsxs("button", { type: "button", className: `flex w-full items-center gap-2 px-3 py-2 text-xs text-left transition ${isActive ? 'bg-surface-2 text-text-primary font-medium' : 'text-text-secondary hover:bg-surface-2'}`, onClick: () => {
                                        onChange(option.key);
                                        setIsOpen(false);
                                    }, children: [_jsx(Icon, { size: 14 }), _jsx("span", { children: option.label }), isActive && (_jsx("svg", { className: "ml-auto h-3.5 w-3.5 text-accent-primary", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", "data-testid": "active-checkmark", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 3, d: "M5 13l4 4L19 7" }) }))] }) }, option.key));
                        }) })] }))] }));
}
//# sourceMappingURL=ViewMenu.js.map